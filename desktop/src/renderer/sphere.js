'use strict';

window.NexSphereRenderer = (function () {
  const MODES = {
    idle: { sp: 0.25, amp: 0.015, ring: 0, orb: 0 },
    listening: { sp: 0.55, amp: 0.04, ring: 1, orb: 0 },
    thinking: { sp: 1.75, amp: 0.02, ring: 0, orb: 0 },
    working: { sp: 0.95, amp: 0.02, ring: 0, orb: 1 },
    speaking: { sp: 0.65, amp: 0.08, ring: 0, orb: 0 }
  };

  function drawBow(c, x, y, r) {
    const s = r * 0.4;
    c.save();
    c.translate(x, y);
    for (const d of [-1, 1]) {
      c.save();
      c.scale(d, 1);
      c.rotate(-0.35);
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(s * 0.5, -s * 1.1, s * 1.7, -s * 1.0, s * 1.55, s * 0.1);
      c.bezierCurveTo(s * 1.4, s * 0.8, s * 0.5, s * 0.6, 0, 0);
      c.closePath();
      const g = c.createLinearGradient(0, -s, s * 1.6, s * 0.4);
      g.addColorStop(0, '#ffb3cf');
      g.addColorStop(1, '#e0538f');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(120,20,60,.35)';
      c.lineWidth = Math.max(1, r * 0.02);
      c.stroke();
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, s * 0.36, 0, Math.PI * 2);
    c.fillStyle = '#d6407f';
    c.fill();
    c.strokeStyle = 'rgba(120,20,60,.35)';
    c.stroke();
    c.beginPath();
    c.arc(-s * 0.1, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fill();
    c.restore();
  }

  function attach(canvas) {
    let state = 'idle';
    let female = false;
    let curSp = 0.25;
    let curAmp = 0.015;
    let phase = 0;
    let last = 0;
    let rafId = 0;

    function draw(t) {
      const c = canvas.getContext('2d');
      const S = canvas.width;
      const cx = S / 2;
      const cy = S / 2;
      const m = MODES[state] || MODES.idle;
      const r = S * 0.30 * (1 + curAmp * Math.sin(t * 7));
      c.clearRect(0, 0, S, S);

      if (m.ring) {
        for (let q = 0; q < 3; q++) {
          const u = (t * 0.6 + q / 3) % 1;
          c.strokeStyle = female
            ? `rgba(224,83,143,${0.48 * (1 - u)})`
            : `rgba(140,146,158,${0.48 * (1 - u)})`;
          c.lineWidth = 2.5;
          c.beginPath();
          c.arc(cx, cy, r * (1.05 + u * 0.5), 0, Math.PI * 2);
          c.stroke();
        }
      }

      c.fillStyle = 'rgba(0,0,0,.18)';
      c.beginPath();
      c.ellipse(cx, cy + r * 1.12, r * 0.7, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();

      c.save();
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.clip();

      const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#e3e6eb');
      g.addColorStop(0.55, '#9aa0ab');
      g.addColorStop(1, '#50545d');
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);

      const hu = female ? 335 : 220;
      const sa = female ? 78 : 4;
      for (let k = 0; k < 7; k++) {
        const a = phase + k * 0.9;
        const y = Math.sin(a) * r * 0.9;
        const w = r * 0.13 * (0.45 + 0.55 * Math.abs(Math.cos(a)));
        const l = 62 + 18 * Math.sin(t * 0.8 + k * 1.1);
        const lg = c.createLinearGradient(cx - r, 0, cx + r, 0);
        const c0 = female ? l - 10 : l - 26;
        const c1 = female ? l + 6 : l + 16;
        const c2 = female ? l - 14 : l - 30;
        lg.addColorStop(0, `hsla(${hu},${sa}%,${c0}%,.2)`);
        lg.addColorStop(0.5, `hsla(${hu},${sa}%,${c1}%,.8)`);
        lg.addColorStop(1, `hsla(${hu},${sa}%,${c2}%,.2)`);
        c.strokeStyle = lg;
        c.lineWidth = w;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(cx - r * 1.1, cy + y * 0.55);
        c.quadraticCurveTo(cx, cy + y + Math.cos(a) * r * 0.55, cx + r * 1.1, cy + y * 0.55);
        c.stroke();
      }

      const hl = c.createRadialGradient(cx - r * 0.35, cy - r * 0.42, 0, cx - r * 0.35, cy - r * 0.42, r * 0.6);
      hl.addColorStop(0, 'rgba(255,255,255,.65)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hl;
      c.fillRect(0, 0, S, S);

      const ed = c.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
      ed.addColorStop(0, 'rgba(0,0,0,0)');
      ed.addColorStop(1, 'rgba(0,0,0,.42)');
      c.fillStyle = ed;
      c.fillRect(0, 0, S, S);
      c.restore();

      if (female) drawBow(c, cx, cy - r * 0.88, r);

      if (m.orb) {
        for (let d = 0; d < 3; d++) {
          const an = t * 2.2 + d * 2.09;
          c.fillStyle = female
            ? `hsl(335,80%,${66 + 10 * Math.sin(t * 2 + d * 2)}%)`
            : `hsl(220,5%,${68 + 14 * Math.sin(t * 2 + d * 2)}%)`;
          c.beginPath();
          c.arc(cx + Math.cos(an) * r * 1.3, cy + Math.sin(an) * r * 0.65, S * 0.016, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    function loop(ts) {
      const t = ts / 1000;
      const dt = Math.min(0.05, Math.max(0, t - last));
      last = t;
      const m = MODES[state] || MODES.idle;
      curSp += (m.sp - curSp) * 0.08;
      curAmp += (m.amp - curAmp) * 0.08;
      phase += dt * curSp * 1.4;
      if (canvas.offsetParent !== null || canvas.isConnected) draw(t);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return {
      update(nextState, nextFemale) {
        if (nextState) state = nextState;
        if (typeof nextFemale === 'boolean') female = nextFemale;
      },
      destroy() { cancelAnimationFrame(rafId); }
    };
  }

  return { attach };
})();
