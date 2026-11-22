'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const drive = require('./drive');

const VAULT_NAME = 'nex_state_vault.nexvault';

function artifactRemoteMeta(art) {
  const map = { presentation: ['json', 'application/json'], table: ['csv', 'text/csv'], html: ['html', 'text/html'], document: ['md', 'text/markdown'] };
  const [ext, mime] = map[art.type] || ['md', 'text/markdown'];
  const cleanTitle = String(art.title || 'artifact').replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]+/g, '_').trim().slice(0, 48) || 'artifact';
  return { remoteName: `${cleanTitle}_${String(art.id || '0').slice(0, 8)}.${ext}`, mime };
}

function listLocalFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => !f.endsWith('.dl') && !f.endsWith('.tmp'))
    .map(f => path.join(dir, f)).filter(p => { try { return fs.statSync(p).isFile(); } catch (_) { return false; } });
}

function getStorageStats(store, nexCodeSessionsDir) {
  const mediaFiles = listLocalFiles(store.mediaDir);
  const attFiles = listLocalFiles(store.attachmentsDir);
  const ncFiles = listLocalFiles(nexCodeSessionsDir);
  let mediaBytes = 0, photoCount = 0, videoCount = 0, attBytes = 0, artBytes = 0, ncBytes = 0;
  for (const fp of mediaFiles) {
    mediaBytes += fs.statSync(fp).size;
    if (/\.(mp4|webm|mov|mkv)$/i.test(fp)) videoCount++; else photoCount++;
  }
  for (const fp of attFiles) attBytes += fs.statSync(fp).size;
  const arts = store.state.artifacts || [];
  for (const a of arts) artBytes += Buffer.byteLength(String(a.content || ''), 'utf8');
  for (const fp of ncFiles) ncBytes += fs.statSync(fp).size;
  return {
    photoCount, videoCount, mediaBytes,
    artifactCount: arts.length, artifactBytes: artBytes,
    attachmentCount: attFiles.length, attachmentBytes: attBytes,
    chatCount: (store.state.chats || []).length,
    nexCodeCount: ncFiles.length, nexCodeBytes: ncBytes,
    keysCount: Object.values(store.getAllApiKeys()).filter(Boolean).length,
    totalBytes: mediaBytes + attBytes + artBytes + ncBytes
  };
}

function webdavAuthHeader(cfg) {
  return 'Basic ' + Buffer.from(`${cfg.username || ''}:${cfg.password || ''}`, 'utf8').toString('base64');
}

function webdavUrl(baseUrl, ...segments) {
  const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
  const joined = segments.filter(Boolean).map(s => String(s).split('/').filter(Boolean).map(encodeURIComponent).join('/')).join('/');
  return joined ? `${cleanBase}/${joined}` : cleanBase;
}

async function webdavEnsureDir(cfg, relDir) {
  let cur = '';
  for (const p of String(relDir || '').split('/').filter(Boolean)) {
    cur = cur ? `${cur}/${p}` : p;
    const res = await fetch(webdavUrl(cfg.url, cur) + '/', { method: 'MKCOL', headers: { Authorization: webdavAuthHeader(cfg) } });
    if (![200, 201, 204, 301, 405, 409].includes(res.status)) throw new Error(`WebDAV MKCOL ${cur} HTTP ${res.status}`);
  }
}

