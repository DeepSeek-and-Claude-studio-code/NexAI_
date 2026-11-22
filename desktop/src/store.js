'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { DEFAULT_MODELS, PROVIDERS, normalizeProfileId } = require('./constants');

function createDefaultAccountState() {
  const firstChatId = crypto.randomUUID();
  return {
    lang: 'ru',
    voice: 'm',
    speechRate: 1.0,
    autoSpeak: false,
    wakeWordEnabled: false,
    userName: '',
    showCompanion: true,
    selectedProfileId: 'quark',
    manualProvider: 'Gemini',
    manualModel: DEFAULT_MODELS.Gemini[0],
    imageModel: 'gemini-nano-banana-2.1',
    videoModel: 'gemini-omni-1.1-flash',
    lastGenMode: null,
    effort: 'medium',
    webSearchEnabled: false,
    memoryEnabled: true,
    memoryAutoSave: true,
    confirmSensitiveActions: true,
    driveAutoSync: true,
    driveFolderMode: 'visible',
    drivePassphraseEnc: '',
    customBaseUrl: '',
    autoRefreshModels: true,
    autoFailover: true,
    lastModelsRefreshAt: 0,
    storageConfig: {
      backend: 'webdav',
      webdav: { url: '', username: '', passwordEnc: '', rootFolder: 'Nex' },
      s3: { endpoint: '', region: 'auto', bucket: '', accessKeyId: '', secretAccessKeyEnc: '', prefix: 'Nex' },
      localFolder: ''
    },
    permissions: {
      files: true,
      shell: true,
      apps: true,
      clipboard: true,
      mail: true
    },
    mailConfig: {
      mode: 'imap',
      email: '',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
      useStartTls: false,
      passwordEnc: '',
      oauthAccessTokenEnc: '',
      oauthClientId: ''
    },
    apiKeysEnc: {},
    googleTokensEnc: { access: '', refresh: '' },
    modelCatalog: JSON.parse(JSON.stringify(DEFAULT_MODELS)),
    memories: [],
    projects: [
      { id: crypto.randomUUID(), name: 'Повседневное', description: 'Почта, заметки, поиск и задачи', folderPath: '' },
      { id: crypto.randomUUID(), name: 'Работа', description: 'Файлы проекта и команды терминала', folderPath: '' }
    ],
    artifacts: [],
    mediaItems: [],
    chats: [
      {
        id: firstChatId,
        title: 'Новый чат',
        projectId: null,
        updatedAt: Date.now(),
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'Привет, я Некс. Напиши мне, отредактируй фото/видео или выбери папку проекта.',
            timestamp: Date.now(),
            attachmentNames: []
          }
        ]
      }
    ],
    activeChatId: firstChatId,
    companionPos: null
  };
}

class NexStore {
  constructor(userDataDir, safeStorage) {
    this.dir = userDataDir;
    this.safeStorage = safeStorage;
    this.metaFile = path.join(userDataDir, 'nex-meta-v2.json');
    this.accountsDir = path.join(userDataDir, 'accounts');
    this.mediaDir = path.join(userDataDir, 'media');
    this.attachmentsDir = path.join(userDataDir, 'attachments');
    fs.mkdirSync(this.dir, { recursive: true });
    fs.mkdirSync(this.accountsDir, { recursive: true });
    fs.mkdirSync(this.mediaDir, { recursive: true });
    fs.mkdirSync(this.attachmentsDir, { recursive: true });

    this._fallbackKey = crypto
      .createHash('sha256')
      .update(`${os.hostname()}|${os.userInfo().username}|nex-desktop-v2`)
      .digest();

    this.meta = this._loadMeta();
    this.state = this._loadAccountState(this.meta.activeAccountId);
  }

  _safeId(raw) {
    if (!raw || raw === 'guest') return 'guest';
    return crypto.createHash('sha256').update(String(raw).toLowerCase()).digest('hex').slice(0, 24);
  }

  _accountFile(accId) {
    return path.join(this.accountsDir, `acc_${this._safeId(accId)}.json`);
  }

