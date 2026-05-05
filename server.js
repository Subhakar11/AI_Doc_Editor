const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { createStore } = require('./storage');

const PORT = process.env.PORT || 5000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const store = createStore(DATA_FILE);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS'
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function userFromReq(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  return store.getUserById(String(userId));
}

function requireUser(req, res) {
  const user = userFromReq(req);
  if (!user) {
    sendJson(res, 401, { error: 'Select a user to continue.' });
    return null;
  }
  return user;
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, pathname) {
  const filePath = pathname === '/' ? path.join(__dirname, 'public', 'index.html') : path.join(__dirname, 'public', pathname);
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return notFound(res);
  }
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml'
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function normalizeTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function normalizeHtml(value) {
  return String(value || '');
}

function normalizePlainText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trimEnd();
}

async function handler(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS'
    });
    return res.end();
  }

  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/me' && req.method === 'GET') {
        const user = requireUser(req, res);
        if (!user) return;
        return sendJson(res, 200, { user });
      }

      if (pathname === '/api/users' && req.method === 'GET') {
        return sendJson(res, 200, { users: store.listUsers() });
      }

      if (pathname === '/api/documents' && req.method === 'GET') {
        const user = requireUser(req, res);
        if (!user) return;
        return sendJson(res, 200, { documents: store.listDocumentsForUser(user.id) });
      }

      if (pathname === '/api/documents' && req.method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return;
        const body = await readBody(req);
        const title = normalizeTitle(body?.title) || 'Untitled document';
        const doc = store.createDocument({
          title,
          content: '<h1>Untitled document</h1><p>Start writing here…</p>',
          ownerId: user.id
        });
        return sendJson(res, 201, { document: doc });
      }

      if (pathname === '/api/documents/import' && req.method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return;
        const body = await readBody(req);
        const fileName = normalizeTitle(body?.fileName) || 'Imported file';
        const content = normalizePlainText(body?.content);
        const mode = body?.mode === 'append' ? 'append' : 'replace';
        const html = textToHtml(content);
        const title = fileName.replace(/\.(txt|md)$/i, '') || 'Imported file';
        const doc = store.createDocument({
          title,
          content: html,
          ownerId: user.id,
          sourceFile: fileName,
          fileType: body?.fileType || 'text/plain'
        });
        if (mode === 'append' && body?.documentId) {
          const existing = store.getDocumentById(String(body.documentId));
          if (!existing || !store.canAccessDocument(existing, user.id)) {
            return sendJson(res, 403, { error: 'You do not have access to that document.' });
          }
          const combined = `${existing.content || ''}<hr>${html}`;
          const updated = store.updateDocument(existing.id, user.id, { content: combined });
          return sendJson(res, 200, { document: updated, importedTo: existing.id });
        }
        return sendJson(res, 201, { document: doc });
      }

      const docIdMatch = pathname.match(/^\/api\/documents\/([^/]+)$/);
      if (docIdMatch) {
        const docId = decodeURIComponent(docIdMatch[1]);
        const user = requireUser(req, res);
        if (!user) return;
        const doc = store.getDocumentById(docId);
        if (!doc) return notFound(res);
        if (!store.canAccessDocument(doc, user.id)) {
          return sendJson(res, 403, { error: 'You do not have access to this document.' });
        }

        if (req.method === 'GET') {
          return sendJson(res, 200, { document: store.enrichDocument(doc) });
        }

        if (req.method === 'PATCH') {
          const body = await readBody(req);
          const updates = {};
          if (Object.prototype.hasOwnProperty.call(body || {}, 'title')) updates.title = normalizeTitle(body.title) || doc.title;
          if (Object.prototype.hasOwnProperty.call(body || {}, 'content')) updates.content = normalizeHtml(body.content);
          const updated = store.updateDocument(docId, user.id, updates);
          return sendJson(res, 200, { document: updated });
        }

        if (pathname.endsWith('/share') && req.method === 'POST') {
          const body = await readBody(req);
          const email = String(body?.email || '').trim().toLowerCase();
          if (!email) return sendJson(res, 400, { error: 'Email is required.' });
          const shared = store.shareDocument(docId, user.id, email);
          if (shared.error) return sendJson(res, shared.status || 400, { error: shared.error });
          return sendJson(res, 200, { document: shared.document, sharedWith: shared.sharedWith });
        }
      }

      const shareMatch = pathname.match(/^\/api\/documents\/([^/]+)\/share$/);
      if (shareMatch && req.method === 'POST') {
        const docId = decodeURIComponent(shareMatch[1]);
        const user = requireUser(req, res);
        if (!user) return;
        const body = await readBody(req);
        const email = String(body?.email || '').trim().toLowerCase();
        if (!email) return sendJson(res, 400, { error: 'Email is required.' });
        const shared = store.shareDocument(docId, user.id, email);
        if (shared.error) return sendJson(res, shared.status || 400, { error: shared.error });
        return sendJson(res, 200, { document: shared.document, sharedWith: shared.sharedWith });
      }

      return notFound(res);
    } catch (err) {
      return sendJson(res, 400, { error: err.message || 'Request failed' });
    }
  }

  return serveStatic(req, res, pathname);
}

function textToHtml(input) {
  const text = String(input || '');
  if (!text) return '<p></p>';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n');
  return escaped.map(line => line ? `<p>${line}</p>` : '<p><br></p>').join('');
}

const server = http.createServer(handler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AI Native Doc Editor running on http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });
}

module.exports = { server };
