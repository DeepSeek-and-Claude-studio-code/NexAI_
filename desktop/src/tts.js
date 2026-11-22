'use strict';

const { spawn, execFileSync } = require('child_process');

let activeProc = null;
let activePlayProc = null;
const binCache = new Map();

function hasBin(name) {
  if (binCache.has(name)) return binCache.get(name);
  let ok = false;
  try {
    execFileSync('which', [name], { stdio: 'ignore' });
    ok = true;
  } catch (_) {}
  binCache.set(name, ok);
  return ok;
}

function cleanSpeechText(raw, lang) {
  let s = String(raw || '');
  s = s.replace(/```[\s\S]*?```/g, lang === 'en' ? ' (code block in chat). ' : ' (код в чате). ');
  s = s.replace(/\[([^\]]+)\]\((?:https?:\/\/[^)]+)\)/g, '$1');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/[#*_`~>|⚡]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 1600) {
    const cut = s.slice(0, 1600);
    const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    s = lastDot > 400 ? cut.slice(0, lastDot + 1) : cut;
  }
  return s;
}

function pcm16ToWavBase64(pcmBuf, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmBuf.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuf]).toString('base64');
}

function parseSampleRate(mimeType) {
  const m = /rate=(\d+)/i.exec(String(mimeType || ''));
  return m ? Number(m[1]) : 24000;
}

async function fetchWithTimeout(url, options, timeoutMs = 9500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryOpenAiTts({ openaiKey, text, voice, rate }) {
  if (!openaiKey) return null;
  const voiceName = voice === 'f' ? 'nova' : (voice === 'n' ? 'alloy' : 'onyx');
  const speed = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: voiceName, input: text, response_format: 'mp3', speed })
    }, 10000);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    return { mode: 'audio', mimeType: 'audio/mpeg', base64: buf.toString('base64') };
  } catch (_) {
    return null;
  }
}

async function tryGeminiTts({ geminiKey, text, voice }) {
  if (!geminiKey) return null;
  const voiceName = voice === 'f' ? 'Aoede' : (voice === 'n' ? 'Puck' : 'Charon');
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
      })
    }, 10000);
    if (!res.ok) return null;
    const data = await res.json();
    const audioPart = (data?.candidates?.[0]?.content?.parts || []).find(p => p?.inlineData?.data);
    if (!audioPart) return null;
    const mime = String(audioPart.inlineData.mimeType || 'audio/L16;rate=24000');
    const rawBuf = Buffer.from(audioPart.inlineData.data, 'base64');
    if (rawBuf.length < 200) return null;
    if (/audio\/(mp3|mpeg|wav|ogg|webm)/i.test(mime)) {
      return { mode: 'audio', mimeType: mime.split(';')[0], base64: rawBuf.toString('base64') };
    }
    return { mode: 'audio', mimeType: 'audio/wav', base64: pcm16ToWavBase64(rawBuf, parseSampleRate(mime), 1, 16) };
  } catch (_) {
    return null;
  }
}

function stopNativeSpeech() {
  if (activeProc) { try { activeProc.kill('SIGTERM'); } catch (_) {} activeProc = null; }
  if (activePlayProc) { try { activePlayProc.kill('SIGTERM'); } catch (_) {} activePlayProc = null; }
}

/**
 * On Fedora/Linux, generate WAV via espeak-ng --stdout and return it as base64 audio
 * so Electron plays it directly through PipeWire/PulseAudio without relying on speech-dispatcher!
 */
function tryEspeakWavBuffer({ text, lang, voice, rate }) {
  const bin = hasBin('espeak-ng') ? 'espeak-ng' : (hasBin('espeak') ? 'espeak' : null);
  if (!bin) return Promise.resolve(null);
  const clampedRate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));
  const wpm = Math.round(160 * clampedRate);
  const pitch = voice === 'f' ? '68' : (voice === 'n' ? '50' : '38');
  const vArg = (lang === 'en' ? 'en' : 'ru') + (voice === 'f' ? '+f3' : '+m3');
  return new Promise((resolve) => {
    const proc = spawn(bin, ['--stdout', '-v', vArg, '-p', pitch, '-s', String(wpm), text], { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks = [];
    let settled = false;
    const finish = (val) => { if (!settled) { settled = true; resolve(val); } };
    const timer = setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) {} finish(null); }, 10000);
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.on('error', () => { clearTimeout(timer); finish(null); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length) {
        const buf = Buffer.concat(chunks);
        if (buf.length > 200) return finish({ mode: 'audio', mimeType: 'audio/wav', base64: buf.toString('base64') });
      }
      finish(null);
    });
  });
}

function speakSpdSay({ text, lang, voice, rate }) {
  if (!hasBin('spd-say')) return Promise.resolve(false);
  stopNativeSpeech();
  const clampedRate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));
  const spdRate = Math.round((clampedRate - 1.0) * 100);
  const voiceType = voice === 'f' ? 'female1' : 'male1';
  return new Promise((resolve) => {
    const proc = spawn('spd-say', ['--wait', '-l', lang === 'en' ? 'en' : 'ru', '-t', voiceType, '-r', String(spdRate), text], { stdio: 'ignore' });
    activeProc = proc;
    proc.on('error', () => { if (activeProc === proc) activeProc = null; resolve(false); });
    proc.on('close', (code) => { if (activeProc === proc) activeProc = null; resolve(code === 0); });
  });
}

async function synthesizeOrSpeak({ text, lang, voice, rate, geminiKey, openaiKey }) {
  const clean = cleanSpeechText(text, lang);
  if (!clean) return { mode: 'none' };

  // Tier 1: Cloud Neural Voice (OpenAI -> Gemini) played via HTML5 <audio> in Electron
  const oai = await tryOpenAiTts({ openaiKey, text: clean, voice, rate });
  if (oai) return oai;

  const gem = await tryGeminiTts({ geminiKey, text: clean, voice });
  if (gem) return gem;

  // Tier 2: Offline espeak-ng -> WAV buffer played directly via HTML5 <audio> (100% reliable on Fedora PipeWire!)
  if (process.platform === 'linux') {
    const wav = await tryEspeakWavBuffer({ text: clean, lang, voice, rate });
    if (wav) return wav;
    const ok = await speakSpdSay({ text: clean, lang, voice, rate });
    if (ok) return { mode: 'native_done' };
  }

  // Tier 3: Renderer Web Speech API fallback
  return { mode: 'webspeech', text: clean };
}

module.exports = { cleanSpeechText, synthesizeOrSpeak, stopNativeSpeech };
