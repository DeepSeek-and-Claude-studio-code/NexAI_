'use strict';

const fs = require('fs');
const path = require('path');

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB (multiple of 256 KB for Google Drive resumable API)
const VAULT_NAME = 'nex_state_vault.nexvault';

function escQ(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function guessMime(name) {
  const ext = path.extname(name || '').toLowerCase().replace('.', '');
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
    html: 'text/html',
    htm: 'text/html',
    csv: 'text/csv',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain'
  };
  return map[ext] || 'application/octet-stream';
}

function artifactRemoteMeta(art) {
  const map = {
    presentation: ['json', 'application/json'],
    table: ['csv', 'text/csv'],
    html: ['html', 'text/html'],
    document: ['md', 'text/markdown']
  };
  const [ext, mime] = map[art.type] || ['md', 'text/markdown'];
  const cleanTitle = String(art.title || 'artifact')
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]+/g, '_')
    .trim()
    .slice(0, 48) || 'artifact';
  const shortId = String(art.id || '0').slice(0, 8);
  return { remoteName: `${cleanTitle}_${shortId}.${ext}`, mime };
}

async function ensureVisibleFolder(token, name, parentId) {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = encodeURIComponent(`name = '${escQ(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`);
  const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (findRes.ok) {
    const data = await findRes.json();
    if (data?.files?.[0]?.id) return data.files[0].id;
  }

  const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(meta)
  });
  const text = await createRes.text();
  if (!createRes.ok) throw new Error(`Cannot create Drive folder '${name}': HTTP ${createRes.status} ${text.slice(0, 180)}`);
  return JSON.parse(text).id;
}

async function resolveFolders(token, folderMode) {
  if (folderMode === 'hidden') {
    return {
      space: 'appDataFolder',
      vaultParentId: 'appDataFolder',
      mediaParentId: 'appDataFolder',
      artifactsParentId: 'appDataFolder',
      attachmentsParentId: 'appDataFolder'
    };
  }
  const rootId = await ensureVisibleFolder(token, 'Nex', null);
  const vaultId = await ensureVisibleFolder(token, 'Vault', rootId);
  const mediaId = await ensureVisibleFolder(token, 'Media', rootId);
  const artId = await ensureVisibleFolder(token, 'Artifacts', rootId);
  const attId = await ensureVisibleFolder(token, 'Attachments', rootId);
  return {
    space: 'drive',
    vaultParentId: vaultId,
    mediaParentId: mediaId,
    artifactsParentId: artId,
    attachmentsParentId: attId
  };
}

