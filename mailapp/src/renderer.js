// ============================================================
// Aurora Mail — renderer process
// Talks to the main process only through window.auroraMail
// (see preload.js). No Node APIs are used directly here.
// ============================================================

const PRESETS = {
  gmail: { imapHost: 'imap.gmail.com', imapPort: 993, imapSecure: true, smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecure: false },
  outlook: { imapHost: 'outlook.office365.com', imapPort: 993, imapSecure: true, smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  yahoo: { imapHost: 'imap.mail.yahoo.com', imapPort: 993, imapSecure: true, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587, smtpSecure: false },
  icloud: { imapHost: 'imap.mail.me.com', imapPort: 993, imapSecure: true, smtpHost: 'smtp.mail.me.com', smtpPort: 587, smtpSecure: false },
  custom: { imapHost: '', imapPort: 993, imapSecure: true, smtpHost: '', smtpPort: 587, smtpSecure: false }
};

const FOLDER_ICONS = {
  inbox: '📥', sent: '📤', drafts: '📝', trash: '🗑️', junk: '🚫', archive: '🗂️', default: '📁'
};

const DEMO_ACCOUNT = { id: 'demo', displayName: 'Bản demo', email: 'demo@aurora.mail', color: '#8e8e93', isDemo: true };

const DEMO_FOLDERS = [
  { path: 'INBOX', label: 'Hộp thư đến', icon: 'inbox', count: 3 },
  { path: 'Sent', label: 'Đã gửi', icon: 'sent', count: 0 },
  { path: 'Drafts', label: 'Nháp', icon: 'drafts', count: 1 },
  { path: 'Archive', label: 'Lưu trữ', icon: 'archive', count: 0 },
  { path: 'Junk', label: 'Thư rác', icon: 'junk', count: 0 },
  { path: 'Trash', label: 'Thùng rác', icon: 'trash', count: 0 }
];

const DEMO_MESSAGES = {
  INBOX: [
    {
      uid: 1, from: 'Nhóm Aurora Mail', to: 'demo@aurora.mail', subject: 'Chào mừng đến với Aurora Mail',
      date: new Date(Date.now() - 1000 * 60 * 40), unread: true,
      text: 'Cảm ơn bạn đã dùng thử Aurora Mail!\n\nĐây là dữ liệu mẫu để bạn xem trước giao diện. Nhấn "+ Thêm tài khoản email" ở góc dưới bên trái để kết nối hộp thư thật của bạn qua IMAP/SMTP — giống như thiết lập trong Thunderbird hoặc Outlook.\n\nChúc bạn có trải nghiệm tốt!'
    },
    {
      uid: 2, from: 'Minh Anh', to: 'demo@aurora.mail', subject: 'Lịch họp tuần tới',
      date: new Date(Date.now() - 1000 * 60 * 60 * 5), unread: true,
      text: 'Chào bạn,\n\nMình gửi lại lịch họp nhóm vào thứ 3 tuần sau lúc 9h sáng. Bạn xem giúp mình phòng họp còn trống không nhé.\n\nCảm ơn bạn!'
    },
    {
      uid: 3, from: 'Bản tin Công nghệ', to: 'demo@aurora.mail', subject: 'Tổng hợp tin tức công nghệ trong tuần',
      date: new Date(Date.now() - 1000 * 60 * 60 * 26), unread: false,
      text: 'Điểm qua những sự kiện công nghệ đáng chú ý tuần này...\n\n(Đây là nội dung mẫu cho mục đích minh hoạ giao diện.)'
    }
  ],
  Sent: [], Drafts: [
    { uid: 4, from: 'Bạn', to: '', subject: '(Bản nháp) Báo cáo tháng', date: new Date(), unread: false, text: 'Nội dung đang soạn dở...' }
  ],
  Archive: [], Junk: [], Trash: []
};

// ---------------- App state ----------------
const state = {
  accounts: [DEMO_ACCOUNT],
  currentAccountId: 'demo',
  folders: DEMO_FOLDERS,
  currentFolder: 'INBOX',
  messages: [],
  selectedMessage: null
};

// ---------------- DOM refs ----------------
const $ = (sel) => document.querySelector(sel);
const accountSwitcher = $('#accountSwitcher');
const folderListEl = $('#folderList');
const folderTitleEl = $('#folderTitle');
const messageListEl = $('#messageList');
const emptyState = $('#emptyState');
const messageDetail = $('#messageDetail');

// ================= Init =================
async function init() {
  try {
    const realAccounts = await window.auroraMail.accounts.list();
    state.accounts = [DEMO_ACCOUNT, ...realAccounts];
  } catch {
    // Running outside Electron (e.g. plain browser preview) — demo only.
  }
  renderAccountSwitcher();
  await selectAccount('demo');
}

// ================= Accounts =================
function renderAccountSwitcher() {
  accountSwitcher.innerHTML = '';
  state.accounts.forEach((acc) => {
    const chip = document.createElement('div');
    chip.className = 'account-chip' + (acc.id === state.currentAccountId ? ' active' : '');
    chip.style.background = acc.color || '#4a63f0';
    chip.textContent = (acc.displayName || acc.email || '?').slice(0, 1).toUpperCase();
    chip.title = acc.displayName + ' — ' + acc.email;
    chip.addEventListener('click', () => selectAccount(acc.id));
    accountSwitcher.appendChild(chip);
  });
}

async function selectAccount(accountId) {
  state.currentAccountId = accountId;
  renderAccountSwitcher();

  if (accountId === 'demo') {
    state.folders = DEMO_FOLDERS;
    renderFolders();
    await selectFolder('INBOX');
    return;
  }

  folderListEl.innerHTML = '<div class="list-empty">Đang tải thư mục…</div>';
  try {
    const rawFolders = await window.auroraMail.mail.folders(accountId);
    state.folders = rawFolders.map((f) => ({
      path: f.path,
      label: prettyFolderName(f.name),
      icon: guessIcon(f.name),
      count: null
    }));
    renderFolders();
    const inbox = state.folders.find((f) => /inbox/i.test(f.path)) || state.folders[0];
    if (inbox) await selectFolder(inbox.path);
  } catch (err) {
    folderListEl.innerHTML = `<div class="list-empty">Không tải được thư mục:<br>${escapeHtml(err.message)}</div>`;
  }
}

function prettyFolderName(name) {
  const map = { INBOX: 'Hộp thư đến', Sent: 'Đã gửi', Drafts: 'Nháp', Trash: 'Thùng rác', Junk: 'Thư rác', Archive: 'Lưu trữ' };
  return map[name] || name;
}
function guessIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('inbox')) return 'inbox';
  if (n.includes('sent')) return 'sent';
  if (n.includes('draft')) return 'drafts';
  if (n.includes('trash') || n.includes('deleted')) return 'trash';
  if (n.includes('junk') || n.includes('spam')) return 'junk';
  if (n.includes('archive')) return 'archive';
  return 'default';
}

