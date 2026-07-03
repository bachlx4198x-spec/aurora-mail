const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('./src/store');
const { testConnection, listFolders, fetchMessages, sendMail } = require('./src/mailEngine');

let mainWindow;
const store = new Store();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC: Account management ----
ipcMain.handle('accounts:list', () => store.getAccounts());

ipcMain.handle('accounts:add', async (_evt, account) => {
  // Verify credentials work before saving
  await testConnection(account);
  const saved = store.addAccount(account);
  return saved;
});

ipcMain.handle('accounts:remove', (_evt, accountId) => {
  store.removeAccount(accountId);
  return true;
});

ipcMain.handle('accounts:test', async (_evt, account) => {
  await testConnection(account);
  return true;
});

// ---- IPC: Folders & messages ----
ipcMain.handle('mail:folders', async (_evt, accountId) => {
  const account = store.getAccount(accountId);
  if (!account) throw new Error('Account not found');
  return listFolders(account);
});

ipcMain.handle('mail:messages', async (_evt, { accountId, folder, limit }) => {
  const account = store.getAccount(accountId);
  if (!account) throw new Error('Account not found');
  return fetchMessages(account, folder, limit || 50);
});

ipcMain.handle('mail:send', async (_evt, { accountId, message }) => {
  const account = store.getAccount(accountId);
  if (!account) throw new Error('Account not found');
  return sendMail(account, message);
});
