'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexApi', {
  getBootstrap: () => ipcRenderer.invoke('nex:getBootstrap'),
  updateSettings: (patch) => ipcRenderer.invoke('nex:updateSettings', patch),
  setApiKey: (provider, value) => ipcRenderer.invoke('nex:setApiKey', { provider, value }),
  saveMailConfig: (cfg) => ipcRenderer.invoke('nex:saveMailConfig', cfg),
  testMail: () => ipcRenderer.invoke('nex:testMail'),
  refreshModels: () => ipcRenderer.invoke('nex:refreshModels'),

  // Account Auth & Encrypted Sync
  registerEmail: (payload) => ipcRenderer.invoke('nex:registerEmail', payload),
  signInEmail: (payload) => ipcRenderer.invoke('nex:signInEmail', payload),
  signInGoogle: (clientId, linkDriveOnly) => ipcRenderer.invoke('nex:signInGoogle', { clientId, linkDriveOnly: Boolean(linkDriveOnly) }),
  setDrivePassphrase: (passphrase) => ipcRenderer.invoke('nex:setDrivePassphrase', passphrase),
  signOut: () => ipcRenderer.invoke('nex:signOut'),
  syncDriveUpload: (passphrase) => ipcRenderer.invoke('nex:syncDriveUpload', passphrase),
  syncDriveDownload: (passphrase) => ipcRenderer.invoke('nex:syncDriveDownload', passphrase),
  exportVault: (passphrase) => ipcRenderer.invoke('nex:exportVault', passphrase),
  importVault: (passphrase) => ipcRenderer.invoke('nex:importVault', passphrase),

  // Chats & Projects
  newChat: (projectId) => ipcRenderer.invoke('nex:newChat', projectId || null),
  openChat: (chatId) => ipcRenderer.invoke('nex:openChat', chatId),
  deleteChat: (chatId) => ipcRenderer.invoke('nex:deleteChat', chatId),
  createProject: (name, description) => ipcRenderer.invoke('nex:createProject', { name, description }),
  pickProjectFolder: (projectId) => ipcRenderer.invoke('nex:pickProjectFolder', projectId),

  // Messaging & Safety
  pickAttachments: () => ipcRenderer.invoke('nex:pickAttachments'),
  sendMessage: (payload) => ipcRenderer.invoke('nex:sendMessage', payload),
  cancelGeneration: () => ipcRenderer.invoke('nex:cancelGeneration'),
  editMessage: (payload) => ipcRenderer.invoke('nex:editMessage', payload),
  regenerateLast: (chatId) => ipcRenderer.invoke('nex:regenerateLast', chatId),
  getQuotaDashboard: () => ipcRenderer.invoke('nex:getQuotaDashboard'),
  resetProviderCooldown: (provider) => ipcRenderer.invoke('nex:resetProviderCooldown', provider),
  captureScreen: () => ipcRenderer.invoke('nex:captureScreen'),
  stopSpeech: () => ipcRenderer.invoke('nex:stopSpeech'),
  spotlightSend: (payload) => ipcRenderer.invoke('nex:spotlightSend', payload),
  spotlightClose: () => ipcRenderer.invoke('nex:spotlightClose'),
  spotlightOpenMain: () => ipcRenderer.invoke('nex:spotlightOpenMain'),
  updateProject: (payload) => ipcRenderer.invoke('nex:updateProject', payload),
  reindexProjectRag: (projectId) => ipcRenderer.invoke('nex:reindexProjectRag', projectId),
  updateMemory: (payload) => ipcRenderer.invoke('nex:updateMemory', payload),
  restoreArtifactVersion: (id, vIndex) => ipcRenderer.invoke('nex:restoreArtifactVersion', { id, vIndex }),
  exportArtifactPdf: (id) => ipcRenderer.invoke('nex:exportArtifactPdf', id),
  updateMediaTags: (id, tags) => ipcRenderer.invoke('nex:updateMediaTags', { id, tags }),
  nexCodeRollback: (checkpointId) => ipcRenderer.invoke('nex:nexCodeRollback', checkpointId),
  transcribeAudio: (payload) => ipcRenderer.invoke('nex:transcribeAudio', payload),
  setSphereVisual: (state, label, transcript) => ipcRenderer.invoke('nex:setSphereVisual', { state, label, transcript: transcript || '' }),
  stopSpeaking: () => ipcRenderer.invoke('nex:stopSpeaking'),
  speechFinished: () => ipcRenderer.invoke('nex:speechFinished'),
  testVoice: () => ipcRenderer.invoke('nex:testVoice'),
  // Devices & Remote Handoff
  devicesGet: () => ipcRenderer.invoke('nex:devicesGet'),
  devicesUpdate: (patch) => ipcRenderer.invoke('nex:devicesUpdate', patch),
  devicesRegenToken: () => ipcRenderer.invoke('nex:devicesRegenToken'),
  devicesRemovePaired: (id) => ipcRenderer.invoke('nex:devicesRemovePaired', id),
  devicesSaveEcosystem: (eco) => ipcRenderer.invoke('nex:devicesSaveEcosystem', eco),
  devicesHubSetup: (payload) => ipcRenderer.invoke('nex:devicesHubSetup', payload),
  devicesHubIntercom: (payload) => ipcRenderer.invoke('nex:devicesHubIntercom', payload),
  devicesSyncHubKeys: (hubId) => ipcRenderer.invoke('nex:devicesSyncHubKeys', hubId),
  devicesClipboardPush: (text) => ipcRenderer.invoke('nex:devicesClipboardPush', text),
  resolveConfirmation: (approved) => ipcRenderer.invoke('nex:resolveConfirmation', approved),

  // Memory
  addMemory: (fact) => ipcRenderer.invoke('nex:addMemory', fact),
  removeMemory: (index) => ipcRenderer.invoke('nex:removeMemory', index),
  clearMemories: () => ipcRenderer.invoke('nex:clearMemories'),

  // Artifacts (Create, Edit, Delete, Export)
  createArtifact: (type, title) => ipcRenderer.invoke('nex:createArtifact', { type, title }),
  updateArtifact: (id, content, title) => ipcRenderer.invoke('nex:updateArtifact', { id, content, title }),
  deleteArtifact: (id) => ipcRenderer.invoke('nex:deleteArtifact', id),
  exportArtifact: (id) => ipcRenderer.invoke('nex:exportArtifact', id),

  // Media Studio (Pick, Save Edited Photo/Video, AI Photo Edit, AI Image->Video)
  pickMediaFile: (kind) => ipcRenderer.invoke('nex:pickMediaFile', kind),
  saveEditedMedia: (payload) => ipcRenderer.invoke('nex:saveEditedMedia', payload),
  aiEditPhoto: (payload) => ipcRenderer.invoke('nex:aiEditPhoto', payload),
  aiImageToVideo: (payload) => ipcRenderer.invoke('nex:aiImageToVideo', payload),

  revealFile: (filePath) => ipcRenderer.invoke('nex:revealFile', filePath),
  openExternalUrl: (url) => ipcRenderer.invoke('nex:openExternalUrl', url),

  openMainWindow: () => ipcRenderer.invoke('nex:openMainWindow'),
  toggleCompanion: () => ipcRenderer.invoke('nex:toggleCompanion'),
  showCompanionMenu: () => ipcRenderer.invoke('nex:showCompanionMenu'),
  moveCompanionBy: (dx, dy) => ipcRenderer.send('nex:moveCompanionBy', { dx, dy }),
  openNexCode: () => ipcRenderer.invoke('nex:openNexCode'),
  nexCodeGet: () => ipcRenderer.invoke('nex:nexCodeGet'),
  nexCodeNew: () => ipcRenderer.invoke('nex:nexCodeNew'),
  nexCodeOpen: (id) => ipcRenderer.invoke('nex:nexCodeOpen', id),
  nexCodeDelete: (id) => ipcRenderer.invoke('nex:nexCodeDelete', id),
  nexCodePickFolder: () => ipcRenderer.invoke('nex:nexCodePickFolder'),
  nexCodeToggleAuto: (enabled) => ipcRenderer.invoke('nex:nexCodeToggleAuto', enabled),
  nexCodeSend: (prompt) => ipcRenderer.invoke('nex:nexCodeSend', prompt),
  nexCodeCancel: () => ipcRenderer.invoke('nex:nexCodeCancel'),
  storageGetStats: () => ipcRenderer.invoke('nex:storageGetStats'),
  storageSaveConfig: (patch) => ipcRenderer.invoke('nex:storageSaveConfig', patch),
  storagePickLocalFolder: () => ipcRenderer.invoke('nex:storagePickLocalFolder'),
  storageTest: () => ipcRenderer.invoke('nex:storageTest'),
  storagePushAll: (passphrase) => ipcRenderer.invoke('nex:storagePushAll', passphrase),
  storagePullAll: (passphrase) => ipcRenderer.invoke('nex:storagePullAll', passphrase),

  onStateChanged: (cb) => ipcRenderer.on('nex:stateChanged', (_e, data) => cb(data)),
  onSphereState: (cb) => ipcRenderer.on('nex:sphereState', (_e, data) => cb(data)),
  onConfirmation: (cb) => ipcRenderer.on('nex:confirmation', (_e, data) => cb(data)),
  onSpeakText: (cb) => ipcRenderer.on('nex:speakText', (_e, data) => cb(data)),
  onSpeakPayload: (cb) => ipcRenderer.on('nex:speakPayload', (_e, data) => cb(data)),
  onStopSpeak: (cb) => ipcRenderer.on('nex:stopSpeak', () => cb()),
  onSpeakingState: (cb) => ipcRenderer.on('nex:speakingState', (_e, speaking) => cb(Boolean(speaking))),
  onStopSpeaking: (cb) => ipcRenderer.on('nex:stopSpeaking', () => cb()),
  onDriveStatus: (cb) => ipcRenderer.on('nex:driveStatus', (_e, msg) => cb(msg)),
  onNexCodeUpdate: (cb) => ipcRenderer.on('nex:nexCodeUpdate', (_e, snap) => cb(snap))
});
