// Admin Tab Component — Manage Vessels, Users, Tags
import { getVessels, getUsers, getTags, addItem, removeItem, renameItem, addUser, removeUser, updateUser, addTag, removeTag, updateTag, moveItem, syncUsers, syncVessels, syncTags } from '../data/adminLists.js';
import { getAirtableConfig, saveAirtableConfig, fetchUsersFromAirtable, pushUserToAirtable } from '../data/airtable.js';

let activeList = 'users'; // 'users' | 'vessels' | 'tags'
let editingUser = null;
let editingTag = null;
let editingVessel = null;

export function initAdmin() {
  const container = document.getElementById('tab-admin');
  container.innerHTML = buildAdminHTML();
  bindAdminEvents();
  bindAirtableEvents();
  // Set correct initial form visibility for users tab
  document.getElementById('adminGenericAdd').style.display = 'none';
  document.getElementById('adminUserAdd').style.display = 'flex';
  renderList();
  bindDragEvents();
}

function buildAdminHTML() {
  return `
    <div class="admin-container">
      <h2 class="admin-title">Administration</h2>
      <div class="admin-tabs">
        <button class="admin-tab active" data-list="users">Users</button>
        <button class="admin-tab" data-list="vessels">Vessels</button>
        <button class="admin-tab" data-list="tags">Tags</button>
        <button class="admin-tab" data-list="airtable">Airtable</button>
      </div>

        <div class="admin-add-row" id="adminGenericAdd">
        <input type="text" id="adminNewItem" placeholder="Add new item..." maxlength="50" />
        <button class="btn btn-primary" id="adminAddBtn">+ Add</button>
        <button class="btn btn-secondary" id="adminCancelBtn" style="display:none; margin-left: 5px; background: #e2e8f0; color: #4a5568;">Cancel</button>
      </div>

      <div class="admin-add-user" id="adminUserAdd" style="display:none;">
        <input type="text" id="newUserName" placeholder="Name" class="admin-input" />
        <input type="email" id="newUserEmail" placeholder="Email" class="admin-input" />
        <select id="newUserRole" class="admin-select">
          <option value="Vessel">Vessel</option>
          <option value="Dispatcher">Dispatcher</option>
          <option value="Admin">Admin</option>
        </select>
        <button class="btn btn-primary" id="adminAddUserBtn">+ Add User</button>
        <button class="btn btn-secondary" id="adminCancelUserBtn" style="display:none; margin-left: 5px; background: #e2e8f0; color: #4a5568;">Cancel</button>
      </div>

      <div class="admin-add-user" id="adminTagAdd" style="display:none;">
        <div style="flex:2; display:flex; gap:10px; align-items:center;">
            <input type="color" id="newTagColor" value="#4299e1" style="width:40px; height:40px; border:none; border-radius:8px; cursor:pointer;" title="Choose tag color">
            <input type="text" id="newTagName" placeholder="Tag Name" class="admin-input" />
        </div>
        <button class="btn btn-primary" id="adminAddTagBtn">+ Add Tag</button>
        <button class="btn btn-secondary" id="adminCancelTagBtn" style="display:none; margin-left: 5px; background: #e2e8f0; color: #4a5568;">Cancel</button>
      </div>

      <div class="admin-airtable-config" id="adminAirtableConfig" style="display:none;">
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
          These override Vercel environment variables. Leave blank to use env vars.
        </p>

        <div class="form-group">
          <label>API Key</label>
          <input type="password" id="airtableApiKey" placeholder="patXXX... (or set VITE_AIRTABLE_API_KEY in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>
        <div class="form-group">
          <label>Base ID <span style="font-weight:normal; color:var(--text-muted); font-size:12px;">(shared by all tables)</span></label>
          <input type="text" id="airtableBaseId" placeholder="appXXX... (or set VITE_AIRTABLE_BASE_ID in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>

        <div style="margin-top:16px; margin-bottom:8px; font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted);">Table IDs</div>

        <div class="form-group">
          <label>Timesheets Table ID</label>
          <input type="text" id="airtableTableId" placeholder="tblXXX... (or set VITE_AIRTABLE_TABLE_ID in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>
        <div class="form-group">
          <label>Users Table ID</label>
          <input type="text" id="airtableUsersTableId" placeholder="tblXXX... (or set VITE_AIRTABLE_USERS_TABLE_ID in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>
        <div class="form-group">
          <label>Vessels Table ID</label>
          <input type="text" id="airtableVesselsTableId" placeholder="tblXXX... (or set VITE_AIRTABLE_VESSELS_TABLE_ID in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>
        <div class="form-group">
          <label>Tags Table ID</label>
          <input type="text" id="airtableTagsTableId" placeholder="tblXXX... (or set VITE_AIRTABLE_TAGS_TABLE_ID in Vercel)" class="admin-input" style="width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px;" />
        </div>

        <div style="margin-top:16px; margin-bottom:8px; font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted);">Timesheet Field Names</div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Match these to your exact Airtable column names.</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">Vessel column</label>
            <input type="text" id="fieldVessel" placeholder="Vessel" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">Date column</label>
            <input type="text" id="fieldDate" placeholder="Date" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">Start time column</label>
            <input type="text" id="fieldStart" placeholder="Start" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">End time column</label>
            <input type="text" id="fieldEnd" placeholder="End" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">Activity column</label>
            <input type="text" id="fieldActivity" placeholder="Description" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">Tag/Type column</label>
            <input type="text" id="fieldTag" placeholder="Type" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:12px;">User email column</label>
            <input type="text" id="fieldUserEmail" placeholder="access_User email" class="admin-input" style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:13px;" />
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:16px;">
          <button class="btn btn-primary" id="airtableSaveBtn">Save</button>
          <button class="btn btn-secondary" id="airtableTestBtn" style="background:#e2e8f0; color:#4a5568;">Test Connection</button>
        </div>
        <div id="airtableStatus" style="margin-top:12px; font-size:13px;"></div>
      </div>

      <div class="admin-list" id="adminList"></div>
    </div>
    <style>
      .draggable-item { cursor: grab; }
      .draggable-item.dragging { opacity: 0.5; border: 2px dashed #4299e1; }
    </style>
  `;
}

