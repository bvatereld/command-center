// ── TABS ──────────────────────────────────────────────────
function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
}

// ── DRAG & DROP ───────────────────────────────────────────
let dragEl = null;

function initDragDrop() {
  document.querySelectorAll('.draggable').forEach(attachDrag);
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); highlightZone(zone); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) clearZones(); });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      if (dragEl) {
        const droppedItem = dragEl;
        zone.appendChild(droppedItem);
        droppedItem.dataset.zone = zone.dataset.zone;
        finishDrag();
        if (zone.dataset.zone === 'waiting') {
          // Small delay so finishDrag completes first
          setTimeout(() => showWaitingModal(droppedItem), 50);
        }
      }
    });
  });
  updateEmptyZones();
}

function attachDrag(el) {
  el.addEventListener('dragstart', e => { dragEl = el; setTimeout(() => el.classList.add('dragging'), 0); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragend', () => { if (dragEl) dragEl.classList.remove('dragging'); clearZones(); finishDrag(); });
  el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); if (!dragEl || dragEl === el) return; const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2; document.querySelectorAll('.drag-over-above,.drag-over-below').forEach(x => x.classList.remove('drag-over-above','drag-over-below')); el.classList.add(e.clientY < mid ? 'drag-over-above' : 'drag-over-below'); highlightZone(el.closest('.drop-zone')); });
  el.addEventListener('dragleave', () => { el.classList.remove('drag-over-above','drag-over-below'); });
  el.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); if (!dragEl || dragEl === el) return; const zone = el.closest('.drop-zone'); const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2; zone.insertBefore(dragEl, e.clientY < mid ? el : el.nextSibling); dragEl.dataset.zone = zone.dataset.zone; el.classList.remove('drag-over-above','drag-over-below'); const droppedItem = dragEl; finishDrag(); if (zone.dataset.zone === 'waiting') setTimeout(() => showWaitingModal(droppedItem), 50); });
}

function highlightZone(zone) { if (!zone) return; clearZones(); const z = zone.dataset.zone; zone.classList.add(z === 'today' ? 'zone-active-today' : z === 'week' ? 'zone-active-week' : z === 'waiting' ? 'zone-active-waiting' : 'zone-active-long'); }
function clearZones() { document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('zone-active-today','zone-active-week','zone-active-long','zone-active-waiting')); }
function finishDrag() {
  // Force-reset visual state on ALL draggables — uncheck any that aren't meant to be done
  document.querySelectorAll('.drop-zone .draggable').forEach(item => {
    const cb = item.querySelector('.task-cb');
    if (cb && cb.checked) cb.checked = false;
    item.style.opacity = '';
    item.style.textDecoration = '';
  });
  dragEl = null; clearZones(); updateEmptyZones(); updatePrioCount(); saveState();
}

function updateEmptyZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    let empty = zone.querySelector('.drop-zone-empty');
    if (zone.querySelectorAll('.draggable').length === 0) { if (!empty) { empty = document.createElement('div'); empty.className = 'drop-zone-empty'; empty.textContent = 'Drop tasks here'; zone.appendChild(empty); } }
    else if (empty) empty.remove();
  });
}

function updatePrioCount() {
  const n = document.querySelectorAll('#priorities-card .draggable').length;
  const el = document.getElementById('prio-count');
  if (el) el.textContent = n + ' task' + (n !== 1 ? 's' : '');
}

// ── DONE AREA ─────────────────────────────────────────────
function initDoneLogic() {
  document.getElementById('priorities-card').addEventListener('change', e => {
    if (!e.target.classList.contains('task-cb')) return;
    const item = e.target.closest('.task-item');
    if (!item) return;
    if (e.target.checked) {
      item.dataset.originZone = item.dataset.zone || item.closest('.drop-zone')?.dataset.zone || 'today';
      item.dataset.pendingDone = 'true'; // mark immediately — saveState will exclude this
      saveState(); // save now with item excluded
      setTimeout(() => moveToDone(item), 400);
    }
  });
}

function moveToDone(item) {
  if (!item.querySelector('.task-cb')?.checked) return;
  const doneList = document.getElementById('done-list');
  const doneSection = document.getElementById('done-section');
  const clearBtn = document.getElementById('clear-done-btn');
  const clone = item.cloneNode(true);
  clone.classList.remove('draggable');
  clone.draggable = false;
  const handle = clone.querySelector('.drag-handle');
  if (handle) {
    const rb = document.createElement('button');
    rb.title = 'Restore';
    rb.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);font-size:12px;padding:0 4px 0 0;flex-shrink:0;margin-top:2px;';
    rb.textContent = '↩';
    rb.onmouseover = () => rb.style.color = 'var(--accent)';
    rb.onmouseout = () => rb.style.color = 'var(--text3)';
    rb.onclick = () => restoreFromDone(clone, item.dataset.originZone);
    handle.replaceWith(rb);
  }
  doneList.appendChild(clone);
  item.remove();
  doneSection.style.display = 'block';
  clearBtn.style.display = 'block';
  updateDoneCount(); updateEmptyZones(); updatePrioCount(); saveState();
}

function restoreFromDone(doneItem, originZone) {
  const zoneId = originZone === 'today' ? 'zone-today' : originZone === 'week' ? 'zone-week' : 'zone-long';
  const zone = document.getElementById(zoneId) || document.getElementById('zone-today');
  const restored = createDraggableTask(doneItem.querySelector('.task-label')?.innerHTML || '', doneItem.querySelector('.task-meta')?.innerHTML || '', originZone || 'today');
  zone.appendChild(restored);
  doneItem.remove();
  updateDoneCount(); updateEmptyZones(); updatePrioCount(); saveState();
}

function toggleDone() {
  const list = document.getElementById('done-list');
  const chevron = document.getElementById('done-chevron');
  const open = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'block';
  chevron.style.transform = open ? '' : 'rotate(90deg)';
}

async function clearDone(e) {
  e.stopPropagation();
  document.getElementById('done-list').innerHTML = '';
  document.getElementById('done-section').style.display = 'none';
  document.getElementById('done-list').style.display = 'none';
  document.getElementById('done-chevron').style.transform = '';
  updateDoneCount(); updatePrioCount();
  await saveState();
  console.log('Done list cleared and saved to Firebase');
}

function updateDoneCount() {
  const n = document.getElementById('done-list').children.length;
  document.getElementById('done-count').textContent = n;
  if (n === 0) { document.getElementById('done-section').style.display = 'none'; document.getElementById('clear-done-btn').style.display = 'none'; }
}