// ================= Folders =================
function renderFolders() {
  folderListEl.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'folder-section-label';
  label.textContent = 'Thư mục';
  folderListEl.appendChild(label);

  state.folders.forEach((f) => {
    const item = document.createElement('div');
    item.className = 'folder-item' + (f.path === state.currentFolder ? ' active' : '');
    item.innerHTML = `
      <span class="folder-icon">${FOLDER_ICONS[f.icon] || FOLDER_ICONS.default}</span>
      <span>${escapeHtml(f.label)}</span>
      ${f.count ? `<span class="folder-count">${f.count}</span>` : ''}
    `;
    item.addEventListener('click', () => selectFolder(f.path));
    folderListEl.appendChild(item);
  });
}

async function selectFolder(folderPath) {
  state.currentFolder = folderPath;
  renderFolders();
  const folderMeta = state.folders.find((f) => f.path === folderPath);
  folderTitleEl.textContent = folderMeta ? folderMeta.label : folderPath;

  if (state.currentAccountId === 'demo') {
    const key = Object.keys(DEMO_MESSAGES).find((k) => k === folderPath) || 'INBOX';
    state.messages = DEMO_MESSAGES[key] || [];
    renderMessageList();
    return;
  }

  messageListEl.innerHTML = '<div class="list-empty">Đang tải thư…</div>';
  try {
    const msgs = await window.auroraMail.mail.messages(state.currentAccountId, folderPath, 50);
    state.messages = msgs.map((m) => ({ ...m, unread: (m.flags || []).indexOf('\\Seen') === -1 }));
    renderMessageList();
  } catch (err) {
    messageListEl.innerHTML = `<div class="list-empty">Không tải được thư:<br>${escapeHtml(err.message)}</div>`;
  }
}

// ================= Message list =================
function renderMessageList() {
  messageListEl.innerHTML = '';
  if (state.messages.length === 0) {
    messageListEl.innerHTML = '<div class="list-empty">Không có email nào trong thư mục này.</div>';
    showEmptyState();
    return;
  }
  state.messages.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'message-card' + (m.unread ? ' unread' : '');
    card.innerHTML = `
      <div class="mc-top">
        <div class="mc-from">${escapeHtml(m.from || 'Không rõ')}</div>
        <div class="mc-date">${formatDate(m.date)}</div>
      </div>
      <div class="mc-subject">${escapeHtml(m.subject || '(Không có tiêu đề)')}</div>
      <div class="mc-preview">${escapeHtml(m.preview || (m.text || '').slice(0, 140))}</div>
    `;
    card.addEventListener('click', () => selectMessage(idx));
    messageListEl.appendChild(card);
  });
}

function selectMessage(idx) {
  state.selectedMessage = state.messages[idx];
  document.querySelectorAll('.message-card').forEach((el, i) => el.classList.toggle('selected', i === idx));
  renderReadingPane();
}