function getListData() {
  switch (activeList) {
    case 'vessels': return getVessels();
    case 'users': return getUsers();
    case 'tags': return getTags();
    default: return [];
  }
}

function renderList() {
  const items = getListData();
  const listEl = document.getElementById('adminList');

  if (items.length === 0) {
    listEl.innerHTML = '<p class="admin-empty">No items. Add one above.</p>';
    return;
  }

  if (activeList === 'users') {
    listEl.innerHTML = items.map(u => `
        <div class="admin-item user-item">
          <div class="user-info">
            <div class="user-main">
              <span class="user-name">${u.name}</span>
              <span class="user-role-badge ${u.role.toLowerCase().replace(' ', '-')}">${u.role}</span>
            </div>
            <span class="user-email">${u.email || 'No email'}</span>
          </div>
          <div class="admin-item-actions">
            <button class="admin-action-btn edit-user" data-name="${u.name}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="admin-action-btn delete-user" data-name="${u.name}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        `).join('');

    // Bind user edit/delete
    listEl.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;

        if (btn.classList.contains('confirm-delete')) {
          removeUser(name);
          renderList();
        } else {
          btn.classList.add('confirm-delete');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<span style="color:#e53e3e; font-weight:600; font-size:11px;">Delete</span>';

          setTimeout(() => {
            if (document.body.contains(btn)) {
              btn.classList.remove('confirm-delete');
              btn.innerHTML = originalHTML;
            }
          }, 3000);
        }
      });
    });

    listEl.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const user = items.find(u => u.name === name);
        startEditUser(user);
      });
    });

  } else if (activeList === 'tags') {
    listEl.innerHTML = items.map((t, idx) => `
        <div class="admin-item user-item draggable-item" draggable="true" data-index="${idx}">
          <div class="user-info" style="flex-direction:row; align-items:center; gap:12px;">
            <div style="width:20px; height:20px; border-radius:50%; background-color:${t.color}; border:1px solid rgba(0,0,0,0.1);"></div>
            <span class="user-name">${t.name}</span>
          </div>
          <div class="admin-item-actions">
            <button class="admin-action-btn edit-tag" data-name="${t.name}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="admin-action-btn delete-tag" data-name="${t.name}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        `).join('');

    listEl.querySelectorAll('.delete-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;

        if (btn.classList.contains('confirm-delete')) {
          removeTag(name);
          renderList();
        } else {
          btn.classList.add('confirm-delete');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<span style="color:#e53e3e; font-weight:600; font-size:11px;">Delete</span>';

          setTimeout(() => {
            if (document.body.contains(btn)) {
              btn.classList.remove('confirm-delete');
              btn.innerHTML = originalHTML;
            }
          }, 3000);
        }
      });
    });

    listEl.querySelectorAll('.edit-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const tag = items.find(t => t.name === name);
        startEditTag(tag);
      });
    });

  } else {
    listEl.innerHTML = items.map((item, idx) => `
        <div class="admin-item draggable-item" draggable="true" data-index="${idx}">
        <span class="admin-item-text" data-value="${item}">${item}</span>
        <div class="admin-item-actions">
            <button class="admin-action-btn edit" data-value="${item}" title="Rename">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            </button>
            <button class="admin-action-btn delete" data-value="${item}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            </button>
        </div>
        </div>
    `).join('');

    // generic edit/delete bindings...
    // generic edit/delete bindings...
    listEl.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const oldVal = btn.dataset.value;
        startEditVessel(oldVal);
      });
    });

    listEl.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;

        if (btn.classList.contains('confirm-delete')) {
          removeItem(activeList, value);
          renderList();
        } else {
          btn.classList.add('confirm-delete');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<span style="color:#e53e3e; font-weight:600; font-size:11px;">Delete</span>';

          setTimeout(() => {
            if (document.body.contains(btn)) {
              btn.classList.remove('confirm-delete');
              btn.innerHTML = originalHTML;
            }
          }, 3000);
        }
      });
    });
  }



  updateTabCounts();
}