function createDraggableTask(label, meta, zone) {
  const item = document.createElement('div');
  item.className = 'task-item draggable';
  item.draggable = true;
  item.dataset.zone = zone;
  item.innerHTML = `<span class="drag-handle">⠿</span><input type="checkbox" class="task-cb"><div class="task-body"><div class="task-label">${label}</div><div class="task-meta">${meta}</div></div>`;
  attachDrag(item);
  attachLabelEdit(item.querySelector('.task-label'));
  return item;
}
function attachLabelEdit(labelEl) {
  labelEl.title = 'Double-click to edit';
  labelEl.addEventListener('dblclick', () => {
    const current = labelEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText = 'width:100%;background:var(--surface2);border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-family:inherit;font-size:inherit;color:var(--text);outline:none;';
    labelEl.replaceWith(input);
    input.focus(); input.select();
    let committed = false;
    const commit = () => {
      if (committed) return; committed = true;
      const newVal = input.value.trim() || current;
      const newLabel = document.createElement('div');
      newLabel.className = 'task-label';
      newLabel.textContent = newVal;
      attachLabelEdit(newLabel);
      input.replaceWith(newLabel);
      saveState();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  });
}

// ── PERSISTENCE — SUPABASE + localStorage fallback ───────
const STORAGE_KEY = 'cmo_cc_state_v18';
// Firebase config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAlMhhnFqFQjsSdO5Nf9WT_s7EDNf82Rd4",
  authDomain: "cmo-command-center.firebaseapp.com",
  projectId: "cmo-command-center",
  storageBucket: "cmo-command-center.firebasestorage.app",
  messagingSenderId: "778648287827",
  appId: "1:778648287827:web:a08c2a0d7b8578f23ce4a6"
};
// Firebase init
let _db = null;
async function getDb() {
  if (_db) return _db;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
  const { getFirestore, doc, getDoc, setDoc, initializeFirestore, persistentLocalCache } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');
  const app = initializeApp(FIREBASE_CONFIG);
  const fs = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });
  _db = { fs, doc, getDoc, setDoc };
  return _db;
}

async function sbGet(id) {
  try {
    const { fs, doc, getDoc } = await getDb();
    const snap = await getDoc(doc(fs, 'cmo', id));
    if (snap.exists()) { console.log('Firebase read OK:', id); return snap.data().payload; }
    return null;
  } catch(e) { console.warn('Firebase read failed:', e); return null; }
}

async function sbSet(id, payload) {
  try {
    const { fs, doc, setDoc } = await getDb();
    await setDoc(doc(fs, 'cmo', id), { payload, updated_at: new Date().toISOString() });
    console.log('Firebase write OK:', id);
  } catch(e) { console.error('Firebase write failed:', e); }
}

async function saveState() {
  try {
    // Sync note textareas into data attributes before saving innerHTML
    document.querySelectorAll('.drop-zone .task-item.draggable').forEach(item => {
      const ta = item.querySelector('.task-notes-input');
      if (ta) { const na = item.querySelector('.task-notes-area'); if (na) na.dataset.note = ta.value; }
    });
    const doneLabels = new Set(Array.from(document.getElementById('done-list')?.querySelectorAll('.task-label')||[]).map(el=>el.textContent.trim()));
    const state = {zones:{},done:[],doneOpen:document.getElementById('done-list')?.style.display!=='none'};
    ['zone-today','zone-week','zone-long','zone-waiting'].forEach(zid => {
      const zone = document.getElementById(zid); if (!zone) return;
      state.zones[zid] = Array.from(zone.querySelectorAll('.task-item.draggable')).filter(item => {
        const label = item.querySelector('.task-label')?.textContent?.trim();
        return label && !doneLabels.has(label) && !item.dataset.pendingDone;
      }).map(item => ({bodyHTML:item.querySelector('.task-body')?.innerHTML||'',zone:item.dataset.zone||'',created:item.dataset.created||'',waitingOn:item.dataset.waitingOn||''}));
    });
    const dl = document.getElementById('done-list');
    if (dl) state.done = Array.from(dl.querySelectorAll('.task-item')).map(item => ({bodyHTML:item.querySelector('.task-body')?.innerHTML||'',originZone:item.dataset.originZone||'today'}));

    // Save Notes tab
    const notesCards = [];
    document.querySelectorAll('.note-card').forEach(card => {
      notesCards.push({ html: card.outerHTML });
    });
    state.notes = notesCards;

    // Save Team tab - contenteditable boxes
    const teamBoxes = {};
    document.querySelectorAll('#tab-team [contenteditable]').forEach((el, i) => {
      teamBoxes[el.id || `team-box-${i}`] = el.innerHTML;
    });
    state.teamBoxes = teamBoxes;

    // Save Inbox queue
    const inboxItems = [];
    document.querySelectorAll('#inbox-queue .inbox-item').forEach(item => {
      inboxItems.push({ html: item.innerHTML, dest: item.dataset.dest || 'week' });
    });
    state.inbox = inboxItems;

    // Save Slack draft
    const slackDraft = document.getElementById('slack-draft')?.value || '';
    state.slackDraft = slackDraft;

    // Save Slack history from localStorage
    try { state.slackHistory = JSON.parse(localStorage.getItem('cmo_slack_history') || '[]'); } catch(e) { state.slackHistory = []; }

    await sbSet('state', state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showSyncStatus('saved');
  } catch(e) { console.warn('Save failed:',e); }
}

async function saveStamps(stamps) {
  await sbSet('stamps', stamps);
  try { localStorage.setItem('cmo_task_stamps', JSON.stringify(stamps)); } catch(e) {}
}

async function restoreState() {
  let state = await sbGet('state');
  if (!state || !state.zones) {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw); } catch(e) {}
  }
  if (!state || !state.zones) return;
  applyState(state);

  // Restore Notes tab
  if (state.notes && state.notes.length) {
    const notesContainer = document.querySelector('#tab-notes .notes-grid, #tab-notes');
    if (notesContainer) {
      const existingCards = notesContainer.querySelectorAll('.note-card');
      existingCards.forEach(c => c.remove());
      state.notes.forEach(n => {
        const div = document.createElement('div');
        div.innerHTML = n.html;
        const card = div.firstElementChild;
        if (card) notesContainer.appendChild(card);
      });
    }
  }

  // Restore Team tab contenteditable boxes
  if (state.teamBoxes) {
    Object.entries(state.teamBoxes).forEach(([id, html]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  }

  // Restore Inbox queue
  if (state.inbox && state.inbox.length) {
    const queue = document.getElementById('inbox-queue');
    if (queue) {
      queue.querySelectorAll('.inbox-item').forEach(i => i.remove());
      state.inbox.forEach(item => {
        const d = document.createElement('div');
        d.className = 'inbox-item';
        d.dataset.dest = item.dest || 'week';
        d.innerHTML = item.html;
        queue.appendChild(d);
      });
    }
  }

  // Restore Slack draft
  if (state.slackDraft) {
    const draft = document.getElementById('slack-draft');
    if (draft) draft.value = state.slackDraft;
  }

  // Restore Slack history
  if (state.slackHistory && state.slackHistory.length) {
    try { localStorage.setItem('cmo_slack_history', JSON.stringify(state.slackHistory)); } catch(e) {}
  }
  // Update all counts after restore
  if (typeof updateDoneCount === 'function') updateDoneCount();
  if (typeof updatePrioCount === 'function') updatePrioCount();
  if (typeof updateInboxCount === 'function') updateInboxCount();
}

function applyState(state) {
  try {
    const doneLabels = new Set((state.done || []).map(t => {
      const tmp = document.createElement('div'); tmp.innerHTML = t.bodyHTML;
      return tmp.querySelector('.task-label')?.textContent?.trim() || '';
    }));
    if (state.zones) {
      ['zone-today','zone-week','zone-long','zone-waiting'].forEach(zid => {
        const zone = document.getElementById(zid);
        if (!zone) return;
        if (!state.zones[zid] || !state.zones[zid].length) { zone.querySelectorAll('.task-item.draggable').forEach(el => el.remove()); return; }
        const staticItems = Array.from(zone.querySelectorAll('.task-item.draggable'));
        const staticLabels = staticItems.map(el => el.querySelector('.task-label')?.textContent?.trim());
        const savedLabels = state.zones[zid].map(t => {
          const tmp = document.createElement('div'); tmp.innerHTML = t.bodyHTML;
          return tmp.querySelector('.task-label')?.textContent?.trim() || '';
        });
        staticItems.forEach(el => el.remove());
        state.zones[zid].forEach(t => {
          const tmp = document.createElement('div'); tmp.innerHTML = t.bodyHTML;
          const label = tmp.querySelector('.task-label')?.textContent?.trim() || '';
          if (doneLabels.has(label)) return;
          const item = document.createElement('div');
          item.className = 'task-item draggable'; item.draggable = true;
          item.dataset.zone = t.zone || zid.replace('zone-','');
          if (t.created) item.dataset.created = t.created;
          if (t.waitingOn) item.dataset.waitingOn = t.waitingOn;
          item.innerHTML = `<span class="drag-handle">⠿</span><input type="checkbox" class="task-cb"><div class="task-body">${t.bodyHTML}</div>`;
          // Close any note areas that have no content
          item.querySelectorAll('.task-notes-area').forEach(na => {
            const ta = na.querySelector('.task-notes-input');
            if (!ta || !ta.value.trim()) na.classList.remove('open');
          });
          if (t.created) item.appendChild(makeAgeBadge(t.created));
          attachDrag(item); addTaskExtrasToItem(item);
          const lbl = item.querySelector('.task-label'); if (lbl) attachLabelEdit(lbl);
          zone.appendChild(item);
        });
        staticLabels.forEach((label, i) => {
          if (label && !savedLabels.includes(label) && !doneLabels.has(label)) {
            zone.appendChild(staticItems[i]); attachDrag(staticItems[i]);
          }
        });
      });
    }
    const dl = document.getElementById('done-list');
    if (dl) dl.innerHTML = ''; // always clear before restore
    if (state.done && state.done.length > 0) {
      const ds = document.getElementById('done-section');
      const cb = document.getElementById('clear-done-btn');
      state.done.forEach(t => {
        const item = document.createElement('div');
        item.className = 'task-item'; item.dataset.originZone = t.originZone || 'today';
        const rb = document.createElement('button');
        rb.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);font-size:12px;padding:0 4px 0 0;flex-shrink:0;margin-top:2px;';
        rb.textContent = "↩"; rb.onmouseover = () => rb.style.color = 'var(--accent)'; rb.onmouseout = () => rb.style.color = 'var(--text3)';
        rb.onclick = () => restoreFromDone(item, t.originZone);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.className = 'task-cb'; checkbox.checked = true;
        const body = document.createElement('div'); body.className = 'task-body'; body.innerHTML = t.bodyHTML;
        item.appendChild(rb); item.appendChild(checkbox); item.appendChild(body);
        dl.appendChild(item);
      });
      ds.style.display = 'block'; cb.style.display = 'block';
      if (state.doneOpen) { dl.style.display = 'block'; document.getElementById('done-chevron').style.transform = 'rotate(90deg)'; }
      updateDoneCount();
    }
    updateEmptyZones(); updatePrioCount(); updateWaitingInTeam();
  } catch(e) { console.warn('Apply state failed:', e); }
}

