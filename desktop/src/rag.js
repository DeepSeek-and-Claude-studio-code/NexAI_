'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_EXT = new Set([
  '.md', '.txt', '.js', '.ts', '.tsx', '.jsx', '.kt', '.java', '.py', '.json',
  '.html', '.css', '.csv', '.yaml', '.yml', '.xml', '.toml', '.sh', '.sql', '.rs', '.go', '.c', '.cpp', '.h'
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.gradle', '.idea', '__pycache__', '.venv', 'venv', 'target']);
const indexCache = new Map();

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function chunkText(relPath, content, chunkSize = 900, overlap = 140) {
  const clean = String(content || '').trim();
  if (!clean) return [];
  const chunks = [];
  let pos = 0, idx = 0;
  while (pos < clean.length && chunks.length < 40) {
    const slice = clean.slice(pos, pos + chunkSize).trim();
    if (slice.length >= 25) {
      const tokens = tokenize(relPath + ' ' + slice);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      chunks.push({ id: `${relPath}#${idx}`, path: relPath, text: slice, len: tokens.length, tf });
      idx++;
    }
    if (pos + chunkSize >= clean.length) break;
    pos += Math.max(200, chunkSize - overlap);
  }
  return chunks;
}

function indexFolder(folderPath, force = false) {
  if (!folderPath || !fs.existsSync(folderPath)) return { files: 0, chunks: [], avgLen: 1, df: new Map(), indexedAt: Date.now() };
  const cached = indexCache.get(folderPath);
  if (!force && cached && (Date.now() - cached.indexedAt < 5 * 60 * 1000)) return cached;

  const chunks = [];
  let files = 0;
  function walk(dir, depth) {
    if (depth > 5 || files >= 180) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const ent of entries) {
      if (files >= 180) break;
      if (ent.name.startsWith('.') && ent.name !== '.env.example') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!SKIP_DIRS.has(ent.name)) walk(full, depth + 1);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (!ALLOWED_EXT.has(ext) && ent.name !== 'NEX.md' && ent.name !== 'README') continue;
        try {
          const st = fs.statSync(full);
          if (st.size === 0 || st.size > 256 * 1024) continue;
          const raw = fs.readFileSync(full, 'utf8');
          if (raw.includes('\u0000')) continue;
          const rel = path.relative(folderPath, full);
          for (const ch of chunkText(rel, raw)) chunks.push(ch);
          files++;
        } catch (_) {}
      }
    }
  }
  walk(folderPath, 0);
  const df = new Map();
  let totalLen = 0;
  for (const ch of chunks) {
    totalLen += ch.len;
    for (const term of ch.tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const built = { files, chunks, avgLen: chunks.length ? totalLen / chunks.length : 1, df, indexedAt: Date.now() };
  indexCache.set(folderPath, built);
  return built;
}

function searchFolder(folderPath, query, topK = 4) {
  const qTokens = Array.from(new Set(tokenize(query)));
  if (!qTokens.length || !folderPath) return [];
  const idx = indexFolder(folderPath, false);
  const N = idx.chunks.length;
  if (!N) return [];
  const k1 = 1.5, b = 0.75;
  const scored = [];
  for (const ch of idx.chunks) {
    let score = 0;
    for (const term of qTokens) {
      const freq = ch.tf.get(term) || 0;
      if (!freq) continue;
      const docFreq = idx.df.get(term) || 1;
      const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      const denom = freq + k1 * (1 - b + b * (ch.len / Math.max(1, idx.avgLen)));
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    if (score > 0.05) scored.push({ path: ch.path, text: ch.text, score });
  }
  scored.sort((a, b2) => b2.score - a.score);
  return scored.slice(0, topK);
}

function getIndexStats(folderPath) {
  if (!folderPath) return { files: 0, chunks: 0, indexedAt: 0 };
  const idx = indexCache.get(folderPath);
  return idx ? { files: idx.files, chunks: idx.chunks.length, indexedAt: idx.indexedAt } : { files: 0, chunks: 0, indexedAt: 0 };
}

module.exports = { indexFolder, searchFolder, getIndexStats };