function updateTabCounts() {
  const vCount = getVessels().length;
  const uCount = getUsers().length;
  const tCount = getTags().length;

  const vTab = document.querySelector('.admin-tab[data-list="vessels"]');
  if (vTab) vTab.textContent = `Vessels (${vCount})`;

  const uTab = document.querySelector('.admin-tab[data-list="users"]');
  if (uTab) uTab.textContent = `Users (${uCount})`;

  const tTab = document.querySelector('.admin-tab[data-list="tags"]');
  if (tTab) tTab.textContent = `Tags (${tCount})`;
}

function bindAdminEvents() {
  // List tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeList = tab.dataset.list;
      document.getElementById('adminNewItem').value = '';
      // Toggle add forms and panels
      const isAirtable = activeList === 'airtable';
      document.getElementById('adminAirtableConfig').style.display = isAirtable ? 'block' : 'none';
      document.getElementById('adminList').style.display = isAirtable ? 'none' : 'block';

      if (isAirtable) {
        document.getElementById('adminGenericAdd').style.display = 'none';
        document.getElementById('adminUserAdd').style.display = 'none';
        document.getElementById('adminTagAdd').style.display = 'none';
        loadAirtableForm();
      } else if (activeList === 'users') {
        document.getElementById('adminGenericAdd').style.display = 'none';
        document.getElementById('adminUserAdd').style.display = 'flex';
        document.getElementById('adminTagAdd').style.display = 'none';
      } else if (activeList === 'tags') {
        document.getElementById('adminGenericAdd').style.display = 'none';
        document.getElementById('adminUserAdd').style.display = 'none';
        document.getElementById('adminTagAdd').style.display = 'flex';
      } else {
        document.getElementById('adminGenericAdd').style.display = 'flex';
        document.getElementById('adminUserAdd').style.display = 'none';
        document.getElementById('adminTagAdd').style.display = 'none';
      }

      if (!isAirtable) renderList();
    });
  });

  // Add new item
  // Add new item (Generic: Vessels)
  const genericAddBtn = document.getElementById('adminAddBtn');
  const genericCancelBtn = document.getElementById('adminCancelBtn');

  genericAddBtn.addEventListener('click', () => {
    const input = document.getElementById('adminNewItem');
    const val = input.value.trim();
    if (!val) return;

    if (activeList === 'vessels' && editingVessel) {
      // Update mode
      const renamed = renameItem(activeList, editingVessel, val);
      if (renamed) {
        cancelEditVessel();
        renderList();
      } else {
        input.style.borderColor = '#e53e3e';
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
      }
    } else {
      // Add mode
      const added = addItem(activeList, val);
      if (added) {
        input.value = '';
        renderList();
      } else {
        input.style.borderColor = '#e53e3e';
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
      }
    }
  });

  genericCancelBtn.addEventListener('click', () => {
    cancelEditVessel();
  });

  // Add/Update User button
  const userBtn = document.getElementById('adminAddUserBtn');
  const cancelBtn = document.getElementById('adminCancelUserBtn');

  userBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('newUserName');
    const emailInput = document.getElementById('newUserEmail');
    const roleInput = document.getElementById('newUserRole');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const role = roleInput.value;

    if (!name) return;

    if (editingUser) {
      // Update mode
      const updated = updateUser(editingUser.name, { name, email, role });
      if (updated) {
        cancelEditUser(); // Reset form and state
        renderList();
      } else {
        nameInput.style.borderColor = '#e53e3e';
        setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      }
    } else {
      // Add mode
      const added = addUser({ name, email, role });
      if (added) {
        nameInput.value = '';
        emailInput.value = '';
        roleInput.value = 'Vessel';
        renderList();
      } else {
        nameInput.style.borderColor = '#e53e3e';
        setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      }
    }
  });

  cancelBtn.addEventListener('click', cancelEditUser);

  // Add/Update Tag button
  const tagBtn = document.getElementById('adminAddTagBtn');
  const cancelTagBtn = document.getElementById('adminCancelTagBtn');

  tagBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('newTagName');
    const colorInput = document.getElementById('newTagColor');

    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) return;

    if (editingTag) {
      // Update mode
      const updated = updateTag(editingTag.name, { name, color });
      if (updated) {
        cancelEditTag();
        renderList();
      } else {
        nameInput.style.borderColor = '#e53e3e';
        setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      }
    } else {
      // Add mode
      const added = addTag({ name, color });
      if (added) {
        nameInput.value = '';
        renderList();
      } else {
        nameInput.style.borderColor = '#e53e3e';
        setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      }
    }
  });

  cancelTagBtn.addEventListener('click', cancelEditTag);
}