async function initAgeBadges() {
  let stamps = await sbGet('stamps');
  if (!stamps) { try { stamps = JSON.parse(localStorage.getItem('cmo_task_stamps') || '{}'); } catch(e) { stamps = {}; } }
  const now = Date.now();
  let changed = false;
  document.querySelectorAll('.drop-zone .task-item.draggable').forEach(item => {
    const label = item.querySelector('.task-label')?.textContent?.trim();
    if (!label) return;
    if (!item.dataset.created) {
      if (!stamps[label]) { stamps[label] = now; changed = true; }
      item.dataset.created = stamps[label];
    } else {
      if (!stamps[label]) { stamps[label] = item.dataset.created; changed = true; }
    }
    if (!item.querySelector('.age-badge')) item.appendChild(makeAgeBadge(item.dataset.created));
  });
  if (changed) await saveStamps(stamps);
}

function showSyncStatus(status) {
  let el = document.getElementById('sync-status');
  if (!el) {
    el = document.createElement('div'); el.id = 'sync-status';
    el.style.cssText = 'font-family:"DM Mono",monospace;font-size:10px;padding:3px 8px;border-radius:4px;transition:opacity .5s;';
    document.querySelector('.topbar-right')?.prepend(el);
  }
  clearTimeout(el._t);
  if (status === 'saved') {
    el.textContent = '☁ Synced'; el.style.color = 'var(--green)'; el.style.opacity = '1';
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2000);
  } else if (status === 'saving') {
    el.textContent = '☁ Syncing...'; el.style.color = 'var(--text3)'; el.style.opacity = '1';
  }
}
// ─────────────────────────────────────────────────────────

// ── INBOX ─────────────────────────────────────────────────
function updateInboxCount() {
  const n = document.querySelectorAll('#inbox-queue .inbox-item').length;
  document.getElementById('inbox-count').textContent = n + ' item' + (n !== 1 ? 's' : '');
  document.getElementById('inbox-empty').style.display = n === 0 ? 'block' : 'none';
}

function addToQueue(text, label, cls) {
  document.getElementById('inbox-empty').style.display = 'none';
  const q = document.getElementById('inbox-queue');
  const d = document.createElement('div');
  d.className = 'task-item inbox-item';
  d.innerHTML = `<input type="checkbox" class="task-cb"><div class="task-body"><div class="task-label">${text.replace(/</g,'&lt;')}</div><div class="task-meta"><span class="badge ${cls}">${label}</span></div></div>`;
  q.appendChild(d);
  updateInboxCount();
}

function routeInbox(dest) {
  const text = document.getElementById('triageInput').value.trim();
  if (!text) return;
  if (['today','week','longterm'].includes(dest)) {
    const zoneMap = {today:'zone-today',week:'zone-week',longterm:'zone-long'};
    const badgeMap = {today:'<span class="badge urgent">Today</span>',week:'<span class="badge high">This Week</span>',longterm:'<span class="badge longterm">Longer Term</span>'};
    const zone = document.getElementById(zoneMap[dest]);
    if (zone) {
      const item = createDraggableTask(text.replace(/</g,'&lt;'), badgeMap[dest], dest === 'longterm' ? 'long' : dest);
      zone.appendChild(item);
      updateEmptyZones(); updatePrioCount(); saveState();
      showRouteToast(dest);
    }
  } else { addToQueue(text, dest === 'team' ? 'Team Item' : 'Archived', dest === 'team' ? 'person' : 'weekly'); }
  document.getElementById('triageInput').value = '';
}

