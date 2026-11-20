'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { normalizeProfileId } = require('./constants');
const drive = require('./drive');

const VAULT_FILENAME = 'nex_account_vault_v1.nexvault';
const PBKDF2_ITERATIONS = 100000;

function pbkdf2(pass, salt) {
  return crypto.pbkdf2Sync(String(pass), salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

function registerEmail(store, { email, password, displayName }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Invalid email address');
  }
  if (String(password || '').length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const key = store._safeId(cleanEmail);
  if (store.meta.emailPasswordsEnc[key]) {
    throw new Error('Account already exists. Use Sign in.');
  }
  const salt = crypto.randomBytes(16);
  const hash = pbkdf2(password, salt);
  store.meta.emailPasswordsEnc[key] = store.encrypt(`${salt.toString('base64')}:${hash.toString('base64')}`);
  store.saveMeta();

  const profile = {
    id: `email:${cleanEmail}`,
    authType: 'email',
    email: cleanEmail,
    displayName: String(displayName || '').trim() || cleanEmail.split('@')[0],
    lastSyncAt: 0
  };
  store.switchAccount(profile);
  return profile;
}

function signInEmail(store, { email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const key = store._safeId(cleanEmail);
  const rec = store.decrypt(store.meta.emailPasswordsEnc[key]);
  if (!rec) throw new Error('Account not found. Create an account first.');
  const [saltB64, hashB64] = rec.split(':');
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = pbkdf2(password, salt);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('Incorrect password');
  }
  const existing = store.meta.accounts[`email:${cleanEmail}`] || {};
  const profile = {
    id: `email:${cleanEmail}`,
    authType: 'email',
    email: cleanEmail,
    displayName: existing.displayName || cleanEmail.split('@')[0],
    lastSyncAt: existing.lastSyncAt || 0
  };
  store.switchAccount(profile);
  return profile;
}

async function signInWithGoogle(store, electronShell, clientId, linkDriveOnly = false) {
  const cleanId = String(clientId || store.meta.googleClientId || '').trim();
  if (!cleanId) throw new Error('Enter your Google Cloud Desktop OAuth Client ID first.');
  store.meta.googleClientId = cleanId;
  store.saveMeta();

  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const { code, redirectUri } = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        if (u.pathname !== '/oauth/callback') {
          res.writeHead(404);
          return res.end();
        }
        const err = u.searchParams.get('error');
        const authCode = u.searchParams.get('code');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Nex</h2><p>You can close this tab and return to Nex.</p></body></html>');
        clearTimeout(timer);
        srv.close();
        if (err) reject(new Error(`Google OAuth error: ${err}`));
        else if (!authCode) reject(new Error('Missing authorization code'));
        else resolve({ code: authCode, redirectUri: `http://127.0.0.1:${srv.address().port}/oauth/callback` });
      } catch (e) {
        clearTimeout(timer);
        srv.close();
        reject(e);
      }
    });

    const timer = setTimeout(() => {
      try { srv.close(); } catch (_) {}
      reject(new Error('Google sign-in timed out.'));
    }, 180000);

    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      const rUri = `http://127.0.0.1:${port}/oauth/callback`;
      const params = new URLSearchParams({
        client_id: cleanId,
        redirect_uri: rUri,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent'
      });
      electronShell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    });
  });

  const form = new URLSearchParams({
    code,
    client_id: cleanId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier
  });
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const tokText = await tokRes.text();
  if (!tokRes.ok) throw new Error(`Google token HTTP ${tokRes.status}: ${tokText.slice(0, 200)}`);
  const tok = JSON.parse(tokText);
  if (!tok.access_token) throw new Error('No access_token returned');

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` }
  });
  if (!userRes.ok) throw new Error(`Google userinfo HTTP ${userRes.status}`);
  const user = await userRes.json();

  let profile;
  if (linkDriveOnly && store.meta.activeAccountId !== 'guest') {
    profile = store.getActiveAccount();
  } else {
    profile = {
      id: `google:${user.sub || user.email}`,
      authType: 'google',
      email: user.email || '',
      displayName: user.name || (user.email || '').split('@')[0],
      lastSyncAt: 0
    };
    store.switchAccount(profile);
  }
  store.state.googleTokensEnc = {
    access: store.encrypt(tok.access_token),
    refresh: tok.refresh_token ? store.encrypt(tok.refresh_token) : (store.state.googleTokensEnc?.refresh || '')
  };
  store.save();
  return profile;
}

async function ensureFreshGoogleToken(store) {
  const access = store.decrypt(store.state.googleTokensEnc?.access);
  const refresh = store.decrypt(store.state.googleTokensEnc?.refresh);
  const clientId = store.meta.googleClientId;
  if (refresh && clientId) {
    const form = new URLSearchParams({
      client_id: clientId,
      refresh_token: refresh,
      grant_type: 'refresh_token'
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        store.state.googleTokensEnc.access = store.encrypt(data.access_token);
        store.save();
        return data.access_token;
      }
    }
  }
  if (access) return access;
  throw new Error('Google session expired. Sign in with Google again.');
}

// Cross-platform .nexvault format (100% compatible with Android AccountSync.kt)
function buildEncryptedVaultBuffer(store, passphrase, includeMediaFiles = true) {
  const s = store.state;
  const pass = String(passphrase || '').trim() || `${store.meta.activeAccountId}|nex-vault`;
  const mediaFiles = {};
  let totalBytes = 0;

  const paths = new Set();
  for (const m of (s.mediaItems || [])) if (m.filePath) paths.add(m.filePath);
  for (const c of (s.chats || [])) {
    for (const msg of (c.messages || [])) {
      if (msg.media?.filePath) paths.add(msg.media.filePath);
    }
  }

  if (includeMediaFiles) {
    for (const fp of paths) {
      try {
        if (!fs.existsSync(fp)) continue;
        const st = fs.statSync(fp);
        if (!st.isFile() || st.size > 15_000_000 || totalBytes + st.size > 40_000_000) continue;
        mediaFiles[path.basename(fp)] = fs.readFileSync(fp).toString('base64');
        totalBytes += st.size;
      } catch (_) {}
    }
  }

  const bundle = {
    version: 1,
    exportedAt: Date.now(),
    settings: {
      lang: s.lang,
      voice: s.voice,
      speechRate: s.speechRate,
      autoSpeak: s.autoSpeak,
      userName: s.userName,
      selectedProfileId: s.selectedProfileId || '',
      manualProvider: s.manualProvider,
      manualModel: s.manualModel,
      imageModel: s.imageModel,
      videoModel: s.videoModel,
      lastGenMode: s.lastGenMode || '',
      effort: s.effort,
      memoryEnabled: s.memoryEnabled,
      memoryAutoSave: s.memoryAutoSave,
      confirmSensitiveActions: s.confirmSensitiveActions
    },
    apiKeys: store.getAllApiKeys(),
    mailConfig: store.getDecryptedMailConfig(),
    state: {
      chats: s.chats,
      projects: s.projects,
      artifacts: s.artifacts,
      mediaItems: s.mediaItems,
      memories: s.memories,
      customModels: s.modelCatalog,
      activeChatId: s.activeChatId
    },
    mediaFiles
  };

  const salt = crypto.randomBytes(16);
  const key = pbkdf2(pass, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(bundle), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Match Android's AES/GCM/NoPadding output (ciphertext || 16-byte GCM tag)
  const combined = Buffer.concat([enc, tag]);

  const envelope = {
    format: 'nexvault-aes256gcm-v1',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: combined.toString('base64')
  };
  return Buffer.from(JSON.stringify(envelope), 'utf8');
}

function restoreFromEncryptedVaultBuffer(store, buf, passphrase) {
  const pass = String(passphrase || '').trim() || `${store.meta.activeAccountId}|nex-vault`;
  const env = JSON.parse(buf.toString('utf8'));
  const salt = Buffer.from(env.salt, 'base64');
  const iv = Buffer.from(env.iv, 'base64');
  const combined = Buffer.from(env.data, 'base64');
  const cipherText = combined.subarray(0, combined.length - 16);
  const tag = combined.subarray(combined.length - 16);

  const key = pbkdf2(pass, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
  const bundle = JSON.parse(plain);

  // Restore media files locally
  const restoredPaths = {};
  for (const [fname, b64] of Object.entries(bundle.mediaFiles || {})) {
    const safeName = path.basename(fname);
    const target = path.join(store.mediaDir, safeName);
    fs.writeFileSync(target, Buffer.from(b64, 'base64'));
    restoredPaths[safeName] = target;
  }

  const s = store.state;
  const set = bundle.settings || {};
  s.lang = set.lang || s.lang;
  s.voice = set.voice || s.voice;
  s.speechRate = Number(set.speechRate) || 1.0;
  s.autoSpeak = Boolean(set.autoSpeak);
  s.userName = set.userName || s.userName;
  s.selectedProfileId = set.selectedProfileId ? normalizeProfileId(set.selectedProfileId) : null;
  s.manualProvider = set.manualProvider || s.manualProvider;
  s.manualModel = set.manualModel || s.manualModel;
  s.imageModel = set.imageModel || s.imageModel;
  s.videoModel = set.videoModel || s.videoModel;
  s.lastGenMode = set.lastGenMode || null;
  s.effort = set.effort || 'medium';
  s.memoryEnabled = set.memoryEnabled !== false;
  s.memoryAutoSave = set.memoryAutoSave !== false;
  s.confirmSensitiveActions = set.confirmSensitiveActions !== false;

  for (const [prov, val] of Object.entries(bundle.apiKeys || {})) {
    if (val) store.setApiKey(prov, val);
  }
  if (bundle.mailConfig) store.saveMailConfig(bundle.mailConfig);

  const st = bundle.state || {};
  const remapMedia = (med) => {
    if (!med) return med;
    const base = path.basename(med.filePath || '');
    return { ...med, filePath: restoredPaths[base] || med.filePath };
  };

  if (Array.isArray(st.chats) && st.chats.length) {
    s.chats = st.chats.map(c => ({
      ...c,
      messages: (c.messages || []).map(m => ({ ...m, media: remapMedia(m.media) }))
    }));
  }
  if (Array.isArray(st.projects)) s.projects = st.projects;
  if (Array.isArray(st.artifacts)) s.artifacts = st.artifacts;
  if (Array.isArray(st.mediaItems)) s.mediaItems = st.mediaItems.map(remapMedia);
  if (Array.isArray(st.memories)) s.memories = st.memories;
  if (st.customModels && typeof st.customModels === 'object') s.modelCatalog = st.customModels;
  if (st.activeChatId && s.chats.some(c => c.id === st.activeChatId)) s.activeChatId = st.activeChatId;

  store.save();
  return store.publicSnapshot();
}

async function uploadToGoogleDrive(store, passphrase, onProgress) {
  const token = await ensureFreshGoogleToken(store);
  const pass = passphrase || store.decrypt(store.state.drivePassphraseEnc);
  const vaultBuf = buildEncryptedVaultBuffer(store, pass, false);
  const report = await drive.pushAllToDrive({ token, store, vaultBuf, onProgress });
  const acc = store.getActiveAccount();
  acc.lastSyncAt = Date.now();
  store.meta.accounts[acc.id] = acc;
  store.saveMeta();
  return report;
}

async function downloadFromGoogleDrive(store, passphrase, onProgress) {
  const token = await ensureFreshGoogleToken(store);
  const pass = passphrase || store.decrypt(store.state.drivePassphraseEnc);
  const res = await drive.pullAllFromDrive({
    token,
    store,
    restoreVaultFn: (buf) => restoreFromEncryptedVaultBuffer(store, buf, pass),
    onProgress
  });
  const acc = store.getActiveAccount();
  acc.lastSyncAt = Date.now();
  store.meta.accounts[acc.id] = acc;
  store.saveMeta();
  return res;
}

async function syncStateOnlyToDrive(store) {
  const token = await ensureFreshGoogleToken(store);
  const pass = store.decrypt(store.state.drivePassphraseEnc);
  const vaultBuf = buildEncryptedVaultBuffer(store, pass, false);
  await drive.uploadStateVaultOnly(token, store.state.driveFolderMode || 'visible', vaultBuf);
  const acc = store.getActiveAccount();
  acc.lastSyncAt = Date.now();
  store.meta.accounts[acc.id] = acc;
  store.saveMeta();
}

async function uploadSingleFileToDrive(store, filePath, category, mimeType) {
  const token = await ensureFreshGoogleToken(store);
  await drive.uploadSingleLocalFile(token, store.state.driveFolderMode || 'visible', filePath, category, mimeType);
}

async function uploadSingleArtifactToDrive(store, artifact) {
  const token = await ensureFreshGoogleToken(store);
  await drive.uploadSingleArtifact(token, store.state.driveFolderMode || 'visible', artifact);
}

module.exports = {
  registerEmail,
  signInEmail,
  signInWithGoogle,
  ensureFreshGoogleToken,
  buildEncryptedVaultBuffer,
  restoreFromEncryptedVaultBuffer,
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
  syncStateOnlyToDrive,
  uploadSingleFileToDrive,
  uploadSingleArtifactToDrive
};
