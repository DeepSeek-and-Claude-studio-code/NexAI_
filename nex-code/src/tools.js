'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PURCHASE_REGEX = /(купить|оплат|заказ|оформит|корзин|подпис|перевест|списат|карт[ауы]|руб|₽|€|\$|buy|pay|checkout|place order|purchase|subscribe|confirm payment|transfer|billing|stripe|paypal)/i;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.gradle', '.next', '__pycache__', '.venv', 'venv', 'target']);

function looksLikePurchase(s) { return PURCHASE_REGEX.test(String(s || '')); }
function safePath(cwd, rel) { const root = path.resolve(cwd), full = path.resolve(root, rel || '.'); if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Path '${rel}' escapes working directory.`); return full; }

function listFiles(cwd, subdir = '.', maxDepth = 2) {
  const start = safePath(cwd, subdir); if (!fs.existsSync(start)) return `Directory not found: ${subdir}`;
  const limit = Math.max(1, Math.min(4, Number(maxDepth) || 2)), out = [];
  function walk(dir, depth, prefix) {
    if (out.length >= 200) return;
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries) { if (out.length >= 200) break; if (SKIP_DIRS.has(e.name)) continue; if (e.isDirectory()) { out.push(`${prefix}${e.name}/`); if (depth < limit) walk(path.join(dir, e.name), depth + 1, prefix + '  '); } else out.push(`${prefix}${e.name}`); }
  }
  walk(start, 1, ''); return out.length ? out.join('\n') : '(empty)';
}

function globFiles(cwd, pattern) {
  const root = path.resolve(cwd), esc = String(pattern || '**/*').replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`^${esc.replace(/\\\*\\\*\//g, '(?:.*/)?').replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*').replace(/\\\?/g, '.')}$`, 'i'), hits = [];
  function walk(dir, depth) {
    if (depth > 8 || hits.length >= 120) return;
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) { if (hits.length >= 120) break; if (SKIP_DIRS.has(e.name)) continue; const full = path.join(dir, e.name), rel = path.relative(root, full).replace(/\\/g, '/'); if (e.isDirectory()) walk(full, depth + 1); else if (rx.test(rel) || rx.test(e.name)) hits.push(rel); }
  }
  walk(root, 0); return hits.length ? hits.join('\n') : `No files matched '${pattern}'.`;
}

function readFile(cwd, relPath, startLine, endLine) {
  const full = safePath(cwd, relPath); if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  if (fs.statSync(full).isDirectory()) return `Path is directory: ${relPath}`;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/), s = Math.max(1, Number(startLine) || 1), e = Math.min(lines.length, Number(endLine) || Math.min(lines.length, s + 299));
  return lines.slice(s - 1, e).map((l, idx) => `${s + idx}: ${l}`).join('\n');
}

function editFile(cwd, relPath, oldText, newText, replaceAll = false) {
  const full = safePath(cwd, relPath); if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  const content = fs.readFileSync(full, 'utf8'); if (!oldText || !content.includes(oldText)) return `Exact old_text snippet not found in ${relPath}.`;
  fs.writeFileSync(full, replaceAll ? content.split(oldText).join(newText) : content.replace(oldText, newText), 'utf8');
  return `Edited ${relPath} (+${String(newText).split(/\r?\n/).length} -${String(oldText).split(/\r?\n/).length} lines).`;
}

function writeFile(cwd, relPath, content) { const full = safePath(cwd, relPath); fs.mkdirSync(path.dirname(full), { recursive: true }); const t = String(content || ''); fs.writeFileSync(full, t, 'utf8'); return `Wrote ${relPath} (${Buffer.byteLength(t, 'utf8')} bytes).`; }
function deleteFile(cwd, relPath) { const full = safePath(cwd, relPath); if (full === path.resolve(cwd)) throw new Error('Cannot delete workspace root.'); if (!fs.existsSync(full)) return `Path not found: ${relPath}`; if (fs.statSync(full).isDirectory()) fs.rmSync(full, { recursive: true, force: true }); else fs.unlinkSync(full); return `Deleted ${relPath}.`; }