function showRouteToast(dest) {
  const labels = {today:'→ Added to Today',week:'→ Added to This Week',longterm:'→ Added to Longer Term'};
  const colors = {today:'var(--red)',week:'var(--accent)',longterm:'var(--accent2)'};
  let t = document.getElementById('route-toast');
  if (!t) { t = document.createElement('div'); t.id = 'route-toast'; t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:8px;font-family:DM Mono,monospace;font-size:12px;z-index:300;transition:opacity .3s;pointer-events:none;'; document.body.appendChild(t); }
  t.textContent = labels[dest]; t.style.background = 'var(--surface)'; t.style.border = `1px solid ${colors[dest]}`; t.style.color = colors[dest]; t.style.opacity = '1';
  clearTimeout(t._t); t._t = setTimeout(() => t.style.opacity = '0', 2000);
}

// ── BRAIN DUMP ────────────────────────────────────────────
function saveBD() {
  const text = document.getElementById('bdText').value.trim(); if (!text) return;
  const emptyEl = document.getElementById('inbox-empty'); if (emptyEl) emptyEl.style.display = 'none';
  const q = document.getElementById('inbox-queue');
  const d = document.createElement('div'); d.className = 'task-item inbox-item'; d.dataset.dest = 'week';
  d.innerHTML = `<div class="task-body" style="display:flex;align-items:center;justify-content:space-between;gap:10px;"><div class="task-label" style="flex:1;">${text.replace(/</g,'&lt;')}</div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><select style="font-family:'DM Mono',monospace;font-size:10px;border-radius:10px;padding:2px 6px;cursor:pointer;outline:none;background:var(--surface2);border:1px solid var(--border);color:var(--accent);" onchange="this.closest('.inbox-item').dataset.dest=this.value;updateInboxCount();"><option value="today">🔴 Today</option><option value="week" selected>🔵 This Week</option><option value="longterm">🟣 Longer Term</option><option value="team">👥 Team</option><option value="archive">Archive</option></select><button style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:11px;" onclick="this.closest('.inbox-item').remove();updateInboxCount();">✕</button></div></div>`;
  q.appendChild(d);
  document.getElementById('bdText').value = '';
  document.getElementById('bdModal').classList.remove('open');
  updateInboxCount();
  showTab('inbox', document.querySelectorAll('.tab-btn')[2]);
}

// ── FORMATS ───────────────────────────────────────────────
function toggleFmtForm(id, show) { document.getElementById(id).style.display = show ? 'flex' : 'none'; }

function addFmtItem(type) {
  const p = type === 'large' ? 'lf' : 'sf';
  const retailer = document.getElementById(p+'-retailer').value.trim();
  const initiative = document.getElementById(p+'-initiative').value.trim();
  const category = document.getElementById(p+'-category').value;
  const timeline = document.getElementById(p+'-timeline').value.trim();
  const startdate = document.getElementById(p+'-startdate').value;
  if (!retailer && !initiative) return;
  const catLabels = {energy:'Energy',fsw:'FSW',tea:'Tea','og-still':'OG Still','og-spark':'OG Spark'};
  const catBadge = category ? `<span class="cat cat-${category}">${catLabels[category]}</span>` : '';
  const initNote = initiative ? `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);">${initiative}</span>` : '';
  const list = document.getElementById(type === 'large' ? 'large-format-list' : 'small-format-list');
  const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  let monthLabel = '', monthKey = '9999-12';
  if (startdate) { const d = new Date(startdate+'T00:00:00'); monthLabel = monthNames[d.getMonth()]; monthKey = startdate.slice(0,7); }
  const item = document.createElement('div');
  item.className = 'fmt-retailer-row';
  item.dataset.start = startdate || '';
  item.innerHTML = `<div class="fmt-retailer-name">${retailer||'—'} ${catBadge}${initNote}</div>${timeline?`<div class="fmt-tactic-list"><div class="fmt-tactic"><span class="fmt-tactic-dot"></span>${timeline}</div></div>`:''}`;
  if (monthLabel) {
    let headers = Array.from(list.querySelectorAll('.fmt-month-header'));
    let targetHeader = headers.find(h => h.textContent.trim() === monthLabel);
    if (!targetHeader) {
      targetHeader = document.createElement('div'); targetHeader.className = 'fmt-month-header'; targetHeader.textContent = monthLabel; targetHeader.dataset.month = monthKey;
      let ins = false;
      for (const h of headers) { if (monthKey < (h.dataset.month||'9999-12')) { list.insertBefore(targetHeader, h); ins = true; break; } }
      if (!ins) list.appendChild(targetHeader);
    }
    let insertBefore = targetHeader.nextSibling;
    while (insertBefore && !insertBefore.classList?.contains('fmt-month-header')) insertBefore = insertBefore.nextSibling;
    list.insertBefore(item, insertBefore || null);
  } else { list.appendChild(item); }
  [p+'-retailer',p+'-initiative',p+'-timeline',p+'-startdate'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
  document.getElementById(p+'-category').value = '';
  toggleFmtForm(p+'-add-form', false);
  const countEl = document.getElementById(p === 'lf' ? 'lf-count' : 'sf-count');
  const cur = parseInt(countEl.textContent)||0; countEl.textContent = (cur+1)+' item'+(cur+1!==1?'s':'');
}

// ── WEEKLY FOCUS ──────────────────────────────────────────
function copySlack() {
  const text = document.getElementById('slack-draft').value;
  navigator.clipboard?.writeText(text).then(() => { const b = document.getElementById('copy-btn'); b.textContent = '✓ Copied!'; setTimeout(() => b.textContent = '📋 Copy message', 2000); });
}

function learnFromEdits() {
  const draft = document.getElementById('slack-draft')?.value;
  if (!draft) return;
  try { const h = JSON.parse(localStorage.getItem('cmo_slack_history')||'[]'); h.unshift({week:getWeekLabel(),text:draft,ts:Date.now()}); localStorage.setItem('cmo_slack_history',JSON.stringify(h.slice(0,12))); } catch(e) {}
  const b = document.getElementById('learn-btn'); b.textContent = '✓ Saved — writing like this next time'; setTimeout(() => b.textContent = '✦ Learn from my edits', 2500);
}

function saveSlackToHistory() {
  const draft = document.getElementById('slack-draft')?.value.trim();
  if (!draft) return;
  const week = getWeekLabel();
  const item = document.createElement('div'); item.className = 'history-item';
  item.innerHTML = `<div class="history-week">${week}</div><div class="history-preview">${draft.replace(/\n/g,' ').slice(0,120)}...</div>`;
  const hist = document.getElementById('slack-history');
  hist.insertBefore(item, hist.firstChild);
  const n = hist.querySelectorAll('.history-item').length;
  document.getElementById('history-count').textContent = n + ' message' + (n!==1?'s':'');
  try { const h = JSON.parse(localStorage.getItem('cmo_slack_history')||'[]'); h.unshift({week,text:draft,ts:Date.now()}); localStorage.setItem('cmo_slack_history',JSON.stringify(h.slice(0,12))); } catch(e) {}
  const b = document.getElementById('save-hist-btn'); b.textContent = '✓ Saved'; setTimeout(() => b.textContent = '💾 Save to history', 2000);
}

function getWeekLabel() {
  const now = new Date(); const day = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - day + (day===0?-6:1));
  return 'Week of ' + mon.toLocaleDateString('en-US',{month:'long',day:'numeric'});
}

function loadScaffoldToDashboard() {
  // 1. Push "I Own" items into This Week horizon
  const weekZone = document.getElementById('zone-week');
  const ownSection = document.getElementById('scaffold-own');
  if (weekZone && ownSection) {
    ownSection.querySelectorAll('.scaffold-item').forEach(item => {
      const label = item.querySelector('.scaffold-text')?.textContent?.trim();
      if (!label) return;
      const exists = Array.from(weekZone.querySelectorAll('.task-label')).some(el => el.textContent.trim() === label);
      if (!exists) weekZone.appendChild(createDraggableTask(label, '<span class="badge high">This Week</span>', 'week'));
    });
  }

  // 2. Add Team Contributes items to each person's CMO Focus box in My Team tab
  const teamSection = document.getElementById('scaffold-team');
  if (teamSection) {
    const cmoBoxes = {
      'N': document.querySelector('#tab-team .team-card:nth-child(1) .cmo-box'),
      'A': document.querySelector('#tab-team .team-card:nth-child(2) .cmo-box'),
      'S': document.querySelector('#tab-team .team-card:nth-child(3) .cmo-box')
    };
    teamSection.querySelectorAll('.team-item').forEach(item => {
      const owner = item.querySelector('.scaffold-owner')?.textContent?.trim() || 'N';
      const label = item.querySelector('.scaffold-text')?.textContent?.trim();
      if (!label) return;
      const box = cmoBoxes[owner];
      if (!box) return;
      const exists = Array.from(box.querySelectorAll('.cmo-item')).some(el => el.textContent.trim() === label);
      if (!exists) { const el = document.createElement('div'); el.className = 'cmo-item'; el.textContent = label; box.appendChild(el); }
    });
  }

  updateEmptyZones(); updatePrioCount(); saveState();
  showTab('priorities', document.querySelectorAll('.tab-btn')[0]);
  const b = document.getElementById('load-scaffold-btn');
  if (b) { b.textContent = '✓ Loaded'; setTimeout(() => b.textContent = '→ Load into My Priorities', 2500); }
}

function cmoAction(btn, action) {
  const item = btn.closest('.cmo-review-item');
  item.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  item.style.opacity = action === 'drop' ? '.4' : '1';
}

function addCmoFocus() {
  const owner = document.getElementById('cmo-new-owner').value;
  const text = document.getElementById('cmo-new-text').value.trim();
  if (!text) return;
  const cls = owner === 'A' ? 'pu' : owner === 'S' ? 'te' : '';
  const list = document.getElementById('cmo-new-list');
  const item = document.createElement('div'); item.className = 'cmo-review-item'; item.style.borderLeft = '2px solid var(--accent)';
  item.innerHTML = `<div class="cmo-review-label"><div class="scaffold-owner ${cls}">${owner}</div><span>${text}</span></div><div class="cmo-review-actions"><button class="cmo-keep-btn selected" onclick="cmoAction(this,'keep')">Keep</button><button class="cmo-drop-btn" onclick="cmoAction(this,'drop')">Drop</button></div>`;
  list.appendChild(item);
  document.getElementById('cmo-new-text').value = '';
}

// ── QUICK ADD ─────────────────────────────────────────────
function openQuickAdd(zone) {
  ['today','week','long'].forEach(z => {
    const w = document.getElementById('qa-'+z);
    const t = document.getElementById('qa-trigger-'+z);
    if (w) w.classList.remove('open');
    if (t) t.style.display = 'flex';
  });
  const wrap = document.getElementById('qa-'+zone);
  const trigger = document.getElementById('qa-trigger-'+zone);
  if (wrap) { wrap.classList.add('open'); }
  if (trigger) trigger.style.display = 'none';
  document.getElementById('qa-input-'+zone)?.focus();
}

function closeQuickAdd(zone) {
  const wrap = document.getElementById('qa-'+zone);
  const trigger = document.getElementById('qa-trigger-'+zone);
  if (wrap) { wrap.classList.remove('open'); }
  if (trigger) trigger.style.display = 'flex';
  const input = document.getElementById('qa-input-'+zone);
  if (input) input.value = '';
}

function quickAddTask(zone) {
  const input = document.getElementById('qa-input-'+zone);
  const text = input?.value?.trim();
  if (!text) return;
  const zoneEl = document.getElementById('zone-'+zone);
  const now = Date.now();
  const item = document.createElement('div');
  item.className = 'task-item draggable';
  item.draggable = true;
  item.dataset.zone = zone;
  item.dataset.created = now;
  item.innerHTML = `<span class="drag-handle">⠿</span><input type="checkbox" class="task-cb"><div class="task-body"><div class="task-label">${text.replace(/</g,'&lt;')}</div></div>`;
  item.appendChild(makeAgeBadge(now));
  attachDrag(item);
  zoneEl.appendChild(item);
  closeQuickAdd(zone);
  updateEmptyZones(); updatePrioCount(); saveState();
}

// ── AGING ─────────────────────────────────────────────────
function makeAgeBadge(created) {
  const badge = document.createElement('span');
  badge.dataset.created = created;
  setAgeBadge(badge, created);
  return badge;
}
function setAgeBadge(badge, created) {
  const days = Math.floor((Date.now() - parseInt(created)) / 86400000);
  if (days === 0) { badge.textContent = 'today'; badge.className = 'age-badge age-fresh'; }
  else if (days <= 3) { badge.textContent = days+'d'; badge.className = 'age-badge age-fresh'; }
  else if (days <= 7) { badge.textContent = days+'d'; badge.className = 'age-badge age-mid'; }
  else { badge.textContent = Math.floor(days/7)+'w'; badge.className = 'age-badge age-old'; }
}
function updateAgeBadges() {
  document.querySelectorAll('.age-badge[data-created]').forEach(b => setAgeBadge(b, b.dataset.created));
}

function initAgeBadges() {
  // Stamp any static task that has no data-created with today's date
  // stored in localStorage so it persists across sessions
  let stamps = {};
  try { stamps = JSON.parse(localStorage.getItem('cmo_task_stamps') || '{}'); } catch(e) {}
  const now = Date.now();
  let changed = false;
  document.querySelectorAll('.drop-zone .task-item.draggable').forEach(item => {
    const label = item.querySelector('.task-label')?.textContent?.trim();
    if (!label) return;
    if (!item.dataset.created) {
      if (!stamps[label]) { stamps[label] = now; changed = true; }
      item.dataset.created = stamps[label];
    } else {
      if (!stamps[label]) { stamps[label] = item.dataset.created; changed = true; }
    }
    // Add badge if not already there
    if (!item.querySelector('.age-badge')) {
      item.appendChild(makeAgeBadge(item.dataset.created));
    }
  });
  if (changed) { try { localStorage.setItem('cmo_task_stamps', JSON.stringify(stamps)); } catch(e) {} }
}
// ─────────────────────────────────────────────────────────
let ritualStep = 1;
const ritualSteps = [
  { title:'Step 1 of 5 — Pulse', html:`<div style="margin-bottom:14px;"><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:8px;letter-spacing:.06em;">WHAT MUST BE TRUE BY FRIDAY?</div><p style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6;">One number, outcome, or state that defines a successful week. Be specific — what moves the needle?</p><textarea id="r-pulse" style="width:100%;min-height:90px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;resize:vertical;outline:none;" placeholder="e.g. Break $1.4M Amazon ordered revenue..."></textarea></div>` },
  { title:'Step 2 of 5 — Tone', html:`<div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:8px;letter-spacing:.06em;">WHAT'S THE REGISTER THIS WEEK?</div><p style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6;">Pick the tone that matches what the team needs to hear.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="tone-opt" onclick="selTone(this)" style="padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;">Urgent &amp; focused</div><div style="font-size:11.5px;color:var(--text3);">Heads down, execute</div></div><div class="tone-opt" onclick="selTone(this)" style="padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;">Confident &amp; building</div><div style="font-size:11.5px;color:var(--text3);">We're on a run, keep going</div></div><div class="tone-opt" onclick="selTone(this)" style="padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;">Challenging</div><div style="font-size:11.5px;color:var(--text3);">Push the team to level up</div></div><div class="tone-opt" onclick="selTone(this)" style="padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;cursor:pointer;"><div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;">Energizing</div><div style="font-size:11.5px;color:var(--text3);">Big moment, rise to it</div></div></div></div>` },
  { title:'Step 3 of 5 — Acknowledge', html:`<div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:8px;letter-spacing:.06em;">WIN FROM LAST WEEK TO CARRY FORWARD</div><p style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6;">Brief acknowledgment before pivoting to this week. Keeps momentum high.</p><textarea id="r-ack" style="width:100%;min-height:80px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;resize:vertical;outline:none;" placeholder="e.g. Great progress driving PDPV last week..."></textarea></div>` },
  { title:'Step 4 of 5 — Priorities', html:`<div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:8px;letter-spacing:.06em;">PRIORITIES THIS WEEK</div><p style="font-size:13px;color:var(--text2);margin-bottom:10px;line-height:1.6;">What do you own? What does the team contribute to?</p><div style="margin-bottom:10px;"><div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--accent);margin-bottom:5px;letter-spacing:.05em;">I OWN</div><textarea id="r-own" style="width:100%;min-height:60px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;resize:vertical;outline:none;" placeholder="One per line..."></textarea></div><div><div style="font-size:11px;font-family:'DM Mono',monospace;color:var(--green);margin-bottom:5px;letter-spacing:.05em;">TEAM CONTRIBUTES</div><textarea id="r-team" style="width:100%;min-height:60px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;resize:vertical;outline:none;" placeholder="One per line..."></textarea></div></div>` },
  { title:'Step 5 of 5 — CMO Focus Review', html:`<div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:8px;letter-spacing:.06em;">REVIEW LAST WEEK'S CMO FOCUS</div><p style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.6;">For each item — Keep it, or Drop it. Then add the new CMO focus items from this week. Hit the button below to go straight there.</p><button onclick="goToCmoReview()" style="width:100%;padding:12px;border-radius:8px;background:var(--gold);border:none;color:#0d0f14;font-family:'Syne',sans-serif;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:12px;transition:opacity .15s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">→ Open CMO Focus Review</button><div style="padding:12px;background:rgba(245,200,66,.06);border:1px solid rgba(245,200,66,.2);border-radius:8px;"><div style="font-size:12.5px;color:var(--gold);font-weight:500;margin-bottom:8px;">✓ Before you close</div><div style="font-size:13px;color:var(--text2);line-height:2;">☐ Slack message edited &amp; copied<br>☐ CMO Focus items reviewed (keep / drop)<br>☐ New CMO Focus items added<br>☐ Priority scaffold loaded into dashboard</div></div></div>` }
];

function startSundayRitual() {
  ritualStep = 1;
  document.getElementById('ritualModal').classList.add('open');
  renderRitualStep();
}

function renderRitualStep() {
  const s = ritualSteps[ritualStep - 1];
  document.getElementById('ritual-step-label').textContent = s.title;
  document.getElementById('ritual-content').innerHTML = s.html;
  document.getElementById('ritual-progress').style.width = (ritualStep / 5 * 100) + '%';
  document.getElementById('ritual-back').style.display = ritualStep > 1 ? 'block' : 'none';
  document.getElementById('ritual-next').textContent = ritualStep === 5 ? '✓ Done' : 'Next →';
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('rs' + i);
    if (!el) continue;
    const label = el.querySelector('div:first-child');
    if (i === ritualStep) { el.style.borderColor = 'var(--gold)'; if (label) label.style.color = 'var(--gold)'; }
    else if (i < ritualStep) { el.style.borderColor = 'var(--green)'; if (label) label.style.color = 'var(--green)'; }
    else { el.style.borderColor = 'var(--border)'; if (label) label.style.color = 'var(--text3)'; }
  }
}

