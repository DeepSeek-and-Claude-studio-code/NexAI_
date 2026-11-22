'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  screen,
  ipcMain,
  dialog,
  shell,
  clipboard,
  safeStorage
} = require('electron');

const constants = require('./constants');
const { NexStore } = require('./store');
const { SafetyGuard } = require('./safety');
const auth = require('./auth');
const storage = require('./storage');
const { DesktopNexCodeManager } = require('./nexcode');
const llm = require('./llm');
const tts = require('./tts');
const mediaGen = require('./media');
const mailClient = require('./mail');
const { runAgentTurn } = require('./agent');

const BRIDGE_PORT = 47800;

let store;
let safety;
let mainWin = null;
let companionWin = null;
let tray = null;
let bridgeServer = null;
let isQuitting = false;
let activeAbort = null;
let autoSyncTimer = null;
let isSpeakingNow = false;
let currentSphere = { state: 'idle', label: 'Готов к работе', female: false };

function renderTrayIcon(female) {
  const s = 24;
  const buf = Buffer.alloc(s * s * 4);
  const cx = (s - 1) / 2;
  const cy = (s - 1) / 2;
  const rad = s * 0.44;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const i = (y * s + x) * 4;
      if (d <= rad) {
        const k = Math.max(0, 1 - d / rad);
        const shade = Math.round(90 + k * 135);
        buf[i] = female ? Math.min(255, Math.round(shade * 0.92)) : Math.min(255, shade + 8);
        buf[i + 1] = female ? Math.round(shade * 0.52) : shade;
        buf[i + 2] = female ? Math.min(255, Math.round(shade * 1.15)) : shade;
        buf[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

function emitDriveStatus(msg) {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('nex:driveStatus', String(msg || ''));
  }
}

function canAutoSyncDrive() {
  if (!store) return false;
  return store.state.driveAutoSync !== false && storage.isBackendConfigured(store);
}

function scheduleDriveStateSync() {
  if (!canAutoSyncDrive()) return;
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(async () => {
    try {
      emitDriveStatus(store.state.lang === 'en' ? 'Syncing to cloud storage…' : 'Сохраняю в хранилище…');
      const pass = store.decrypt(store.state.drivePassphraseEnc);
      const vaultBuf = auth.buildEncryptedVaultBuffer(store, pass, false);
      await storage.uploadStateVaultOnly(store, auth, vaultBuf);
      emitDriveStatus(store.state.lang === 'en' ? 'Synced to cloud storage' : 'Сохранено в хранилище');
    } catch (err) { emitDriveStatus('Storage: ' + err.message); }
  }, 3500);
}

function autoUploadFileToDrive(filePath, category, mimeType) {
  if (!canAutoSyncDrive() || !filePath || !fs.existsSync(filePath)) return;
  const base = path.basename(filePath);
  emitDriveStatus(store.state.lang === 'en' ? `Uploading ${base}…` : `Загружаю ${base}…`);
  storage.uploadSingleFile(store, auth, filePath, category, mimeType)
    .then(() => emitDriveStatus(store.state.lang === 'en' ? `Saved ${base}` : `Файл ${base} сохранён`))
    .catch(err => emitDriveStatus('Storage upload: ' + err.message));
}

function autoUploadArtifactToDrive(art) {
  if (!canAutoSyncDrive() || !art) return;
  storage.uploadSingleArtifact(store, auth, art).catch(err => emitDriveStatus('Storage artifact: ' + err.message));
}

async function refreshAllModelsFromApis(onlyProvider = null) {
  if (!store) return { updated: 0 };
  const keys = store.getAllApiKeys(), customUrl = store.state.customBaseUrl || '';
  const providers = onlyProvider ? [onlyProvider] : constants.PROVIDERS;
  let updated = 0;
  await Promise.all(providers.map(async (p) => {
    if (!constants.isProviderReady(p, keys, customUrl)) return;
    try {
      const list = await llm.fetchModels(p, keys[p] || '', customUrl);
      if (list && list.length) { store.state.modelCatalog[p] = list; updated++; }
    } catch (_) {}
  }));
  if (updated > 0 || !onlyProvider) { store.state.lastModelsRefreshAt = Date.now(); store.save(); broadcastState(); }
  return { updated, state: store.publicSnapshot() };
}

function scheduleAutoModelRefresh(onlyProvider = null) {
  if (!store || store.state.autoRefreshModels === false) return;
  if (modelRefreshTimer) clearTimeout(modelRefreshTimer);
  modelRefreshTimer = setTimeout(() => { refreshAllModelsFromApis(onlyProvider).catch(() => {}); }, 700);
}

function broadcastState() {
  const snap = store.publicSnapshot();
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('nex:stateChanged', snap);
  }
  const fem = store.state.voice === 'f';
  if (currentSphere.female !== fem) {
    currentSphere = { ...currentSphere, female: fem };
    if (tray) tray.setImage(renderTrayIcon(fem));
    broadcastSphere(currentSphere.state, currentSphere.label);
  }
  rebuildMenus();
}

function broadcastSphere(state, label, transcript) {
  const fem = store.state.voice === 'f';
  const defaultReady = store.state.lang === 'en' ? 'Ready' : (fem ? 'Готова к работе' : 'Готов к работе');
  currentSphere = {
    state: state || 'idle',
    label: label !== undefined ? label : defaultReady,
    transcript: transcript !== undefined ? String(transcript || '') : (state === 'idle' ? '' : (currentSphere.transcript || '')),
    female: fem
  };
  if (companionWin && !companionWin.isDestroyed()) {
    companionWin.webContents.send('nex:sphereState', currentSphere);
  }
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('nex:sphereState', currentSphere);
  }
}

function broadcastConfirmation(pending) {
  if (pending && mainWin && !mainWin.isDestroyed()) {
    mainWin.show();
    mainWin.focus();
  }
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('nex:confirmation', pending);
  }
}

function createMainWindow() {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.show();
    mainWin.focus();
    return;
  }
  mainWin = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 800,
    minHeight: 580,
    title: 'Nex',
    icon: nativeImage.createFromPath(path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  mainWin.loadFile(path.join(__dirname, 'renderer', 'app.html'));
  mainWin.on('close', (e) => {
    if (!isQuitting && store.state.showCompanion) {
      e.preventDefault();
      mainWin.hide();
    }
  });
  mainWin.on('closed', () => { mainWin = null; });
}

