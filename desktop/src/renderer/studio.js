'use strict';

window.NexMediaStudio = (function () {
  function toFileUrl(fp) {
    return 'file://' + (fp.startsWith('/') ? '' : '/') + fp.replace(/\\/g, '/');
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function cssFilterString({ brightness, contrast, saturation, filter }) {
    const parts = [
      `brightness(${100 + brightness}%)`,
      `contrast(${Math.round(contrast * 100)}%)`,
      `saturate(${Math.round(saturation * 100)}%)`
    ];
    if (filter === 'gray') parts.push('grayscale(100%)');
    if (filter === 'sepia') parts.push('sepia(85%)');
    if (filter === 'warm') parts.push('sepia(28%) saturate(125%)');
    if (filter === 'cool') parts.push('hue-rotate(190deg) saturate(85%)');
    return parts.join(' ');
  }

  function render({ root, state, currentItem, onSelectItem, tr }) {
    root.innerHTML = '';
    const isEn = state.lang === 'en';
    root.appendChild(el('h2', '', tr('studio')));
    root.appendChild(el('p', 'sub', isEn
      ? 'Real photo & video editing (filters, crop, rotate, text, video trim, speed, mute, frame capture) + AI Edit (Nex Foton).'
      : 'Реальное редактирование фото и видео (фильтры, обрезка, поворот, текст, обрезка видео, скорость, без звука, захват кадра) + ИИ-правка (Nex Foton).'
    ));

    const topBtns = el('div', 'flex-row');
    topBtns.style.marginBottom = '14px';
    const bPhoto = el('button', 'btn outline', isEn ? 'Open Photo' : 'Выбрать фото');
    bPhoto.onclick = async () => {
      const item = await window.nexApi.pickMediaFile('photo');
      if (item) onSelectItem(item);
    };
    const bVideo = el('button', 'btn outline', isEn ? 'Open Video' : 'Выбрать видео');
    bVideo.onclick = async () => {
      const item = await window.nexApi.pickMediaFile('video');
      if (item) onSelectItem(item);
    };
    topBtns.appendChild(bPhoto);
    topBtns.appendChild(bVideo);
    root.appendChild(topBtns);

    const status = el('p', 'sub', '');
    status.style.color = 'var(--ok)';
    root.appendChild(status);

    if (currentItem) {
      if (!currentItem.isVideo) {
        renderPhotoEditor(root, currentItem, state, status, onSelectItem, isEn);
      } else {
        renderVideoEditor(root, currentItem, state, status, onSelectItem, isEn);
      }
    } else {
      root.appendChild(el('div', 'card-box', isEn
        ? 'Open a photo or video above, or click Edit on any media inside chat.'
        : 'Открой фото или видео сверху, либо нажми «Редактировать» у любой картинки/видео в чате.'
      ));
    }

    // Saved media gallery
    if (currentItem && !currentItem.isVideo) {
      const tagRow = el('div', 'flex-row'); tagRow.style.margin = '10px 0';
      const tInp = el('input'); tInp.type = 'text'; tInp.value = (currentItem.tags || []).join(', ');
      tInp.placeholder = isEn ? 'Tags (comma-separated)…' : 'Теги через запятую…';
      const tBtn = el('button', 'btn outline', isEn ? 'Save Tags' : 'Сохранить теги');
      tBtn.onclick = async () => { await window.nexApi.updateMediaTags(currentItem.id, tInp.value.split(',').map(x => x.trim()).filter(Boolean)); status.textContent = isEn ? 'Tags saved.' : 'Теги сохранены.'; };
      tagRow.appendChild(tInp); tagRow.appendChild(tBtn); root.appendChild(tagRow);
      const prevOrig = (state.mediaItems || []).find(x => !x.isVideo && x.id !== currentItem.id);
      if (prevOrig) {
        const cmpWrap = el('div', 'card-box'), cmpBtn = el('button', 'pill-btn small', isEn ? 'Compare Before / After' : 'Сравнить До / После'), cmpBox = el('div', 'compare-grid'); cmpBox.hidden = true;
        cmpBtn.onclick = () => {
          cmpBox.hidden = !cmpBox.hidden;
          if (!cmpBox.hidden && !cmpBox.childElementCount) {
            const c1 = el('div'); c1.appendChild(el('small', '', isEn ? 'Before' : 'До')); const i1 = el('img'); i1.src = toFileUrl(prevOrig.filePath); c1.appendChild(i1);
            const c2 = el('div'); c2.appendChild(el('small', '', isEn ? 'After' : 'После')); const i2 = el('img'); i2.src = toFileUrl(currentItem.filePath); c2.appendChild(i2);
            cmpBox.appendChild(c1); cmpBox.appendChild(c2);
          }
        };
        cmpWrap.appendChild(cmpBtn); cmpWrap.appendChild(cmpBox); root.appendChild(cmpWrap);
      }
    }
    const qStudio = (window.__nexStudioQuery || '').trim().toLowerCase();
    const sRow = el('div', 'flex-row'); sRow.style.marginTop = '14px';
    const sInp = el('input'); sInp.type = 'search'; sInp.value = window.__nexStudioQuery || '';
    sInp.placeholder = isEn ? 'Search gallery by prompt or tag…' : 'Поиск по галерее (промпт или тег)…';
    sInp.oninput = () => { window.__nexStudioQuery = sInp.value; render({ root, state, currentItem, onSelectItem, tr }); };
    sRow.appendChild(sInp); root.appendChild(sRow);
    const gallery = (state.mediaItems || []).filter(it => !qStudio || `${it.prompt || ''} ${it.modelName || ''} ${(it.tags || []).join(' ')}`.toLowerCase().includes(qStudio));
    if (gallery.length) {
      const h = el('h3', '', isEn ? `Saved Photos & Videos (${gallery.length})` : `Сохранённые фото и видео (${gallery.length})`);
      h.style.marginTop = '18px';
      root.appendChild(h);
      const grid = el('div', 'tabs-row');
      gallery.forEach(item => {
        const b = el('button', 'pill-btn small' + (currentItem?.id === item.id ? ' active' : ''), `${item.isVideo ? '🎬' : '🖼️'} ${(item.prompt || item.modelName || 'media').slice(0, 26)}`);
        b.onclick = () => onSelectItem(item);
        grid.appendChild(b);
      });
      root.appendChild(grid);
    }
  }

  function renderPhotoEditor(root, item, state, statusEl, onSelectItem, isEn) {
    const cfg = { brightness: 0, contrast: 1, saturation: 1, rotation: 0, flipH: false, filter: 'none', aspect: 'orig', caption: '' };
    const card = el('div', 'card-box');
    const canvas = el('canvas');
    canvas.style.cssText = 'display:block;max-width:100%;max-height:360px;margin:0 auto 12px;border-radius:12px;background:#111';
    card.appendChild(canvas);

    const img = new Image();
    img.src = toFileUrl(item.filePath);

    function draw() {
      if (!img.naturalWidth) return;
      const rot90 = (cfg.rotation % 180) !== 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let sx = 0, sy = 0;

      if (cfg.aspect !== 'orig') {
        const targetRatio = cfg.aspect === '1:1' ? 1 : cfg.aspect === '16:9' ? (16 / 9) : (4 / 5);
        const curRatio = sw / sh;
        if (curRatio > targetRatio) {
          const nw = Math.round(sh * targetRatio);
          sx = Math.round((sw - nw) / 2);
          sw = nw;
        } else {
          const nh = Math.round(sw / targetRatio);
          sy = Math.round((sh - nh) / 2);
          sh = nh;
        }
      }

      const maxDim = 1400;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const dw = Math.max(1, Math.round(sw * scale));
      const dh = Math.max(1, Math.round(sh * scale));
      canvas.width = rot90 ? dh : dw;
      canvas.height = rot90 ? dw : dh;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.filter = cssFilterString(cfg);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((cfg.rotation * Math.PI) / 180);
      if (cfg.flipH) ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      const text = cfg.caption.trim();
      if (text) {
        const fontSize = Math.max(22, Math.min(84, Math.round(Math.min(canvas.width, canvas.height) * 0.07)));
        ctx.save();
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const tw = ctx.measureText(text).width;
        const y = canvas.height - fontSize * 1.05;
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.fillRect(canvas.width / 2 - tw / 2 - 20, y - fontSize, tw + 40, fontSize * 1.35);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, canvas.width / 2, y);
        ctx.restore();
      }
    }
    img.onload = draw;

    // Filter chips
    const fRow = el('div', 'tabs-row');
    [['none', isEn ? 'Original' : 'Оригинал'], ['gray', isEn ? 'B&W' : 'Ч/Б'], ['sepia', 'Sepia'], ['warm', isEn ? 'Warm' : 'Тёплый'], ['cool', isEn ? 'Cool' : 'Холодный']].forEach(([id, lbl]) => {
      const b = el('button', 'pill-btn small' + (cfg.filter === id ? ' active' : ''), lbl);
      b.onclick = () => {
        cfg.filter = id;
        [...fRow.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        draw();
      };
      fRow.appendChild(b);
    });
    card.appendChild(fRow);

    // Aspect + Transform
    const tRow = el('div', 'tabs-row');
    ['orig', '1:1', '16:9', '4:5'].forEach(a => {
      const b = el('button', 'pill-btn small' + (cfg.aspect === a ? ' active' : ''), a === 'orig' ? (isEn ? 'Original' : 'Оригинал') : a);
      b.onclick = () => {
        cfg.aspect = a;
        [...tRow.querySelectorAll('.asp')].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        draw();
      };
      b.classList.add('asp');
      tRow.appendChild(b);
    });
    const bRot = el('button', 'pill-btn small', '↻ 90°');
    bRot.onclick = () => { cfg.rotation = (cfg.rotation + 90) % 360; draw(); };
    const bFlip = el('button', 'pill-btn small', '⇄');
    bFlip.onclick = () => { cfg.flipH = !cfg.flipH; draw(); };
    tRow.appendChild(bRot); tRow.appendChild(bFlip);
    card.appendChild(tRow);

    const addRange = (label, min, max, step, val, onVal) => {
      const lbl = el('label', 'field-label', `${label}: ${val}`);
      const r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
      r.oninput = () => { const v = parseFloat(r.value); lbl.textContent = `${label}: ${v}`; onVal(v); draw(); };
      card.appendChild(lbl); card.appendChild(r);
    };
    addRange(isEn ? 'Brightness' : 'Яркость', -80, 80, 2, 0, v => { cfg.brightness = v; });
    addRange(isEn ? 'Contrast' : 'Контраст', 0.5, 2.0, 0.05, 1, v => { cfg.contrast = v; });
    addRange(isEn ? 'Saturation' : 'Насыщенность', 0, 2.0, 0.05, 1, v => { cfg.saturation = v; });

    card.appendChild(el('label', 'field-label', isEn ? 'Caption / Text overlay' : 'Подпись на фото'));
    const capInp = el('input'); capInp.type = 'text';
    capInp.oninput = () => { cfg.caption = capInp.value; draw(); };
    card.appendChild(capInp);

    const saveRow = el('div', 'flex-row');
    saveRow.style.marginTop = '12px';
    const bSave = el('button', 'btn', isEn ? 'Save Edited Photo' : 'Сохранить фото');
    bSave.onclick = async () => {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const res = await window.nexApi.saveEditedMedia({
        isVideo: false, base64Data, ext: 'png',
        modelName: 'Nex Photo Editor', prompt: cfg.caption || 'Edited photo', postToChat: true
      });
      if (res.ok) {
        statusEl.textContent = isEn ? 'Edited photo saved & added to chat!' : 'Отредактированное фото сохранено!';
        onSelectItem(res.item);
      }
    };
    const bRev = el('button', 'btn outline', isEn ? 'Show in folder' : 'Показать в папке');
    bRev.onclick = () => window.nexApi.revealFile(item.filePath);
    saveRow.appendChild(bSave); saveRow.appendChild(bRev);
    card.appendChild(saveRow);

    // AI Photo Edit & Animate to Video
    card.appendChild(el('label', 'field-label', isEn ? 'AI Photo Edit / Animate (Nex Foton)' : 'ИИ-редактирование / Оживление (Nex Foton)'));
    const aiInp = el('input'); aiInp.type = 'text';
    aiInp.placeholder = isEn ? 'Describe edit (e.g. warm sunset lighting, remove background)…' : 'Опиши правку ИИ (например: закатный свет, убрать фон)…';
    card.appendChild(aiInp);

    const aiRow = el('div', 'flex-row');
    aiRow.style.marginTop = '8px';
    const bAiEdit = el('button', 'btn', isEn ? 'AI Edit Photo' : 'ИИ-правка фото');
    bAiEdit.onclick = async () => {
      if (!aiInp.value.trim()) return;
      statusEl.textContent = isEn ? 'Running AI edit…' : 'Выполняю ИИ-редактирование…';
      const r = await window.nexApi.aiEditPhoto({ sourcePath: item.filePath, instruction: aiInp.value.trim() });
      if (r.ok) { statusEl.textContent = isEn ? 'AI edit complete!' : 'ИИ-правка готова!'; onSelectItem(r.item); }
      else statusEl.textContent = 'Error: ' + r.error;
    };
    const bAiVid = el('button', 'btn outline', isEn ? 'Animate → Video' : 'Оживить → Видео');
    bAiVid.onclick = async () => {
      if (!aiInp.value.trim()) return;
      statusEl.textContent = isEn ? 'Generating video from photo…' : 'Создаю видео по фото…';
      const r = await window.nexApi.aiImageToVideo({ sourcePath: item.filePath, instruction: aiInp.value.trim() });
      if (r.ok) { statusEl.textContent = isEn ? 'Video ready!' : 'Видео готово!'; onSelectItem(r.item); }
      else statusEl.textContent = 'Error: ' + r.error;
    };
    aiRow.appendChild(bAiEdit); aiRow.appendChild(bAiVid);
    card.appendChild(aiRow);

    root.appendChild(card);
  }

  function renderVideoEditor(root, item, state, statusEl, onSelectItem, isEn) {
    const cfg = { startSec: 0, endSec: 5, speed: 1, mute: false, brightness: 0, contrast: 1, saturation: 1, filter: 'none', caption: '' };
    const card = el('div', 'card-box');

    const vid = el('video');
    vid.src = toFileUrl(item.filePath);
    vid.controls = true;
    vid.style.cssText = 'display:block;width:100%;max-height:320px;border-radius:12px;background:#000;margin-bottom:12px';
    card.appendChild(vid);

    const startLbl = el('label', 'field-label', `${isEn ? 'Start (sec)' : 'Начало (сек)'}: 0.0`);
    const startR = el('input'); startR.type = 'range'; startR.min = 0; startR.max = 10; startR.step = 0.1; startR.value = 0;
    const endLbl = el('label', 'field-label', `${isEn ? 'End (sec)' : 'Конец (сек)'}: 5.0`);
    const endR = el('input'); endR.type = 'range'; endR.min = 0.5; endR.max = 10; endR.step = 0.1; endR.value = 5;

    vid.onloadedmetadata = () => {
      const dur = Math.max(0.5, vid.duration || 5);
      startR.max = dur;
      endR.max = dur;
      cfg.endSec = dur;
      endR.value = dur;
      endLbl.textContent = `${isEn ? 'End (sec)' : 'Конец (сек)'}: ${dur.toFixed(1)}`;
    };

    startR.oninput = () => {
      cfg.startSec = Math.min(parseFloat(startR.value), cfg.endSec - 0.3);
      startR.value = cfg.startSec;
      startLbl.textContent = `${isEn ? 'Start (sec)' : 'Начало (сек)'}: ${cfg.startSec.toFixed(1)}`;
      vid.currentTime = cfg.startSec;
    };
    endR.oninput = () => {
      cfg.endSec = Math.max(parseFloat(endR.value), cfg.startSec + 0.3);
      endR.value = cfg.endSec;
      endLbl.textContent = `${isEn ? 'End (sec)' : 'Конец (сек)'}: ${cfg.endSec.toFixed(1)}`;
    };

    card.appendChild(startLbl); card.appendChild(startR);
    card.appendChild(endLbl); card.appendChild(endR);

    // Speed & Filter
    const spRow = el('div', 'tabs-row');
    [0.5, 1, 1.5, 2].forEach(sp => {
      const b = el('button', 'pill-btn small' + (cfg.speed === sp ? ' active' : ''), `${sp}x`);
      b.onclick = () => {
        cfg.speed = sp;
        vid.playbackRate = sp;
        [...spRow.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      spRow.appendChild(b);
    });
    card.appendChild(el('label', 'field-label', isEn ? 'Playback Speed' : 'Скорость'));
    card.appendChild(spRow);

    const fRow = el('div', 'tabs-row');
    [['none', isEn ? 'Original' : 'Оригинал'], ['gray', isEn ? 'B&W' : 'Ч/Б'], ['sepia', 'Sepia'], ['warm', isEn ? 'Warm' : 'Тёплый']].forEach(([id, lbl]) => {
      const b = el('button', 'pill-btn small' + (cfg.filter === id ? ' active' : ''), lbl);
      b.onclick = () => {
        cfg.filter = id;
        vid.style.filter = cssFilterString(cfg);
        [...fRow.children].forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      fRow.appendChild(b);
    });
    card.appendChild(fRow);

    const muteRow = el('div', 'row-item');
    muteRow.appendChild(el('span', '', isEn ? 'Mute audio track' : 'Убрать звук'));
    const mSw = el('button', 'sw'); mSw.setAttribute('aria-checked', 'false');
    mSw.onclick = () => { cfg.mute = !cfg.mute; mSw.setAttribute('aria-checked', String(cfg.mute)); vid.muted = cfg.mute; };
    muteRow.appendChild(mSw);
    card.appendChild(muteRow);

    card.appendChild(el('label', 'field-label', isEn ? 'Burn-in caption' : 'Титры на видео'));
    const capInp = el('input'); capInp.type = 'text';
    capInp.oninput = () => { cfg.caption = capInp.value; };
    card.appendChild(capInp);

    const acts = el('div', 'flex-row');
    acts.style.marginTop = '12px';

    const bRender = el('button', 'btn', isEn ? 'Render & Save Video (.webm)' : 'Сохранить видео (.webm)');
    bRender.onclick = async () => {
      statusEl.textContent = isEn ? 'Rendering video…' : 'Рендерю видео…';
      bRender.disabled = true;
      try {
        const w = vid.videoWidth || 640;
        const h = vid.videoHeight || 360;
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const ctx = off.getContext('2d');

        const canvasStream = off.captureStream(30);
        if (!cfg.mute && typeof vid.captureStream === 'function') {
          try {
            const audioTracks = vid.captureStream().getAudioTracks();
            audioTracks.forEach(t => canvasStream.addTrack(t));
          } catch (_) {}
        }

        const chunks = [];
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        const rec = new MediaRecorder(canvasStream, { mimeType: mime });
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

        const donePromise = new Promise(resolve => { rec.onstop = resolve; });
        vid.currentTime = cfg.startSec;
        vid.playbackRate = cfg.speed;
        vid.muted = cfg.mute;
        await vid.play();
        rec.start();

        let raf = 0;
        const step = () => {
          ctx.filter = cssFilterString(cfg);
          ctx.drawImage(vid, 0, 0, w, h);
          ctx.filter = 'none';
          if (cfg.caption.trim()) {
            const fs = Math.max(20, Math.round(h * 0.065));
            ctx.font = `bold ${fs}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 6;
            ctx.fillText(cfg.caption.trim(), w / 2, h - fs);
            ctx.shadowBlur = 0;
          }
          if (vid.currentTime >= cfg.endSec || vid.ended) {
            vid.pause();
            if (rec.state !== 'inactive') rec.stop();
            cancelAnimationFrame(raf);
            return;
          }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        await donePromise;

        const blob = new Blob(chunks, { type: 'video/webm' });
        const arrBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrBuf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 8192) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        }
        const b64 = btoa(bin);
        const res = await window.nexApi.saveEditedMedia({
          isVideo: true, base64Data: b64, ext: 'webm',
          modelName: `Nex Video Editor (${cfg.speed}x)`,
          prompt: `Edited ${cfg.startSec.toFixed(1)}s–${cfg.endSec.toFixed(1)}s`,
          postToChat: true
        });
        if (res.ok) {
          statusEl.textContent = isEn ? 'Edited video saved!' : 'Отредактированное видео сохранено!';
          onSelectItem(res.item);
        }
      } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
      } finally {
        bRender.disabled = false;
      }
    };

    const bFrame = el('button', 'btn outline', isEn ? 'Extract Frame → Photo' : 'Кадр → Фото');
    bFrame.onclick = async () => {
      const off = document.createElement('canvas');
      off.width = vid.videoWidth || 640;
      off.height = vid.videoHeight || 360;
      const ctx = off.getContext('2d');
      ctx.filter = cssFilterString(cfg);
      ctx.drawImage(vid, 0, 0, off.width, off.height);
      const b64 = off.toDataURL('image/png').split(',')[1];
      const res = await window.nexApi.saveEditedMedia({
        isVideo: false, base64Data: b64, ext: 'png',
        modelName: 'Video Frame', prompt: `Frame at ${vid.currentTime.toFixed(1)}s`, postToChat: false
      });
      if (res.ok) {
        statusEl.textContent = isEn ? 'Frame extracted to Photo Editor!' : 'Кадр открыт в редакторе фото!';
        onSelectItem(res.item);
      }
    };

    acts.appendChild(bRender); acts.appendChild(bFrame);
    card.appendChild(acts);
    root.appendChild(card);
  }

  return { render };
})();
