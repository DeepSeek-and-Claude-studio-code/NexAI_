'use strict';

window.NexVoice = (function () {
  const WAKE_REGEX = /(?:^|[\s,.!?;:—–-])(некс[ауеи]?|нэкс[ауеи]?|nexi?|некст|next)(?:[\s,.!?;:—–-]+([\s\S]*))?$/i;
  const LEADING_WAKE_STRIP = /^\s*(?:эй|окей|ок|привет|слушай|hey|ok|hi)?[\s,.!?;:—–-]*(?:некс[ауеи]?|нэкс[ауеи]?|nexi?|некст|next)[\s,.!?;:—–-]*/i;

  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let vadTimer = null;

  let wakeEnabled = false;
  let isSpeakingLock = false;
  let speakingCooldownUntil = 0;

  let mode = 'idle'; // 'idle' | 'wake_watch' | 'wake_probe' | 'command_recording'
  let recorder = null;
  let chunks = [];
  let mimeType = 'audio/webm';

  let noiseFloor = 0.008;
  let loudStreakMs = 0;
  let sessionStartAt = 0;
  let lastLoudAt = 0;
  let lastProbeAt = 0;
  let probeInFlight = false;
  let wakeDetectedInSession = false;
  let hasCommandSpeech = false;
  let liveWords = '';
  let stripWakeOnFinal = false;

  let onTranscriptCb = null;
  let onStatusCb = null;
  let onMicActiveCb = null;
  let getLangFn = () => 'ru';
  let isBusyFn = () => false;

  function listeningLabel() {
    return getLangFn() === 'en' ? 'Listening…' : 'Слушает…';
  }

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.11);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
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
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
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
    abortRecorder();
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
    if (onMicActiveCb) onMicActiveCb(false);
  }

  function currentRms() {
    if (!analyser) return 0;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  function speechThreshold() {
    return Math.max(0.014, Math.min(0.075, noiseFloor * 2.5 + 0.009));
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

  function abortRecorder() {
    if (recorder) {
      const r = recorder;
      recorder = null;
      r.ondataavailable = null;
      r.onstop = null;
      if (r.state !== 'inactive') {
        try { r.stop(); } catch (_) {}
      }
    }
    chunks = [];
    probeInFlight = false;
  }

  function beginTimeslicedRecorder(onFinalStop) {
    abortRecorder();
    if (!stream) return;
    mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    chunks = [];
    const rec = new MediaRecorder(stream, { mimeType });
    recorder = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = async () => {
      const snapshot = chunks.slice();
      chunks = [];
      if (recorder === rec) recorder = null;
      if (!onFinalStop) return;
      const blob = new Blob(snapshot, { type: mimeType });
      if (blob.size < 600) {
        onFinalStop(null, mimeType);
        return;
      }
      const b64 = await blobToBase64(blob);
      onFinalStop(b64, mimeType);
    };
    rec.start(250);
  }

  function finishRecorderGracefully() {
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (_) {}
    }
  }

  function stripWakePrefix(text) {
    const cleaned = String(text || '').trim();
    const m = WAKE_REGEX.exec(cleaned);
    if (m) return String(m[2] || '').trim();
    return cleaned.replace(LEADING_WAKE_STRIP, '').trim();
  }

  async function runWakeProbeSnapshot() {
    if (probeInFlight || mode !== 'wake_probe' || chunks.length === 0) return;
    const snap = chunks.slice();
    const blob = new Blob(snap, { type: mimeType });
    if (blob.size < 700) return;

    probeInFlight = true;
    lastProbeAt = Date.now();
    try {
      const b64 = await blobToBase64(blob);
      const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType, wakeCheck: true });
      if (mode !== 'wake_probe') return;
      const text = String(res?.text || '').trim();
      const m = text ? WAKE_REGEX.exec(text) : null;
      if (m) {
        const trailing = String(m[2] || '').trim();
        playChime();
        wakeDetectedInSession = true;
        mode = 'command_recording';
        stripWakeOnFinal = true;
        liveWords = trailing;
        hasCommandSpeech = trailing.length >= 2;
        sessionStartAt = Date.now();
        lastLoudAt = Date.now();
        if (onMicActiveCb) onMicActiveCb(true);
        window.nexApi.setSphereVisual('listening', listeningLabel(), liveWords);
      }
    } catch (_) {
    } finally {
      probeInFlight = false;
    }
  }

  async function runLiveTranscriptPoll() {
    if (probeInFlight || mode !== 'command_recording' || chunks.length === 0) return;
    const snap = chunks.slice();
    const blob = new Blob(snap, { type: mimeType });
    if (blob.size < 900) return;

    probeInFlight = true;
    lastProbeAt = Date.now();
    try {
      const b64 = await blobToBase64(blob);
      const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType, wakeCheck: false });
      if (mode !== 'command_recording') return;
      const raw = String(res?.text || '').trim();
      const shown = stripWakeOnFinal ? stripWakePrefix(raw) : raw;
      if (shown) {
        liveWords = shown;
        hasCommandSpeech = true;
        window.nexApi.setSphereVisual('listening', listeningLabel(), liveWords);
      }
    } catch (_) {
    } finally {
      probeInFlight = false;
    }
  }

  function resetToWatch() {
    abortRecorder();
    wakeDetectedInSession = false;
    hasCommandSpeech = false;
    stripWakeOnFinal = false;
    liveWords = '';
    loudStreakMs = 0;
    if (onMicActiveCb) onMicActiveCb(false);
    mode = wakeEnabled ? 'wake_watch' : 'idle';
    if (!wakeEnabled) releaseMic();
  }

  function dispatchRecognizedCommand(commandText) {
    const clean = String(commandText || '').trim();
    abortRecorder();
    wakeDetectedInSession = false;
    hasCommandSpeech = false;
    stripWakeOnFinal = false;
    loudStreakMs = 0;
    if (onMicActiveCb) onMicActiveCb(false);
    mode = wakeEnabled ? 'wake_watch' : 'idle';
    if (!wakeEnabled) releaseMic();

    if (!clean) {
      window.nexApi.setSphereVisual('idle', undefined, '');
      return;
    }
    const isEn = getLangFn() === 'en';
    window.nexApi.setSphereVisual('thinking', isEn ? 'Working…' : 'Думаю…', clean);
    if (onTranscriptCb) onTranscriptCb(clean, { fromVoice: true });
  }

  async function handleFinalAudioBuffer(b64, mt, wasCommand) {
    const isEn = getLangFn() === 'en';
    if (wasCommand) {
      window.nexApi.setSphereVisual('thinking', isEn ? 'Recognizing…' : 'Обрабатываю…', liveWords);
      const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType: mt, wakeCheck: false });
      const raw = String(res?.text || '').trim();
      const finalCmd = (stripWakeOnFinal ? stripWakePrefix(raw) : raw) || liveWords.trim();
      if (finalCmd) {
        dispatchRecognizedCommand(finalCmd);
      } else {
        window.nexApi.setSphereVisual('idle', undefined, '');
        if (onStatusCb && res?.error) onStatusCb(res.error);
        resetToWatch();
      }
      return;
    }

    const res = await window.nexApi.transcribeAudio({ audioBase64: b64, mimeType: mt, wakeCheck: true });
    const text = String(res?.text || '').trim();
    const m = text ? WAKE_REGEX.exec(text) : null;
    if (m) {
      const trailing = String(m[2] || '').trim();
      playChime();
      if (trailing.length >= 2) {
        liveWords = trailing;
        window.nexApi.setSphereVisual('listening', listeningLabel(), trailing);
        dispatchRecognizedCommand(trailing);
      } else {
        startCommandCapture({ afterWakeWord: true });
      }
    } else {
      resetToWatch();
    }
  }

  function startVadLoop() {
    if (vadTimer) return;
    const TICK_MS = 80;
    vadTimer = setInterval(() => {
      if (!analyser) return;
      const now = Date.now();

      if (mode !== 'command_recording' && (isBusyFn() || isSpeakingLock || now < speakingCooldownUntil)) {
        if (mode === 'wake_probe') resetToWatch();
        loudStreakMs = 0;
        return;
      }

      const rms = currentRms();
      const thresh = speechThreshold();
      const isLoud = rms > thresh;

      if (!isLoud && (mode === 'wake_watch' || mode === 'idle')) {
        noiseFloor = noiseFloor * 0.96 + rms * 0.04;
      }

      if (mode === 'wake_watch') {
        if (isLoud) {
          loudStreakMs += TICK_MS;
          if (loudStreakMs >= 160) {
            mode = 'wake_probe';
            sessionStartAt = now;
            lastLoudAt = now;
            lastProbeAt = now;
            wakeDetectedInSession = false;
            stripWakeOnFinal = true;
            hasCommandSpeech = false;
            liveWords = '';
            beginTimeslicedRecorder(async (b64, mt) => {
              if (!b64) {
                if (wakeDetectedInSession) {
                  if (liveWords.trim()) dispatchRecognizedCommand(liveWords);
                  else startCommandCapture({ afterWakeWord: true });
                } else {
                  resetToWatch();
                }
                return;
              }
              await handleFinalAudioBuffer(b64, mt, wakeDetectedInSession);
            });
          }
        } else {
          loudStreakMs = Math.max(0, loudStreakMs - TICK_MS);
        }
      } else if (mode === 'wake_probe') {
        if (isLoud) lastLoudAt = now;
        const elapsed = now - sessionStartAt;
        const silence = now - lastLoudAt;

        if (!probeInFlight && elapsed >= 1150 && (now - lastProbeAt) >= 1100 && silence < 550) {
          runWakeProbeSnapshot();
        }
        if (silence >= 550 || elapsed >= 3800) {
          finishRecorderGracefully();
        }
      } else if (mode === 'command_recording') {
        if (isLoud) {
          lastLoudAt = now;
          if (now - sessionStartAt > 240) hasCommandSpeech = true;
        }
        const elapsed = now - sessionStartAt;
        const silence = now - lastLoudAt;

        if (hasCommandSpeech && !probeInFlight && (now - lastProbeAt) >= 1100 && elapsed >= 800) {
          runLiveTranscriptPoll();
        }

        if (hasCommandSpeech && elapsed >= 900 && silence >= 1350) {
          finishRecorderGracefully();
        } else if (!hasCommandSpeech && elapsed >= 6500) {
          window.nexApi.setSphereVisual('idle', undefined, '');
          resetToWatch();
        } else if (elapsed >= 28000) {
          finishRecorderGracefully();
        }
      }
    }, TICK_MS);
  }

  async function startCommandCapture({ afterWakeWord = false } = {}) {
    window.nexApi.stopSpeaking();
    const ok = await ensureMic();
    if (!ok) return false;
    abortRecorder();
    mode = 'command_recording';
    wakeDetectedInSession = true;
    stripWakeOnFinal = false;
    hasCommandSpeech = false;
    liveWords = '';
    sessionStartAt = Date.now();
    lastLoudAt = Date.now();
    lastProbeAt = Date.now();
    if (onMicActiveCb) onMicActiveCb(true);
    window.nexApi.setSphereVisual('listening', listeningLabel(), '');
    if (!afterWakeWord) playChime();

    beginTimeslicedRecorder(async (b64, mt) => {
      if (!b64) {
        if (liveWords.trim()) {
          dispatchRecognizedCommand(liveWords);
        } else {
          window.nexApi.setSphereVisual('idle', undefined, '');
          resetToWatch();
        }
        return;
      }
      await handleFinalAudioBuffer(b64, mt, true);
    });
    startVadLoop();
    return true;
  }

  async function toggleManualRecord() {
    if (mode === 'command_recording') {
      finishRecorderGracefully();
      return false;
    }
    return await startCommandCapture({ afterWakeWord: false });
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

  function setSpeaking(speaking) {
    isSpeakingLock = Boolean(speaking);
    if (!speaking) {
      speakingCooldownUntil = Date.now() + 500;
    } else if (mode === 'wake_probe') {
      resetToWatch();
    }
  }

  function init({ onTranscript, onStatus, onMicActive, getLang, isBusy }) {
    onTranscriptCb = onTranscript;
    onStatusCb = onStatus;
    onMicActiveCb = onMicActive;
    getLangFn = getLang;
    isBusyFn = isBusy;
  }

  function isRecordingCommand() {
    return mode === 'command_recording';
  }

  return { init, toggleManualRecord, setWakeWordEnabled, setSpeaking, isRecordingCommand };
})();
