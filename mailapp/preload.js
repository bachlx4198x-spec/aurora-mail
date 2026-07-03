const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('auroraMail', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (account) => ipcRenderer.invoke('accounts:add', account),
    remove: (accountId) => ipcRenderer.invoke('accounts:remove', accountId),
    test: (account) => ipcRenderer.invoke('accounts:test', account)
  },
  mail: {
    folders: (accountId) => ipcRenderer.invoke('mail:folders', accountId),
    messages: (accountId, folder, limit) =>
      ipcRenderer.invoke('mail:messages', { accountId, folder, limit }),
    send: (accountId, message) => ipcRenderer.invoke('mail:send', { accountId, message })
  }
});