function bindDragEvents() {
  const container = document.getElementById('adminList');
  let draggedItem = null;

  container.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.draggable-item');
    if (!item || activeList === 'users') return; // Users not reorderable

    draggedItem = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.index);
  });

  container.addEventListener('dragend', (e) => {
    const item = e.target.closest('.draggable-item');
    if (item) item.classList.remove('dragging');
    draggedItem = null;

    // Cleanup placeholders/highlights if any
    container.querySelectorAll('.draggable-item').forEach(el => {
      el.style.borderTop = '';
      el.style.borderBottom = '';
    });
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;
    const target = e.target.closest('.draggable-item');
    if (!target || target === draggedItem) return;

    // Visual feedback: show where it will drop
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    container.querySelectorAll('.draggable-item').forEach(el => {
      if (el !== target) {
        el.style.borderTop = '';
        el.style.borderBottom = '';
      }
    });

    if (e.clientY < midpoint) {
      target.style.borderTop = '2px solid #4299e1';
      target.style.borderBottom = '';
      target.dataset.dropPos = 'before';
    } else {
      target.style.borderTop = '';
      target.style.borderBottom = '2px solid #4299e1';
      target.dataset.dropPos = 'after';
    }
  });

  container.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.draggable-item');
    if (target) {
      // Verify we aren't entering a child
    }
    // Simple clear isn't enough because events fire frequently.
    // We rely on dragover to clear others.
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const target = e.target.closest('.draggable-item');
    if (!target || target === draggedItem) return;

    // Clear styles
    target.style.borderTop = '';
    target.style.borderBottom = '';

    const fromIndex = parseInt(draggedItem.dataset.index);
    let toIndex = parseInt(target.dataset.index);

    const pos = target.dataset.dropPos;
    // If dropping after, and target is after source, index doesn't change?
    // Move logic: move item FROM to TO.
    // If we want it BEFORE target (index 5), we insert at 5. Item at 5 becomes 6.
    // If we want it AFTER target (index 5), we insert at 6.
    if (pos === 'after') toIndex++;

    // Correction for removing item first:
    // If dragging from 0 to 5 (after 5):
    // Remove 0. Item 5 becomes index 4.
    // Insert at 6? No, original 5 is now 4.
    // It's safer to use the visual index.

    if (fromIndex < toIndex) {
      toIndex--; // Because removal shifts indices down
    }

    if (moveItem(activeList, fromIndex, toIndex)) {
      renderList();
    }
  });
}