async function listInParent(token, space, parentId, categoryFilter) {
  const parts = ['trashed = false', "mimeType != 'application/vnd.google-apps.folder'"];
  if (space === 'drive') parts.push(`'${parentId}' in parents`);
  if (categoryFilter) parts.push(`appProperties has { key='nexCategory' and value='${categoryFilter}' }`);
  const q = encodeURIComponent(parts.join(' and '));

  const out = [];
  let pageToken = '';
  do {
    const pt = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://www.googleapis.com/drive/v3/files?spaces=${space}&q=${q}&pageSize=100&fields=nextPageToken,files(id,name,size,mimeType,appProperties)${pt}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const obj = await res.json();
    for (const f of (obj.files || [])) {
      out.push({
        id: f.id,
        name: f.name,
        size: Number(f.size || 0),
        mimeType: f.mimeType || 'application/octet-stream',
        category: f.appProperties?.nexCategory || ''
      });
    }
    pageToken = obj.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function findFileByName(token, space, parentId, name, category) {
  const parentClause = space === 'drive' ? ` and '${parentId}' in parents` : '';
  const q = encodeURIComponent(`name = '${escQ(name)}' and trashed = false${parentClause}`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=${space}&q=${q}&fields=files(id,name,size,mimeType,appProperties)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const files = (await res.json()).files || [];
  for (const f of files) {
    const cat = f.appProperties?.nexCategory || '';
    if (space === 'drive' || !cat || cat === category) {
      return { id: f.id, name: f.name, size: Number(f.size || 0), mimeType: f.mimeType, category: cat };
    }
  }
  return null;
}

async function initiateResumable(token, method, url, meta, mimeType, totalLen) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(totalLen)
    },
    body: JSON.stringify(meta)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive init HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const loc = res.headers.get('location');
  if (!loc) throw new Error('Drive did not return resumable upload Location');
  return loc;
}

async function putChunk(sessionUri, chunk, offset, totalLen, mimeType) {
  const headers = { 'Content-Type': mimeType };
  if (totalLen > 0) {
    headers['Content-Range'] = `bytes ${offset}-${offset + chunk.length - 1}/${totalLen}`;
  }
  const res = await fetch(sessionUri, { method: 'PUT', headers, body: chunk });
  if (!res.ok && res.status !== 308) {
    const err = await res.text();
    throw new Error(`Drive chunk HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
}

async function uploadBufferResumable(token, parentId, existingId, remoteName, mimeType, category, buf) {
  const totalLen = buf.length;
  const meta = {
    name: remoteName,
    mimeType,
    appProperties: { nexCategory: category, nexSize: String(totalLen) }
  };
  if (!existingId) meta.parents = [parentId];
  const initUrl = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=resumable`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
  const sessionUri = await initiateResumable(token, existingId ? 'PATCH' : 'POST', initUrl, meta, mimeType, totalLen);

  if (totalLen === 0) {
    await putChunk(sessionUri, Buffer.alloc(0), 0, 0, mimeType);
    return;
  }
  for (let offset = 0; offset < totalLen; offset += CHUNK_SIZE) {
    const end = Math.min(totalLen, offset + CHUNK_SIZE);
    await putChunk(sessionUri, buf.subarray(offset, end), offset, totalLen, mimeType);
  }
}

async function uploadFileResumable(token, parentId, existingId, remoteName, mimeType, category, filePath) {
  const stat = fs.statSync(filePath);
  const totalLen = stat.size;
  const meta = {
    name: remoteName,
    mimeType,
    appProperties: { nexCategory: category, nexSize: String(totalLen) }
  };
  if (!existingId) meta.parents = [parentId];
  const initUrl = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=resumable`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
  const sessionUri = await initiateResumable(token, existingId ? 'PATCH' : 'POST', initUrl, meta, mimeType, totalLen);

  if (totalLen === 0) {
    await putChunk(sessionUri, Buffer.alloc(0), 0, 0, mimeType);
    return;
  }

  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.allocUnsafe(Math.min(CHUNK_SIZE, totalLen));
    let offset = 0;
    while (offset < totalLen) {
      const toRead = Math.min(buf.length, totalLen - offset);
      const bytesRead = fs.readSync(fd, buf, 0, toRead, offset);
      if (bytesRead <= 0) break;
      await putChunk(sessionUri, buf.subarray(0, bytesRead), offset, totalLen, mimeType);
      offset += bytesRead;
    }
  } finally {
    fs.closeSync(fd);
  }
}

async function downloadFileToLocal(token, fileId, destPath) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Drive download HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tmp = destPath + '.dl';
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, destPath);
}

// --- High-level Sync Operations ---

async function uploadSingleLocalFile(token, folderMode, filePath, category, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return;
  const folders = await resolveFolders(token, folderMode);
  const parentId = category === 'attachments' ? folders.attachmentsParentId : folders.mediaParentId;
  const baseName = path.basename(filePath);
  const existing = await findFileByName(token, folders.space, parentId, baseName, category);
  if (existing && existing.size === stat.size) return;
  await uploadFileResumable(token, parentId, existing?.id || null, baseName, mimeType || guessMime(baseName), category, filePath);
}

async function uploadSingleArtifact(token, folderMode, artifact) {
  const folders = await resolveFolders(token, folderMode);
  const { remoteName, mime } = artifactRemoteMeta(artifact);
  const buf = Buffer.from(String(artifact.content || ''), 'utf8');
  const existing = await findFileByName(token, folders.space, folders.artifactsParentId, remoteName, 'artifacts');
  await uploadBufferResumable(token, folders.artifactsParentId, existing?.id || null, remoteName, mime, 'artifacts', buf);
}

async function uploadStateVaultOnly(token, folderMode, vaultBuf) {
  const folders = await resolveFolders(token, folderMode);
  const existing = await findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, 'vault');
  await uploadBufferResumable(token, folders.vaultParentId, existing?.id || null, VAULT_NAME, 'application/octet-stream', 'vault', vaultBuf);
}

async function pushAllToDrive({ token, store, vaultBuf, onProgress }) {
  const mode = store.state.driveFolderMode || 'visible';
  const folders = await resolveFolders(token, mode);
  let uploaded = 0;
  let skipped = 0;

  if (onProgress) onProgress('Vault…');
  const existingVault = await findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, 'vault');
  await uploadBufferResumable(token, folders.vaultParentId, existingVault?.id || null, VAULT_NAME, 'application/octet-stream', 'vault', vaultBuf);
  uploaded++;

  // Media files (photos & videos of any size)
  const remoteMedia = new Map((await listInParent(token, folders.space, folders.mediaParentId, mode === 'hidden' ? 'media' : null)).map(f => [f.name, f]));
  const localMedia = fs.existsSync(store.mediaDir)
    ? fs.readdirSync(store.mediaDir).filter(f => !f.endsWith('.dl')).map(f => path.join(store.mediaDir, f)).filter(p => fs.statSync(p).isFile())
    : [];
  for (let i = 0; i < localMedia.length; i++) {
    const fp = localMedia[i];
    const name = path.basename(fp);
    const size = fs.statSync(fp).size;
    const rem = remoteMedia.get(name);
    if (rem && rem.size === size) {
      skipped++;
    } else {
      if (onProgress) onProgress(`Media ${i + 1}/${localMedia.length}: ${name}`);
      await uploadFileResumable(token, folders.mediaParentId, rem?.id || null, name, guessMime(name), 'media', fp);
      uploaded++;
    }
  }

  // Artifacts as readable files
  const remoteArts = new Map((await listInParent(token, folders.space, folders.artifactsParentId, mode === 'hidden' ? 'artifacts' : null)).map(f => [f.name, f]));
  const arts = store.state.artifacts || [];
  for (let i = 0; i < arts.length; i++) {
    const art = arts[i];
    const { remoteName, mime } = artifactRemoteMeta(art);
    const buf = Buffer.from(String(art.content || ''), 'utf8');
    const rem = remoteArts.get(remoteName);
    if (rem && rem.size === buf.length) {
      skipped++;
    } else {
      if (onProgress) onProgress(`Artifact ${i + 1}/${arts.length}: ${art.title}`);
      await uploadBufferResumable(token, folders.artifactsParentId, rem?.id || null, remoteName, mime, 'artifacts', buf);
      uploaded++;
    }
  }

  // Chat attachments
  const remoteAtts = new Map((await listInParent(token, folders.space, folders.attachmentsParentId, mode === 'hidden' ? 'attachments' : null)).map(f => [f.name, f]));
  const localAtts = fs.existsSync(store.attachmentsDir)
    ? fs.readdirSync(store.attachmentsDir).filter(f => !f.endsWith('.dl')).map(f => path.join(store.attachmentsDir, f)).filter(p => fs.statSync(p).isFile())
    : [];
  for (let i = 0; i < localAtts.length; i++) {
    const fp = localAtts[i];
    const name = path.basename(fp);
    const size = fs.statSync(fp).size;
    const rem = remoteAtts.get(name);
    if (rem && rem.size === size) {
      skipped++;
    } else {
      if (onProgress) onProgress(`Attachment ${i + 1}/${localAtts.length}: ${name}`);
      await uploadFileResumable(token, folders.attachmentsParentId, rem?.id || null, name, guessMime(name), 'attachments', fp);
      uploaded++;
    }
  }

  return { uploadedFiles: uploaded, skippedFiles: skipped, folderMode: mode };
}

async function pullAllFromDrive({ token, store, restoreVaultFn, onProgress }) {
  const mode = store.state.driveFolderMode || 'visible';
  const folders = await resolveFolders(token, mode);

  if (onProgress) onProgress('Vault…');
  let vaultEntry = await findFileByName(token, folders.space, folders.vaultParentId, VAULT_NAME, 'vault');
  if (!vaultEntry) {
    vaultEntry = await findFileByName(token, 'appDataFolder', 'appDataFolder', 'nex_account_vault_v1.nexvault', 'vault');
  }
  if (!vaultEntry) throw new Error('No Nex backup found on Google Drive yet.');

  const tmpVault = path.join(store.dir, 'vault_pull.tmp');
  await downloadFileToLocal(token, vaultEntry.id, tmpVault);
  const vaultBuf = fs.readFileSync(tmpVault);
  try { fs.unlinkSync(tmpVault); } catch (_) {}

  restoreVaultFn(vaultBuf);

  let downloaded = 1;
  let skipped = 0;

  // Download all missing Media files
  const remoteMedia = await listInParent(token, folders.space, folders.mediaParentId, mode === 'hidden' ? 'media' : null);
  const restoredPaths = {};
  for (let i = 0; i < remoteMedia.length; i++) {
    const entry = remoteMedia[i];
    const safeName = path.basename(entry.name);
    const dest = path.join(store.mediaDir, safeName);
    if (fs.existsSync(dest) && fs.statSync(dest).size === entry.size && entry.size > 0) {
      skipped++;
    } else {
      if (onProgress) onProgress(`Media ${i + 1}/${remoteMedia.length}: ${safeName}`);
      await downloadFileToLocal(token, entry.id, dest);
      downloaded++;
    }
    restoredPaths[safeName] = dest;
  }

  // Download all missing Attachments
  const remoteAtts = await listInParent(token, folders.space, folders.attachmentsParentId, mode === 'hidden' ? 'attachments' : null);
  for (let i = 0; i < remoteAtts.length; i++) {
    const entry = remoteAtts[i];
    const safeName = path.basename(entry.name);
    const dest = path.join(store.attachmentsDir, safeName);
    if (fs.existsSync(dest) && fs.statSync(dest).size === entry.size && entry.size > 0) {
      skipped++;
    } else {
      if (onProgress) onProgress(`File ${i + 1}/${remoteAtts.length}: ${safeName}`);
      await downloadFileToLocal(token, entry.id, dest);
      downloaded++;
    }
  }

  // Remap MediaItem file paths to local mediaDir
  const remap = (med) => {
    if (!med || !med.filePath) return med;
    const base = path.basename(med.filePath);
    return { ...med, filePath: restoredPaths[base] || path.join(store.mediaDir, base) };
  };
  store.state.chats = (store.state.chats || []).map(c => ({
    ...c,
    messages: (c.messages || []).map(m => ({ ...m, media: remap(m.media) }))
  }));
  store.state.mediaItems = (store.state.mediaItems || []).map(remap);
  store.save();

  return {
    state: store.publicSnapshot(),
    report: { downloadedFiles: downloaded, skippedFiles: skipped, folderMode: mode }
  };
}

module.exports = {
  guessMime,
  uploadSingleLocalFile,
  uploadSingleArtifact,
  uploadStateVaultOnly,
  pushAllToDrive,
  pullAllFromDrive
};