function ritualNav(dir) {
  if (ritualStep === 5 && dir === 1) { closeRitual(); return; }
  ritualStep = Math.max(1, Math.min(5, ritualStep + dir));
  renderRitualStep();
}

function closeRitual() { document.getElementById('ritualModal').classList.remove('open'); }

function goToCmoReview() {
  closeRitual();
  // Switch to Weekly Focus tab
  showTab('rhythm', document.querySelectorAll('.tab-btn')[3]);
  // Scroll to and highlight CMO review card
  setTimeout(() => {
    const card = document.querySelector('#tab-rhythm .card:last-child');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.transition = 'box-shadow .3s, border-color .3s';
    card.style.borderColor = 'var(--gold)';
    card.style.boxShadow = '0 0 0 3px rgba(245,200,66,.15)';
    setTimeout(() => { card.style.borderColor = 'var(--border)'; card.style.boxShadow = 'none'; }, 3000);
  }, 150);
}

function selTone(el) {
  document.querySelectorAll('.tone-opt').forEach(o => { o.style.borderColor = 'var(--border)'; o.style.background = 'var(--surface2)'; });
  el.style.borderColor = 'var(--gold)'; el.style.background = 'rgba(245,200,66,.06)';
}

// ── WAITING ON ────────────────────────────────────────────
let _waitingItem = null;

