'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');

function resolveSafePath(folderPath, relativeName) {
  if (!folderPath) throw new Error('No project working folder selected.');
  const root = path.resolve(folderPath);
  const target = path.resolve(root, relativeName || '.');
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Access denied: path escapes project working folder.');
  }
  return target;
}

function listProjectFiles(folderPath, subdir = '.') {
  const dir = resolveSafePath(folderPath, subdir);
  if (!fs.existsSync(dir)) return `Directory not found: ${subdir}`;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 120);
  if (!entries.length) return 'Directory is empty.';
  return entries.map(e => {
    if (e.isDirectory()) return `- ${e.name}/ [DIR]`;
    const st = fs.statSync(path.join(dir, e.name));
    return `- ${e.name} (${st.size} B)`;
  }).join('\n');
}

function readProjectFile(folderPath, fileName) {
  const full = resolveSafePath(folderPath, fileName);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    return `File not found: ${fileName}`;
  }
  const text = fs.readFileSync(full, 'utf8');
  return text.length > 24000 ? text.slice(0, 24000) + '\n... (truncated)' : text;
}

function writeProjectFile(folderPath, fileName, content) {
  const full = resolveSafePath(folderPath, fileName);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, String(content || ''), 'utf8');
  return `Saved '${fileName}' (${String(content || '').length} chars).`;
}

function searchProjectFiles(folderPath, query) {
  const root = resolveSafePath(folderPath, '.');
  const q = String(query || '').toLowerCase();
  if (!q) return 'Empty search query.';
  const matches = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.gradle', '__pycache__']);

  function walk(dir, depth) {
    if (depth > 5 || matches.length >= 40) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (matches.length >= 40) break;
      if (skip.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else {
        try {
          const st = fs.statSync(full);
          if (st.size > 512 * 1024) continue;
          const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(q)) {
              matches.push(`${path.relative(root, full)}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
              if (matches.length >= 40) break;
            }
          }
        } catch (_) {}
      }
    }
  }
  walk(root, 0);
  return matches.length ? matches.join('\n') : `No matches for '${query}'.`;
}

function runShellCommand(command, cwd) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'powershell.exe' : '/bin/sh';
    const args = isWin ? ['-NoProfile', '-NonInteractive', '-Command', command] : ['-c', command];
    const workDir = cwd && fs.existsSync(cwd) ? cwd : os.homedir();

    execFile(shell, args, { cwd: workDir, timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || '').trim();
      const er = (stderr || '').trim();
      let combined = '';
      if (out) combined += `STDOUT:\n${out}\n`;
      if (er) combined += `STDERR:\n${er}\n`;
      if (err && !combined) combined = `Error: ${err.message}`;
      if (!combined) combined = 'Command completed with exit code 0.';
      resolve(combined.slice(0, 12000));
    });
  });
}

async function openAppOrUrl(target, electronShell) {
  const clean = String(target || '').trim();
  if (!clean) return 'Empty target.';
  if (/^https?:\/\//i.test(clean)) {
    await electronShell.openExternal(clean);
    return `Opened URL: ${clean}`;
  }
  if (fs.existsSync(clean)) {
    const err = await electronShell.openPath(clean);
    return err ? `Failed to open path: ${err}` : `Opened: ${clean}`;
  }
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const p = spawn('cmd.exe', ['/c', 'start', '', clean], { detached: true, stdio: 'ignore' });
      p.on('error', e => resolve(`Failed to launch '${clean}': ${e.message}`));
      p.unref();
      resolve(`Launched '${clean}'.`);
    } else {
      const p = spawn(clean, [], { detached: true, stdio: 'ignore' });
      p.on('error', () => {
        const x = spawn('xdg-open', [clean], { detached: true, stdio: 'ignore' });
        x.on('error', e => resolve(`Failed to launch '${clean}': ${e.message}`));
        x.unref();
        resolve(`Opened '${clean}' via xdg-open.`);
      });
      p.unref();
      resolve(`Launched '${clean}'.`);
    }
  });
}

function getSystemInfo(folderPath) {
  return [
    `OS: ${os.type()} ${os.release()} (${os.arch()})`,
    `Platform: ${process.platform}`,
    `CPUs: ${os.cpus().length}`,
    `Memory: ${Math.round(os.freemem() / 1048576)} MB free / ${Math.round(os.totalmem() / 1048576)} MB total`,
    `Home: ${os.homedir()}`,
    `Active Project Folder: ${folderPath || '(none)'}`,
    `Local Time: ${new Date().toLocaleString()}`
  ].join('\n');
}

async function webSearch(query) {
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) NexDesktop/1.0' }
  });
  if (!res.ok) return `Web search HTTP ${res.status}`;
  const html = await res.text();
  const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
  const titles = [...html.matchAll(/class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi)].map(m => strip(m[1])).filter(Boolean).slice(0, 6);
  const snippets = [...html.matchAll(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi)].map(m => strip(m[1])).filter(Boolean).slice(0, 6);
  if (!titles.length && !snippets.length) return `No search results extracted for '${query}'.`;
  const lines = [`Web search results for: ${query}`];
  const count = Math.max(titles.length, snippets.length);
  for (let i = 0; i < count; i++) {
    lines.push(`${i + 1}. ${titles[i] || 'Result'}`);
    if (snippets[i]) lines.push(`   ${snippets[i]}`);
  }
  return lines.join('\n');
}

module.exports = {
  listProjectFiles,
  readProjectFile,
  writeProjectFile,
  searchProjectFiles,
  runShellCommand,
  openAppOrUrl,
  getSystemInfo,
  webSearch
};