function createCompanionWindow() {
  if (companionWin && !companionWin.isDestroyed()) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const saved = store.state.companionPos;
  const x = saved && Number.isFinite(saved.x) ? Math.max(0, Math.min(saved.x, width - 240)) : width - 250;
  const y = saved && Number.isFinite(saved.y) ? Math.max(0, Math.min(saved.y, height - 290)) : height - 300;

  companionWin = new BrowserWindow({
    width: 268,
    height: 332,
    x,
    y,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: Boolean(store.state.showCompanion),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  companionWin.setAlwaysOnTop(true, 'screen-saver');
  companionWin.loadFile(path.join(__dirname, 'renderer', 'companion.html'));
  companionWin.webContents.once('did-finish-load', () => {
    broadcastSphere(currentSphere.state, currentSphere.label);
  });
  companionWin.on('closed', () => { companionWin = null; });
}

function toggleCompanion() {
  if (!companionWin || companionWin.isDestroyed()) {
    store.state.showCompanion = true;
    store.save();
    createCompanionWindow();
    broadcastState();
    return;
  }
  if (companionWin.isVisible()) {
    companionWin.hide();
    store.state.showCompanion = false;
  } else {
    companionWin.showInactive();
    store.state.showCompanion = true;
  }
  store.save();
  broadcastState();
}

function launchNexCodeTerminal() {
  const activeChat = store.state.chats.find(c => c.id === store.state.activeChatId);
  const proj = activeChat?.projectId ? store.state.projects.find(p => p.id === activeChat.projectId) : null;
  const cwd = (proj && proj.folderPath && fs.existsSync(proj.folderPath)) ? proj.folderPath : app.getPath('home');

  const candidatePaths = [
    path.resolve(__dirname, '..', '..', 'nex-code', 'bin', 'nex-code.js'),
    path.resolve(process.resourcesPath || '', 'nex-code', 'bin', 'nex-code.js')
  ];
  const cliPath = candidatePaths.find(p => fs.existsSync(p));
  const cmd = cliPath ? `node "${cliPath}"` : 'nex-code';

  if (process.platform === 'win32') {
    const p = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', cmd], { cwd, detached: true, stdio: 'ignore' });
    p.unref();
    return;
  }

  const terminals = [
    ['ptyxis', ['--', 'sh', '-c', `${cmd}; exec sh`]],
    ['gnome-terminal', ['--', 'sh', '-c', `${cmd}; exec sh`]],
    ['x-terminal-emulator', ['-e', `sh -c '${cmd}; exec sh'`]],
    ['alacritty', ['-e', 'sh', '-c', `${cmd}; exec sh`]],
    ['kitty', ['sh', '-c', `${cmd}; exec sh`]],
    ['konsole', ['-e', 'sh', '-c', `${cmd}; exec sh`]],
    ['xfce4-terminal', ['-e', `sh -c '${cmd}; exec sh'`]],
    ['xterm', ['-e', `sh -c '${cmd}; exec sh'`]]
  ];

  const tryNext = (idx) => {
    if (idx >= terminals.length) return;
    const [bin, args] = terminals[idx];
    const proc = spawn(bin, args, { cwd, detached: true, stdio: 'ignore' });
    proc.on('error', () => tryNext(idx + 1));
    proc.unref();
  };
  tryNext(0);
}

function buildCompanionContextMenu() {
  const isEn = store.state.lang === 'en';
  const fem = store.state.voice === 'f';
  const name = isEn ? (fem ? 'Nexi' : 'Nex') : (fem ? 'Некси' : 'Некс');
  return Menu.buildFromTemplate([
    { label: isEn ? `Open ${name}` : `Открыть ${name}`, click: () => createMainWindow() },
    { label: isEn ? 'New chat' : 'Новый чат', click: () => { createNewChat(null); createMainWindow(); } },
    { label: isEn ? 'Show / Hide companion (Ctrl+Alt+N)' : 'Показать / скрыть на экране (Ctrl+Alt+N)', click: toggleCompanion },
    { type: 'separator' },
    { label: isEn ? 'State: Ready' : 'Ожидание', click: () => broadcastSphere('idle') },
    { label: isEn ? 'State: Listening' : 'Слушает', click: () => broadcastSphere('listening', isEn ? 'Listening…' : 'Слушаю…') },
    { label: isEn ? 'State: Thinking' : 'Думает', click: () => broadcastSphere('thinking', isEn ? 'Thinking…' : 'Думаю…') },
    { label: isEn ? 'State: Working' : 'Выполняет задачу', click: () => broadcastSphere('working', isEn ? 'Working…' : 'Выполняю задачу…') },
    { type: 'separator' },
    { label: isEn ? 'Open Nex Code (Terminal)' : 'Открыть Nex Code (терминал)', click: launchNexCodeTerminal },
    { type: 'separator' },
    { label: isEn ? 'Quit' : 'Выход', click: () => { isQuitting = true; app.quit(); } }
  ]);
}

function rebuildMenus() {
  const isEn = store.state.lang === 'en';
  if (tray) tray.setContextMenu(buildCompanionContextMenu());

  const appMenu = Menu.buildFromTemplate([
    {
      label: isEn ? 'File' : 'Файл',
      submenu: [
        { label: isEn ? 'New chat' : 'Новый чат', accelerator: 'CmdOrCtrl+N', click: () => { createNewChat(null); createMainWindow(); } },
        { label: isEn ? 'Open Nex Code' : 'Открыть Nex Code', click: launchNexCodeTerminal },
        { type: 'separator' },
        { label: isEn ? 'Quit' : 'Выход', accelerator: 'CmdOrCtrl+Q', click: () => { isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: isEn ? 'Edit' : 'Правка',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: isEn ? 'View' : 'Вид',
      submenu: [
        { label: isEn ? 'Show / Hide Companion' : 'Показать / скрыть Некса на экране', accelerator: 'CmdOrCtrl+Alt+N', click: toggleCompanion },
        { type: 'separator' },
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }
      ]
    },
    {
      label: isEn ? 'Agent' : 'Агент',
      submenu: [
        { label: isEn ? 'Ready' : 'Ожидание', click: () => broadcastSphere('idle') },
        { label: isEn ? 'Listening' : 'Слушает', click: () => broadcastSphere('listening', isEn ? 'Listening…' : 'Слушаю…') },
        { label: isEn ? 'Thinking' : 'Думает', click: () => broadcastSphere('thinking', isEn ? 'Thinking…' : 'Думаю…') },
        { label: isEn ? 'Working' : 'Выполняет задачу', click: () => broadcastSphere('working', isEn ? 'Working…' : 'Выполняю…') }
      ]
    }
  ]);
  Menu.setApplicationMenu(appMenu);
}

function isFreshEmptyChat(c) {
  if (!c) return false;
  return !(c.messages || []).some(m => m.role === 'user' || m.media || m.artifactId);
}

function createNewChat(projectId) {
  const s = store.state;
  const targetProjId = projectId || null;
  const current = s.chats.find(c => c.id === s.activeChatId);
  if (current && (current.projectId || null) === targetProjId && isFreshEmptyChat(current)) { broadcastState(); return current; }
  const existingEmpty = s.chats.find(c => (c.projectId || null) === targetProjId && isFreshEmptyChat(c));
  if (existingEmpty) { s.activeChatId = existingEmpty.id; store.save(); broadcastState(); return existingEmpty; }

  const isEn = s.lang === 'en', fem = s.voice === 'f';
  const name = isEn ? (fem ? 'Nexi' : 'Nex') : (fem ? 'Некси' : 'Некс');
  const proj = targetProjId ? s.projects.find(p => p.id === targetProjId) : null;
  const greeting = proj
    ? (proj.folderPath
        ? (isEn ? `Project "${proj.name}" opened. Working folder: ${proj.folderPath}.` : `Проект «${proj.name}» открыт. Рабочая папка: ${proj.folderPath}.`)
        : (isEn ? `Project "${proj.name}" opened. Choose a working folder so ${name} can edit files.` : `Проект «${proj.name}» открыт. Выбери рабочую папку, чтобы ${name} работал с файлами.`))
    : (isEn ? `Hi, I'm ${name}. How can I help?` : `Привет, я ${name}. Чем помочь?`);

  const chat = {
    id: crypto.randomUUID(),
    title: proj ? proj.name : (isEn ? 'New chat' : 'Новый чат'),
    projectId: proj ? proj.id : null,
    updatedAt: Date.now(),
    messages: [{ id: crypto.randomUUID(), role: 'assistant', text: greeting, timestamp: Date.now(), attachmentNames: [] }]
  };
  s.chats.unshift(chat);
  s.activeChatId = chat.id;
  store.save();
  broadcastState();
  return chat;
}

function resolveTextTarget() {
  const s = store.state;
  const keys = store.getAllApiKeys();
  if (s.selectedProfileId) {
    const pid = constants.normalizeProfileId(s.selectedProfileId);
    const prof = constants.NEX_PROFILES.find(p => p.id === pid);
    if (prof && !prof.isMedia) return constants.resolveProfileText(prof.id, keys);
    if (prof && prof.isMedia) return constants.resolveProfileText('quark', keys);
  }
  if ((keys[s.manualProvider] || '').trim()) {
    return { provider: s.manualProvider, model: s.manualModel };
  }
  return null;
}

function resolveMediaTarget(mode) {
  const s = store.state;
  const keys = store.getAllApiKeys();
  const pid = constants.normalizeProfileId(s.selectedProfileId);
  if (pid === 'foton') {
    return constants.resolveProfileMedia('foton', mode, keys);
  }
  if (mode === 'video') {
    return keys.Gemini ? { provider: 'Gemini', model: s.videoModel } : null;
  }
  const prov = Object.keys(constants.IMAGE_MODELS).find(p => constants.IMAGE_MODELS[p].includes(s.imageModel)) || 'Gemini';
  return keys[prov] ? { provider: prov, model: s.imageModel } : constants.resolveProfileMedia('foton', mode, keys);
}

function startLocalBridge() {
  const validStates = new Set(['idle', 'listening', 'thinking', 'working', 'speaking']);
  bridgeServer = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/state') {
      res.writeHead(404);
      return res.end();
    }
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) { tooLarge = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const parsed = JSON.parse(body);
        const st = validStates.has(parsed.state) ? parsed.state : 'idle';
        const lbl = typeof parsed.label === 'string' ? parsed.label.slice(0, 120) : '';
        broadcastSphere(st, lbl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (_) {
        res.writeHead(400);
        res.end('{"ok":false}');
      }
    });
  });
  bridgeServer.on('error', () => {});
  bridgeServer.listen(BRIDGE_PORT, '127.0.0.1');
}