function showWaitingModal(item) {
  _waitingItem = item;
  document.getElementById('waiting-owner-input').value = item.dataset.waitingOn || '';
  document.getElementById('waitingModal').classList.add('open');
  setTimeout(() => document.getElementById('waiting-owner-input').focus(), 100);
}

function setWaitingOwner(name) {
  document.getElementById('waiting-owner-input').value = name;
}

function confirmWaiting() {
  const owner = document.getElementById('waiting-owner-input').value.trim();
  if (_waitingItem) applyWaitingTag(_waitingItem, owner);
  closeWaitingModal();
}

function skipWaiting() {
  if (_waitingItem) applyWaitingTag(_waitingItem, '');
  closeWaitingModal();
}

function closeWaitingModal() {
  document.getElementById('waitingModal').classList.remove('open');
  document.getElementById('waiting-owner-input').value = '';
  _waitingItem = null;
}

function applyWaitingTag(item, owner) {
  item.dataset.waitingOn = owner;
  // Remove any existing waiting tag
  item.querySelector('.waiting-tag')?.remove();
  if (owner) {
    const tag = document.createElement('div');
    tag.className = 'waiting-tag';
    tag.innerHTML = `⏳ Waiting on <strong style="margin-left:3px;">${owner}</strong>`;
    item.querySelector('.task-body')?.appendChild(tag);
  }
  saveState();
  updateWaitingInTeam();
}

