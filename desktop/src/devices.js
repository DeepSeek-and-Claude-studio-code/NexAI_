'use strict';

const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function getLocalLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const iface of (list || [])) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function generatePairingToken() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getSystemTelemetry() {
  const totalMem = os.totalmem() || 1;
  const freeMem = os.freemem() || 0;
  const ramUsedPct = Math.min(100, Math.max(0, Math.round(((totalMem - freeMem) / totalMem) * 100)));
  const cpus = os.cpus() || [];
  const load1 = (os.loadavg && os.loadavg()[0]) || 0;
  const cpuLoadPct = Math.min(100, Math.max(0, Math.round((load1 / Math.max(1, cpus.length)) * 100)));
  let diskUsedPct = null;
  if (process.platform === 'linux') {
    try {
      const out = execFileSync('df', ['-P', '/'], { encoding: 'utf8', timeout: 1500 });
      const line = out.trim().split('\n')[1] || '';
      const m = /(\d+)%/.exec(line);
      if (m) diskUsedPct = Number(m[1]);
    } catch (_) {}
  }
  return { cpuCores: cpus.length || 1, cpuLoadPct, ramUsedPct, ramTotalGb: Number((totalMem / (1024 ** 3)).toFixed(1)), diskUsedPct };
}

function defaultEcosystemDevices() {
  return {
    hubs: [{
      id: 'hub_living', model: 'Nex Hub Ultra', name: 'Nex Hub Ultra · Гостиная', connected: false,
      connectionType: 'Wi-Fi', wifiSsid: '', activity: 'Ожидает подключения', character: 'm',
      brightness: 75, cameraTracking: true, volume: 65, audioService: 'Яндекс Музыка',
      nightDnd: false, keysSyncedAt: 0, lastIntercom: ''
    }],
    clip: { name: 'Nex AI Clip', connected: false, battery: 88, freeStoragePct: 74, continuousNotes: false, quickButtonAction: 'voice_nex', privacyMute: false, lastSummary: '' },
    watch: { name: 'Nex Watch', connected: false, battery: 82, quickVoice: true, silentHints: true, shareHealthContext: false, hubMediaRemote: true, lastPulse: 72, lastSleepHours: 7.4 },
    glasses: { name: 'Nex AR Glasses', connected: false, battery: 69, hudBrightness: 60, liveSubtitles: false, syncTranslate: false, navHints: true, lastVisionResult: '' }
  };
}

function mergeEcosystemDevices(saved) {
  const def = defaultEcosystemDevices();
  if (!saved || typeof saved !== 'object') return def;
  return {
    hubs: Array.isArray(saved.hubs) && saved.hubs.length ? saved.hubs : def.hubs,
    clip: Object.assign({}, def.clip, saved.clip || {}),
    watch: Object.assign({}, def.watch, saved.watch || {}),
    glasses: Object.assign({}, def.glasses, saved.glasses || {})
  };
}

function getThisDeviceInfo(store, bridgePort) {
  const s = store.state, ips = getLocalLanIps();
  return {
    id: s.deviceId || 'desktop_local', name: s.deviceName || os.hostname() || 'Nex Core (Fedora)',
    platform: process.platform === 'linux' ? 'Fedora / Linux' : process.platform, arch: process.arch,
    lanIps: ips, primaryIp: ips[0] || '127.0.0.1', port: bridgePort, lanEnabled: s.lanBridgeEnabled !== false,
    pairingToken: s.devicePairingToken || '', online: true, uptimeSec: Math.round(process.uptime()),
    telemetry: getSystemTelemetry()
  };
}

module.exports = { getLocalLanIps, generatePairingToken, getSystemTelemetry, defaultEcosystemDevices, mergeEcosystemDevices, getThisDeviceInfo };
