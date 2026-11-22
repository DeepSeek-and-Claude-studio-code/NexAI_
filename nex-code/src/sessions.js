'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class NexCodeSessionStore {
  constructor(baseDir) { this.dir = baseDir || path.join(os.homedir(), '.nex-code', 'sessions'); fs.mkdirSync(this.dir, { recursive: true }); }
  _file(id) { return path.join(this.dir, `${String(id || '').replace(/[^a-zA-Z0-9_-]/g, '')}.json`); }
  list() {
    fs.mkdirSync(this.dir, { recursive: true });
    const out = [];
    for (const f of fs.readdirSync(this.dir).filter(x => x.endsWith('.json'))) {
      try { const d = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')); if (d && d.id) out.push({ id: d.id, title: d.title || 'Nex Code', cwd: d.cwd || '', updatedAt: d.updatedAt || 0, messageCount: (d.uiLog || []).length }); } catch (_) {}
    }
    return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  create(cwd, title) {
    const now = Date.now();
    const s = { id: `nc_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`, title: title || `Nex Code · ${path.basename(cwd || os.homedir()) || 'workspace'}`, cwd: cwd || os.homedir(), createdAt: now, updatedAt: now, messages: [], uiLog: [] };
    this.save(s); return s;
  }
  load(id) { const fp = this._file(id); if (!fs.existsSync(fp)) return null; try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (_) { return null; } }
  save(s) {
    if (!s || !s.id) return;
    fs.mkdirSync(this.dir, { recursive: true }); s.updatedAt = Date.now();
    if (s.messages.length > 80) s.messages = s.messages.slice(-80);
    if (s.uiLog.length > 300) s.uiLog = s.uiLog.slice(-300);
    const fp = this._file(s.id); fs.writeFileSync(fp + '.tmp', JSON.stringify(s, null, 2), 'utf8'); fs.renameSync(fp + '.tmp', fp);
  }
  findFreshEmpty(cwd) {
    for (const meta of this.list()) if (meta.cwd === cwd && meta.messageCount === 0) { const f = this.load(meta.id); if (f && !f.messages.length) return f; }
    return null;
  }
}

module.exports = { NexCodeSessionStore };
