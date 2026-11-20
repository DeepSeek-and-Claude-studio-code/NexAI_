'use strict';

const net = require('net');
const tls = require('tls');

function decodeMimeHeader(raw) {
  return String(raw || '').replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (m, _cs, enc, payload) => {
    try {
      if (enc.toUpperCase() === 'B') return Buffer.from(payload, 'base64').toString('utf8');
      const spaced = payload.replace(/_/g, ' ');
      const bytes = [];
      for (let i = 0; i < spaced.length; i++) {
        if (spaced[i] === '=' && i + 2 < spaced.length) {
          const val = parseInt(spaced.slice(i + 1, i + 3), 16);
          if (!Number.isNaN(val)) { bytes.push(val); i += 2; continue; }
        }
        bytes.push(spaced.charCodeAt(i));
      }
      return Buffer.from(bytes).toString('utf8');
    } catch (_) {
      return m;
    }
  });
}

function createLineReader(socket) {
  let buf = '';
  const waiters = [];
  const queue = [];

  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (waiters.length) waiters.shift().resolve(line);
      else queue.push(line);
    }
  });
  socket.on('error', (err) => {
    while (waiters.length) waiters.shift().reject(err);
  });
  socket.on('close', () => {
    while (waiters.length) waiters.shift().resolve(null);
  });

  return {
    nextLine(timeoutMs = 20000) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Mail socket timeout')), timeoutMs);
        waiters.push({
          resolve: (v) => { clearTimeout(timer); resolve(v); },
          reject: (e) => { clearTimeout(timer); reject(e); }
        });
      });
    }
  };
}

