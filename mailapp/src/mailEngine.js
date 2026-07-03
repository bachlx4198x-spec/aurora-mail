const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

function openImap(account) {
  return new Imap({
    user: account.username || account.email,
    password: account.password,
    host: account.imapHost,
    port: account.imapPort || 993,
    tls: account.imapSecure !== false,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
    connTimeout: 10000
  });
}

/** Verify IMAP credentials by opening + immediately closing a connection. */
function testConnection(account) {
  return new Promise((resolve, reject) => {
    const imap = openImap(account);
    const timer = setTimeout(() => {
      imap.destroy();
      reject(new Error('Kết nối quá thời gian chờ (timeout). Kiểm tra lại host/port.'));
    }, 12000);

    imap.once('ready', () => {
      clearTimeout(timer);
      imap.end();
      resolve(true);
    });
    imap.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    imap.connect();
  });
}

/** List mailbox folders (Inbox, Sent, Drafts, Trash, custom...). */
function listFolders(account) {
  return new Promise((resolve, reject) => {
    const imap = openImap(account);
    imap.once('ready', () => {
      imap.getBoxes((err, boxes) => {
        imap.end();
        if (err) return reject(err);
        resolve(flattenBoxes(boxes));
      });
    });
    imap.once('error', reject);
    imap.connect();
  });
}

function flattenBoxes(boxes, prefix = '') {
  const out = [];
  for (const [name, box] of Object.entries(boxes)) {
    const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
    out.push({ name, path: fullName, attribs: box.attribs || [] });
    if (box.children) {
      out.push(...flattenBoxes(box.children, fullName));
    }
  }
  return out;
}

/** Fetch the most recent `limit` messages (headers + preview) from a folder. */
function fetchMessages(account, folder, limit = 50) {
  return new Promise((resolve, reject) => {
    const imap = openImap(account);
    const results = [];

    imap.once('ready', () => {
      imap.openBox(folder || 'INBOX', true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }
        const total = box.messages.total;
        if (total === 0) {
          imap.end();
          return resolve([]);
        }
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:${total}`;

        const f = imap.seq.fetch(range, {
          bodies: '',
          struct: true
        });

        f.on('message', (msg, seqno) => {
          let buffer = '';
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });
          let attrs = null;
          msg.once('attributes', (a) => {
            attrs = a;
          });
          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(buffer);
              results.push({
                seqno,
                uid: attrs ? attrs.uid : seqno,
                flags: attrs ? attrs.flags : [],
                from: parsed.from ? parsed.from.text : '',
                to: parsed.to ? parsed.to.text : '',
                subject: parsed.subject || '(Không có tiêu đề)',
                date: parsed.date,
                preview: (parsed.text || '').slice(0, 180),
                html: parsed.html || null,
                text: parsed.text || ''
              });
            } catch {
              // Skip unparsable message rather than failing the whole fetch.
            }
          });
        });

        f.once('error', (err) => {
          imap.end();
          reject(err);
        });

        f.once('end', () => {
          imap.end();
          results.sort((a, b) => new Date(b.date) - new Date(a.date));
          resolve(results);
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

/** Send an email via SMTP using nodemailer. */
async function sendMail(account, message) {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort || 587,
    secure: account.smtpSecure === true,
    auth: {
      user: account.username || account.email,
      pass: account.smtpPassword || account.password
    }
  });

  const info = await transporter.sendMail({
    from: account.email,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    subject: message.subject,
    text: message.text,
    html: message.html
  });

  return { messageId: info.messageId };
}

module.exports = { testConnection, listFolders, fetchMessages, sendMail };
