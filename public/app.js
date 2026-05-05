const API = '';

const state = {
  users: [],
  currentUser: null,
  documents: [],
  activeDoc: null,
  editorDirty: false,
  saveTimer: null
};

const el = {
  userSelect: document.getElementById('userSelect'),
  docList: document.getElementById('docList'),
  newDocBtn: document.getElementById('newDocBtn'),
  titleInput: document.getElementById('titleInput'),
  editor: document.getElementById('editor'),
  editorWrap: document.getElementById('editorWrap'),
  emptyState: document.getElementById('emptyState'),
  badge: document.getElementById('docBadge'),
  saveState: document.getElementById('saveState'),
  saveBtn: document.getElementById('saveBtn'),
  toast: document.getElementById('toast'),
  fileInput: document.getElementById('fileInput'),
  shareEmail: document.getElementById('shareEmail'),
  shareBtn: document.getElementById('shareBtn'),
  sharedInfo: document.getElementById('sharedInfo'),
  sourceInfo: document.getElementById('sourceInfo')
};

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(el.toast._t);
  el.toast._t = setTimeout(() => el.toast.classList.add('hidden'), 2400);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.currentUser) headers['X-User-Id'] = state.currentUser.id;
  const response = await fetch(path, { ...options, headers });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function setSaveState(text) {
  el.saveState.textContent = text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsers(users) {
  return users.map(user => `<span>${escapeHtml(user.name)} (${escapeHtml(user.email)})</span>`).join('<br>');
}

function renderUserSelect() {
  el.userSelect.innerHTML = state.users.map(user => (
    `<option value="${user.id}">${user.name} · ${user.email}</option>`
  )).join('');
  const saved = localStorage.getItem('ajaia_user');
  const fallback = state.users[0]?.id;
  const selectedId = state.users.some(u => u.id === saved) ? saved : fallback;
  el.userSelect.value = selectedId || '';
  state.currentUser = state.users.find(u => u.id === el.userSelect.value) || null;
  localStorage.setItem('ajaia_user', el.userSelect.value);
}

function documentAccessLabel(doc) {
  return doc.access === 'owned' ? 'Owned' : 'Shared';
}

function renderDocuments() {
  el.docList.innerHTML = state.documents.map(doc => {
    const active = state.activeDoc?.id === doc.id ? 'active' : '';
    return `
      <div class="doc-card ${active}" data-id="${doc.id}">
        <div class="doc-title">${escapeHtml(doc.title)}</div>
        <div class="doc-meta">${documentAccessLabel(doc)} · Updated ${new Date(doc.updatedAt).toLocaleString()}</div>
      </div>
    `;
  }).join('') || '<div class="hint">No documents yet.</div>';
  el.docList.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', () => openDocument(card.dataset.id));
  });
}

function syncEditorToState(doc) {
  el.titleInput.disabled = !doc;
  el.titleInput.value = doc?.title || '';
  el.editor.innerHTML = doc?.content || '';
  el.editorWrap.classList.toggle('hidden', !doc);
  el.emptyState.classList.toggle('hidden', !!doc);
  el.badge.textContent = doc ? `${documentAccessLabel(doc)} · ${doc.owner?.name || 'Unknown owner'}` : 'No document selected';
  el.sharedInfo.innerHTML = doc ? (doc.sharedUsers?.length ? `Shared with: ${formatUsers(doc.sharedUsers)}` : 'Not shared yet.') : '';
  el.sourceInfo.textContent = doc ? (doc.sourceFile ? `Imported from ${doc.sourceFile}` : 'Created in app') : '';
  setSaveState(doc ? 'Loaded' : 'Idle');
  state.editorDirty = false;
}

async function refreshDocuments(selectId) {
  const data = await api('/api/documents');
  state.documents = data.documents;
  renderDocuments();
  if (selectId) {
    const doc = state.documents.find(d => d.id === selectId);
    if (doc) await openDocument(doc.id, false);
  } else if (state.activeDoc) {
    const doc = state.documents.find(d => d.id === state.activeDoc.id);
    if (doc) {
      state.activeDoc = doc;
      syncEditorToState(doc);
      renderDocuments();
    }
  }
}