async function readInbox(cfg, limit = 5) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  if (cfg.mode === 'gmail_oauth') {
    if (!cfg.oauthAccessToken) throw new Error('Gmail OAuth token not configured.');
    const headers = { Authorization: `Bearer ${cfg.oauthAccessToken}` };
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${safeLimit}`, { headers });
    const listText = await listRes.text();
    if (!listRes.ok) throw new Error(`Gmail HTTP ${listRes.status}: ${listText.slice(0, 200)}`);
    const msgs = JSON.parse(listText).messages || [];
    const out = [];
    for (const m of msgs) {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers });
      if (!r.ok) continue;
      const obj = await r.json();
      const hdrs = obj?.payload?.headers || [];
      const getH = (n) => (hdrs.find(h => (h.name || '').toLowerCase() === n)?.value) || '';
      out.push({
        from: getH('from'),
        subject: getH('subject') || '(no subject)',
        date: getH('date'),
        snippet: obj.snippet || ''
      });
    }
    return out;
  }

  if (!cfg.email || !cfg.password || !cfg.imapHost) {
    throw new Error('IMAP email settings are incomplete.');
  }

  const socket = await new Promise((resolve, reject) => {
    const s = tls.connect({ host: cfg.imapHost, port: cfg.imapPort || 993, servername: cfg.imapHost }, () => resolve(s));
    s.once('error', reject);
  });

  try {
    const reader = createLineReader(socket);
    await reader.nextLine(); // greeting

    const cmd = async (tag, line) => {
      socket.write(`${tag} ${line}\r\n`);
      const lines = [];
      while (true) {
        const l = await reader.nextLine();
        if (l === null) break;
        lines.push(l);
        if (l.startsWith(`${tag} `)) break;
      }
      return lines;
    };

    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const loginRes = await cmd('A1', `LOGIN "${esc(cfg.email)}" "${esc(cfg.password)}"`);
    if (!loginRes[loginRes.length - 1]?.startsWith('A1 OK')) {
      throw new Error(`IMAP login failed: ${loginRes[loginRes.length - 1] || 'unknown'}`);
    }

    const selRes = await cmd('A2', 'SELECT INBOX');
    let total = 0;
    for (const l of selRes) {
      const m = /\* (\d+) EXISTS/.exec(l);
      if (m) total = parseInt(m[1], 10);
    }
    if (total === 0) {
      await cmd('A9', 'LOGOUT');
      return [];
    }

    const start = Math.max(1, total - safeLimit + 1);
    const fetchRes = await cmd('A3', `FETCH ${start}:${total} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] BODY.PEEK[TEXT]<0.500>)`);
    await cmd('A9', 'LOGOUT');

    const results = [];
    let from = '', subject = '', date = '', snippet = '', inBody = false;
    const flush = () => {
      if (from || subject) {
        results.push({
          from: decodeMimeHeader(from),
          subject: decodeMimeHeader(subject || '(no subject)'),
          date: date.trim(),
          snippet: snippet.replace(/\s+/g, ' ').trim().slice(0, 240)
        });
      }
      from = ''; subject = ''; date = ''; snippet = ''; inBody = false;
    };
    for (const raw of fetchRes) {
      if (raw.startsWith('* ') && raw.includes('FETCH')) flush();
      else if (raw.startsWith('A3 ')) flush();
      else if (raw.includes('BODY[TEXT]')) inBody = true;
      else if (!inBody && /^From:/i.test(raw)) from = raw.slice(5).trim();
      else if (!inBody && /^Subject:/i.test(raw)) subject = raw.slice(8).trim();
      else if (!inBody && /^Date:/i.test(raw)) date = raw.slice(5).trim();
      else if (inBody && raw !== ')' && !raw.startsWith('--') && !raw.startsWith('Content-')) {
        if (snippet.length < 300) snippet += raw + ' ';
      }
    }
    flush();
    return results.reverse();
  } finally {
    socket.destroy();
  }
}

async function sendEmail(cfg, { to, subject, body }) {
  if (cfg.mode === 'gmail_oauth') {
    if (!cfg.oauthAccessToken) throw new Error('Gmail OAuth token not configured.');
    const encSubj = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
    const mime = `To: ${to}\r\nSubject: ${encSubj}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
    const raw = Buffer.from(mime, 'utf8').toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.oauthAccessToken}` },
      body: JSON.stringify({ raw })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Gmail Send HTTP ${res.status}: ${text.slice(0, 250)}`);
    return `Email sent to ${to}`;
  }

  if (!cfg.email || !cfg.password || !cfg.smtpHost) {
    throw new Error('SMTP settings are incomplete.');
  }

  let socket = await new Promise((resolve, reject) => {
    const s = cfg.useStartTls
      ? net.connect({ host: cfg.smtpHost, port: cfg.smtpPort || 587 }, () => resolve(s))
      : tls.connect({ host: cfg.smtpHost, port: cfg.smtpPort || 465, servername: cfg.smtpHost }, () => resolve(s));
    s.once('error', reject);
  });

  try {
    let reader = createLineReader(socket);
    const readReply = async () => {
      const lines = [];
      while (true) {
        const l = await reader.nextLine();
        if (l === null) break;
        lines.push(l);
        if (l.length >= 4 && l[3] === ' ') break;
      }
      return lines.join('\n');
    };
    const sendCmd = async (line, prefix) => {
      socket.write(`${line}\r\n`);
      const reply = await readReply();
      if (!reply.startsWith(prefix)) throw new Error(`SMTP error: ${reply}`);
    };

    await readReply(); // 220 banner
    await sendCmd('EHLO nex.local', '250');

    if (cfg.useStartTls) {
      await sendCmd('STARTTLS', '220');
      socket = await new Promise((resolve, reject) => {
        const ts = tls.connect({ socket, servername: cfg.smtpHost }, () => resolve(ts));
        ts.once('error', reject);
      });
      reader = createLineReader(socket);
      await sendCmd('EHLO nex.local', '250');
    }

    await sendCmd('AUTH LOGIN', '334');
    await sendCmd(Buffer.from(cfg.email, 'utf8').toString('base64'), '334');
    await sendCmd(Buffer.from(cfg.password, 'utf8').toString('base64'), '235');
    await sendCmd(`MAIL FROM:<${cfg.email}>`, '250');
    await sendCmd(`RCPT TO:<${String(to).trim()}>`, '250');
    await sendCmd('DATA', '354');

    const encSubj = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
    const safeBody = String(body || '').replace(/\r\n/g, '\n').replace(/\n\./g, '\n..').replace(/\n/g, '\r\n');
    const msg = `From: <${cfg.email}>\r\nTo: <${String(to).trim()}>\r\nSubject: ${encSubj}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${safeBody}\r\n.`;
    await sendCmd(msg, '250');
    try { await sendCmd('QUIT', '221'); } catch (_) {}
    return `Email sent to ${to}`;
  } finally {
    socket.destroy();
  }
}

module.exports = { readInbox, sendEmail };
