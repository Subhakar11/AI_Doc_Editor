const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw ? JSON.parse(raw) : null;
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createSeedData() {
  return {
    users: [
      { id: 'u_ali', name: 'Alicia Dev', email: 'alicia@ajaia.internal' },
      { id: 'u_ben', name: 'Ben Collaborator', email: 'ben@ajaia.internal' },
      { id: 'u_cara', name: 'Cara Reviewer', email: 'cara@ajaia.internal' }
    ],
    documents: [
      {
        id: 'doc_welcome',
        title: 'Project brief',
        content: '<h1>Project brief</h1><p>Use this doc to draft ideas, import files, and share with teammates.</p><ul><li>Bold and italic formatting</li><li>Headings</li><li>Lists</li></ul>',
        ownerId: 'u_ali',
        sharedWith: ['u_ben'],
        createdAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
        sourceFile: null,
        fileType: null
      }
    ],
    counters: { doc: 2 }
  };
}

function createStore(filePath) {
  let db = readJson(filePath);
  if (!db) {
    db = createSeedData();
    writeJson(filePath, db);
  }

  function save() {
    writeJson(filePath, db);
  }

  function listUsers() {
    return db.users.map(u => ({ ...u }));
  }

  function getUserById(id) {
    return db.users.find(u => u.id === String(id)) || null;
  }

  function getUserByEmail(email) {
    return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  function canAccessDocument(doc, userId) {
    if (!doc) return false;
    if (doc.ownerId === userId) return true;
    return Array.isArray(doc.sharedWith) && doc.sharedWith.includes(userId);
  }

  function enrichDocument(doc) {
    if (!doc) return null;
    return {
      ...doc,
      owner: getUserById(doc.ownerId),
      sharedUsers: (doc.sharedWith || []).map(id => getUserById(id)).filter(Boolean)
    };
  }

  function listDocumentsForUser(userId) {
    return db.documents
      .filter(doc => canAccessDocument(doc, userId))
      .map(doc => ({
        ...enrichDocument(doc),
        access: doc.ownerId === userId ? 'owned' : 'shared'
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function getDocumentById(id) {
    return db.documents.find(doc => doc.id === String(id)) || null;
  }

  function createDocument({ title, content, ownerId, sourceFile = null, fileType = null }) {
    const now = new Date().toISOString();
    const id = `doc_${crypto.randomUUID().slice(0, 8)}`;
    const document = {
      id,
      title: title || 'Untitled document',
      content: content || '<p></p>',
      ownerId,
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
      sourceFile,
      fileType
    };
    db.documents.unshift(document);
    db.counters.doc += 1;
    save();
    return enrichDocument(document);
  }

  function updateDocument(id, userId, updates) {
    const doc = getDocumentById(id);
    if (!doc) return null;
    if (!canAccessDocument(doc, userId)) {
      const err = new Error('You do not have access to this document.');
      err.status = 403;
      throw err;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      doc.title = String(updates.title).trim() || doc.title;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'content')) {
      doc.content = String(updates.content);
    }
    doc.updatedAt = new Date().toISOString();
    save();
    return enrichDocument(doc);
  }

  function shareDocument(id, ownerUserId, email) {
    const doc = getDocumentById(id);
    if (!doc) return { error: 'Document not found.', status: 404 };
    if (doc.ownerId !== ownerUserId) {
      return { error: 'Only the owner can share this document.', status: 403 };
    }
    const user = getUserByEmail(email);
    if (!user) return { error: 'No seeded user matches that email.', status: 404 };
    if (user.id === ownerUserId) return { error: 'You already own this document.', status: 400 };
    doc.sharedWith = Array.isArray(doc.sharedWith) ? doc.sharedWith : [];
    if (!doc.sharedWith.includes(user.id)) {
      doc.sharedWith.push(user.id);
      doc.updatedAt = new Date().toISOString();
      save();
    }
    return { document: enrichDocument(doc), sharedWith: doc.sharedWith.slice() };
  }

  return {
    listUsers,
    getUserById,
    getUserByEmail,
    canAccessDocument,
    enrichDocument,
    listDocumentsForUser,
    getDocumentById,
    createDocument,
    updateDocument,
    shareDocument,
    save
  };
}

module.exports = { createStore };
