const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { createStore } = require('../storage');

test('documents can be created, shared, and access is persisted', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ajaia-docs-'));
  const dataFile = path.join(tempDir, 'db.json');
  const store = createStore(dataFile);

  const doc = store.createDocument({
    title: 'Roadmap',
    content: '<h1>Roadmap</h1><p>Build the MVP</p>',
    ownerId: 'u_ali'
  });

  assert.ok(doc.id.startsWith('doc_'));
  assert.strictEqual(doc.title, 'Roadmap');
  assert.strictEqual(store.listDocumentsForUser('u_ali').length >= 1, true);
  assert.strictEqual(store.listDocumentsForUser('u_ben').length >= 0, true);

  const share = store.shareDocument(doc.id, 'u_ali', 'ben@ajaia.internal');
  assert.ok(!share.error);
  assert.strictEqual(store.canAccessDocument(store.getDocumentById(doc.id), 'u_ben'), true);

  const reopened = createStore(dataFile);
  assert.strictEqual(reopened.canAccessDocument(reopened.getDocumentById(doc.id), 'u_ben'), true);
  assert.strictEqual(reopened.getDocumentById(doc.id).title, 'Roadmap');
});
