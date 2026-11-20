'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PURCHASE_REGEX = /(купить|оплат|заказ|оформит|корзин|подпис|перевест|списат|карт[ауы]|руб|₽|€|\$|buy|pay|checkout|place order|purchase|subscribe|confirm payment|transfer|billing|stripe|paypal)/i;

function looksLikePurchase(s) {
  return PURCHASE_REGEX.test(String(s || ''));
}

function safePath(cwd, rel) {
  const root = path.resolve(cwd);
  const full = path.resolve(root, rel || '.');
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Path '${rel}' escapes working directory.`);
  }
  return full;
}

function listFiles(cwd, subdir = '.') {
  const dir = safePath(cwd, subdir);
  if (!fs.existsSync(dir)) return `Directory not found: ${subdir}`;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 150);
  return entries.map(e => (e.isDirectory() ? `${e.name}/` : e.name)).join('\n') || '(empty)';
}

function readFile(cwd, relPath, startLine, endLine) {
  const full = safePath(cwd, relPath);
  if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const s = Math.max(1, Number(startLine) || 1);
  const e = Math.min(lines.length, Number(endLine) || Math.min(lines.length, s + 299));
  return lines.slice(s - 1, e).map((l, idx) => `${s + idx}: ${l}`).join('\n');
}

function editFile(cwd, relPath, oldText, newText) {
  const full = safePath(cwd, relPath);
  if (!fs.existsSync(full)) return `File not found: ${relPath}`;
  const content = fs.readFileSync(full, 'utf8');
  if (!content.includes(oldText)) return `Exact old_text snippet not found in ${relPath}.`;
  const updated = content.replace(oldText, newText);
  fs.writeFileSync(full, updated, 'utf8');
  const added = String(newText).split(/\r?\n/).length;
  const removed = String(oldText).split(/\r?\n/).length;
  return `Edited ${relPath} (+${added} -${removed} lines).`;
}

function writeFile(cwd, relPath, content) {
  const full = safePath(cwd, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, String(content || ''), 'utf8');
  return `Wrote ${relPath} (${String(content || '').length} bytes).`;
}

function searchFiles(cwd, query) {
  const root = path.resolve(cwd);
  const q = String(query || '').toLowerCase();
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.gradle']);
  const hits = [];
  function walk(dir, depth) {
    if (depth > 6 || hits.length >= 50) return;
    let list;
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of list) {
      if (hits.length >= 50) break;
      if (skip.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else {
        try {
          if (fs.statSync(full).size > 512 * 1024) continue;
          const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(q)) {
              hits.push(`${path.relative(root, full)}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
              if (hits.length >= 50) break;
            }
          }
        } catch (_) {}
      }
    }
  }
  walk(root, 0);
  return hits.length ? hits.join('\n') : `No matches for '${query}'.`;
}

function runShell(cwd, command) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const bin = isWin ? 'powershell.exe' : '/bin/sh';
    const args = isWin ? ['-NoProfile', '-NonInteractive', '-Command', command] : ['-c', command];
    execFile(bin, args, { cwd, timeout: 45000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      let out = '';
      if (stdout?.trim()) out += stdout.trim() + '\n';
      if (stderr?.trim()) out += 'STDERR:\n' + stderr.trim() + '\n';
      if (err && !out) out = `Error: ${err.message}`;
      resolve((out || 'Exit code 0.').slice(0, 14000));
    });
  });
}

const TOOL_SPECS = [
  { name: 'list_files', description: 'List files in a directory inside cwd.', parameters: { type: 'object', properties: { subdir: { type: 'string' } } } },
  {
    name: 'read_file',
    description: 'Read a file with line numbers.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, start_line: { type: 'integer' }, end_line: { type: 'integer' } },
      required: ['path']
    }
  },
  {
    name: 'edit_file',
    description: 'Replace an exact old_text snippet with new_text in a file.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, old_text: { type: 'string' }, new_text: { type: 'string' } },
      required: ['path', 'old_text', 'new_text']
    }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file in the project.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content']
    }
  },
  {
    name: 'search_files',
    description: 'Search text across project files.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the working directory.',
    parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
  },
  {
    name: 'request_purchase_confirmation',
    description: 'MANDATORY before any purchase, order, subscription, or payment.',
    parameters: {
      type: 'object',
      properties: { item_summary: { type: 'string' }, amount: { type: 'string' } },
      required: ['item_summary', 'amount']
    }
  }
];

module.exports = { looksLikePurchase, listFiles, readFile, editFile, writeFile, searchFiles, runShell, TOOL_SPECS };
