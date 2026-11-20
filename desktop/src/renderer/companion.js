'use strict';

(function () {
  const cv = document.getElementById('cv');
  const bubble = document.getElementById('bubble');
  const sphere = window.NexSphereRenderer.attach(cv);

  function apply(data) {
    if (!data) return;
    sphere.update(data.state, data.female);
    bubble.textContent = data.label || '';
    bubble.classList.toggle('empty', !data.label);
  }

  window.nexApi.getBootstrap().then(b => apply(b.sphere));
  window.nexApi.onSphereState(apply);

  // Dragging & click-to-open
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;

  cv.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    lastX = e.screenX;
    lastY = e.screenY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.screenX - lastX;
    const dy = e.screenY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    lastX = e.screenX;
    lastY = e.screenY;
    if (dx || dy) window.nexApi.moveCompanionBy(dx, dy);
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) window.nexApi.openMainWindow();
  });

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.nexApi.showCompanionMenu();
  });
})();