function startEditTag(tag) {
  editingTag = tag;
  document.getElementById('newTagName').value = tag.name;
  document.getElementById('newTagColor').value = tag.color;

  const btn = document.getElementById('adminAddTagBtn');
  btn.textContent = 'Update Tag';
  btn.classList.add('btn-warning');

  document.getElementById('adminCancelTagBtn').style.display = 'inline-block';
  document.getElementById('newTagName').focus();
}

function cancelEditTag() {
  editingTag = null;
  document.getElementById('newTagName').value = '';
  document.getElementById('newTagColor').value = '#4299e1';

  const btn = document.getElementById('adminAddTagBtn');
  btn.textContent = '+ Add Tag';
  btn.classList.remove('btn-warning');

  document.getElementById('adminCancelTagBtn').style.display = 'none';
}

function startEditUser(user) {
  editingUser = user;

  // Ensure user form is visible
  document.getElementById('adminGenericAdd').style.display = 'none';
  document.getElementById('adminUserAdd').style.display = 'flex';
  document.getElementById('adminTagAdd').style.display = 'none';

  document.getElementById('newUserName').value = user.name;
  document.getElementById('newUserEmail').value = user.email || '';
  document.getElementById('newUserRole').value = user.role;

  // Switch button to Update
  const btn = document.getElementById('adminAddUserBtn');
  btn.textContent = 'Update User';
  btn.classList.add('btn-warning');

  // Show cancel
  document.getElementById('adminCancelUserBtn').style.display = 'inline-block';

  // Highlight input to show focus
  document.getElementById('newUserName').focus();
}

function cancelEditUser() {
  editingUser = null;
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserRole').value = 'Vessel';

  // Switch button back to Add
  const btn = document.getElementById('adminAddUserBtn');
  btn.textContent = '+ Add User';
  btn.classList.remove('btn-warning');

  // Hide cancel
  document.getElementById('adminCancelUserBtn').style.display = 'none';
}

function startEditVessel(vesselName) {
  editingVessel = vesselName;
  const input = document.getElementById('adminNewItem');
  input.value = vesselName;

  const btn = document.getElementById('adminAddBtn');
  btn.textContent = 'Update';
  btn.classList.add('btn-warning');

  document.getElementById('adminCancelBtn').style.display = 'inline-block';
  input.focus();
}