async function openDocument(id, redraw = true) {
  try {
    const data = await api(`/api/documents/${id}`);
    state.activeDoc = data.document;
    syncEditorToState(state.activeDoc);
    if (redraw) renderDocuments();
  } catch (err) {
    showToast(err.message);
  }
}

async function createDocument() {
  try {
    const data = await api('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'Untitled document' })
    });
    await refreshDocuments(data.document.id);
    showToast('Document created');
  } catch (err) {
    showToast(err.message);
  }
}

async function saveDocument() {
  if (!state.activeDoc) return;
  const payload = {
    title: el.titleInput.value.trim() || 'Untitled document',
    content: el.editor.innerHTML
  };
  try {
    setSaveState('Saving...');
    const data = await api(`/api/documents/${state.activeDoc.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    state.activeDoc = data.document;
    await refreshDocuments();
    setSaveState('Saved');
    showToast('Saved');
  } catch (err) {
    setSaveState('Save failed');
    showToast(err.message);
  }
}

function scheduleAutoSave() {
  clearTimeout(state.saveTimer);
  state.editorDirty = true;
  setSaveState('Unsaved changes');
  state.saveTimer = setTimeout(() => {
    saveDocument();
  }, 1200);
}

async function shareDocument() {
  if (!state.activeDoc) return;
  const email = el.shareEmail.value.trim();
  if (!email) {
    showToast('Enter a teammate email');
    return;
  }
  try {
    const data = await api(`/api/documents/${state.activeDoc.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    state.activeDoc = data.document;
    el.shareEmail.value = '';
    await refreshDocuments();
    showToast('Shared successfully');
  } catch (err) {
    showToast(err.message);
  }
}

async function importFile(file) {
  const text = await file.text();
  try {
    const data = await api('/api/documents/import', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'text/plain',
        content: text
      })
    });
    await refreshDocuments(data.document.id);
    showToast(`Imported ${file.name}`);
  } catch (err) {
    showToast(err.message);
  }
}

function exec(cmd) {
  if (cmd === 'h1' || cmd === 'h2') {
    document.execCommand('formatBlock', false, cmd);
  } else {
    document.execCommand(cmd, false, null);
  }
  el.editor.focus();
  scheduleAutoSave();
}

async function boot() {
  const usersData = await api('/api/users');
  state.users = usersData.users;
  renderUserSelect();
  state.currentUser = state.users.find(u => u.id === el.userSelect.value) || state.users[0];

  const currentDocs = await api('/api/documents');
  state.documents = currentDocs.documents;
  renderDocuments();

  if (state.documents[0]) {
    await openDocument(state.documents[0].id);
  }
}

el.userSelect.addEventListener('change', async () => {
  state.currentUser = state.users.find(u => u.id === el.userSelect.value) || null;
  localStorage.setItem('ajaia_user', el.userSelect.value);
  state.activeDoc = null;
  syncEditorToState(null);
  try {
    const data = await api('/api/documents');
    state.documents = data.documents;
    renderDocuments();
    if (state.documents[0]) await openDocument(state.documents[0].id);
  } catch (err) {
    showToast(err.message);
  }
});

el.newDocBtn.addEventListener('click', createDocument);
el.saveBtn.addEventListener('click', saveDocument);
el.shareBtn.addEventListener('click', shareDocument);
el.fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.(txt|md)$/i.test(file.name)) {
    showToast('Only .txt and .md files are supported in this build.');
    event.target.value = '';
    return;
  }
  await importFile(file);
  event.target.value = '';
});

el.titleInput.addEventListener('input', () => {
  if (!state.activeDoc) return;
  scheduleAutoSave();
});

el.editor.addEventListener('input', scheduleAutoSave);
el.editor.addEventListener('paste', () => scheduleAutoSave());

document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => exec(btn.dataset.cmd));
});

window.addEventListener('beforeunload', (e) => {
  if (state.editorDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

boot().catch(err => {
  showToast(err.message);
});