function registerIpc() {
  ipcMain.handle('nex:getBootstrap', () => ({
    constants: {
      PROVIDERS: constants.PROVIDERS,
      PROVIDER_META: constants.PROVIDER_META,
      DEFAULT_MODELS: constants.DEFAULT_MODELS,
      IMAGE_MODELS: constants.IMAGE_MODELS,
      VIDEO_MODELS: constants.VIDEO_MODELS,
      EFFORTS: constants.EFFORTS,
      NEX_PROFILES: constants.NEX_PROFILES
    },
    state: store.publicSnapshot(),
    sphere: currentSphere,
    confirmation: safety.active,
    platform: process.platform
  }));

  ipcMain.handle('nex:updateSettings', (_e, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'onboarded')) {
      store.meta.onboarded = Boolean(patch.onboarded);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'googleClientId')) {
      store.meta.googleClientId = String(patch.googleClientId || '').trim();
    }
    const allowed = [
      'lang', 'voice', 'speechRate', 'autoSpeak', 'wakeWordEnabled', 'userName',
      'showCompanion', 'selectedProfileId', 'manualProvider', 'manualModel',
      'imageModel', 'videoModel', 'lastGenMode', 'effort', 'webSearchEnabled',
      'memoryEnabled', 'memoryAutoSave', 'confirmSensitiveActions', 'permissions', 'driveAutoSync', 'driveFolderMode', 'customBaseUrl', 'autoRefreshModels', 'autoFailover'
    ];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        if (key === 'permissions' && patch.permissions && typeof patch.permissions === 'object') {
          store.state.permissions = Object.assign({}, store.state.permissions, patch.permissions);
        } else if (key === 'selectedProfileId') {
          store.state.selectedProfileId = patch.selectedProfileId ? constants.normalizeProfileId(patch.selectedProfileId) : null;
        } else {
          store.state[key] = patch[key];
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'showCompanion')) {
      if (store.state.showCompanion) {
        if (!companionWin || companionWin.isDestroyed()) createCompanionWindow();
        else companionWin.showInactive();
      } else if (companionWin && !companionWin.isDestroyed()) {
        companionWin.hide();
      }
    }
    store.save();
    broadcastState();
    if (Object.prototype.hasOwnProperty.call(patch, 'customBaseUrl')) { llm.clearProviderCooldown('Custom'); scheduleAutoModelRefresh('Custom'); }
    scheduleDriveStateSync();
    return store.publicSnapshot();
  });

  // --- Account Auth & Sync IPC ---
  ipcMain.handle('nex:registerEmail', (_e, payload) => {
    try {
      const profile = auth.registerEmail(store, payload || {});
      broadcastState();
      return { ok: true, profile, state: store.publicSnapshot() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:signInEmail', (_e, payload) => {
    try {
      const profile = auth.signInEmail(store, payload || {});
      broadcastState();
      return { ok: true, profile, state: store.publicSnapshot() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:signInGoogle', async (_e, arg) => {
    try {
      const clientId = typeof arg === 'string' ? arg : arg?.clientId;
      const linkDriveOnly = typeof arg === 'object' ? Boolean(arg?.linkDriveOnly) : false;
      const profile = await auth.signInWithGoogle(store, shell, clientId, linkDriveOnly);
      broadcastState();
      return { ok: true, profile, state: store.publicSnapshot() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:setDrivePassphrase', (_e, passphrase) => {
    const clean = String(passphrase || '').trim();
    store.state.drivePassphraseEnc = clean ? store.encrypt(clean) : '';
    store.save();
    return { ok: true };
  });

  ipcMain.handle('nex:signOut', () => {
    store.switchAccount({ id: 'guest', authType: 'guest', email: '', displayName: '', lastSyncAt: 0 });
    broadcastState();
    return { ok: true, state: store.publicSnapshot() };
  });

  ipcMain.handle('nex:syncDriveUpload', async (_e, passphrase) => {
    try {
      if (passphrase) {
        store.state.drivePassphraseEnc = store.encrypt(String(passphrase).trim());
        store.save();
      }
      const report = await auth.uploadToGoogleDrive(store, passphrase, (p) => emitDriveStatus(p));
      broadcastState();
      return { ok: true, report };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:syncDriveDownload', async (_e, passphrase) => {
    try {
      if (passphrase) {
        store.state.drivePassphraseEnc = store.encrypt(String(passphrase).trim());
        store.save();
      }
      const res = await auth.downloadFromGoogleDrive(store, passphrase, (p) => emitDriveStatus(p));
      broadcastState();
      return { ok: true, state: res.state, report: res.report };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:exportVault', async (_e, passphrase) => {
    try {
      const res = await dialog.showSaveDialog(mainWin, {
        defaultPath: 'nex-backup.nexvault',
        filters: [{ name: 'Nex Encrypted Vault', extensions: ['nexvault'] }]
      });
      if (res.canceled || !res.filePath) return { ok: false, canceled: true };
      const buf = auth.buildEncryptedVaultBuffer(store, passphrase);
      fs.writeFileSync(res.filePath, buf);
      return { ok: true, filePath: res.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:importVault', async (_e, passphrase) => {
    try {
      const res = await dialog.showOpenDialog(mainWin, {
        properties: ['openFile'],
        filters: [{ name: 'Nex Encrypted Vault', extensions: ['nexvault', 'json'] }]
      });
      if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
      const buf = fs.readFileSync(res.filePaths[0]);
      const snap = auth.restoreFromEncryptedVaultBuffer(store, buf, passphrase);
      broadcastState();
      return { ok: true, state: snap };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:setApiKey', (_e, { provider, value }) => {
    if (constants.PROVIDERS.includes(provider)) store.setApiKey(provider, value);
    broadcastState();
    scheduleDriveStateSync();
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:saveMailConfig', (_e, cfg) => {
    store.saveMailConfig(cfg || {});
    broadcastState();
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:testMail', async () => {
    try {
      const list = await mailClient.readInbox(store.getDecryptedMailConfig(), 3);
      return { ok: true, count: list.length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('nex:refreshModels', async () => {
    const keys = store.getAllApiKeys();
    let updated = 0;
    for (const p of constants.PROVIDERS) {
      if (!keys[p]) continue;
      try {
        const list = await llm.fetchModels(p, keys[p]);
        if (list.length) {
          store.state.modelCatalog[p] = Array.from(new Set([...(constants.DEFAULT_MODELS[p] || []), ...list]));
          updated++;
        }
      } catch (_) {}
    }
    store.save();
    broadcastState();
    return { updated };
  });

  ipcMain.handle('nex:newChat', (_e, projectId) => createNewChat(projectId));

  ipcMain.handle('nex:openChat', (_e, chatId) => {
    if (store.state.chats.some(c => c.id === chatId)) {
      store.state.activeChatId = chatId;
      store.save();
      broadcastState();
    }
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:deleteChat', (_e, chatId) => {
    store.state.chats = store.state.chats.filter(c => c.id !== chatId);
    if (!store.state.chats.length) createNewChat(null);
    else if (store.state.activeChatId === chatId) store.state.activeChatId = store.state.chats[0].id;
    store.save();
    broadcastState();
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:createProject', (_e, { name, description }) => {
    const proj = {
      id: crypto.randomUUID(),
      name: String(name || '').trim() || `Project ${store.state.projects.length + 1}`,
      description: String(description || '').trim(),
      folderPath: ''
    };
    store.state.projects.unshift(proj);
    store.save();
    broadcastState();
    return proj;
  });

  ipcMain.handle('nex:pickProjectFolder', async (_e, projectId) => {
    const res = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths.length) return null;
    const folder = res.filePaths[0];
    const proj = store.state.projects.find(p => p.id === projectId);
    if (proj) {
      proj.folderPath = folder;
      store.save();
      broadcastState();
    }
    return folder;
  });

  ipcMain.handle('nex:pickAttachments', async () => {
    const res = await dialog.showOpenDialog(mainWin, { properties: ['openFile', 'multiSelections'] });
    if (res.canceled || !res.filePaths.length) return [];
    const items = [];
    for (const fp of res.filePaths) {
      try {
        const st = fs.statSync(fp);
        const name = path.basename(fp);
        const ext = path.extname(fp).toLowerCase();
        const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '_')}`;
        const savedAttPath = path.join(store.attachmentsDir, safeName);
        fs.copyFileSync(fp, savedAttPath);
        const imgMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
        autoUploadFileToDrive(savedAttPath, 'attachments', imgMap[ext] || 'application/octet-stream');
        if (imgMap[ext] && st.size <= 5 * 1024 * 1024) {
          items.push({ id: crypto.randomUUID(), name, mimeType: imgMap[ext], localPath: savedAttPath, base64Image: fs.readFileSync(fp).toString('base64') });
        } else {
          const preview = st.size <= 512 * 1024 ? fs.readFileSync(fp, 'utf8').slice(0, 14000) : '';
          items.push({ id: crypto.randomUUID(), name, mimeType: 'text/plain', localPath: savedAttPath, textPreview: preview });
        }
      } catch (_) {}
    }
    return items;
  });

  // --- Media Studio IPC (Pick, Save Edited, AI Photo Edit, AI Image-to-Video) ---
  ipcMain.handle('nex:pickMediaFile', async (_e, kind) => {
    const isVideo = kind === 'video';
    const filters = isVideo
      ? [{ name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'mkv'] }]
      : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];
    const res = await dialog.showOpenDialog(mainWin, { properties: ['openFile'], filters });
    if (res.canceled || !res.filePaths.length) return null;
    const src = res.filePaths[0];
    const ext = path.extname(src) || (isVideo ? '.mp4' : '.png');
    const dst = path.join(store.mediaDir, `${isVideo ? 'vid' : 'img'}_import_${Date.now()}${ext}`);
    fs.copyFileSync(src, dst);
    const item = {
      id: crypto.randomUUID(),
      isVideo,
      filePath: dst,
      modelName: isVideo ? 'Imported Video' : 'Imported Photo',
      prompt: path.basename(src),
      createdAt: Date.now()
    };
    store.state.mediaItems.unshift(item);
    store.save();
    broadcastState();
    autoUploadFileToDrive(dst, 'media', isVideo ? 'video/mp4' : 'image/png');
    scheduleDriveStateSync();
    return item;
  });

  ipcMain.handle('nex:saveEditedMedia', (_e, { isVideo, base64Data, ext, modelName, prompt, postToChat }) => {
    const cleanExt = String(ext || (isVideo ? 'webm' : 'png')).replace(/[^a-z0-9]/gi, '');
    const filePath = path.join(store.mediaDir, `${isVideo ? 'vid' : 'img'}_edit_${Date.now()}.${cleanExt}`);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    const item = {
      id: crypto.randomUUID(),
      isVideo: Boolean(isVideo),
      filePath,
      modelName: modelName || (isVideo ? 'Nex Video Editor' : 'Nex Photo Editor'),
      prompt: prompt || (isVideo ? 'Edited video' : 'Edited photo'),
      createdAt: Date.now()
    };
    store.state.mediaItems.unshift(item);
    if (postToChat) {
      let chat = store.state.chats.find(c => c.id === store.state.activeChatId);
      if (!chat) chat = createNewChat(null);
      chat.messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: item.prompt,
        timestamp: Date.now(),
        media: item
      });
      chat.updatedAt = Date.now();
    }
    store.save();
    broadcastState();
    autoUploadFileToDrive(filePath, 'media', isVideo ? 'video/webm' : 'image/png');
    scheduleDriveStateSync();
    return { ok: true, item };
  });

  ipcMain.handle('nex:aiEditPhoto', async (_e, { sourcePath, instruction }) => {
    const target = resolveMediaTarget('image');
    if (!target) return { ok: false, error: 'Add a Gemini or OpenAI API key in Settings -> AI.' };
    try {
      broadcastSphere('working', store.state.lang === 'en' ? 'Editing photo with AI…' : 'Редактирую фото ИИ…');
      const item = await mediaGen.editImageWithAi({
        mediaDir: store.mediaDir,
        provider: target.provider,
        model: target.model,
        apiKey: store.getApiKey(target.provider),
        sourcePath,
        instruction
      });
      store.state.mediaItems.unshift(item);
      let chat = store.state.chats.find(c => c.id === store.state.activeChatId);
      if (!chat) chat = createNewChat(null);
      chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: item.prompt, timestamp: Date.now(), media: item });
      store.save();
      broadcastState();
      autoUploadFileToDrive(item.filePath, 'media', 'image/png');
      scheduleDriveStateSync();
      return { ok: true, item };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      broadcastSphere('idle');
    }
  });

  ipcMain.handle('nex:aiImageToVideo', async (_e, { sourcePath, instruction }) => {
    const target = resolveMediaTarget('video');
    if (!target) return { ok: false, error: 'Add a Gemini API key in Settings -> AI.' };
    try {
      broadcastSphere('working', store.state.lang === 'en' ? 'Generating video from photo…' : 'Создаю видео по фото…');
      const item = await mediaGen.generateVideo({
        mediaDir: store.mediaDir,
        provider: target.provider,
        model: target.model,
        apiKey: store.getApiKey(target.provider),
        prompt: instruction,
        referencePath: sourcePath
      });
      store.state.mediaItems.unshift(item);
      let chat = store.state.chats.find(c => c.id === store.state.activeChatId);
      if (!chat) chat = createNewChat(null);
      chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: item.prompt, timestamp: Date.now(), media: item });
      store.save();
      broadcastState();
      autoUploadFileToDrive(item.filePath, 'media', 'video/mp4');
      scheduleDriveStateSync();
      return { ok: true, item };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      broadcastSphere('idle');
    }
  });

  ipcMain.handle('nex:transcribeAudio', async (_e, { audioBase64, mimeType, wakeCheck }) => {
    const keys = store.getAllApiKeys();
    return await llm.transcribeAudio({
      geminiKey: keys.Gemini || '',
      openaiKey: keys.OpenAI || '',
      groqKey: keys.Groq || '',
      geminiModels: store.state.modelCatalog?.Gemini || [],
      audioBase64,
      mimeType,
      lang: store.state.lang || 'ru',
      wakeCheck: Boolean(wakeCheck)
    });
  });

  ipcMain.handle('nex:setSphereVisual', (_e, { state, label, transcript }) => {
    broadcastSphere(state, label, transcript);
    return { ok: true };
  });

  ipcMain.handle('nex:stopSpeaking', () => {
    isSpeakingNow = false;
    tts.stopNativeSpeech();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('nex:stopSpeaking');
      mainWin.webContents.send('nex:speakingState', false);
    }
    return { ok: true };
  });

  ipcMain.handle('nex:speechFinished', () => {
    isSpeakingNow = false;
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('nex:speakingState', false);
    }
    if (!activeAbort) broadcastSphere('idle', undefined, '');
    return { ok: true };
  });

  ipcMain.handle('nex:cancelGeneration', () => {
    if (activeAbort) activeAbort.abort();
    safety.cancelActive();
    broadcastSphere('idle');
    return { ok: true };
  });

  ipcMain.handle('nex:resolveConfirmation', (_e, approved) => {
    safety.resolve(Boolean(approved));
    return { ok: true };
  });

  async function speakReplyIfNeeded(replyText, shouldSpeak) {
    if (!shouldSpeak || !replyText) return;
    const s = store.state;
    const isEn = s.lang === 'en';
    isSpeakingNow = true;
    broadcastSphere('speaking', isEn ? 'Speaking…' : 'Отвечаю…', '');
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('nex:speakingState', true);
    try {
      const keys = store.getAllApiKeys();
      const ttsRes = await tts.synthesizeOrSpeak({
        text: replyText,
        lang: s.lang,
        voice: s.voice,
        rate: s.speechRate,
        geminiKey: keys.Gemini || '',
        openaiKey: keys.OpenAI || ''
      });
      if (ttsRes.mode === 'audio' || ttsRes.mode === 'webspeech') {
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send('nex:speakPayload', {
            ...ttsRes,
            lang: s.lang,
            voice: s.voice,
            rate: s.speechRate
          });
          return; // renderer will call nex:speechFinished when playback ends
        }
      }
    } catch (_) {
    }
    isSpeakingNow = false;
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('nex:speakingState', false);
    broadcastSphere('idle', undefined, '');
  }

  ipcMain.handle('nex:sendMessage', async (_e, { text, attachments, genMode, fromVoice }) => {
    const s = store.state;
    const isEn = s.lang === 'en';
    const cleanText = String(text || '').trim();
    const atts = Array.isArray(attachments) ? attachments : [];
    if (!cleanText && !atts.length) return { ok: false };

    let chat = s.chats.find(c => c.id === s.activeChatId);
    if (!chat) chat = createNewChat(null);

    chat.messages.push({
      id: crypto.randomUUID(),
      role: 'user',
      text: cleanText,
      timestamp: Date.now(),
      attachmentNames: atts.map(a => a.name)
    });
    chat.updatedAt = Date.now();
    if (!chat.projectId && cleanText && chat.messages.filter(m => m.role === 'user').length === 1) {
      chat.title = cleanText.slice(0, 40);
    }
    store.save();
    broadcastState();

    activeAbort = new AbortController();
    const signal = activeAbort.signal;

    try {
      if (genMode === 'image' || genMode === 'video') {
        const target = resolveMediaTarget(genMode);
        if (!target) {
          const msg = isEn
            ? `Add a Gemini${genMode === 'image' ? ' or OpenAI' : ''} API key in Settings -> AI.`
            : `Добавь API-ключ Gemini${genMode === 'image' ? ' или OpenAI' : ''} в Настройках → ИИ.`;
          chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: msg, timestamp: Date.now() });
          store.save();
          broadcastState();
          return { ok: false };
        }
        const apiKey = store.getApiKey(target.provider);
        const imgAtt = atts.find(a => a.base64Image);
        broadcastSphere('working', genMode === 'image' ? (isEn ? 'Generating image…' : 'Рисую картинку…') : (isEn ? 'Generating video…' : 'Создаю видео…'));

        let media;
        if (genMode === 'image') {
          if (imgAtt) {
            const tmp = path.join(store.mediaDir, `src_${Date.now()}.png`);
            fs.writeFileSync(tmp, Buffer.from(imgAtt.base64Image, 'base64'));
            media = await mediaGen.editImageWithAi({ mediaDir: store.mediaDir, provider: target.provider, model: target.model, apiKey, sourcePath: tmp, instruction: cleanText, signal });
          } else {
            media = await mediaGen.generateImage({ mediaDir: store.mediaDir, provider: target.provider, model: target.model, apiKey, prompt: cleanText, signal });
          }
        } else {
          let refPath = null;
          if (imgAtt) {
            refPath = path.join(store.mediaDir, `ref_${Date.now()}.png`);
            fs.writeFileSync(refPath, Buffer.from(imgAtt.base64Image, 'base64'));
          }
          media = await mediaGen.generateVideo({ mediaDir: store.mediaDir, provider: target.provider, model: target.model, apiKey, prompt: cleanText, referencePath: refPath, signal });
        }
        s.mediaItems.unshift(media);
        autoUploadFileToDrive(media.filePath, 'media', media.isVideo ? 'video/mp4' : 'image/png');
        const doneText = genMode === 'image'
          ? (isEn ? `Image ready (${media.modelName}).` : `Картинка готова (${media.modelName}).`)
          : (isEn ? `Video ready (${media.modelName}).` : `Видео готово (${media.modelName}).`);
        chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: doneText, timestamp: Date.now(), media });
        store.save();
        broadcastState();
        return { ok: true };
      }

      const memMatch = /^(?:запомни|remember)[\s:,-]+(.+)/i.exec(cleanText);
      if (memMatch && s.memoryAutoSave && s.memoryEnabled) {
        const fact = memMatch[1].trim();
        if (fact && !s.memories.includes(fact)) s.memories.unshift(fact);
        const reply = isEn ? `Remembered: "${fact}".` : `Запомнил: «${fact}».`;
        chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: reply, timestamp: Date.now() });
        store.save();
        broadcastState();
        return { ok: true };
      }

      const target = resolveTextTarget();
      if (!target) {
        const msg = isEn
          ? 'No API key configured for the selected model/profile. Add a key in Settings -> AI.'
          : 'Для выбранной модели или профиля не добавлен API-ключ. Добавь ключ в Настройках → ИИ.';
        chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: msg, timestamp: Date.now() });
        store.save();
        broadcastState();
        return { ok: false };
      }

      const proj = chat.projectId ? s.projects.find(p => p.id === chat.projectId) : null;
      const recent = chat.messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-24);
      const llmHistory = recent.map((m, idx) => {
        if (idx === recent.length - 1 && m.role === 'user' && atts.length) {
          const textExtras = atts.filter(a => a.textPreview).map(a => `[File: ${a.name}]\n${a.textPreview}`).join('\n\n');
          const combined = [m.text, textExtras].filter(Boolean).join('\n\n');
          const images = atts.filter(a => a.base64Image).map(a => ({ mimeType: a.mimeType, base64: a.base64Image }));
          return { role: 'user', text: combined, images };
        }
        return { role: m.role, text: m.text };
      });

      const res = await runAgentTurn({
        store,
        safety,
        electronShell: shell,
        electronClipboard: clipboard,
        provider: target.provider,
        model: target.model,
        apiKey: store.getApiKey(target.provider),
        effort: s.effort,
        projectFolder: proj?.folderPath || '',
        history: llmHistory,
        onStatus: (st, lbl) => broadcastSphere(st, lbl),
        signal
      });

      for (const fact of res.savedMemories) {
        if (fact && !s.memories.includes(fact)) s.memories.unshift(fact);
      }
      for (const art of res.createdArtifacts) {
        s.artifacts.unshift(art);
        autoUploadArtifactToDrive(art);
      }

      const firstArtId = res.createdArtifacts[0]?.id || null;
      const finalReply = res.finalText || (isEn ? 'Done.' : 'Готово.');
      chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: finalReply, timestamp: Date.now(), artifactId: firstArtId });
      for (const extra of res.createdArtifacts.slice(1)) {
        chat.messages.push({ id: crypto.randomUUID(), role: 'assistant', text: extra.title, timestamp: Date.now(), artifactId: extra.id });
      }
      chat.updatedAt = Date.now();
      store.save();
      broadcastState();

      const shouldSpeak = Boolean(fromVoice || s.autoSpeak);
      await speakReplyIfNeeded(finalReply, shouldSpeak);
      return { ok: true };
    } catch (err) {
      const textMsg = err?.name === 'AbortError'
        ? (isEn ? 'Stopped.' : 'Остановлено.')
        : `${isEn ? 'Error' : 'Ошибка'}: ${err?.message || 'unknown'}`;
      chat.messages.push({ id: crypto.randomUUID(), role: err?.name === 'AbortError' ? 'system' : 'assistant', text: textMsg, timestamp: Date.now() });
      store.save();
      broadcastState();
      return { ok: false, error: textMsg };
    } finally {
      activeAbort = null;
      if (!isSpeakingNow) broadcastSphere('idle', undefined, '');
      scheduleDriveStateSync();
    }
  });

  ipcMain.handle('nex:addMemory', (_e, fact) => {
    const clean = String(fact || '').trim();
    if (clean && !store.state.memories.includes(clean)) {
      store.state.memories.unshift(clean);
      store.save();
      broadcastState();
    }
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:removeMemory', (_e, index) => {
    if (index >= 0 && index < store.state.memories.length) {
      store.state.memories.splice(index, 1);
      store.save();
      broadcastState();
    }
    return store.publicSnapshot();
  });

  ipcMain.handle('nex:clearMemories', () => {
    store.state.memories = [];
    store.save();
    broadcastState();
    return store.publicSnapshot();
  });

  // --- Artifacts CRUD ---
  ipcMain.handle('nex:createArtifact', (_e, { type, title }) => {
    const cleanType = ['presentation', 'table', 'document', 'html'].includes(type) ? type : 'document';
    const cleanTitle = String(title || '').trim() || cleanType;
    const defaults = {
      presentation: JSON.stringify([{ title: cleanTitle, subtitle: 'Created in Nex', bullets: ['Point 1', 'Point 2'] }], null, 2),
      table: 'Item,Plan,Actual\nTask A,100,120\nTask B,50,45',
      html: `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:24px"><h2>${cleanTitle}</h2><p>Interactive HTML artifact</p></body>`,
      document: `# ${cleanTitle}\n\nWrite your notes here.\n\n- Key point 1\n- Key point 2`
    };
    const art = { id: crypto.randomUUID(), type: cleanType, title: cleanTitle, content: defaults[cleanType], createdAt: Date.now() };
    store.state.artifacts.unshift(art);
    store.save();
    broadcastState();
    autoUploadArtifactToDrive(art);
    scheduleDriveStateSync();
    return art;
  });

  ipcMain.handle('nex:updateArtifact', (_e, { id, content, title }) => {
    const art = store.state.artifacts.find(a => a.id === id);
    if (art) {
      if (typeof content === 'string') art.content = content;
      if (typeof title === 'string' && title.trim()) art.title = title.trim();
      store.save();
      broadcastState();
      autoUploadArtifactToDrive(art);
      scheduleDriveStateSync();
    }
    return { ok: true };
  });

  ipcMain.handle('nex:deleteArtifact', (_e, id) => {
    store.state.artifacts = store.state.artifacts.filter(a => a.id !== id);
    store.save();
    broadcastState();
    return { ok: true };
  });

  ipcMain.handle('nex:exportArtifact', async (_e, id) => {
    const art = store.state.artifacts.find(a => a.id === id);
    if (!art) return { ok: false };
    const extMap = { presentation: 'json', table: 'csv', document: 'md', html: 'html' };
    const ext = extMap[art.type] || 'txt';
    const res = await dialog.showSaveDialog(mainWin, {
      defaultPath: `${art.title.replace(/[^\wа-яА-ЯёЁ -]/g, '_')}.${ext}`
    });
    if (res.canceled || !res.filePath) return { ok: false };
    fs.writeFileSync(res.filePath, art.content, 'utf8');
    return { ok: true, filePath: res.filePath };
  });

  ipcMain.handle('nex:revealFile', (_e, filePath) => {
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('nex:openExternalUrl', (_e, url) => {
    if (/^https?:\/\//i.test(String(url || ''))) shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('nex:openMainWindow', () => { createMainWindow(); return { ok: true }; });
  ipcMain.handle('nex:toggleCompanion', () => { toggleCompanion(); return { ok: true }; });
  ipcMain.handle('nex:showCompanionMenu', () => {
    if (companionWin && !companionWin.isDestroyed()) buildCompanionContextMenu().popup({ window: companionWin });
    return { ok: true };
  });
  ipcMain.on('nex:moveCompanionBy', (_e, { dx, dy }) => {
    if (!companionWin || companionWin.isDestroyed()) return;
    const [cx, cy] = companionWin.getPosition();
    const nx = Math.round(cx + Number(dx || 0));
    const ny = Math.round(cy + Number(dy || 0));
    companionWin.setPosition(nx, ny);
    store.state.companionPos = { x: nx, y: ny };
    store.save();
  });
  ipcMain.handle('nex:openNexCode', () => { launchNexCodeTerminal(); return { ok: true }; });

  const broadcastNexCode = (snap) => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('nex:nexCodeUpdate', snap); };
  ipcMain.handle('nex:nexCodeGet', () => nexCodeMgr.snapshot());
  ipcMain.handle('nex:nexCodeNew', () => { nexCodeMgr.createSession(nexCodeMgr.getActiveSession()?.cwd); const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodeOpen', (_e, id) => { if (nexCodeMgr.loadSession(id)) nexCodeMgr.activeSessionId = id; const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodeDelete', (_e, id) => { nexCodeMgr.deleteSession(id); const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodePickFolder', async () => { const r = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] }); if (!r.canceled && r.filePaths.length) nexCodeMgr.setCwd(r.filePaths[0]); const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodeToggleAuto', (_e, enabled) => { nexCodeMgr.autoApprove = Boolean(enabled); const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodeCancel', () => { nexCodeMgr.cancel(); const s = nexCodeMgr.snapshot(); broadcastNexCode(s); return s; });
  ipcMain.handle('nex:nexCodeSend', async (_e, prompt) => {
    const target = resolveTextTarget();
    if (!target) return { ok: false, error: store.state.lang === 'en' ? 'Add an API key in Settings -> AI first.' : 'Сначала добавь API-ключ в Настройках → ИИ.' };
    return await nexCodeMgr.sendTask({ prompt, store, target: { provider: target.provider, model: target.model, apiKey: store.getApiKey(target.provider) }, effort: store.state.effort, lang: store.state.lang, safety, onUpdate: broadcastNexCode, onSphere: (st, lbl, tr) => broadcastSphere(st, lbl, tr) });
  });

  ipcMain.handle('nex:storageGetStats', () => storage.getStorageStats(store, nexCodeMgr.sessionsDir));
  ipcMain.handle('nex:storageSaveConfig', (_e, patch) => {
    const cur = store.state.storageConfig || { backend: 'webdav', webdav: { url: '', username: '', passwordEnc: '', rootFolder: 'Nex' }, s3: { endpoint: '', region: 'auto', bucket: '', accessKeyId: '', secretAccessKeyEnc: '', prefix: 'Nex' }, localFolder: '' };
    if (patch.backend) cur.backend = String(patch.backend);
    if (patch.webdav) {
      cur.webdav = cur.webdav || {};
      if (patch.webdav.url !== undefined) cur.webdav.url = String(patch.webdav.url).trim();
      if (patch.webdav.username !== undefined) cur.webdav.username = String(patch.webdav.username).trim();
      if (patch.webdav.rootFolder !== undefined) cur.webdav.rootFolder = String(patch.webdav.rootFolder).trim() || 'Nex';
      if (patch.webdav.password) cur.webdav.passwordEnc = store.encrypt(String(patch.webdav.password).trim());
    }
    if (patch.s3) {
      cur.s3 = cur.s3 || {};
      if (patch.s3.endpoint !== undefined) cur.s3.endpoint = String(patch.s3.endpoint).trim();
      if (patch.s3.region !== undefined) cur.s3.region = String(patch.s3.region).trim() || 'auto';
      if (patch.s3.bucket !== undefined) cur.s3.bucket = String(patch.s3.bucket).trim();
      if (patch.s3.accessKeyId !== undefined) cur.s3.accessKeyId = String(patch.s3.accessKeyId).trim();
      if (patch.s3.prefix !== undefined) cur.s3.prefix = String(patch.s3.prefix).trim() || 'Nex';
      if (patch.s3.secretAccessKey) cur.s3.secretAccessKeyEnc = store.encrypt(String(patch.s3.secretAccessKey).trim());
    }
    if (patch.localFolder !== undefined) cur.localFolder = String(patch.localFolder).trim();
    store.state.storageConfig = cur; store.save(); broadcastState();
    return { ok: true, state: store.publicSnapshot() };
  });
  ipcMain.handle('nex:storagePickLocalFolder', async () => {
    const res = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths.length) return { canceled: true };
    store.state.storageConfig = store.state.storageConfig || {}; store.state.storageConfig.backend = 'local_folder'; store.state.storageConfig.localFolder = res.filePaths[0];
    store.save(); broadcastState();
    return { ok: true, folder: res.filePaths[0] };
  });
  ipcMain.handle('nex:storageTest', async () => { try { return { ok: true, message: await storage.testConnection(store, auth) }; } catch (err) { return { ok: false, error: err.message }; } });
  ipcMain.handle('nex:storagePushAll', async (_e, passphrase) => { try { if (passphrase) { store.state.drivePassphraseEnc = store.encrypt(String(passphrase).trim()); store.save(); } const report = await storage.pushAll({ store, authModule: auth, passphrase, onProgress: (p) => emitDriveStatus(p) }); broadcastState(); return { ok: true, report }; } catch (err) { return { ok: false, error: err.message }; } });
  ipcMain.handle('nex:storagePullAll', async (_e, passphrase) => { try { if (passphrase) { store.state.drivePassphraseEnc = store.encrypt(String(passphrase).trim()); store.save(); } const res = await storage.pullAll({ store, authModule: auth, passphrase, onProgress: (p) => emitDriveStatus(p) }); broadcastState(); return { ok: true, state: res.state, report: res.report }; } catch (err) { return { ok: false, error: err.message }; } });
}

app.setName('Nex');

app.whenReady().then(() => {
  store = new NexStore(app.getPath('userData'), safeStorage);
  nexCodeMgr = new DesktopNexCodeManager(app.getPath('userData'));
  safety = new SafetyGuard((pending) => broadcastConfirmation(pending));
  registerIpc();

  tray = new Tray(renderTrayIcon(store.state.voice === 'f'));
  tray.setToolTip('Nex');
  tray.on('click', () => {
    if (mainWin && mainWin.isVisible()) mainWin.focus();
    else createMainWindow();
  });

  createCompanionWindow();
  createMainWindow();
  rebuildMenus();
  startLocalBridge();
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  if (store.state.autoRefreshModels !== false && (Date.now() - (store.state.lastModelsRefreshAt || 0) > SIX_HOURS)) {
    setTimeout(() => refreshAllModelsFromApis(null).catch(() => {}), 2500);
  }
  setInterval(() => { if (store && store.state.autoRefreshModels !== false) refreshAllModelsFromApis(null).catch(() => {}); }, SIX_HOURS);

  globalShortcut.register('CommandOrControl+Alt+N', toggleCompanion);
  globalShortcut.register('CommandOrControl+Shift+N', () => createMainWindow());
});

app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (bridgeServer) { try { bridgeServer.close(); } catch (_) {} }
});
app.on('window-all-closed', () => { if (isQuitting) app.quit(); });
