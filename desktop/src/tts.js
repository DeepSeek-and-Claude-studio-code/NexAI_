'use strict';

const { spawn, execFileSync } = require('child_process');

let activeProc = null;
let cachedLinuxBin = undefined;

function cleanSpeechText(raw, lang) {
  let s = String(raw || '');
  s = s.replace(/```[\s\S]*?```/g, lang === 'en' ? ' (code block in chat). ' : ' (код в чате). ');
  s = s.replace(/\[([^\]]+)\]\((?:https?:\/\/[^)]+)\)/g, '$1');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/[#*_`~>|]+/g, ' ');
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
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voiceName,
        input: text,
        response_format: 'mp3',
        speed
      })
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
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      })
    }, 10000);
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p?.inlineData?.data);
    if (!audioPart) return null;
    const mime = String(audioPart.inlineData.mimeType || 'audio/L16;rate=24000');
    const rawBuf = Buffer.from(audioPart.inlineData.data, 'base64');
    if (rawBuf.length < 200) return null;
    if (/audio\/(mp3|mpeg|wav|ogg|webm)/i.test(mime)) {
      return { mode: 'audio', mimeType: mime.split(';')[0], base64: rawBuf.toString('base64') };
    }
    const wavB64 = pcm16ToWavBase64(rawBuf, parseSampleRate(mime), 1, 16);
    return { mode: 'audio', mimeType: 'audio/wav', base64: wavB64 };
  } catch (_) {
    return null;
  }
}

function detectLinuxTtsBinary() {
  if (cachedLinuxBin !== undefined) return cachedLinuxBin;
  for (const bin of ['spd-say', 'espeak-ng', 'espeak']) {
    try {
      execFileSync('which', [bin], { stdio: 'ignore' });
      cachedLinuxBin = bin;
      return bin;
    } catch (_) {}
  }
  cachedLinuxBin = null;
  return null;
}

function stopNativeSpeech() {
  if (activeProc) {
    try { activeProc.kill('SIGTERM'); } catch (_) {}
    activeProc = null;
  }
}

function speakNativeOs({ text, lang, voice, rate }) {
  stopNativeSpeech();
  const clampedRate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));

  if (process.platform === 'linux') {
    const bin = detectLinuxTtsBinary();
    if (!bin) return Promise.resolve(false);
    return new Promise((resolve) => {
      let args = [];
      if (bin === 'spd-say') {
        const spdRate = Math.round((clampedRate - 1.0) * 100);
        const voiceType = voice === 'f' ? 'female1' : 'male1';
        args = ['--wait', '-l', lang === 'en' ? 'en' : 'ru', '-t', voiceType, '-r', String(spdRate), text];
      } else {
        const wpm = Math.round(160 * clampedRate);
        const pitch = voice === 'f' ? '68' : (voice === 'n' ? '50' : '38');
        const vArg = (lang === 'en' ? 'en' : 'ru') + (voice === 'f' ? '+f3' : '+m3');
        args = ['-v', vArg, '-p', pitch, '-s', String(wpm), text];
      }
      const proc = spawn(bin, args, { stdio: 'ignore' });
      activeProc = proc;
      proc.on('error', () => {
        if (activeProc === proc) activeProc = null;
        resolve(false);
      });
      proc.on('close', () => {
        if (activeProc === proc) activeProc = null;
        resolve(true);
      });
    });
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const sapiRate = Math.round((clampedRate - 1.0) * 6);
      const psScript = [
        'Add-Type -AssemblyName System.Speech;',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
        `$s.Rate = ${sapiRate};`,
        '$t = $env:NEX_TTS_TEXT;',
        'if ($t) { $s.Speak($t); }'
      ].join(' ');
      const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        stdio: 'ignore',
        env: { ...process.env, NEX_TTS_TEXT: text }
      });
      activeProc = proc;
      proc.on('error', () => {
        if (activeProc === proc) activeProc = null;
        resolve(false);
      });
      proc.on('close', () => {
        if (activeProc === proc) activeProc = null;
        resolve(true);
      });
    });
  }

  return Promise.resolve(false);
}

async function synthesizeOrSpeak({ text, lang, voice, rate, geminiKey, openaiKey }) {
  const clean = cleanSpeechText(text, lang);
  if (!clean) return { mode: 'none' };

  const oai = await tryOpenAiTts({ openaiKey, text: clean, voice, rate });
  if (oai) return oai;

  const gem = await tryGeminiTts({ geminiKey, text: clean, voice });
  if (gem) return gem;

  const spoken = await speakNativeOs({ text: clean, lang, voice, rate });
  if (spoken) return { mode: 'native_done' };

  return { mode: 'webspeech', text: clean };
}

module.exports = { cleanSpeechText, synthesizeOrSpeak, stopNativeSpeech };
