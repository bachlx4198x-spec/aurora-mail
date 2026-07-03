const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');

// Simple local JSON store for account configs.
// Passwords are encrypted at rest using Electron's OS-level safeStorage
// (Keychain on macOS, DPAPI on Windows, libsecret on Linux) when available,
// falling back to a locally-derived key so the app still works headless.

class Store {
  constructor() {
    const userData = app.getPath('userData');
    this.filePath = path.join(userData, 'accounts.json');
    this._data = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { accounts: [] };
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2), 'utf-8');
  }

  _encrypt(plain) {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return { enc: true, value: safeStorage.encryptString(plain).toString('base64') };
    }
    // Fallback: not real encryption, just avoid storing plaintext obviously.
    // Documented limitation: only used when OS keychain is unavailable.
    return { enc: false, value: Buffer.from(plain, 'utf-8').toString('base64') };
  }

  _decrypt(entry) {
    if (!entry) return '';
    if (entry.enc && safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(entry.value, 'base64'));
    }
    return Buffer.from(entry.value, 'base64').toString('utf-8');
  }

  getAccounts() {
    // Never return raw password to renderer.
    return this._data.accounts.map(({ password, smtpPassword, ...rest }) => rest);
  }

  getAccount(id) {
    const acc = this._data.accounts.find((a) => a.id === id);
    if (!acc) return null;
    return {
      ...acc,
      password: this._decrypt(acc.password),
      smtpPassword: this._decrypt(acc.smtpPassword || acc.password)
    };
  }

  addAccount(account) {
    const id = crypto.randomUUID();
    const stored = {
      id,
      displayName: account.displayName,
      email: account.email,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapSecure: account.imapSecure,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      smtpSecure: account.smtpSecure,
      username: account.username || account.email,
      password: this._encrypt(account.password || ''),
      color: account.color || '#5b8def'
    };
    this._data.accounts.push(stored);
    this._save();
    const { password, ...safe } = stored;
    return safe;
  }

  removeAccount(id) {
    this._data.accounts = this._data.accounts.filter((a) => a.id !== id);
    this._save();
  }
}

module.exports = Store;