function searchFiles(cwd, query, isRegex = false) {
  const root = path.resolve(cwd), rawQ = String(query || ''); if (!rawQ) return 'Empty search query.';
  let rx = null; if (isRegex) { try { rx = new RegExp(rawQ, 'i'); } catch (e) { return `Invalid regex: ${e.message}`; } }
  const qLower = rawQ.toLowerCase(), hits = [];
  function walk(dir, depth) {
    if (depth > 7 || hits.length >= 60) return;
    let list; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of list) { if (hits.length >= 60) break; if (SKIP_DIRS.has(e.name)) continue; const full = path.join(dir, e.name); if (e.isDirectory()) walk(full, depth + 1); else { try { if (fs.statSync(full).size > 768 * 1024) continue; const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/); for (let i = 0; i < lines.length; i++) if (rx ? rx.test(lines[i]) : lines[i].toLowerCase().includes(qLower)) { hits.push(`${path.relative(root, full).replace(/\\/g, '/')}:${i + 1}: ${lines[i].trim().slice(0, 160)}`); if (hits.length >= 60) break; } } catch (_) {} } }
  }
  walk(root, 0); return hits.length ? hits.join('\n') : `No matches for '${query}'.`;
}

function runShell(cwd, command, timeoutMs = 60000) {
  return new Promise((resolve) => {
    execFile('/bin/sh', ['-c', command], { cwd, timeout: Math.min(180000, Number(timeoutMs) || 60000), maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      let out = ''; if (stdout?.trim()) out += stdout.trim() + '\n'; if (stderr?.trim()) out += 'STDERR:\n' + stderr.trim() + '\n'; if (err) out += `\n[${err.code !== undefined ? 'Exit code ' + err.code : err.message}]`;
      resolve((out.trim() || 'Exit code 0.').slice(0, 16000));
    });
  });
}

function stripHtml(html) { return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

async function webSearch(query) {
  const q = String(query || '').trim(); if (!q) return 'Empty web search query.';
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' }, signal: ctrl.signal });
    const html = await res.text(), out = [], rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;
    let m; while ((m = rx.exec(html)) && out.length < 7) { let href = m[1].replace(/&amp;/g, '&'); const u = /[?&]uddg=([^&]+)/.exec(href); if (u) { try { href = decodeURIComponent(u[1]); } catch (_) {} } const title = stripHtml(m[2]), snip = stripHtml(m[3] || m[4] || ''); if (title) out.push(`${out.length + 1}. ${title}\n   ${href}${snip ? `\n   ${snip}` : ''}`); }
    return out.length ? out.join('\n\n') : `No results for "${q}".`;
  } catch (e) { return `Web search error: ${e.message}`; } finally { clearTimeout(t); }
}

async function webFetch(urlStr) {
  const target = String(urlStr || '').trim(); if (!/^https?:\/\//i.test(target)) return 'URL must start with http:// or https://';
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
  try { const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal }); const ct = String(res.headers.get('content-type') || ''), raw = await res.text(); return `HTTP ${res.status} (${target})\n\n${(ct.includes('html') ? stripHtml(raw) : raw).slice(0, 12000)}`; }
  catch (e) { return `Fetch error: ${e.message}`; } finally { clearTimeout(t); }
}

const TOOL_SPECS = [
  { name: 'list_files', description: 'List directory tree.', parameters: { type: 'object', properties: { subdir: { type: 'string' }, max_depth: { type: 'integer' } } } },
  { name: 'glob_files', description: 'Find files by wildcard pattern.', parameters: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'read_file', description: 'Read file with line numbers.', parameters: { type: 'object', properties: { path: { type: 'string' }, start_line: { type: 'integer' }, end_line: { type: 'integer' } }, required: ['path'] } },
  { name: 'search_files', description: 'Search text or regex in files.', parameters: { type: 'object', properties: { query: { type: 'string' }, is_regex: { type: 'boolean' } }, required: ['query'] } },
  { name: 'edit_file', description: 'Replace old_text with new_text.', parameters: { type: 'object', properties: { path: { type: 'string' }, old_text: { type: 'string' }, new_text: { type: 'string' }, replace_all: { type: 'boolean' } }, required: ['path', 'old_text', 'new_text'] } },
  { name: 'write_file', description: 'Create or overwrite a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'delete_file', description: 'Delete a file or directory.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'git_status', description: 'Check git status.', parameters: { type: 'object', properties: {} } },
  { name: 'git_diff', description: 'Check git diff.', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'run_command', description: 'Run a shell command in cwd.', parameters: { type: 'object', properties: { command: { type: 'string' }, timeout_ms: { type: 'integer' } }, required: ['command'] } },
  { name: 'web_search', description: 'Search the internet for docs, errors, or libraries.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'web_fetch', description: 'Read a web page URL.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'request_purchase_confirmation', description: 'MANDATORY before any purchase or payment.', parameters: { type: 'object', properties: { item_summary: { type: 'string' }, amount: { type: 'string' } }, required: ['item_summary', 'amount'] } }
];

module.exports = { looksLikePurchase, listFiles, globFiles, readFile, editFile, writeFile, deleteFile, searchFiles, runShell, webSearch, webFetch, TOOL_SPECS };