async function webdavListDir(cfg, relDir) {
  const res = await fetch(webdavUrl(cfg.url, relDir) + '/', {
    method: 'PROPFIND',
    headers: { Authorization: webdavAuthHeader(cfg), Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
    body: '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>'
  });
  if (res.status === 404) return [];
  if (!res.ok && res.status !== 207) throw new Error(`WebDAV PROPFIND HTTP ${res.status}`);
  const xml = await res.text();
  const entries = [];
  const respRx = /<(?:[a-zA-Z0-9_-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi;
  let m, first = true;
  while ((m = respRx.exec(xml))) {
    if (first) { first = false; continue; }
    const block = m[1];
    if (/<(?:[a-zA-Z0-9_-]+:)?collection\s*\/?>/i.test(block)) continue;
    const hrefM = /<(?:[a-zA-Z0-9_-]+:)?href\b[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?href>/i.exec(block);
    const lenM = /<(?:[a-zA-Z0-9_-]+:)?getcontentlength\b[^>]*>(\d+)<\/(?:[a-zA-Z0-9_-]+:)?getcontentlength>/i.exec(block);
    if (!hrefM) continue;
    const seg = hrefM[1].replace(/\/+$/, '').split('/').pop();
    if (!seg) continue;
    let name = seg; try { name = decodeURIComponent(seg); } catch (_) {}
    entries.push({ name, size: lenM ? Number(lenM[1]) : 0 });
  }
  return entries;
}

async function webdavPutBuffer(cfg, relPath, buf, mimeType) {
  const res = await fetch(webdavUrl(cfg.url, relPath), { method: 'PUT', headers: { Authorization: webdavAuthHeader(cfg), 'Content-Type': mimeType || 'application/octet-stream' }, body: buf });
  if (!res.ok) throw new Error(`WebDAV PUT ${relPath} HTTP ${res.status}`);
}

async function webdavGetBuffer(cfg, relPath) {
  const res = await fetch(webdavUrl(cfg.url, relPath), { method: 'GET', headers: { Authorization: webdavAuthHeader(cfg) } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`WebDAV GET ${relPath} HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function sha256Hex(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function hmacSha256(key, msg) { return crypto.createHmac('sha256', key).update(msg).digest(); }
function encodeS3Key(key) { return String(key || '').split('/').map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/'); }

function signS3Request({ method, endpoint, region, bucket, key, query = {}, headers = {}, payload, accessKeyId, secretAccessKey }) {
  const u = new URL(String(endpoint || '').replace(/\/+$/, ''));
  const pathParts = [u.pathname.replace(/\/+$/, ''), encodeURIComponent(bucket)];
  if (key) pathParts.push(encodeS3Key(key));
  const canonicalUri = pathParts.join('/').replace(/\/{2,}/g, '/') || '/';
  const canonicalQuery = Object.keys(query).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join('&');
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const reg = region || 'us-east-1';
  const payloadHash = sha256Hex(payload || '');
  const normHeaders = { host: u.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  for (const [k, v] of Object.entries(headers)) if (v !== undefined && v !== null) normHeaders[k.toLowerCase()] = String(v).trim();
  const signedHeaderNames = Object.keys(normHeaders).sort();
  const canonicalHeaders = signedHeaderNames.map(k => `${k}:${normHeaders[k]}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${reg}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const kSigning = hmacSha256(hmacSha256(hmacSha256(hmacSha256(`AWS4${secretAccessKey}`, dateStamp), reg), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const fullUrl = `${u.protocol}//${u.host}${canonicalUri}${canonicalQuery ? '?' + canonicalQuery : ''}`;
  const outHeaders = { ...normHeaders, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
  delete outHeaders.host;
  return { url: fullUrl, headers: outHeaders };
}

async function s3ListPrefix(cfg, prefix) {
  const req = signS3Request({ method: 'GET', endpoint: cfg.endpoint, region: cfg.region || 'auto', bucket: cfg.bucket, key: '', query: { 'list-type': '2', prefix }, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey });
  const res = await fetch(req.url, { method: 'GET', headers: req.headers });
  const xml = await res.text();
  if (!res.ok) throw new Error(`S3 List HTTP ${res.status}: ${xml.slice(0, 180)}`);
  const items = [];
  const rx = /<Contents>([\s\S]*?)<\/Contents>/gi;
  let m;
  while ((m = rx.exec(xml))) {
    const keyM = /<Key>([^<]+)<\/Key>/i.exec(m[1]);
    const sizeM = /<Size>(\d+)<\/Size>/i.exec(m[1]);
    if (!keyM) continue;
    const fullKey = keyM[1].replace(/&amp;/g, '&');
    const name = fullKey.slice(prefix.length);
    if (name && !name.includes('/')) items.push({ key: fullKey, name, size: sizeM ? Number(sizeM[1]) : 0 });
  }
  return items;
}

async function s3PutBuffer(cfg, key, buf, mimeType) {
  const req = signS3Request({ method: 'PUT', endpoint: cfg.endpoint, region: cfg.region || 'auto', bucket: cfg.bucket, key, headers: { 'content-type': mimeType || 'application/octet-stream' }, payload: buf, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey });
  const res = await fetch(req.url, { method: 'PUT', headers: req.headers, body: buf });
  if (!res.ok) throw new Error(`S3 PUT ${key} HTTP ${res.status}`);
}

async function s3GetBuffer(cfg, key) {
  const req = signS3Request({ method: 'GET', endpoint: cfg.endpoint, region: cfg.region || 'auto', bucket: cfg.bucket, key, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey });
  const res = await fetch(req.url, { method: 'GET', headers: req.headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`S3 GET ${key} HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function getActiveConfig(store) {
  const raw = store.state.storageConfig || {};
  return {
    backend: raw.backend || 'webdav',
    autoSync: store.state.driveAutoSync !== false,
    webdav: { url: raw.webdav?.url || '', username: raw.webdav?.username || '', password: store.decrypt(raw.webdav?.passwordEnc || ''), rootFolder: raw.webdav?.rootFolder || 'Nex' },
    s3: { endpoint: raw.s3?.endpoint || '', region: raw.s3?.region || 'auto', bucket: raw.s3?.bucket || '', accessKeyId: raw.s3?.accessKeyId || '', secretAccessKey: store.decrypt(raw.s3?.secretAccessKeyEnc || ''), prefix: raw.s3?.prefix || 'Nex' },
    localFolder: raw.localFolder || ''
  };
}

function isBackendConfigured(store) {
  const cfg = getActiveConfig(store);
  if (cfg.backend === 'webdav') return Boolean(cfg.webdav.url && cfg.webdav.username && cfg.webdav.password);
  if (cfg.backend === 's3') return Boolean(cfg.s3.endpoint && cfg.s3.bucket && cfg.s3.accessKeyId && cfg.s3.secretAccessKey);
  if (cfg.backend === 'local_folder') return Boolean(cfg.localFolder && fs.existsSync(cfg.localFolder));
  return Boolean(store.decrypt(store.state.googleTokensEnc?.access) || store.decrypt(store.state.googleTokensEnc?.refresh));
}

async function testConnection(store, authModule) {
  const cfg = getActiveConfig(store);
  if (cfg.backend === 'webdav') {
    if (!cfg.webdav.url || !cfg.webdav.username || !cfg.webdav.password) throw new Error('Fill in WebDAV URL, username, and app password.');
    const root = cfg.webdav.rootFolder || 'Nex';
    for (const sub of ['', '/Vault', '/Media', '/Artifacts', '/Attachments']) await webdavEnsureDir(cfg.webdav, `${root}${sub}`);
    return `WebDAV connected (${cfg.webdav.url}/${root})`;
  }
  if (cfg.backend === 's3') {
    if (!cfg.s3.endpoint || !cfg.s3.bucket || !cfg.s3.accessKeyId || !cfg.s3.secretAccessKey) throw new Error('Fill in S3 Endpoint, Bucket, Access Key ID, and Secret Access Key.');
    await s3ListPrefix(cfg.s3, `${cfg.s3.prefix || 'Nex'}/`);
    return `S3 connected (${cfg.s3.bucket})`;
  }
  if (cfg.backend === 'local_folder') {
    if (!cfg.localFolder) throw new Error('Choose a local sync folder first.');
    fs.mkdirSync(path.join(cfg.localFolder, 'Nex', 'Vault'), { recursive: true });
    return `Local folder ready (${cfg.localFolder})`;
  }
  const tok = await authModule.ensureFreshGoogleToken(store);
  if (!tok) throw new Error('Connect Google Drive first.');
  return 'Google Drive connected';
}

async function uploadStateVaultOnly(store, authModule, vaultBuf) {
  const cfg = getActiveConfig(store);
  if (!isBackendConfigured(store)) return;
  if (cfg.backend === 'webdav') { const r = cfg.webdav.rootFolder || 'Nex'; await webdavEnsureDir(cfg.webdav, `${r}/Vault`); await webdavPutBuffer(cfg.webdav, `${r}/Vault/${VAULT_NAME}`, vaultBuf, 'application/octet-stream'); return; }
  if (cfg.backend === 's3') { await s3PutBuffer(cfg.s3, `${(cfg.s3.prefix || 'Nex').replace(/\/+$/, '')}/Vault/${VAULT_NAME}`, vaultBuf, 'application/octet-stream'); return; }
  if (cfg.backend === 'local_folder') { const d = path.join(cfg.localFolder, 'Nex', 'Vault'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, VAULT_NAME), vaultBuf); return; }
  await authModule.syncStateOnlyToDrive(store);
}

async function uploadSingleFile(store, authModule, filePath, category, mimeType) {
  if (!filePath || !fs.existsSync(filePath) || !isBackendConfigured(store)) return;
  const cfg = getActiveConfig(store);
  const sub = category === 'attachments' ? 'Attachments' : 'Media';
  const name = path.basename(filePath);
  if (cfg.backend === 'webdav') { const r = cfg.webdav.rootFolder || 'Nex'; await webdavEnsureDir(cfg.webdav, `${r}/${sub}`); await webdavPutBuffer(cfg.webdav, `${r}/${sub}/${name}`, fs.readFileSync(filePath), mimeType || drive.guessMime(name)); return; }
  if (cfg.backend === 's3') { await s3PutBuffer(cfg.s3, `${(cfg.s3.prefix || 'Nex').replace(/\/+$/, '')}/${sub}/${name}`, fs.readFileSync(filePath), mimeType || drive.guessMime(name)); return; }
  if (cfg.backend === 'local_folder') { const d = path.join(cfg.localFolder, 'Nex', sub); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(filePath, path.join(d, name)); return; }
  await authModule.uploadSingleFileToDrive(store, filePath, category, mimeType);
}

async function uploadSingleArtifact(store, authModule, artifact) {
  if (!artifact || !isBackendConfigured(store)) return;
  const cfg = getActiveConfig(store);
  const { remoteName, mime } = artifactRemoteMeta(artifact);
  const buf = Buffer.from(String(artifact.content || ''), 'utf8');
  if (cfg.backend === 'webdav') { const r = cfg.webdav.rootFolder || 'Nex'; await webdavEnsureDir(cfg.webdav, `${r}/Artifacts`); await webdavPutBuffer(cfg.webdav, `${r}/Artifacts/${remoteName}`, buf, mime); return; }
  if (cfg.backend === 's3') { await s3PutBuffer(cfg.s3, `${(cfg.s3.prefix || 'Nex').replace(/\/+$/, '')}/Artifacts/${remoteName}`, buf, mime); return; }
  if (cfg.backend === 'local_folder') { const d = path.join(cfg.localFolder, 'Nex', 'Artifacts'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, remoteName), buf); return; }
  await authModule.uploadSingleArtifactToDrive(store, artifact);
}

async function pushAll({ store, authModule, passphrase, onProgress }) {
  const cfg = getActiveConfig(store);
  if (cfg.backend === 'google_drive') return { ...(await authModule.uploadToGoogleDrive(store, passphrase, onProgress)), backend: 'google_drive' };
  const pass = passphrase || store.decrypt(store.state.drivePassphraseEnc);
  const vaultBuf = authModule.buildEncryptedVaultBuffer(store, pass, false);
  let uploaded = 0, skipped = 0;
  const localMedia = listLocalFiles(store.mediaDir), localAtts = listLocalFiles(store.attachmentsDir), arts = store.state.artifacts || [];

  if (cfg.backend === 'webdav') {
    const root = cfg.webdav.rootFolder || 'Nex';
    for (const sub of ['Vault', 'Media', 'Artifacts', 'Attachments']) await webdavEnsureDir(cfg.webdav, `${root}/${sub}`);
    await webdavPutBuffer(cfg.webdav, `${root}/Vault/${VAULT_NAME}`, vaultBuf, 'application/octet-stream'); uploaded++;
    const remMedia = new Map((await webdavListDir(cfg.webdav, `${root}/Media`)).map(f => [f.name, f]));
    for (const fp of localMedia) { const n = path.basename(fp), sz = fs.statSync(fp).size; if (remMedia.get(n)?.size === sz && sz > 0) skipped++; else { await webdavPutBuffer(cfg.webdav, `${root}/Media/${n}`, fs.readFileSync(fp), drive.guessMime(n)); uploaded++; } }
    const remArts = new Map((await webdavListDir(cfg.webdav, `${root}/Artifacts`)).map(f => [f.name, f]));
    for (const art of arts) { const { remoteName, mime } = artifactRemoteMeta(art), buf = Buffer.from(String(art.content || ''), 'utf8'); if (remArts.get(remoteName)?.size === buf.length && buf.length > 0) skipped++; else { await webdavPutBuffer(cfg.webdav, `${root}/Artifacts/${remoteName}`, buf, mime); uploaded++; } }
    const remAtts = new Map((await webdavListDir(cfg.webdav, `${root}/Attachments`)).map(f => [f.name, f]));
    for (const fp of localAtts) { const n = path.basename(fp), sz = fs.statSync(fp).size; if (remAtts.get(n)?.size === sz && sz > 0) skipped++; else { await webdavPutBuffer(cfg.webdav, `${root}/Attachments/${n}`, fs.readFileSync(fp), drive.guessMime(n)); uploaded++; } }
  } else if (cfg.backend === 's3') {
    const pfx = (cfg.s3.prefix || 'Nex').replace(/\/+$/, '');
    await s3PutBuffer(cfg.s3, `${pfx}/Vault/${VAULT_NAME}`, vaultBuf, 'application/octet-stream'); uploaded++;
    const remMedia = new Map((await s3ListPrefix(cfg.s3, `${pfx}/Media/`)).map(f => [f.name, f]));
    for (const fp of localMedia) { const n = path.basename(fp), sz = fs.statSync(fp).size; if (remMedia.get(n)?.size === sz && sz > 0) skipped++; else { await s3PutBuffer(cfg.s3, `${pfx}/Media/${n}`, fs.readFileSync(fp), drive.guessMime(n)); uploaded++; } }
    const remArts = new Map((await s3ListPrefix(cfg.s3, `${pfx}/Artifacts/`)).map(f => [f.name, f]));
    for (const art of arts) { const { remoteName, mime } = artifactRemoteMeta(art), buf = Buffer.from(String(art.content || ''), 'utf8'); if (remArts.get(remoteName)?.size === buf.length && buf.length > 0) skipped++; else { await s3PutBuffer(cfg.s3, `${pfx}/Artifacts/${remoteName}`, buf, mime); uploaded++; } }
    const remAtts = new Map((await s3ListPrefix(cfg.s3, `${pfx}/Attachments/`)).map(f => [f.name, f]));
    for (const fp of localAtts) { const n = path.basename(fp), sz = fs.statSync(fp).size; if (remAtts.get(n)?.size === sz && sz > 0) skipped++; else { await s3PutBuffer(cfg.s3, `${pfx}/Attachments/${n}`, fs.readFileSync(fp), drive.guessMime(n)); uploaded++; } }
  } else if (cfg.backend === 'local_folder') {
    if (!cfg.localFolder) throw new Error('Choose a local folder first.');
    for (const sub of ['Vault', 'Media', 'Artifacts', 'Attachments']) fs.mkdirSync(path.join(cfg.localFolder, 'Nex', sub), { recursive: true });
    fs.writeFileSync(path.join(cfg.localFolder, 'Nex', 'Vault', VAULT_NAME), vaultBuf); uploaded++;
    for (const fp of localMedia) { const dst = path.join(cfg.localFolder, 'Nex', 'Media', path.basename(fp)); if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(fp).size) skipped++; else { fs.copyFileSync(fp, dst); uploaded++; } }
    for (const art of arts) { const { remoteName } = artifactRemoteMeta(art); fs.writeFileSync(path.join(cfg.localFolder, 'Nex', 'Artifacts', remoteName), String(art.content || ''), 'utf8'); uploaded++; }
    for (const fp of localAtts) { const dst = path.join(cfg.localFolder, 'Nex', 'Attachments', path.basename(fp)); if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(fp).size) skipped++; else { fs.copyFileSync(fp, dst); uploaded++; } }
  }
  const acc = store.getActiveAccount(); acc.lastSyncAt = Date.now(); store.meta.accounts[acc.id] = acc; store.saveMeta();
  return { uploadedFiles: uploaded, skippedFiles: skipped, backend: cfg.backend };
}

async function pullAll({ store, authModule, passphrase, onProgress }) {
  const cfg = getActiveConfig(store);
  if (cfg.backend === 'google_drive') { const res = await authModule.downloadFromGoogleDrive(store, passphrase, onProgress); return { state: res.state, report: { ...res.report, backend: 'google_drive' } }; }
  const pass = passphrase || store.decrypt(store.state.drivePassphraseEnc);
  let downloaded = 0, skipped = 0; const restoredPaths = {};

  if (cfg.backend === 'webdav') {
    const root = cfg.webdav.rootFolder || 'Nex';
    const vBuf = await webdavGetBuffer(cfg.webdav, `${root}/Vault/${VAULT_NAME}`);
    if (!vBuf) throw new Error(`No backup found at ${root}/Vault/${VAULT_NAME}`);
    authModule.restoreFromEncryptedVaultBuffer(store, vBuf, pass); downloaded++;
    for (const f of await webdavListDir(cfg.webdav, `${root}/Media`)) { const s = path.basename(f.name), d = path.join(store.mediaDir, s); if (fs.existsSync(d) && fs.statSync(d).size === f.size && f.size > 0) skipped++; else { const b = await webdavGetBuffer(cfg.webdav, `${root}/Media/${s}`); if (b) { fs.writeFileSync(d, b); downloaded++; } } restoredPaths[s] = d; }
    for (const f of await webdavListDir(cfg.webdav, `${root}/Attachments`)) { const s = path.basename(f.name), d = path.join(store.attachmentsDir, s); if (fs.existsSync(d) && fs.statSync(d).size === f.size && f.size > 0) skipped++; else { const b = await webdavGetBuffer(cfg.webdav, `${root}/Attachments/${s}`); if (b) { fs.writeFileSync(d, b); downloaded++; } } }
  } else if (cfg.backend === 's3') {
    const pfx = (cfg.s3.prefix || 'Nex').replace(/\/+$/, '');
    const vBuf = await s3GetBuffer(cfg.s3, `${pfx}/Vault/${VAULT_NAME}`);
    if (!vBuf) throw new Error(`No backup found at s3://${cfg.s3.bucket}/${pfx}/Vault/${VAULT_NAME}`);
    authModule.restoreFromEncryptedVaultBuffer(store, vBuf, pass); downloaded++;
    for (const f of await s3ListPrefix(cfg.s3, `${pfx}/Media/`)) { const s = path.basename(f.name), d = path.join(store.mediaDir, s); if (fs.existsSync(d) && fs.statSync(d).size === f.size && f.size > 0) skipped++; else { const b = await s3GetBuffer(cfg.s3, f.key); if (b) { fs.writeFileSync(d, b); downloaded++; } } restoredPaths[s] = d; }
    for (const f of await s3ListPrefix(cfg.s3, `${pfx}/Attachments/`)) { const s = path.basename(f.name), d = path.join(store.attachmentsDir, s); if (fs.existsSync(d) && fs.statSync(d).size === f.size && f.size > 0) skipped++; else { const b = await s3GetBuffer(cfg.s3, f.key); if (b) { fs.writeFileSync(d, b); downloaded++; } } }
  } else if (cfg.backend === 'local_folder') {
    const vp = path.join(cfg.localFolder, 'Nex', 'Vault', VAULT_NAME);
    if (!fs.existsSync(vp)) throw new Error(`No backup found in ${vp}`);
    authModule.restoreFromEncryptedVaultBuffer(store, fs.readFileSync(vp), pass); downloaded++;
    for (const src of listLocalFiles(path.join(cfg.localFolder, 'Nex', 'Media'))) { const s = path.basename(src), d = path.join(store.mediaDir, s); if (fs.existsSync(d) && fs.statSync(d).size === fs.statSync(src).size) skipped++; else { fs.copyFileSync(src, d); downloaded++; } restoredPaths[s] = d; }
    for (const src of listLocalFiles(path.join(cfg.localFolder, 'Nex', 'Attachments'))) { const s = path.basename(src), d = path.join(store.attachmentsDir, s); if (fs.existsSync(d) && fs.statSync(d).size === fs.statSync(src).size) skipped++; else { fs.copyFileSync(src, d); downloaded++; } }
  }
  const remap = (med) => (!med || !med.filePath) ? med : { ...med, filePath: restoredPaths[path.basename(med.filePath)] || path.join(store.mediaDir, path.basename(med.filePath)) };
  store.state.chats = (store.state.chats || []).map(c => ({ ...c, messages: (c.messages || []).map(m => ({ ...m, media: remap(m.media) })) }));
  store.state.mediaItems = (store.state.mediaItems || []).map(remap);
  store.save();
  const acc = store.getActiveAccount(); acc.lastSyncAt = Date.now(); store.meta.accounts[acc.id] = acc; store.saveMeta();
  return { state: store.publicSnapshot(), report: { downloadedFiles: downloaded, skippedFiles: skipped, backend: cfg.backend } };
}

module.exports = { signS3Request, getStorageStats, getActiveConfig, isBackendConfigured, testConnection, uploadStateVaultOnly, uploadSingleFile, uploadSingleArtifact, pushAll, pullAll };