function cancelEditVessel() {
  editingVessel = null;
  const input = document.getElementById('adminNewItem');
  input.value = '';

  const btn = document.getElementById('adminAddBtn');
  btn.textContent = '+ Add';
  btn.classList.remove('btn-warning');

  document.getElementById('adminCancelBtn').style.display = 'none';
}

function loadAirtableForm() {
  const config = getAirtableConfig();
  document.getElementById('airtableApiKey').value = config.apiKey || '';
  document.getElementById('airtableBaseId').value = config.baseId || '';
  document.getElementById('airtableTableId').value = config.tableId || '';
  document.getElementById('airtableUsersTableId').value = config.usersTableId || '';
  document.getElementById('airtableVesselsTableId').value = config.vesselsTableId || '';
  document.getElementById('airtableTagsTableId').value = config.tagsTableId || '';
  document.getElementById('fieldVessel').value = config.fieldVessel || 'Vessel';
  document.getElementById('fieldDate').value = config.fieldDate || 'Date';
  document.getElementById('fieldStart').value = config.fieldStart || 'Start';
  document.getElementById('fieldEnd').value = config.fieldEnd || 'End';
  document.getElementById('fieldActivity').value = config.fieldActivity || 'Description';
  document.getElementById('fieldTag').value = config.fieldTag || 'Type';
  document.getElementById('fieldUserEmail').value = config.fieldUserEmail || 'access_User email';
  document.getElementById('airtableStatus').textContent = '';
}

function bindAirtableEvents() {
  document.getElementById('airtableSaveBtn').addEventListener('click', () => {
    const config = {
      apiKey:         document.getElementById('airtableApiKey').value.trim(),
      baseId:         document.getElementById('airtableBaseId').value.trim(),
      tableId:        document.getElementById('airtableTableId').value.trim(),
      usersTableId:   document.getElementById('airtableUsersTableId').value.trim(),
      vesselsTableId: document.getElementById('airtableVesselsTableId').value.trim(),
      tagsTableId:    document.getElementById('airtableTagsTableId').value.trim(),
      fieldVessel:    document.getElementById('fieldVessel').value.trim() || 'Vessel',
      fieldDate:      document.getElementById('fieldDate').value.trim() || 'Date',
      fieldStart:     document.getElementById('fieldStart').value.trim() || 'Start',
      fieldEnd:       document.getElementById('fieldEnd').value.trim() || 'End',
      fieldActivity:  document.getElementById('fieldActivity').value.trim() || 'Description',
      fieldTag:       document.getElementById('fieldTag').value.trim() || 'Type',
      fieldUserEmail: document.getElementById('fieldUserEmail').value.trim() || 'access_User email',
    };
    saveAirtableConfig(config);
    const status = document.getElementById('airtableStatus');
    status.textContent = 'Saved.';
    status.style.color = '#38a169';
  });

  document.getElementById('airtableTestBtn').addEventListener('click', async () => {
    const status = document.getElementById('airtableStatus');
    status.textContent = 'Testing...';
    status.style.color = 'var(--text-muted)';

    const apiKey = getAirtableConfig().apiKey;
    const baseId = document.getElementById('airtableBaseId').value.trim();
    const tableId = document.getElementById('airtableTableId').value.trim();

    if (!apiKey) {
      status.textContent = 'API Key is missing (check Vercel env vars).';
      status.style.color = '#e53e3e';
      return;
    }

    if (!baseId || !tableId) {
      status.textContent = 'Base ID and Table ID are required.';
      status.style.color = '#e53e3e';
      return;
    }

    try {
      const url = `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=1`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        status.textContent = 'Connection successful.';
        status.style.color = '#38a169';
      } else {
        const err = await res.json();
        status.textContent = `Error: ${err.error?.message || res.statusText}`;
        status.style.color = '#e53e3e';
      }
    } catch (err) {
      status.textContent = `Network error: ${err.message}`;
      status.style.color = '#e53e3e';
    }
  });
}