  encrypt(plain) {
    if (!plain) return '';
    try {
      if (this.safeStorage && this.safeStorage.isEncryptionAvailable()) {
        return 'ss:' + this.safeStorage.encryptString(plain).toString('base64');
      }
    } catch (_) {}
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this._fallbackKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return 'fb:' + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(stored) {
    if (!stored) return '';
    try {
      if (stored.startsWith('ss:') && this.safeStorage && this.safeStorage.isEncryptionAvailable()) {
        return this.safeStorage.decryptString(Buffer.from(stored.slice(3), 'base64'));
      }
      if (stored.startsWith('fb:')) {
        const buf = Buffer.from(stored.slice(3), 'base64');
        const iv = buf.subarray(0, 12);
        const tag = buf.subarray(12, 28);
        const enc = buf.subarray(28);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this._fallbackKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
      }
    } catch (_) {}
    return '';
  }

  _loadMeta() {
    const def = {
      onboarded: false,
      activeAccountId: 'guest',
      googleClientId: '',
      googleClientSecretEnc: '',
      accounts: {
        guest: { id: 'guest', authType: 'guest', email: '', displayName: '', lastSyncAt: 0 }
      },
      emailPasswordsEnc: {}
    };
    if (!fs.existsSync(this.metaFile)) return def;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.metaFile, 'utf8'));
      const m = Object.assign({}, def, parsed);
      m.accounts = Object.assign({}, def.accounts, parsed.accounts || {});
      m.emailPasswordsEnc = Object.assign({}, parsed.emailPasswordsEnc || {});
      return m;
    } catch (_) {
      return def;
    }
  }

  saveMeta() {
    const tmp = this.metaFile + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.meta, null, 2), 'utf8');
      fs.renameSync(tmp, this.metaFile);
    } catch (_) {
      try { fs.writeFileSync(this.metaFile, JSON.stringify(this.meta, null, 2), 'utf8'); } catch (_) {}
    }
  }

  _loadAccountState(accId) {
    const def = createDefaultAccountState();
    const file = this._accountFile(accId);
    if (!fs.existsSync(file)) return def;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const merged = Object.assign({}, def, parsed);
      merged.selectedProfileId = parsed.selectedProfileId === null ? null : normalizeProfileId(parsed.selectedProfileId || 'quark');
      merged.permissions = Object.assign({}, def.permissions, parsed.permissions || {});
      merged.mailConfig = Object.assign({}, def.mailConfig, parsed.mailConfig || {});
      merged.googleTokensEnc = Object.assign({}, def.googleTokensEnc, parsed.googleTokensEnc || {});
      merged.modelCatalog = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_MODELS)), parsed.modelCatalog || {});
      if (!Array.isArray(merged.mediaItems)) merged.mediaItems = [];
      if (!Array.isArray(merged.chats) || !merged.chats.length) {
        merged.chats = def.chats;
        merged.activeChatId = def.activeChatId;
      }
      if (!merged.chats.some(c => c.id === merged.activeChatId)) {
        merged.activeChatId = merged.chats[0].id;
      }
      return merged;
    } catch (_) {
      return def;
    }
  }

  save() {
    const file = this._accountFile(this.meta.activeAccountId);
    const tmp = file + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch (_) {
      try { fs.writeFileSync(file, JSON.stringify(this.state, null, 2), 'utf8'); } catch (_) {}
    }
    this.saveMeta();
  }

  switchAccount(profile) {
    this.save();
    this.meta.activeAccountId = profile.id;
    this.meta.accounts[profile.id] = Object.assign(
      { id: profile.id, authType: 'guest', email: '', displayName: '', lastSyncAt: 0 },
      this.meta.accounts[profile.id] || {},
      profile
    );
    this.saveMeta();
    this.state = this._loadAccountState(profile.id);
    if (profile.displayName && !this.state.userName) {
      this.state.userName = profile.displayName;
      this.save();
    }
  }

  getActiveAccount() {
    return this.meta.accounts[this.meta.activeAccountId] || { id: 'guest', authType: 'guest', email: '', displayName: '', lastSyncAt: 0 };
  }

  getApiKey(provider) {
    return this.decrypt((this.state.apiKeysEnc || {})[provider]);
  }

  setApiKey(provider, value) {
    if (!this.state.apiKeysEnc) this.state.apiKeysEnc = {};
    const trimmed = String(value || '').trim();
    if (!trimmed) delete this.state.apiKeysEnc[provider];
    else this.state.apiKeysEnc[provider] = this.encrypt(trimmed);
    this.save();
  }

  getAllApiKeys() {
    const out = {};
    for (const p of PROVIDERS) out[p] = this.getApiKey(p);
    return out;
  }

  getApiKeyStatus() {
    const out = {};
    for (const p of PROVIDERS) {
      const val = this.getApiKey(p);
      out[p] = val ? { set: true, masked: val.slice(0, 4) + '••••' + val.slice(-3) } : { set: false, masked: '' };
    }
    return out;
  }

  getDecryptedMailConfig() {
    const mc = this.state.mailConfig;
    return {
      mode: mc.mode || 'imap',
      email: mc.email || '',
      imapHost: mc.imapHost || 'imap.gmail.com',
      imapPort: Number(mc.imapPort) || 993,
      smtpHost: mc.smtpHost || 'smtp.gmail.com',
      smtpPort: Number(mc.smtpPort) || 465,
      useStartTls: Boolean(mc.useStartTls),
      password: this.decrypt(mc.passwordEnc),
      oauthAccessToken: this.decrypt(mc.oauthAccessTokenEnc),
      oauthClientId: mc.oauthClientId || ''
    };
  }

  saveMailConfig(cfg) {
    const mc = this.state.mailConfig;
    mc.mode = cfg.mode || 'imap';
    mc.email = String(cfg.email || '').trim();
    mc.imapHost = String(cfg.imapHost || 'imap.gmail.com').trim();
    mc.imapPort = Number(cfg.imapPort) || 993;
    mc.smtpHost = String(cfg.smtpHost || 'smtp.gmail.com').trim();
    mc.smtpPort = Number(cfg.smtpPort) || 465;
    mc.useStartTls = Boolean(cfg.useStartTls);
    mc.oauthClientId = String(cfg.oauthClientId || '').trim();
    if (typeof cfg.password === 'string' && cfg.password !== '__UNCHANGED__') {
      mc.passwordEnc = cfg.password ? this.encrypt(cfg.password) : '';
    }
    if (typeof cfg.oauthAccessToken === 'string' && cfg.oauthAccessToken !== '__UNCHANGED__') {
      mc.oauthAccessTokenEnc = cfg.oauthAccessToken ? this.encrypt(cfg.oauthAccessToken) : '';
    }
    this.save();
  }

  publicSnapshot() {
    const s = this.state;
    const acc = this.getActiveAccount();
    return {
      onboarded: Boolean(this.meta.onboarded),
      account: {
        ...acc,
        isSignedIn: acc.authType === 'email' || acc.authType === 'google',
        googleClientId: this.meta.googleClientId || '',
        driveConnected: Boolean(this.decrypt(s.googleTokensEnc?.access) || this.decrypt(s.googleTokensEnc?.refresh)),
        driveAutoSync: s.driveAutoSync !== false,
        driveFolderMode: s.driveFolderMode || 'visible',
        hasDrivePassphrase: Boolean(s.drivePassphraseEnc)
      },
      customBaseUrl: s.customBaseUrl || '',
      autoRefreshModels: s.autoRefreshModels !== false,
      autoFailover: s.autoFailover !== false,
      lastModelsRefreshAt: s.lastModelsRefreshAt || 0,
      storageConfig: {
        backend: s.storageConfig?.backend || 'webdav',
        webdav: { url: s.storageConfig?.webdav?.url || '', username: s.storageConfig?.webdav?.username || '', hasPassword: Boolean(s.storageConfig?.webdav?.passwordEnc), rootFolder: s.storageConfig?.webdav?.rootFolder || 'Nex' },
        s3: { endpoint: s.storageConfig?.s3?.endpoint || '', region: s.storageConfig?.s3?.region || 'auto', bucket: s.storageConfig?.s3?.bucket || '', accessKeyId: s.storageConfig?.s3?.accessKeyId || '', hasSecret: Boolean(s.storageConfig?.s3?.secretAccessKeyEnc), prefix: s.storageConfig?.s3?.prefix || 'Nex' },
        localFolder: s.storageConfig?.localFolder || ''
      },
      lang: s.lang,
      voice: s.voice,
      speechRate: s.speechRate,
      autoSpeak: s.autoSpeak,
      wakeWordEnabled: Boolean(s.wakeWordEnabled),
      userName: s.userName,
      showCompanion: s.showCompanion,
      selectedProfileId: s.selectedProfileId,
      manualProvider: s.manualProvider,
      manualModel: s.manualModel,
      imageModel: s.imageModel,
      videoModel: s.videoModel,
      lastGenMode: s.lastGenMode || null,
      effort: s.effort,
      webSearchEnabled: s.webSearchEnabled,
      memoryEnabled: s.memoryEnabled,
      memoryAutoSave: s.memoryAutoSave,
      confirmSensitiveActions: s.confirmSensitiveActions,
      permissions: s.permissions,
      apiKeyStatus: this.getApiKeyStatus(),
      mailConfigPublic: {
        mode: s.mailConfig.mode,
        email: s.mailConfig.email,
        imapHost: s.mailConfig.imapHost,
        imapPort: s.mailConfig.imapPort,
        smtpHost: s.mailConfig.smtpHost,
        smtpPort: s.mailConfig.smtpPort,
        useStartTls: s.mailConfig.useStartTls,
        oauthClientId: s.mailConfig.oauthClientId,
        hasPassword: Boolean(s.mailConfig.passwordEnc),
        hasOAuthToken: Boolean(s.mailConfig.oauthAccessTokenEnc)
      },
      modelCatalog: s.modelCatalog,
      memories: s.memories,
      projects: s.projects,
      artifacts: s.artifacts,
      mediaItems: s.mediaItems,
      chats: s.chats,
      activeChatId: s.activeChatId
    };
  }
}

module.exports = { NexStore };