function updateWaitingInTeam() {
  // Clear existing waiting sections in team cards
  document.querySelectorAll('.team-waiting-section').forEach(el => el.remove());

  const waitingItems = Array.from(document.querySelectorAll('#zone-waiting .task-item.draggable'));
  if (!waitingItems.length) return;

  // Group by owner
  const byOwner = {};
  waitingItems.forEach(item => {
    const owner = item.dataset.waitingOn || 'Other';
    if (!byOwner[owner]) byOwner[owner] = [];
    byOwner[owner].push(item.querySelector('.task-label')?.textContent?.trim() || '');
  });

  // Map to team cards
  const teamMap = { 'Nick': 0, 'Andrew': 1, 'Sterling': 2 };
  const teamCards = document.querySelectorAll('#tab-team .team-card');

  Object.entries(byOwner).forEach(([owner, tasks]) => {
    const cardIndex = teamMap[owner];
    const card = cardIndex !== undefined ? teamCards[cardIndex] : null;

    if (card) {
      const section = document.createElement('div');
      section.className = 'team-waiting-section';
      section.style.cssText = 'margin:0 16px 14px;padding:10px 12px;background:rgba(247,144,68,.06);border:1px solid rgba(247,144,68,.2);border-radius:7px;';
      section.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--orange);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px;">⏳ Waiting on ${owner}</div>${tasks.map(t => `<div style="font-size:12px;color:var(--text2);padding:2px 0;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:var(--orange);">·</span>${t}</div>`).join('')}`;
      card.appendChild(section);
    }
  });

  // Also handle external people — add to a general waiting summary
  const externalOwners = Object.keys(byOwner).filter(o => !teamMap.hasOwnProperty(o));
  if (externalOwners.length) {
    // Find the team tab and append an external waiting card if needed
    let extCard = document.getElementById('external-waiting-card');
    if (!extCard) {
      extCard = document.createElement('div');
      extCard.id = 'external-waiting-card';
      extCard.className = 'team-card team-waiting-section';
      document.querySelector('#tab-team .grid-3')?.appendChild(extCard);
    }
    extCard.innerHTML = `<div class="tp-header" style="background:rgba(247,144,68,.06);border-bottom:1px solid rgba(247,144,68,.2);"><div style="width:36px;height:36px;border-radius:8px;background:rgba(247,144,68,.15);display:flex;align-items:center;justify-content:center;font-size:18px;">⏳</div><div class="p-info"><div class="p-name">External</div><div class="p-role">Waiting on others</div></div></div><div style="padding:12px 16px;">${externalOwners.map(owner => `<div style="margin-bottom:8px;"><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--orange);margin-bottom:4px;">${owner}</div>${byOwner[owner].map(t => `<div style="font-size:12px;color:var(--text2);padding:1px 0;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:var(--orange);">·</span>${t}</div>`).join('')}</div>`).join('')}</div>`;
  } else {
    document.getElementById('external-waiting-card')?.remove();
  }
}
// ─────────────────────────────────────────────────────────
async function exportZip() {
  const btn = document.querySelector('[onclick="exportZip()"]');
  if (btn) { btn.textContent = '⏳ Backing up...'; btn.style.opacity = '.6'; btn.style.pointerEvents = 'none'; }
  try {
    const date = new Date().toISOString().slice(0,10);
    const html = document.documentElement.outerHTML;
    // Open in new tab (works in both Chrome and Flotato)
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    if (btn) { btn.textContent = '✓ Backed up'; setTimeout(() => { btn.textContent = '↓ Backup'; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }, 2000); }
  } catch(e) {
    console.error('Backup failed:', e);
    if (btn) { btn.textContent = '↓ Backup'; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
}

// ── TRIAGE MODE ───────────────────────────────────────────
let triageActive = false;
let triageTotal = 0;
let triageDone = 0;
const TRIAGE_ACTIONS = {
  today:   [{label:'Keep',cls:'keep',zone:null},{label:'→ Week',cls:'move-week',zone:'week'},{label:'→ Later',cls:'move-later',zone:'long'},{label:'✕',cls:'del',zone:'delete'}],
  waiting: [{label:'Keep',cls:'keep',zone:null},{label:'→ Today',cls:'move-today',zone:'today'},{label:'→ Week',cls:'move-week',zone:'week'},{label:'✕',cls:'del',zone:'delete'}],
  week:    [{label:'Keep',cls:'keep',zone:null},{label:'→ Today',cls:'move-today',zone:'today'},{label:'→ Later',cls:'move-later',zone:'long'},{label:'✕',cls:'del',zone:'delete'}],
  long:    [{label:'Keep',cls:'keep',zone:null},{label:'→ Week',cls:'move-week',zone:'week'},{label:'Archive ✕',cls:'del',zone:'delete'}]
};
function toggleTriageMode() {
  triageActive = !triageActive;
  const card = document.getElementById('priorities-card');
  const btn = document.getElementById('triage-toggle-btn');
  const bar = document.getElementById('triage-bar');
  if (triageActive) {
    card.classList.add('triage-mode-active');
    btn.classList.add('active'); btn.textContent = '⚡ Triaging...';
    bar.classList.add('visible');
    triageTotal = 0; triageDone = 0;
    document.querySelectorAll('#priorities-card .drop-zone .task-item.draggable').forEach(item => {
      const zone = item.dataset.zone || 'today';
      const actions = TRIAGE_ACTIONS[zone] || TRIAGE_ACTIONS.today;
      item.querySelector('.triage-actions-wrap')?.remove();
      const wrap = document.createElement('div'); wrap.className = 'triage-actions-wrap';
      actions.forEach(a => { const pill = document.createElement('button'); pill.className = 'tr-pill '+a.cls; pill.textContent = a.label; pill.onclick = (e) => { e.stopPropagation(); triageAction(item,a.zone,wrap); }; wrap.appendChild(pill); });
      item.appendChild(wrap); triageTotal++;
    });
    updateTriageProgress();
  } else {
    card.classList.remove('triage-mode-active');
    btn.classList.remove('active'); btn.textContent = '⚡ Triage';
    bar.classList.remove('visible');
    document.querySelectorAll('#priorities-card .task-item.triaged').forEach(item => item.remove());
    document.querySelectorAll('#priorities-card .triage-actions-wrap').forEach(el => el.remove());
    document.querySelectorAll('#priorities-card .drop-zone .task-item.draggable').forEach(item => { item.style.opacity = ''; });
    updateEmptyZones(); updatePrioCount(); saveState();
  }
}
function triageAction(item, targetZone, wrap) {
  if (targetZone === null) {
    wrap.innerHTML = '<span style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--green);padding:0 4px;">✓ kept</span>';
    item.style.opacity = '.4';
  } else if (targetZone === 'delete') {
    item.style.transition = 'all .2s'; item.style.opacity = '0'; item.style.height = '0'; item.style.padding = '0'; item.style.overflow = 'hidden';
    setTimeout(() => { item.remove(); updateEmptyZones(); updatePrioCount(); }, 200);
  } else {
    const zoneEl = document.getElementById('zone-' + targetZone);
    if (zoneEl) {
      item.dataset.zone = targetZone;
      item.querySelector('.triage-actions-wrap')?.remove();
      const actions = TRIAGE_ACTIONS[targetZone] || TRIAGE_ACTIONS.today;
      const newWrap = document.createElement('div'); newWrap.className = 'triage-actions-wrap';
      actions.forEach(a => { const pill = document.createElement('button'); pill.className = 'tr-pill '+a.cls; pill.textContent = a.label; pill.onclick = (e) => { e.stopPropagation(); triageAction(item,a.zone,newWrap); }; newWrap.appendChild(pill); });
      item.appendChild(newWrap); zoneEl.appendChild(item);
    }
    item.style.opacity = '.4';
  }
  triageDone++; updateTriageProgress();
}
function updateTriageProgress() {
  const lbl = document.getElementById('triage-progress-label');
  if (lbl) lbl.textContent = `${triageDone} of ${triageTotal} tasks reviewed`;
}

// ── TASK NOTES & SUBTASKS ─────────────────────────────────
function toggleTaskNotes(btn) {
  const body = btn.closest('.task-body');
  const area = body.querySelector('.task-notes-area');
  const isOpen = area.classList.toggle('open');
  btn.classList.toggle('has-content', isOpen || !!area.querySelector('.task-notes-input')?.value?.trim());
  if (isOpen) area.querySelector('.task-notes-input')?.focus();
}
function toggleTaskSubtasks(btn) {
  const body = btn.closest('.task-body');
  const area = body.querySelector('.task-subtasks');
  const isOpen = area.classList.toggle('open');
  btn.classList.toggle('has-content', isOpen || body.querySelectorAll('.task-subtask-item').length > 0);
  if (isOpen) body.querySelector('.task-add-subtask-input')?.focus();
}
function addSubtask(input) {
  const text = input.value.trim(); if (!text) return;
  const list = input.closest('.task-subtasks').querySelector('.task-subtask-list');
  const item = document.createElement('div'); item.className = 'task-subtask-item';
  item.innerHTML = `<input type="checkbox" class="task-subtask-cb" onchange="saveState()"><span class="task-subtask-label" contenteditable="true" onblur="saveState()">${text}</span><button class="task-subtask-del" onclick="this.closest('.task-subtask-item').remove();saveState()">✕</button>`;
  list.appendChild(item); input.value = '';
  const btn = input.closest('.task-body').querySelector('[onclick*="toggleTaskSubtasks"]');
  if (btn) btn.classList.add('has-content');
  saveState();
}
function addTaskExtrasToItem(item) {
  if (item.querySelector('.task-expand-bar')) {
    // restore note value from data attribute
    const notesArea = item.querySelector('.task-notes-area');
    const ta = item.querySelector('.task-notes-input');
    if (notesArea && ta && notesArea.dataset.note) {
      ta.value = notesArea.dataset.note;
      ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
      if (notesArea.dataset.note.trim()) { notesArea.classList.add('open'); const btn = item.querySelector('[onclick*="toggleTaskNotes"]'); if (btn) btn.classList.add('has-content'); }
    }
    return;
  }
  const body = item.querySelector('.task-body'); if (!body) return;
  const bar = document.createElement('div'); bar.className = 'task-expand-bar';
  bar.innerHTML = `<button class="task-expand-btn" onclick="toggleTaskNotes(this)" title="Note">💬 Note</button><button class="task-expand-btn" onclick="toggleTaskSubtasks(this)" title="Subtasks">☑ Subtasks</button>`;
  const notesArea = document.createElement('div'); notesArea.className = 'task-notes-area';
  notesArea.innerHTML = `<textarea class="task-notes-input" placeholder="Add a note..." oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';saveState()" onblur="saveState()"></textarea>`;
  const subtasksArea = document.createElement('div'); subtasksArea.className = 'task-subtasks';
  subtasksArea.innerHTML = `<div class="task-subtask-list"></div><div class="task-add-subtask"><input class="task-add-subtask-input" placeholder="+ Add subtask..." onkeydown="if(event.key==='Enter'){event.preventDefault();addSubtask(this);}"></div>`;
  const meta = body.querySelector('.task-meta');
  if (meta) { meta.after(bar, notesArea, subtasksArea); } else { body.appendChild(bar); body.appendChild(notesArea); body.appendChild(subtasksArea); }
}

// ── CMO KEEP / DROP ───────────────────────────────────────
function cmoItemKeep(btn) {
  const wrap = btn.closest('.cmo-item-wrap');
  wrap.style.opacity = '.45';
  btn.textContent = '✓'; btn.style.background = 'rgba(62,207,142,.15)';
}
function cmoItemDrop(btn) {
  const wrap = btn.closest('.cmo-item-wrap');
  wrap.style.transition = 'all .2s'; wrap.style.opacity = '0'; wrap.style.height = '0'; wrap.style.overflow = 'hidden'; wrap.style.padding = '0';
  setTimeout(() => { wrap.remove(); }, 210);
}

// ── NEW INBOX: TAG → PUSH ─────────────────────────────────
function updateInboxCount() {
  const n = document.querySelectorAll('#inbox-queue .inbox-item').length;
  const el = document.getElementById('inbox-count');
  if (el) el.textContent = n + ' item' + (n !== 1 ? 's' : '');
  const emptyEl = document.getElementById('inbox-empty');
  if (emptyEl) emptyEl.style.display = n === 0 ? 'block' : 'none';
  const tagged = document.querySelectorAll('#inbox-queue .inbox-item[data-dest]:not([data-dest="archive"])').length;
  const lbl = document.getElementById('inbox-tagged-label');
  if (lbl) lbl.textContent = tagged > 0 ? `${tagged} item${tagged!==1?'s':''} tagged — push when ready` : 'Tag items above, then push when ready';
}
function tagInbox(dest) {
  const text = document.getElementById('triageInput').value.trim(); if (!text) return;
  const emptyEl = document.getElementById('inbox-empty'); if (emptyEl) emptyEl.style.display = 'none';
  const q = document.getElementById('inbox-queue');
  const d = document.createElement('div'); d.className = 'task-item inbox-item'; d.dataset.dest = dest;
  const tagColors = {today:'var(--red)',week:'var(--accent)',longterm:'var(--accent2)',team:'var(--teal)',archive:'var(--text3)'};
  d.innerHTML = `<div class="task-body" style="display:flex;align-items:center;justify-content:space-between;gap:10px;"><div class="task-label" style="flex:1;">${text.replace(/</g,'&lt;')}</div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0;"><select style="font-family:'DM Mono',monospace;font-size:10px;border-radius:10px;padding:2px 6px;cursor:pointer;outline:none;background:var(--surface2);border:1px solid var(--border);color:${tagColors[dest]};" onchange="this.closest('.inbox-item').dataset.dest=this.value;updateInboxCount();"><option value="today" ${dest==='today'?'selected':''}>🔴 Today</option><option value="week" ${dest==='week'?'selected':''}>🔵 This Week</option><option value="longterm" ${dest==='longterm'?'selected':''}>🟣 Longer Term</option><option value="team" ${dest==='team'?'selected':''}>👥 Team</option><option value="archive" ${dest==='archive'?'selected':''}>Archive</option></select><button style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:11px;" onclick="this.closest('.inbox-item').remove();updateInboxCount();">✕</button></div></div>`;
  q.appendChild(d); document.getElementById('triageInput').value = ''; updateInboxCount();
}
function pushInboxToPriorities() {
  const items = document.querySelectorAll('#inbox-queue .inbox-item');
  let pushed = 0;
  items.forEach(item => {
    const dest = item.dataset.dest;
    const label = item.querySelector('.task-label')?.textContent?.trim();
    if (!label || dest === 'archive') { item.remove(); return; }
    const zoneMap = {today:'zone-today',week:'zone-week',longterm:'zone-long'};
    const badgeMap = {today:'<span class="badge urgent">Today</span>',week:'<span class="badge high">This Week</span>',longterm:'<span class="badge longterm">Longer Term</span>'};
    if (dest === 'team') return;
    const zone = document.getElementById(zoneMap[dest]);
    if (zone) { const task = createDraggableTask(label, badgeMap[dest]||'', dest==='longterm'?'long':dest); zone.appendChild(task); item.remove(); pushed++; }
  });
  updateEmptyZones(); updatePrioCount(); saveState(); updateInboxCount();
  const btn = document.getElementById('push-btn');
  if (btn) { btn.textContent = `✓ ${pushed} pushed`; setTimeout(()=>btn.textContent='→ Push to Priorities',2000); }
  if (pushed > 0) showTab('priorities', document.querySelectorAll('.tab-btn')[0]);
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Clear hardcoded done list before restoring from Firebase
  const doneList = document.getElementById('done-list');
  if (doneList) doneList.innerHTML = '';
  // Clear hardcoded tasks from zones before restoring
  ['zone-today','zone-week','zone-long','zone-waiting'].forEach(zid => {
    const zone = document.getElementById(zid);
    if (zone) zone.querySelectorAll('.task-item.draggable').forEach(el => el.remove());
  });
  initDragDrop();
  initDoneLogic();
  await restoreState();
  await initAgeBadges();
  updateAgeBadges();
  updateWaitingInTeam();
  document.querySelectorAll('.drop-zone .task-item.draggable').forEach(item => addTaskExtrasToItem(item));
  setInterval(updateAgeBadges, 60000);
});