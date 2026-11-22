'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const llm = require('./llm');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.gradle', '.next', '__pycache__', '.venv', 'venv', 'target']);
const PURCHASE_REGEX = /(купить|оплат|заказ|оформит|корзин|подпис|перевест|списат|карт[ауы]|руб|₽|€|\$|buy|pay|checkout|place order|purchase|subscribe|confirm payment|transfer|billing|stripe|paypal)/i;

function loadNexMd(cwd) {
  try { const p = path.join(cwd, 'NEX.md'); if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.readFileSync(p, 'utf8').slice(0, 16000); } catch (_) {}
  return '';
}

function computeLineDiff(beforeStr, afterStr, maxLines = 140) {
  const a = String(beforeStr || '').split(/\r?\n/), b = String(afterStr || '').split(/\r?\n/);
  let prefix = 0; while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0; while (suffix < (a.length - prefix) && suffix < (b.length - prefix) && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
  const out = [];
  for (let i = Math.max(0, prefix - 2); i < prefix; i++) out.push('  ' + a[i]);
  for (let i = prefix; i < a.length - suffix; i++) out.push('- ' + a[i]);
  for (let i = prefix; i < b.length - suffix; i++) out.push('+ ' + b[i]);
  for (let i = a.length - suffix; i < Math.min(a.length, a.length - suffix + 2); i++) out.push('  ' + a[i]);
  return out.length > maxLines ? out.slice(0, maxLines).join('\n') + `\n… (+${out.length - maxLines} lines)` : out.join('\n');
}

function captureBeforeState(cwd, relPath) {
  const full = safePath(cwd, relPath);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return { relPath, existed: true, content: fs.readFileSync(full, 'utf8') };
  return { relPath, existed: false, content: '' };
}

function safePath(cwd, rel) {
  const root = path.resolve(cwd), full = path.resolve(root, rel || '.');
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Path '${rel}' escapes working directory.`);
  return full;
}

function listFiles(cwd, subdir = '.', maxDepth = 2) {
  const start = safePath(cwd, subdir);
  if (!fs.existsSync(start)) return `Directory not found: ${subdir}`;
  const limit = Math.max(1, Math.min(4, Number(maxDepth) || 2)), out = [];
  function walk(dir, depth, prefix) {
    if (out.length >= 200) return;
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= 200) break;
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.isDirectory()) { out.push(`${prefix}${e.name}/`); if (depth < limit) walk(path.join(dir, e.name), depth + 1, prefix + '  '); }
      else out.push(`${prefix}${e.name}`);
    }
  }
  walk(start, 1, '');
  return out.length ? out.join('\n') : '(empty)';
}

function globFiles(cwd, pattern) {
  const root = path.resolve(cwd);
  const esc = String(pattern || '**/*').replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`^${esc.replace(/\\\*\\\*\//g, '(?:.*/)?').replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*').replace(/\\\?/g, '.')}$`, 'i');
  const hits = [];
  function walk(dir, depth) {
    if (depth > 8 || hits.length >= 120) return;
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (hits.length >= 120) break;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name), rel = path.relative(root, full).replace(/\\/g, '/');
      if (e.isDirectory()) walk(full, depth + 1);
      else if (rx.test(rel) || rx.test(e.name)) hits.push(rel);
    }
  }
  walk(root, 0);
  return hits.length ? hits.join('\n') : `No files matched '${pattern}'.`;
}

function readFile(cwd, relPath, startLine, endLine) {
  const full = safePath(cwd, relPath);
  if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  if (fs.statSync(full).isDirectory()) return `Directory: ${relPath}. Use list_files.`;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const s = Math.max(1, Number(startLine) || 1), e = Math.min(lines.length, Number(endLine) || Math.min(lines.length, s + 299));
  return lines.slice(s - 1, e).map((l, idx) => `${s + idx}: ${l}`).join('\n');
}

function editFile(cwd, relPath, oldText, newText, replaceAll = false) {
  const full = safePath(cwd, relPath);
  if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  const content = fs.readFileSync(full, 'utf8');
  if (!oldText || !content.includes(oldText)) return `Exact old_text snippet not found in ${relPath}.`;
  fs.writeFileSync(full, replaceAll ? content.split(oldText).join(newText) : content.replace(oldText, newText), 'utf8');
  return `Edited ${relPath} (+${String(newText).split(/\r?\n/).length} -${String(oldText).split(/\r?\n/).length} lines).`;
}

function writeFile(cwd, relPath, content) {
  const full = safePath(cwd, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const text = String(content || '');
  fs.writeFileSync(full, text, 'utf8');
  return `Wrote ${relPath} (${Buffer.byteLength(text, 'utf8')} bytes).`;
}

function deleteFile(cwd, relPath) {
  const full = safePath(cwd, relPath);
  if (full === path.resolve(cwd)) throw new Error('Cannot delete workspace root.');
  if (!fs.existsSync(full)) return `Not found: ${relPath}`;
  if (fs.statSync(full).isDirectory()) fs.rmSync(full, { recursive: true, force: true }); else fs.unlinkSync(full);
  return `Deleted ${relPath}.`;
}

function searchFiles(cwd, query, isRegex = false) {
  const root = path.resolve(cwd), rawQ = String(query || '');
  if (!rawQ) return 'Empty query.';
  let rx = null;
  if (isRegex) { try { rx = new RegExp(rawQ, 'i'); } catch (e) { return `Invalid regex: ${e.message}`; } }
  const qLower = rawQ.toLowerCase(), hits = [];
  function walk(dir, depth) {
    if (depth > 7 || hits.length >= 60) return;
    let list; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of list) {
      if (hits.length >= 60) break;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else {
        try {
          if (fs.statSync(full).size > 768 * 1024) continue;
          const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (rx ? rx.test(lines[i]) : lines[i].toLowerCase().includes(qLower)) {
              hits.push(`${path.relative(root, full).replace(/\\/g, '/')}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
              if (hits.length >= 60) break;
            }
          }
        } catch (_) {}
      }
    }
  }
  walk(root, 0);
  return hits.length ? hits.join('\n') : `No matches for '${query}'.`;
}

function runShell(cwd, command, timeoutMs = 60000) {
  return new Promise((resolve) => {
    execFile('/bin/sh', ['-c', command], { cwd, timeout: Math.min(180000, Number(timeoutMs) || 60000), maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      let out = '';
      if (stdout?.trim()) out += stdout.trim() + '\n';
      if (stderr?.trim()) out += 'STDERR:\n' + stderr.trim() + '\n';
      if (err) out += `\n[${err.code !== undefined ? 'Exit code ' + err.code : err.message}]`;
      resolve((out.trim() || 'Exit code 0.').slice(0, 16000));
    });
  });
}

function stripHtml(html) {
  return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function webSearch(query) {
  const q = String(query || '').trim();
  if (!q) return 'Empty search query.';
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' }, signal: ctrl.signal });
    const html = await res.text(), out = [];
    const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;
    let m;
    while ((m = rx.exec(html)) && out.length < 7) {
      let href = m[1].replace(/&amp;/g, '&');
      const u = /[?&]uddg=([^&]+)/.exec(href); if (u) { try { href = decodeURIComponent(u[1]); } catch (_) {} }
      const title = stripHtml(m[2]), snip = stripHtml(m[3] || m[4] || '');
      if (title) out.push(`${out.length + 1}. ${title}\n   ${href}${snip ? `\n   ${snip}` : ''}`);
    }
    return out.length ? out.join('\n\n') : `No search results for "${q}".`;
  } catch (e) { return `Web search error: ${e.message}`; } finally { clearTimeout(timer); }
}

async function webFetch(urlStr) {
  const target = String(urlStr || '').trim();
  if (!/^https?:\/\//i.test(target)) return 'URL must start with http:// or https://';
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' }, signal: ctrl.signal });
    const ct = String(res.headers.get('content-type') || ''), raw = await res.text();
    return `HTTP ${res.status} (${target})\n\n${(ct.includes('html') ? stripHtml(raw) : raw).slice(0, 12000)}`;
  } catch (e) { return `Fetch error: ${e.message}`; } finally { clearTimeout(timer); }
}

const TOOL_SPECS = [
  { name: 'list_files', description: 'List directory tree inside working folder.', parameters: { type: 'object', properties: { subdir: { type: 'string' }, max_depth: { type: 'integer' } } } },
  { name: 'glob_files', description: 'Find files matching a wildcard pattern like "**/*.js" or "*.kt".', parameters: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'read_file', description: 'Read file content with line numbers.', parameters: { type: 'object', properties: { path: { type: 'string' }, start_line: { type: 'integer' }, end_line: { type: 'integer' } }, required: ['path'] } },
  { name: 'search_files', description: 'Search text or regex across project files.', parameters: { type: 'object', properties: { query: { type: 'string' }, is_regex: { type: 'boolean' } }, required: ['query'] } },
  { name: 'edit_file', description: 'Replace exact old_text snippet with new_text in a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, old_text: { type: 'string' }, new_text: { type: 'string' }, replace_all: { type: 'boolean' } }, required: ['path', 'old_text', 'new_text'] } },
  { name: 'write_file', description: 'Create or overwrite a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'delete_file', description: 'Delete a file or directory inside the workspace.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'git_status', description: 'Show git status.', parameters: { type: 'object', properties: {} } },
  { name: 'git_diff', description: 'Show git diff.', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'run_command', description: 'Run a shell command (build, test, git, scripts) in the working directory.', parameters: { type: 'object', properties: { command: { type: 'string' }, timeout_ms: { type: 'integer' } }, required: ['command'] } },
  { name: 'web_search', description: 'Search the internet for docs, errors, libraries, or solutions.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'web_fetch', description: 'Read a web page URL (documentation, GitHub, StackOverflow).', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'request_purchase_confirmation', description: 'MANDATORY before any purchase, order, subscription, or payment.', parameters: { type: 'object', properties: { item_summary: { type: 'string' }, amount: { type: 'string' } }, required: ['item_summary', 'amount'] } }
];

class DesktopNexCodeManager {
  constructor(userDataDir) {
    this.sessionsDir = path.join(userDataDir, 'nex-code-sessions');
    fs.mkdirSync(this.sessionsDir, { recursive: true });
    this.activeSessionId = null;
    this.autoApprove = true;
    this.activeAbort = null;
    const all = this.listSessions();
    this.activeSessionId = all.length ? all[0].id : this.createSession(os.homedir()).id;
  }

  _file(id) { return path.join(this.sessionsDir, `${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}.json`); }

  listSessions() {
    fs.mkdirSync(this.sessionsDir, { recursive: true });
    const out = [];
    for (const f of fs.readdirSync(this.sessionsDir).filter(x => x.endsWith('.json'))) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, f), 'utf8'));
        if (d && d.id) out.push({ id: d.id, title: d.title || 'Nex Code', cwd: d.cwd || os.homedir(), updatedAt: d.updatedAt || 0, count: (d.uiLog || []).length });
      } catch (_) {}
    }
    return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  loadSession(id) {
    const fp = this._file(id);
    if (!fs.existsSync(fp)) return null;
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (_) { return null; }
  }

  saveSession(session) {
    if (!session || !session.id) return;
    session.updatedAt = Date.now();
    if (session.messages.length > 80) session.messages = session.messages.slice(-80);
    if (session.uiLog.length > 300) session.uiLog = session.uiLog.slice(-300);
    const fp = this._file(session.id);
    fs.writeFileSync(fp + '.tmp', JSON.stringify(session, null, 2), 'utf8');
    fs.renameSync(fp + '.tmp', fp);
  }

  createSession(cwd) {
    const folder = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
    for (const meta of this.listSessions()) {
      if (meta.cwd === folder && meta.count === 0) {
        const existing = this.loadSession(meta.id);
        if (existing && (!existing.messages || !existing.messages.length)) { this.activeSessionId = existing.id; return existing; }
      }
    }
    const now = Date.now();
    const s = { id: `nc_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`, title: `Nex Code · ${path.basename(folder) || 'workspace'}`, cwd: folder, createdAt: now, updatedAt: now, messages: [], uiLog: [], checkpoints: [] };
    this.saveSession(s);
    this.activeSessionId = s.id;
    return s;
  }

  deleteSession(id) {
    const fp = this._file(id);
    if (fs.existsSync(fp)) { try { fs.unlinkSync(fp); } catch (_) {} }
    const rem = this.listSessions();
    if (!rem.length) this.createSession(os.homedir());
    else if (this.activeSessionId === id) this.activeSessionId = rem[0].id;
  }

  setCwd(cwd) {
    const s = this.getActiveSession();
    if (cwd && fs.existsSync(cwd)) {
      s.cwd = cwd;
      if (!s.uiLog.length) s.title = `Nex Code · ${path.basename(cwd) || 'workspace'}`;
      this.saveSession(s);
    }
    return s;
  }

  getActiveSession() {
    let s = this.activeSessionId ? this.loadSession(this.activeSessionId) : null;
    return s || this.createSession(os.homedir());
  }

  snapshot() {
    const active = this.getActiveSession();
    const hasNexMd = Boolean(active?.cwd && fs.existsSync(path.join(active.cwd, 'NEX.md')));
    return { sessions: this.listSessions(), activeSession: active, hasNexMd, autoApprove: this.autoApprove, busy: Boolean(this.activeAbort) };
  }

  rollbackCheckpoint(checkpointId) {
    const s = this.getActiveSession();
    const cp = (s.checkpoints || []).find(c => c.id === checkpointId);
    if (!cp) return { ok: false, error: 'Checkpoint not found' };
    try {
      const full = safePath(s.cwd || os.homedir(), cp.relPath);
      if (cp.existed) { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, cp.beforeContent || '', 'utf8'); }
      else if (fs.existsSync(full)) fs.unlinkSync(full);
      cp.rolledBack = true;
      s.uiLog = s.uiLog || []; s.uiLog.push({ id: `rb_${Date.now()}`, kind: 'note', text: `↩ Откачена правка: ${cp.relPath}`, ts: Date.now() });
      this.saveSession(s);
      return { ok: true, snapshot: this.snapshot() };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  cancel() { if (this.activeAbort) { this.activeAbort.abort(); this.activeAbort = null; } }

  async sendTask({ prompt, store, target, effort, lang, safety, onUpdate, onSphere }) {
    if (this.activeAbort) return { ok: false, error: 'Nex Code is already running a task.' };
    const session = this.getActiveSession(), cwd = session.cwd || os.homedir(), cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) return { ok: false, error: 'Empty prompt.' };
    if (!session.messages.length) session.title = cleanPrompt.slice(0, 48);
    session.messages.push({ role: 'user', text: cleanPrompt });
    session.uiLog.push({ id: `u_${Date.now()}`, kind: 'user', text: cleanPrompt, ts: Date.now() });
    this.saveSession(session);
    if (onUpdate) onUpdate(this.snapshot());

    this.activeAbort = new AbortController();
    const signal = this.activeAbort.signal;
    const nexMd = loadNexMd(cwd);
    const sysPrompt = [
      `You are Nex Code, an autonomous agentic engineering shell working inside "${cwd}" on ${process.platform}.`,
      nexMd ? `Repository instructions (NEX.md):\n${nexMd}` : '',
      'You can independently explore directories, search files, google documentation/fixes (web_search, web_fetch), read/edit/write/delete files, check git status/diff, and run shell commands/builds/tests.',
      'Always verify your work and self-correct errors before concluding.',
      'SAFETY RULE: NEVER complete any purchase, order, subscription, or financial payment without calling request_purchase_confirmation first.',
      lang === 'en' ? 'Respond in English.' : 'Отвечай на русском языке, если пользователь пишет по-русски.'
    ].join('\n');

    let activeProvider = target.provider, activeModel = target.model;
    try {
      for (let step = 0; step < 22; step++) {
        if (signal.aborted) break;
        if (onSphere) onSphere('thinking', lang === 'en' ? `Nex Code step ${step + 1}…` : `Nex Code (шаг ${step + 1})…`);
        const allKeys = store.getAllApiKeys();
        const res = await llm.completeWithFailover({
          provider: activeProvider, model: activeModel, apiKey: allKeys[activeProvider] || target.apiKey,
          profileId: store.state.selectedProfileId || 'quark', apiKeys: allKeys, modelCatalog: store.state.modelCatalog,
          customBaseUrl: store.state.customBaseUrl || '', autoFailover: store.state.autoFailover !== false,
          systemPrompt: sysPrompt, messages: session.messages.slice(-36), tools: TOOL_SPECS, effort: effort || 'medium',
          webSearchEnabled: true, signal,
          onSwitch: ({ fromProvider, toProvider, toModel }) => {
            activeProvider = toProvider; activeModel = toModel;
            const note = lang === 'en' ? `⚡ ${fromProvider} limit reached → switched to ${toProvider} (${toModel})` : `⚡ Лимит ${fromProvider} исчерпан → переключено на ${toProvider} (${toModel})`;
            session.uiLog.push({ id: `sw_${Date.now()}`, kind: 'note', text: note, ts: Date.now() });
            this.saveSession(session); if (onUpdate) onUpdate(this.snapshot()); if (onSphere) onSphere('thinking', note);
          }
        });
        if (res.usedProvider) activeProvider = res.usedProvider;
        if (res.usedModel) activeModel = res.usedModel;

        if (!res.toolCalls || !res.toolCalls.length) {
          const reply = res.text || (lang === 'en' ? 'Done.' : 'Готово.');
          session.messages.push({ role: 'assistant', text: reply });
          session.uiLog.push({ id: `a_${Date.now()}`, kind: 'assistant', text: reply, ts: Date.now() });
          this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());
          return { ok: true, text: reply };
        }
        if (res.text) session.uiLog.push({ id: `n_${Date.now()}`, kind: 'note', text: res.text, ts: Date.now() });
        session.messages.push({ role: 'assistant', text: res.text || '', toolCalls: res.toolCalls, rawParts: res.rawParts || null });
        this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());

        for (const tc of res.toolCalls) {
          if (signal.aborted) break;
          const a = tc.arguments || {};
          const entry = { id: tc.id || `t_${Date.now()}`, kind: 'tool', tool: tc.name, args: a, output: '', status: 'running', ts: Date.now() };
          session.uiLog.push(entry); this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());
          let out = '';
          try {
            if (tc.name === 'list_files') { if (onSphere) onSphere('working', lang === 'en' ? 'Inspecting folder…' : 'Смотрю файлы…'); out = listFiles(cwd, a.subdir, a.max_depth); }
            else if (tc.name === 'glob_files') { if (onSphere) onSphere('working', `Glob ${a.pattern}…`); out = globFiles(cwd, a.pattern); }
            else if (tc.name === 'read_file') { if (onSphere) onSphere('working', `${lang === 'en' ? 'Reading' : 'Читаю'} ${a.path}…`); out = readFile(cwd, a.path, a.start_line, a.end_line); }
            else if (tc.name === 'search_files') { if (onSphere) onSphere('working', `${lang === 'en' ? 'Searching' : 'Ищу'} ${a.query}…`); out = searchFiles(cwd, a.query, a.is_regex); }
            else if (tc.name === 'git_status') { if (onSphere) onSphere('working', 'git status…'); out = await runShell(cwd, 'git status -sb', 15000); }
            else if (tc.name === 'git_diff') { if (onSphere) onSphere('working', 'git diff…'); out = await runShell(cwd, `git diff${a.path ? ` -- "${String(a.path).replace(/"/g, '\\"')}"` : ''}`, 15000); }
            else if (tc.name === 'web_search') { if (onSphere) onSphere('working', `${lang === 'en' ? 'Googling' : 'Ищу в сети'}: ${a.query}…`); out = await webSearch(a.query); }
            else if (tc.name === 'web_fetch') { if (onSphere) onSphere('working', lang === 'en' ? 'Reading webpage…' : 'Читаю страницу…'); out = await webFetch(a.url); }
            else if (tc.name === 'edit_file') {
              const ok = this.autoApprove ? true : await safety.requestConfirmation({ title: `Edit ${a.path}`, details: `Apply patch to ${a.path}`, isPurchase: false });
              if (ok) {
                const bef = captureBeforeState(cwd, a.path); out = editFile(cwd, a.path, a.old_text, a.new_text, a.replace_all); const aft = captureBeforeState(cwd, a.path);
                const cpId = `cp_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
                session.checkpoints = session.checkpoints || []; session.checkpoints.push({ id: cpId, relPath: a.path, existed: bef.existed, beforeContent: bef.content, ts: Date.now(), rolledBack: false });
                entry.checkpointId = cpId; entry.diffPath = a.path; entry.diffText = computeLineDiff(bef.content, aft.content);
              } else out = 'User declined edit.';
            }
            else if (tc.name === 'write_file') {
              const ok = this.autoApprove ? true : await safety.requestConfirmation({ title: `Write ${a.path}`, details: `Write ${String(a.content || '').length} bytes to ${a.path}`, isPurchase: false });
              if (ok) {
                const bef = captureBeforeState(cwd, a.path); out = writeFile(cwd, a.path, a.content);
                const cpId = `cp_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
                session.checkpoints = session.checkpoints || []; session.checkpoints.push({ id: cpId, relPath: a.path, existed: bef.existed, beforeContent: bef.content, ts: Date.now(), rolledBack: false });
                entry.checkpointId = cpId; entry.diffPath = a.path; entry.diffText = computeLineDiff(bef.content, String(a.content || ''));
              } else out = 'User declined write.';
            }
            else if (tc.name === 'delete_file') {
              const ok = this.autoApprove ? true : await safety.requestConfirmation({ title: `Delete ${a.path}`, details: `Delete ${a.path}`, isPurchase: false });
              if (ok) {
                const bef = captureBeforeState(cwd, a.path); out = deleteFile(cwd, a.path);
                if (bef.existed) {
                  const cpId = `cp_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
                  session.checkpoints = session.checkpoints || []; session.checkpoints.push({ id: cpId, relPath: a.path, existed: true, beforeContent: bef.content, ts: Date.now(), rolledBack: false });
                  entry.checkpointId = cpId; entry.diffPath = a.path; entry.diffText = computeLineDiff(bef.content, '');
                }
              } else out = 'User declined delete.';
            }
            else if (tc.name === 'run_command') {
              const isBuy = PURCHASE_REGEX.test(String(a.command || ''));
              const ok = (!isBuy && this.autoApprove) ? true : await safety.requestConfirmation({ title: isBuy ? 'Confirm payment command' : 'Run shell command', details: a.command, isPurchase: isBuy });
              if (ok) { if (onSphere) onSphere('working', lang === 'en' ? 'Running command…' : 'Выполняю команду…'); out = await runShell(cwd, a.command, a.timeout_ms); }
              else out = 'User declined command.';
            } else if (tc.name === 'request_purchase_confirmation') {
              const ok = await safety.requestConfirmation({ title: 'Confirm purchase', details: `${a.item_summary} (${a.amount})`, isPurchase: true });
              out = ok ? 'CONFIRMED by user.' : 'CANCELLED by user.';
            } else out = `Unknown tool: ${tc.name}`;
            entry.status = 'done';
          } catch (e) { out = `Error: ${e.message}`; entry.status = 'error'; }
          entry.output = String(out || '').slice(0, 6000);
          session.messages.push({ role: 'tool', text: String(out || ''), toolCallId: tc.id, toolName: tc.name });
          this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());
        }
      }
      const fin = lang === 'en' ? 'Stopped or reached 22 steps.' : 'Остановлено или достигнут лимит шагов (22).';
      session.uiLog.push({ id: `f_${Date.now()}`, kind: 'assistant', text: fin, ts: Date.now() });
      this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());
      return { ok: true, text: fin };
    } catch (err) {
      const msg = err?.name === 'AbortError' ? (lang === 'en' ? 'Stopped.' : 'Остановлено.') : `Error: ${err.message}`;
      session.uiLog.push({ id: `e_${Date.now()}`, kind: 'error', text: msg, ts: Date.now() });
      this.saveSession(session); if (onUpdate) onUpdate(this.snapshot());
      return { ok: false, error: msg };
    } finally {
      this.activeAbort = null;
      if (onSphere) onSphere('idle', undefined, '');
      if (onUpdate) onUpdate(this.snapshot());
    }
  }
}

module.exports = { DesktopNexCodeManager };
