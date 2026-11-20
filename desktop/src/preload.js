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

  onStateChanged: (cb) => ipcRenderer.on('nex:stateChanged', (_e, data) => cb(data)),
  onSphereState: (cb) => ipcRenderer.on('nex:sphereState', (_e, data) => cb(data)),
  onConfirmation: (cb) => ipcRenderer.on('nex:confirmation', (_e, data) => cb(data)),
  onSpeakText: (cb) => ipcRenderer.on('nex:speakText', (_e, data) => cb(data)),
  onDriveStatus: (cb) => ipcRenderer.on('nex:driveStatus', (_e, msg) => cb(msg))
});
