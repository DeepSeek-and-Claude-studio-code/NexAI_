'use strict';

window.NexVoice = (function () {
  const WAKE_REGEX = /(?:^|[\s,.!?])(некс[ауеи]?|нэкс[ауеи]?|nexi?|next)(?:[\s,.!?]+(.*))?$/i;

  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let vadTimer = null;
  let wakeEnabled = false;
  let mode = 'idle'; // 'idle' | 'wake_watch' | 'wake_recording' | 'command_recording'
  let recorder = null;
  let chunks = [];
  let speechStartAt = 0;
  let lastLoudAt = 0;
  let onTranscriptCb = null;
  let onStatusCb = null;
  let getLangFn = () => 'ru';
  let isBusyFn = () => false;

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
      setTimeout(() => ctx.close().catch(() => {}), 260);
    } catch (_) {}
  }

  async function ensureMic() {
    if (stream && stream.active) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      return true;
    } catch (err) {
      if (onStatusCb) onStatusCb('Mic error: ' + err.message);
      return false;
    }
  }

  function releaseMic() {
    if (vadTimer) { clearInterval(vadTimer); vadTimer = null; }
    stopRecorderInternal();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
      analyser = null;
    }
    mode = 'idle';
  }

  function currentRms() {
    if (!analyser) return 0;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const str = String(reader.result || '');
        resolve(str.includes(',') ? str.split(',')[1] : '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function stopRecorderInternal() {
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (_) {}
    }
    recorder = null;
  }

  function startRecorder(onFinished) {
    if (!stream) return;
    chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recorder = rec;
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: mime });
      chunks = [];
      if (blob.size < 800) { onFinished(null, mime); return; }
      const b64 = await blobToBase64(blob);
      onFinished(b64, mime);
    };
    rec.start();
  }

  function startVadLoop() {
    if (vadTimer) return;
    vadTimer = setInterval(() => {
      if (!analyser) return;
      if (isBusyFn() && mode !== 'command_recording') return;

      const rms = currentRms();
      const now = Date.now();
      const threshold = 0.022;

      if (mode === 'wake_watch') {
        if (rms > threshold) {
          mode = 'wake_recording';
          speechStartAt = now;
          lastLoudAt = now;
          startRecorder(async (b64, mime) => {
            if (!b64) {
              if (wakeEnabled && mode !== 'command_recording') mode = 'wake_watch';
              return;
            }
            const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType: mime, wakeCheck: true });
            const text = String(res?.text || '').trim();
            const m = text ? WAKE_REGEX.exec(text) : null;
            if (m) {
              playChime();
              const inlineCmd = String(m[2] || '').trim();
              if (inlineCmd.length > 1) {
                mode = wakeEnabled ? 'wake_watch' : 'idle';
                if (onTranscriptCb) onTranscriptCb(inlineCmd);
              } else {
                startCommandCapture();
              }
            } else {
              if (wakeEnabled && mode !== 'command_recording') mode = 'wake_watch';
            }
          });
        }
      } else if (mode === 'wake_recording') {
        if (rms > threshold) lastLoudAt = now;
        const elapsed = now - speechStartAt;
        const silence = now - lastLoudAt;
        if (silence > 750 || elapsed > 4000) {
          mode = wakeEnabled ? 'wake_watch' : 'idle';
          stopRecorderInternal();
        }
      } else if (mode === 'command_recording') {
        if (rms > threshold) lastLoudAt = now;
        const elapsed = now - speechStartAt;
        const silence = now - lastLoudAt;
        if ((elapsed > 1000 && silence > 1400) || elapsed > 15000) {
          finishCommandCapture();
        }
      }
    }, 80);
  }

  async function startCommandCapture() {
    const ok = await ensureMic();
    if (!ok) return false;
    stopRecorderInternal();
    mode = 'command_recording';
    speechStartAt = Date.now();
    lastLoudAt = Date.now();
    const isEn = getLangFn() === 'en';
    window.nexApi.setSphereVisual('listening', isEn ? 'Listening…' : 'Слушаю просьбу…');
    if (onStatusCb) onStatusCb(isEn ? 'Listening…' : 'Слушаю просьбу…');

    startRecorder(async (b64, mime) => {
      window.nexApi.setSphereVisual('thinking', isEn ? 'Recognizing…' : 'Распознаю речь…');
      if (!b64) {
        window.nexApi.setSphereVisual('idle');
        if (!wakeEnabled) releaseMic();
        else mode = 'wake_watch';
        return;
      }
      const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType: mime, wakeCheck: false });
      if (!wakeEnabled) releaseMic();
      else mode = 'wake_watch';

      if (res?.ok && res.text) {
        if (onTranscriptCb) onTranscriptCb(res.text);
      } else {
        window.nexApi.setSphereVisual('idle');
        if (onStatusCb) onStatusCb(res?.error || (isEn ? 'Could not recognize speech' : 'Речь не распознана'));
      }
    });
    startVadLoop();
    return true;
  }

  function finishCommandCapture() {
    if (mode !== 'command_recording') return;
    mode = wakeEnabled ? 'wake_watch' : 'idle';
    stopRecorderInternal();
  }

  async function toggleManualRecord() {
    if (mode === 'command_recording') {
      finishCommandCapture();
      return false;
    }
    return await startCommandCapture();
  }

  async function setWakeWordEnabled(enabled) {
    wakeEnabled = Boolean(enabled);
    if (wakeEnabled) {
      const ok = await ensureMic();
      if (!ok) { wakeEnabled = false; return false; }
      if (mode === 'idle') mode = 'wake_watch';
      startVadLoop();
      return true;
    } else {
      if (mode !== 'command_recording') releaseMic();
      return false;
    }
  }

  function init({ onTranscript, onStatus, getLang, isBusy }) {
    onTranscriptCb = onTranscript;
    onStatusCb = onStatus;
    getLangFn = getLang;
    isBusyFn = isBusy;
  }

  function isRecordingCommand() {
    return mode === 'command_recording';
  }

  return { init, toggleManualRecord, setWakeWordEnabled, isRecordingCommand };
})();