function renderReadingPane() {
  const m = state.selectedMessage;
  if (!m) return showEmptyState();
  emptyState.hidden = true;
  messageDetail.hidden = false;

  $('#detailSubject').textContent = m.subject || '(Không có tiêu đề)';
  $('#detailFrom').textContent = m.from || 'Không rõ';
  $('#detailTo').textContent = 'Đến: ' + (m.to || '');
  $('#detailDate').textContent = formatDate(m.date, true);
  $('#detailAvatar').textContent = (m.from || '?').slice(0, 1).toUpperCase();
  $('#detailBody').textContent = m.text || m.preview || '';
}

function showEmptyState() {
  emptyState.hidden = false;
  messageDetail.hidden = true;
}

// ================= Utilities =================
function formatDate(d, long = false) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  if (long) return date.toLocaleString('vi-VN');
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showToast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { t.hidden = true; }, ms);
}

// ================= Add Account modal =================
const accountModalOverlay = $('#accountModalOverlay');
const accountForm = $('#accountForm');
const formError = $('#formError');

$('#btnAddAccount').addEventListener('click', () => {
  accountForm.reset();
  formError.hidden = true;
  document.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
  accountModalOverlay.hidden = false;
});
$('#btnCancelAccount').addEventListener('click', () => { accountModalOverlay.hidden = true; });

document.querySelectorAll('.preset-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const preset = PRESETS[chip.dataset.preset];
    if (preset) {
      $('#fImapHost').value = preset.imapHost;
      $('#fImapPort').value = preset.imapPort;
      $('#fImapSecure').value = String(preset.imapSecure);
      $('#fSmtpHost').value = preset.smtpHost;
      $('#fSmtpPort').value = preset.smtpPort;
      $('#fSmtpSecure').value = String(preset.smtpSecure);
    }
  });
});

function readAccountForm() {
  return {
    displayName: $('#fDisplayName').value.trim(),
    email: $('#fEmail').value.trim(),
    password: $('#fPassword').value,
    imapHost: $('#fImapHost').value.trim(),
    imapPort: Number($('#fImapPort').value),
    imapSecure: $('#fImapSecure').value === 'true',
    smtpHost: $('#fSmtpHost').value.trim(),
    smtpPort: Number($('#fSmtpPort').value),
    smtpSecure: $('#fSmtpSecure').value === 'true',
    username: $('#fEmail').value.trim(),
    color: randomAccentColor()
  };
}

function randomAccentColor() {
  const palette = ['#4a63f0', '#ff9f43', '#34c759', '#ff375f', '#5856d6', '#00c7be'];
  return palette[Math.floor(Math.random() * palette.length)];
}

$('#btnTestAccount').addEventListener('click', async () => {
  formError.hidden = true;
  const data = readAccountForm();
  if (!data.imapHost || !data.email) {
    formError.textContent = 'Vui lòng nhập đầy đủ thông tin trước khi kiểm tra.';
    formError.hidden = false;
    return;
  }
  try {
    await window.auroraMail.accounts.test(data);
    showToast('✅ Kết nối IMAP thành công!');
  } catch (err) {
    formError.textContent = 'Kết nối thất bại: ' + err.message;
    formError.hidden = false;
  }
});

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const data = readAccountForm();
  try {
    const saved = await window.auroraMail.accounts.add(data);
    state.accounts.push(saved);
    accountModalOverlay.hidden = true;
    renderAccountSwitcher();
    await selectAccount(saved.id);
    showToast('Đã thêm tài khoản ' + saved.email);
  } catch (err) {
    formError.textContent = 'Không thể lưu tài khoản: ' + err.message;
    formError.hidden = false;
  }
});

// ================= Compose modal =================
const composeOverlay = $('#composeOverlay');
const composeForm = $('#composeForm');
const composeError = $('#composeError');

$('#btnCompose').addEventListener('click', () => {
  composeForm.reset();
  composeError.hidden = true;
  composeOverlay.hidden = false;
});
$('#btnCancelCompose').addEventListener('click', () => { composeOverlay.hidden = true; });

composeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  composeError.hidden = true;

  if (state.currentAccountId === 'demo') {
    composeError.textContent = 'Đây là tài khoản demo — hãy thêm tài khoản email thật để gửi thư.';
    composeError.hidden = false;
    return;
  }

  const message = { to: $('#cTo').value.trim(), subject: $('#cSubject').value.trim(), text: $('#cBody').value };
  try {
    await window.auroraMail.mail.send(state.currentAccountId, message);
    composeOverlay.hidden = true;
    showToast('Đã gửi email thành công');
  } catch (err) {
    composeError.textContent = 'Gửi thất bại: ' + err.message;
    composeError.hidden = false;
  }
});

// ================= Search (client-side filter, demo + fetched msgs) =================
$('#searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.message-card').forEach((card, i) => {
    const m = state.messages[i];
    const hay = `${m.from} ${m.subject} ${m.preview || m.text || ''}`.toLowerCase();
    card.style.display = hay.includes(q) ? '' : 'none';
  });
});

init();
