'use strict';
(function () {
  const inp = document.getElementById('spotInput'), btnScreen = document.getElementById('btnSpotScreen'), btnSend = document.getElementById('btnSpotSend'), btnOpen = document.getElementById('btnSpotOpen'), statusEl = document.getElementById('spotStatus'), replyEl = document.getElementById('spotReply');
  let includeScreen = false, busy = false;
  btnScreen.onclick = () => { includeScreen = !includeScreen; btnScreen.classList.toggle('active', includeScreen); statusEl.textContent = includeScreen ? '👁 Снимок экрана будет прикреплён' : 'Alt+Space · Быстрая строка Nex'; };
  btnOpen.onclick = () => window.nexApi.spotlightOpenMain();
  async function submit() {
    if (busy) return; const text = inp.value.trim(); if (!text) return;
    busy = true; statusEl.textContent = includeScreen ? '👁 Снимаю экран и думаю…' : 'Думаю…'; replyEl.hidden = false; replyEl.textContent = '…';
    try { const res = await window.nexApi.spotlightSend({ text, includeScreen }); replyEl.textContent = (res && res.ok) ? (res.reply || 'Готово.') : ('Ошибка: ' + (res?.error || 'Unknown')); statusEl.textContent = (res && res.ok) ? 'Готово' : 'Ошибка'; if (res && res.ok) inp.value = ''; }
    catch (e) { replyEl.textContent = 'Ошибка: ' + e.message; } finally { busy = false; includeScreen = false; btnScreen.classList.remove('active'); }
  }
  btnSend.onclick = submit;
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape') window.nexApi.spotlightClose(); });
})();
