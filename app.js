(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // 1. Anti-Copy & Link Privacy Safeguards
  // ---------------------------------------------------------------------------
  if (window.location.search && window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  function isEditableTarget(target) {
    return Boolean(target && target.closest && target.closest('input, textarea'));
  }

  document.addEventListener('contextmenu', (e) => {
    if (!isEditableTarget(e.target)) e.preventDefault();
  });

  ['copy', 'cut', 'dragstart', 'selectstart'].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      if (!isEditableTarget(e.target)) e.preventDefault();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (isEditableTarget(e.target)) return;
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u', 's'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Personalized State & Server-Side Session Gate
  // ---------------------------------------------------------------------------
  const heroFresherNameEl = document.getElementById('hero-fresher-name');
  const fresherNameEl = document.getElementById('fresher-name');
  const checkinGate = document.getElementById('checkin-gate');
  const checkinForm = document.getElementById('checkin-form');
  const checkinNameInput = document.getElementById('checkin-name');
  const checkinRollInput = document.getElementById('checkin-roll');
  const checkinHpInput = document.getElementById('checkin-website');
  const checkinErrorEl = document.getElementById('checkin-error');
  const checkinSubmitBtn = document.getElementById('checkin-submit');
  const checkinReadyBox = document.getElementById('checkin-ready');
  const readyGreetingEl = document.getElementById('ready-greeting');
  const btnLetsStart = document.getElementById('btn-lets-start');
  const checkinSubEl = document.querySelector('.checkin-sub');
  const checkinTitleEl = document.getElementById('checkin-title');

  let displayName = 'MCA Star';
  let celebrationStarted = false;
  let pendingCheckin = null;

  function applyPersonalizedName(fullName, firstName) {
    const cleanFull = String(fullName || '').trim() || 'MCA Star';
    const cleanFirst = String(firstName || cleanFull.split(' ')[0] || 'FRESHER').trim();
    displayName = cleanFull;

    if (heroFresherNameEl) {
      heroFresherNameEl.textContent = cleanFirst.toUpperCase();
    }
    if (fresherNameEl) {
      fresherNameEl.textContent = cleanFull;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Toast Announcement Helper
  // ---------------------------------------------------------------------------
  const toastEl = document.getElementById('celebration-toast');
  const toastTextEl = document.getElementById('celebration-toast-text');
  let toastTimer = null;

  function showCelebrationToast(message) {
    if (!toastEl || !toastTextEl) return;
    toastTextEl.textContent = message;
    toastEl.hidden = false;
    requestAnimationFrame(() => {
      toastEl.classList.add('is-visible');
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => {
        toastEl.hidden = true;
      }, 260);
    }, 3200);
  }

  // ---------------------------------------------------------------------------
  // 3. 3D Rotation & Perspective Math for Realistic Paper/Foil Flutter
  // ---------------------------------------------------------------------------
  function rotatePoint3D(p, rx, ry, rz) {
    let { x, y, z } = p;

    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;

    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x2 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x2;
    z = z2;

    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    const x3 = x * cosZ - y * sinZ;
    const y3 = x * sinZ + y * cosZ;

    return { x: x3, y: y3, z };
  }

  function project3D(p, cx, cy, focalLength) {
    const depth = Math.max(40, focalLength + p.z);
    const scale = focalLength / depth;
    return {
      x: cx + p.x * scale,
      y: cy + p.y * scale
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Layer 1: Celebratory Floating Balloons & Soft Golden Star Sparkles
  // ---------------------------------------------------------------------------
  const bgCanvas = document.getElementById('bg-geometry-canvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;

  let bgW = 0;
  let bgH = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;
  let sparkles = [];
  let balloons = [];
  let lastBgTime = 0;

  function resizeBackgroundCanvasOnly() {
    if (!bgCanvas || !bgCtx) return;
    const nextW = window.innerWidth;
    // Cover full device height (including hidden mobile URL bar) so vertical scroll never stretches or jumps
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const maxTouchH = isTouch ? Math.max(window.innerHeight, window.screen?.height || window.innerHeight) : window.innerHeight;
    const nextH = bgH && bgW === nextW && isTouch ? bgH : maxTouchH;
    if (bgW === nextW && bgH === nextH) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = bgW || nextW;
    bgW = nextW;
    bgH = nextH;
    bgCanvas.style.width = `${bgW}px`;
    bgCanvas.style.height = `${bgH}px`;
    bgCanvas.width = Math.floor(bgW * dpr);
    bgCanvas.height = Math.floor(bgH * dpr);
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Rescale horizontal positions smoothly without resetting or teleporting elements
    if (prevW > 0 && prevW !== nextW) {
      const ratio = nextW / prevW;
      sparkles.forEach((s) => { s.x *= ratio; });
      balloons.forEach((b) => { b.x *= ratio; });
    }
  }

  function initCelebrationBackground() {
    if (!bgCanvas || !bgCtx) return;
    resizeBackgroundCanvasOnly();

    const isMobile = bgW < 640;

    // Soft celebratory star sparkles & warm bokeh motes
    const sparkleCount = isMobile ? 20 : 34;
    sparkles = Array.from({ length: sparkleCount }, (_, i) => ({
      x: Math.random() * bgW,
      y: Math.random() * bgH,
      r: i % 3 === 0 ? Math.random() * 4.5 + 3.5 : Math.random() * 2 + 1,
      isFlare: i % 3 === 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.9 + Math.random() * 1.4,
      driftY: -(6 + Math.random() * 9), // px per second
      depth: 0.3 + Math.random() * 0.7
    }));

    // Volumetric Bezier balloons distributed across screen from the very first frame
    const balloonThemes = [
      { highlight: '#FFF2B2', mid: '#E3B026', deep: '#8C6208', rim: 'rgba(255, 240, 179, 0.55)' },
      { highlight: '#F26B82', mid: '#8F1D31', deep: '#460A15', rim: 'rgba(255, 165, 180, 0.45)' },
      { highlight: '#6D96E8', mid: '#1B3675', deep: '#07122D', rim: 'rgba(155, 190, 255, 0.42)' },
      { highlight: '#FFFFFF', mid: '#EBDCC0', deep: '#9E8C6E', rim: 'rgba(255, 250, 240, 0.55)' }
    ];
    const balloonCount = isMobile ? 8 : 13;
    balloons = Array.from({ length: balloonCount }, () => ({
      x: bgW * (0.04 + Math.random() * 0.92),
      y: Math.random() * (bgH * 1.15),
      rx: isMobile ? 15 + Math.random() * 9 : 18 + Math.random() * 12,
      speedY: 14 + Math.random() * 32,
      swayAmp: 8 + Math.random() * 18,
      swaySpeed: 0.7 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      theme: balloonThemes[Math.floor(Math.random() * balloonThemes.length)],
      alpha: 0.38 + Math.random() * 0.24
    }));
  }

  function drawStarFlare(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFE49E';

    // Delicate 4-point starlight flare
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.14, -size * 0.14, size, 0);
    ctx.quadraticCurveTo(size * 0.14, size * 0.14, 0, size);
    ctx.quadraticCurveTo(-size * 0.14, size * 0.14, -size, 0);
    ctx.quadraticCurveTo(-size * 0.14, -size * 0.14, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawVolumetricBalloon(ctx, b, timeSec) {
    const swaySpeed = b.swaySpeed || 1.2;
    const swayX = Math.sin(timeSec * swaySpeed + b.phase) * b.swayAmp + smoothPointerX * 10;
    const tilt = Math.cos(timeSec * swaySpeed + b.phase) * 0.08;
    const cx = b.x + swayX;
    const cy = b.y;
    const r = b.rx;
    const ry = r * 1.24;

    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // Bezier undulating string
    ctx.beginPath();
    ctx.moveTo(0, ry + 4);
    const wave1 = Math.sin(timeSec * 2.1 + b.phase) * 8;
    const wave2 = Math.cos(timeSec * 1.8 + b.phase) * 11;
    ctx.bezierCurveTo(wave1, ry + 26, -wave2, ry + 54, wave1 * 0.7, ry + 84);
    ctx.strokeStyle = 'rgba(255, 233, 156, 0.45)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Teardrop Balloon Body (smooth cubic Bezier)
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.bezierCurveTo(r * 1.12, -ry, r * 1.08, ry * 0.25, 0, ry);
    ctx.bezierCurveTo(-r * 1.08, ry * 0.25, -r * 1.12, -ry, 0, -ry);
    ctx.closePath();

    // Off-center 3D radial specular shading
    const grad = ctx.createRadialGradient(-r * 0.34, -ry * 0.36, r * 0.1, 0, 0, ry * 1.1);
    grad.addColorStop(0, b.theme.highlight);
    grad.addColorStop(0.38, b.theme.mid);
    grad.addColorStop(1, b.theme.deep);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = b.theme.rim;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glossy reflection highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -ry * 0.36, r * 0.16, ry * 0.26, -0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fill();

    // Tied knot
    ctx.beginPath();
    ctx.moveTo(-3.5, ry + 4.5);
    ctx.lineTo(3.5, ry + 4.5);
    ctx.lineTo(0, ry - 0.5);
    ctx.closePath();
    ctx.fillStyle = b.theme.mid;
    ctx.fill();

    ctx.restore();
  }

  function renderBackgroundFrame(timestamp) {
    if (!bgCtx) return;
    const timeSec = timestamp * 0.001;
    const dt = lastBgTime ? Math.min(0.05, Math.max(0.001, (timestamp - lastBgTime) * 0.001)) : 0.016;
    lastBgTime = timestamp;

    bgCtx.clearRect(0, 0, bgW, bgH);

    smoothPointerX += (pointerX - smoothPointerX) * Math.min(1, dt * 4);
    smoothPointerY += (pointerY - smoothPointerY) * Math.min(1, dt * 4);

    // 1. Twinkling golden star sparkles & warm bokeh motes
    sparkles.forEach((s) => {
      if (!prefersReducedMotion) {
        s.y += s.driftY * dt;
        if (s.y < -16) {
          s.y = bgH + 16;
          s.x = Math.random() * bgW;
        }
      }
      const alpha = 0.14 + 0.52 * (0.5 + 0.5 * Math.sin(timeSec * s.speed + s.phase));
      const sx = s.x + smoothPointerX * s.depth * 12;
      const sy = s.y + smoothPointerY * s.depth * 8;

      if (s.isFlare) {
        drawStarFlare(bgCtx, sx, sy, s.r, alpha);
      } else {
        bgCtx.beginPath();
        bgCtx.arc(sx, sy, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(255, 224, 130, ${alpha.toFixed(2)})`;
        bgCtx.fill();
      }
    });

    // 2. Volumetric floating balloons
    if (!prefersReducedMotion) {
      balloons.forEach((b) => {
        b.y -= b.speedY * dt;
        if (b.y < -150) {
          b.y = bgH + 90 + Math.random() * 240;
          b.x = bgW * (0.04 + Math.random() * 0.92);
          b.speedY = 14 + Math.random() * 32;
        }
        drawVolumetricBalloon(bgCtx, b, timeSec);
      });

      requestAnimationFrame(renderBackgroundFrame);
    }
  }

  if (bgCanvas && bgCtx) {
    initCelebrationBackground();
    window.addEventListener('resize', resizeBackgroundCanvasOnly, { passive: true });
    // Mouse-only parallax so touch taps and mobile scrolling never cause direction jitter
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener(
        'pointermove',
        (e) => {
          if (e.pointerType !== 'mouse') return;
          pointerX = (e.clientX / Math.max(1, bgW) - 0.5) * 2;
          pointerY = (e.clientY / Math.max(1, bgH) - 0.5) * 2;
        },
        { passive: true }
      );
    }
    requestAnimationFrame(renderBackgroundFrame);
  }

  // ---------------------------------------------------------------------------
  // 5. Layer 2: 3D Confetti Burst + Negligible Continuous Background Flutter
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const CONFETTI_PALETTE = [
    { base: [244, 196, 48], sheen: [255, 245, 198] },  // Gold foil
    { base: [143, 29, 49], sheen: [224, 92, 116] },    // Maroon silk
    { base: [255, 250, 240], sheen: [255, 255, 255] }, // Cream pearl
    { base: [42, 92, 198], sheen: [130, 174, 255] },   // Royal navy highlight
    { base: [24, 168, 114], sheen: [122, 235, 189] }   // Emerald accent
  ];

  let particles = [];
  let ambientConfetti = [];
  let animFrameId = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let ambientEnabled = false;

  function resizeConfettiCanvas() {
    if (!canvas || !ctx) return;
    const nextW = window.innerWidth;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const maxTouchH = isTouch ? Math.max(window.innerHeight, window.screen?.height || window.innerHeight) : window.innerHeight;
    const nextH = canvasHeight && canvasWidth === nextW && isTouch ? canvasHeight : maxTouchH;
    if (canvasWidth === nextW && canvasHeight === nextH) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = nextW;
    canvasHeight = nextH;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createConfettiPiece(originX, originY, spreadAngle, power) {
    const angle = spreadAngle + (Math.random() - 0.5) * 1.25;
    const speed = (Math.random() * 0.72 + 0.42) * power;
    const shapes = ['quad', 'ribbon'];
    const palette = CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)];

    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: Math.random() * 7 + 8,
      h: Math.random() * 4.5 + 5,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      vrx: (Math.random() - 0.5) * 0.16,
      vry: (Math.random() - 0.5) * 0.16,
      vrz: (Math.random() - 0.5) * 0.12,
      flutterPhase: Math.random() * Math.PI * 2,
      flutterFreq: 0.08 + Math.random() * 0.06,
      gravity: 0.2 + Math.random() * 0.08,
      palette,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      alpha: 1,
      decay: 0.0026 + Math.random() * 0.0024
    };
  }

  function createAmbientConfettiPiece(randomY = false) {
    const palette = CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)];
    return {
      x: Math.random() * canvasWidth,
      y: randomY ? Math.random() * canvasHeight : -18 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.35,
      vy: 0.45 + Math.random() * 0.5,
      w: Math.random() * 3.5 + 4.5,
      h: Math.random() * 2.5 + 3,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      vrx: (Math.random() - 0.5) * 0.06,
      vry: (Math.random() - 0.5) * 0.06,
      vrz: (Math.random() - 0.5) * 0.04,
      flutterPhase: Math.random() * Math.PI * 2,
      flutterFreq: 0.04 + Math.random() * 0.03,
      palette,
      alpha: 0.24 + Math.random() * 0.16
    };
  }

  function drawShadedQuad(p, alphaOverride) {
    const normalZ = Math.cos(p.rx) * Math.cos(p.ry);
    const sheenMix = Math.max(0, normalZ);
    const [r0, g0, b0] = p.palette.base;
    const [r1, g1, b1] = p.palette.sheen;
    const shadeFactor = normalZ < 0 ? 0.62 : 1;
    const r = Math.round((r0 + (r1 - r0) * sheenMix * 0.55) * shadeFactor);
    const g = Math.round((g0 + (g1 - g0) * sheenMix * 0.55) * shadeFactor);
    const b = Math.round((b0 + (b1 - b0) * sheenMix * 0.55) * shadeFactor);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alphaOverride !== undefined ? alphaOverride : p.alpha);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    if (p.shape === 'ribbon') {
      const pts = [
        { x: -p.w * 0.85, y: -p.h * 0.25, z: 0 },
        { x: 0, y: -p.h * 0.25, z: Math.sin(p.flutterPhase) * 4 },
        { x: p.w * 0.85, y: -p.h * 0.25, z: 0 },
        { x: p.w * 0.85, y: p.h * 0.25, z: 0 },
        { x: 0, y: p.h * 0.25, z: Math.sin(p.flutterPhase) * 4 },
        { x: -p.w * 0.85, y: p.h * 0.25, z: 0 }
      ].map((pt) => project3D(rotatePoint3D(pt, p.rx, p.ry, p.rz), p.x, p.y, 260));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.quadraticCurveTo(pts[4].x, pts[4].y, pts[5].x, pts[5].y);
      ctx.closePath();
      ctx.fill();
    } else {
      const localPts = [
        { x: -p.w * 0.5, y: -p.h * 0.5, z: 0 },
        { x: p.w * 0.5, y: -p.h * 0.5, z: 0 },
        { x: p.w * 0.5, y: p.h * 0.5, z: 0 },
        { x: -p.w * 0.5, y: p.h * 0.5, z: 0 }
      ];
      const projected = localPts.map((pt) =>
        project3D(rotatePoint3D(pt, p.rx, p.ry, p.rz), p.x, p.y, 260)
      );

      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      ctx.lineTo(projected[1].x, projected[1].y);
      ctx.lineTo(projected[2].x, projected[2].y);
      ctx.lineTo(projected[3].x, projected[3].y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function renderConfetti() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Continuous slight/negligible ambient confetti drift after initial burst
    if (ambientEnabled && !prefersReducedMotion) {
      for (let i = 0; i < ambientConfetti.length; i += 1) {
        const a = ambientConfetti[i];
        a.rx += a.vrx;
        a.ry += a.vry;
        a.rz += a.vrz;
        a.flutterPhase += a.flutterFreq;
        a.x += a.vx + Math.sin(a.flutterPhase) * 0.28;
        a.y += a.vy;

        if (a.y > canvasHeight + 24) {
          ambientConfetti[i] = createAmbientConfettiPiece(false);
        }
        drawShadedQuad(a, a.alpha);
      }
    }

    // 2. Active celebration bursts
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.rx += p.vrx;
      p.ry += p.vry;
      p.rz += p.vrz;
      p.flutterPhase += p.flutterFreq;

      const normalZ = Math.cos(p.rx) * Math.cos(p.ry);
      const faceArea = 0.25 + 0.75 * Math.abs(normalZ);
      const airDrag = 1 - 0.018 * faceArea;

      p.vx = p.vx * airDrag + Math.sin(p.flutterPhase) * 0.18 * (1 - Math.abs(normalZ));
      p.vy = p.vy * airDrag + p.gravity * (1.05 - 0.25 * faceArea);

      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > canvasHeight + 48) {
        particles.splice(i, 1);
        continue;
      }

      drawShadedQuad(p);
    }

    if (particles.length > 0 || (ambientEnabled && !prefersReducedMotion)) {
      animFrameId = requestAnimationFrame(renderConfetti);
    } else {
      animFrameId = null;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  function startConfettiLoop() {
    if (!animFrameId) {
      animFrameId = requestAnimationFrame(renderConfetti);
    }
  }

  function fireConfettiBurst(count = 220) {
    if (prefersReducedMotion || !ctx) return;
    const isMobile = canvasWidth < 640;
    const total = isMobile ? Math.round(count * 0.78) : count;

    for (let i = 0; i < total; i += 1) {
      const mode = i % 4;
      if (mode === 0) {
        particles.push(createConfettiPiece(canvasWidth * 0.12, canvasHeight * 0.84, -Math.PI / 2.7, isMobile ? 13.5 : 16.5));
      } else if (mode === 1) {
        particles.push(createConfettiPiece(canvasWidth * 0.88, canvasHeight * 0.84, -Math.PI * 0.63, isMobile ? 13.5 : 16.5));
      } else if (mode === 2) {
        particles.push(createConfettiPiece(canvasWidth * 0.5, canvasHeight * 0.76, -Math.PI / 2, isMobile ? 12.5 : 15));
      } else {
        particles.push(createConfettiPiece(canvasWidth * (0.1 + Math.random() * 0.8), -14, Math.PI / 2, isMobile ? 6.5 : 8.5));
      }
    }
    startConfettiLoop();
  }

  function enableSubtleBackgroundConfetti() {
    if (prefersReducedMotion || !ctx || ambientEnabled) return;
    const count = canvasWidth < 640 ? 14 : 22;
    ambientConfetti = Array.from({ length: count }, () => createAmbientConfettiPiece(true));
    ambientEnabled = true;
    startConfettiLoop();
  }

  function fireWelcomeShower(force = false) {
    if ((!force && celebrationStarted) || prefersReducedMotion || !ctx) return;
    celebrationStarted = true;
    fireConfettiBurst(220);
    setTimeout(() => fireConfettiBurst(140), 420);
    setTimeout(enableSubtleBackgroundConfetti, 2200);
  }

  if (canvas && ctx) {
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas, { passive: true });
  }

  const CACHE_KEY = 'pim_fresher_cache';

  function readLocalPass() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocalPass(fullName, firstName) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ name: fullName, firstName }));
    } catch {
      // Ignore storage quota errors
    }
  }

  function unlockCelebration(fullName, firstName, forceConfetti = false) {
    applyPersonalizedName(fullName, firstName);
    writeLocalPass(fullName, firstName);
    updateShareLinks(fullName);
    if (checkinGate) checkinGate.hidden = true;
    document.body.classList.remove('awaiting-session', 'gate-open');
    fireWelcomeShower(forceConfetti);
    renderFeedbackUI();
  }

  function showGate() {
    celebrationStarted = false;
    document.body.classList.remove('awaiting-session');
    if (checkinGate) {
      checkinGate.hidden = false;
      document.body.classList.add('gate-open');
    }
    if (checkinNameInput) {
      setTimeout(() => checkinNameInput.focus(), 60);
    }
  }

  function setCheckinError(msg) {
    if (!checkinErrorEl) return;
    if (!msg) {
      checkinErrorEl.hidden = true;
      checkinErrorEl.textContent = '';
    } else {
      checkinErrorEl.textContent = msg;
      checkinErrorEl.hidden = false;
    }
  }

  async function initSessionGate() {
    if (window.location.protocol === 'file:') {
      document.body.classList.remove('awaiting-session');
      fireWelcomeShower();
      return;
    }

    // Instant 0ms render for returning students using local cache while verifying cookie in background
    const cached = readLocalPass();
    if (cached && cached.name) {
      unlockCelebration(cached.name, cached.firstName, false);
    } else {
      // Show Check-In Gate immediately so first-time visitors never wait 3s on a blank screen
      showGate();
    }

    try {
      const resp = await fetch('/api/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (!resp.ok) {
        if (!cached) {
          setCheckinError('Check-in backend is not connected on this host yet. Deploy to Vercel with DATABASE_URL to enable live check-in.');
        }
        return;
      }

      const data = await resp.json();
      syncFeedbackState(data);
      if (data.checkedIn && data.name) {
        unlockCelebration(data.name, data.firstName, false);
      } else if (cached) {
        // Cookie was cleared or removed by admin -> clear stale local cache and show gate
        try { localStorage.removeItem(CACHE_KEY); } catch {}
        showGate();
      }
    } catch {
      if (!cached) {
        setCheckinError('Unable to reach the check-in server. Please check your internet connection and refresh.');
      }
    }
  }

  if (checkinForm) {
    checkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setCheckinError('');

      const nameVal = (checkinNameInput?.value || '').trim();
      const rollVal = (checkinRollInput?.value || '').trim().toUpperCase().replace(/[\s\-_]+/g, '');

      if (nameVal.length < 2) {
        setCheckinError('Please enter your full name.');
        checkinNameInput?.focus();
        return;
      }
      if (!/^261\d{2}$/.test(rollVal)) {
        setCheckinError('Roll Number must be a 5-digit number starting with 261 (e.g. 26101).');
        checkinRollInput?.focus();
        return;
      }

      const submitLabel = checkinSubmitBtn?.querySelector('.btn-label');
      if (checkinSubmitBtn) {
        checkinSubmitBtn.disabled = true;
        checkinSubmitBtn.classList.add('is-loading');
      }
      if (submitLabel) submitLabel.textContent = 'Checking In...';

      try {
        const resp = await fetch('/api/checkin', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            rollNo: rollVal,
            website: checkinHpInput?.value || ''
          })
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
          setCheckinError(data.error || 'Could not complete check-in. Please verify your details.');
          return;
        }

        syncFeedbackState(data);
        unlockCelebration(data.name, data.firstName, true);
      } catch {
        setCheckinError('Network error while checking in. Please try again.');
      } finally {
        if (checkinSubmitBtn) {
          checkinSubmitBtn.disabled = false;
          checkinSubmitBtn.classList.remove('is-loading');
        }
        if (submitLabel) submitLabel.textContent = "LET'S CELEBRATE";
      }
    });
  }

  function showLetsStartStep(fullName, firstName, status) {
    pendingCheckin = { fullName, firstName, status };
    if (checkinForm) checkinForm.hidden = true;
    if (checkinSubEl) checkinSubEl.hidden = true;
    if (checkinTitleEl) checkinTitleEl.hidden = true;
    if (readyGreetingEl) {
      readyGreetingEl.textContent = `Welcome, ${fullName}!`;
    }
    if (checkinReadyBox) {
      checkinReadyBox.hidden = false;
    }
    if (btnLetsStart) {
      setTimeout(() => btnLetsStart.focus(), 60);
    }
  }

  if (btnLetsStart) {
    btnLetsStart.addEventListener('click', () => {
      if (!pendingCheckin) return;
      unlockCelebration(pendingCheckin.fullName, pendingCheckin.firstName, pendingCheckin.status);
    });
  }

  window.addEventListener('DOMContentLoaded', initSessionGate);

  // ---------------------------------------------------------------------------
  // 5b. Event Feedback (Locked until unlock time, 5s alert on unlock, tied to Roll No)
  // ---------------------------------------------------------------------------
  const DEFAULT_FEEDBACK_UNLOCK_ISO = '2026-11-26T12:30:00+05:30';
  const feedbackLockedEl = document.getElementById('feedback-locked');
  const feedbackUnlockLabelEl = document.getElementById('feedback-unlock-label');
  const feedbackCountdownEl = document.getElementById('feedback-countdown');
  const feedbackFormEl = document.getElementById('feedback-form');
  const feedbackCommentEl = document.getElementById('feedback-comment');
  const feedbackErrorEl = document.getElementById('feedback-error');
  const feedbackSubmitBtn = document.getElementById('feedback-submit');
  const feedbackDoneEl = document.getElementById('feedback-done');
  const feedbackDoneTextEl = document.getElementById('feedback-done-text');
  const feedbackUnlockAlertEl = document.getElementById('feedback-unlock-alert');
  const starBtns = Array.from(document.querySelectorAll('.star-btn'));

  let feedbackUnlockMs = Date.parse(DEFAULT_FEEDBACK_UNLOCK_ISO);
  let serverOffsetMs = 0;
  let feedbackSubmitted = false;
  let feedbackRatingVal = 0;
  let wasFeedbackLocked = null;
  let feedbackTickTimer = null;
  let unlockAlertTimer = null;

  function getServerNowMs() {
    return Date.now() + serverOffsetMs;
  }

  function formatUnlockIST(ms) {
    try {
      return new Date(ms).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '26 November 2026, 12:30 PM';
    }
  }

  function showFiveSecUnlockAlert() {
    if (!feedbackUnlockAlertEl || (checkinGate && !checkinGate.hidden)) return;
    feedbackUnlockAlertEl.hidden = false;
    requestAnimationFrame(() => {
      feedbackUnlockAlertEl.classList.add('is-visible');
    });
    clearTimeout(unlockAlertTimer);
    unlockAlertTimer = setTimeout(() => {
      feedbackUnlockAlertEl.classList.remove('is-visible');
      setTimeout(() => {
        feedbackUnlockAlertEl.hidden = true;
      }, 300);
    }, 5000);
  }

  function setSelectedRating(val) {
    feedbackRatingVal = val;
    starBtns.forEach((btn) => {
      const r = Number(btn.getAttribute('data-rating'));
      btn.classList.toggle('is-active', r <= val);
    });
  }

  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSelectedRating(Number(btn.getAttribute('data-rating')));
    });
  });

  function renderFeedbackUI() {
    if (!feedbackLockedEl || !feedbackFormEl || !feedbackDoneEl) return;

    if (feedbackSubmitted) {
      feedbackLockedEl.hidden = true;
      feedbackFormEl.hidden = true;
      feedbackDoneEl.hidden = false;
      if (feedbackDoneTextEl && feedbackRatingVal) {
        const starWord = feedbackRatingVal === 1 ? 'star' : 'stars';
        feedbackDoneTextEl.textContent = `Thank you! You rated Freshers Day 2026: ${feedbackRatingVal} / 5 ${starWord}.`;
      }
      return;
    }

    const diffMs = feedbackUnlockMs - getServerNowMs();
    if (diffMs > 0) {
      wasFeedbackLocked = true;
      feedbackLockedEl.hidden = false;
      feedbackFormEl.hidden = true;
      feedbackDoneEl.hidden = true;

      if (feedbackUnlockLabelEl) {
        feedbackUnlockLabelEl.textContent = `Unlocks on ${formatUnlockIST(feedbackUnlockMs)} IST`;
      }
      if (feedbackCountdownEl) {
        const totalSec = Math.ceil(diffMs / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        const pad = (n) => String(n).padStart(2, '0');
        feedbackCountdownEl.textContent = `${pad(hrs)}h : ${pad(mins)}m : ${pad(secs)}s`;
      }
    } else {
      feedbackLockedEl.hidden = true;
      feedbackFormEl.hidden = false;
      feedbackDoneEl.hidden = true;

      if (wasFeedbackLocked === true) {
        wasFeedbackLocked = false;
        showFiveSecUnlockAlert();
      } else if (wasFeedbackLocked === null) {
        wasFeedbackLocked = false;
        if (!feedbackSubmitted) {
          showFiveSecUnlockAlert();
        }
      }
    }
  }

  function syncFeedbackState(data) {
    if (data && data.serverNow) {
      const srv = Date.parse(data.serverNow);
      if (Number.isFinite(srv)) serverOffsetMs = srv - Date.now();
    }
    if (data && data.feedbackUnlockAt) {
      const unlock = Date.parse(data.feedbackUnlockAt);
      if (Number.isFinite(unlock)) feedbackUnlockMs = unlock;
    }
    if (data && typeof data.feedbackSubmitted === 'boolean') {
      feedbackSubmitted = data.feedbackSubmitted;
    }
    if (data && data.feedbackRating) {
      feedbackRatingVal = Number(data.feedbackRating) || 0;
    }
    renderFeedbackUI();
  }

  if (feedbackFormEl) {
    feedbackFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (feedbackErrorEl) {
        feedbackErrorEl.hidden = true;
        feedbackErrorEl.textContent = '';
      }

      const comment = (feedbackCommentEl?.value || '').trim();
      if (!feedbackRatingVal || feedbackRatingVal < 1 || feedbackRatingVal > 5) {
        if (feedbackErrorEl) {
          feedbackErrorEl.textContent = 'Please tap a star rating (1 to 5) first.';
          feedbackErrorEl.hidden = false;
        }
        return;
      }
      if (comment.length < 3) {
        if (feedbackErrorEl) {
          feedbackErrorEl.textContent = 'Please share a short note (at least 3 characters).';
          feedbackErrorEl.hidden = false;
        }
        feedbackCommentEl?.focus();
        return;
      }

      if (feedbackSubmitBtn) feedbackSubmitBtn.disabled = true;
      try {
        const resp = await fetch('/api/feedback', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: feedbackRatingVal, comment })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
          if (data.feedbackUnlockAt) syncFeedbackState(data);
          if (feedbackErrorEl) {
            feedbackErrorEl.textContent = data.error || 'Could not submit feedback.';
            feedbackErrorEl.hidden = false;
          }
          return;
        }
        feedbackSubmitted = true;
        renderFeedbackUI();
      } catch {
        if (feedbackErrorEl) {
          feedbackErrorEl.textContent = 'Network error submitting feedback. Please try again.';
          feedbackErrorEl.hidden = false;
        }
      } finally {
        if (feedbackSubmitBtn) feedbackSubmitBtn.disabled = false;
      }
    });
  }

  renderFeedbackUI();
  feedbackTickTimer = setInterval(() => {
    if (!feedbackSubmitted && feedbackUnlockMs > getServerNowMs() - 2000) {
      renderFeedbackUI();
    }
  }, 1000);

  // Live-sync unlock timer changes from Admin without needing a page refresh
  let lastSessionSyncAt = 0;
  async function syncSessionSilently() {
    if (window.location.protocol === 'file:' || feedbackSubmitted) return;
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - lastSessionSyncAt < 4000) return;
    lastSessionSyncAt = now;

    try {
      const resp = await fetch('/api/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!resp.ok) return;
      const data = await resp.json();
      syncFeedbackState(data);
    } catch {
      // Non-blocking background sync
    }
  }

  setInterval(() => {
    // Poll every 15s only while tab is visible and feedback is still locked/unsubmitted
    if (!feedbackSubmitted && document.visibilityState === 'visible' && getServerNowMs() < feedbackUnlockMs) {
      syncSessionSilently();
    }
  }, 15000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !feedbackSubmitted) {
      syncSessionSilently();
    }
  });

  window.addEventListener('focus', () => {
    if (!feedbackSubmitted) {
      syncSessionSilently();
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Button Actions ("LET'S CELEBRATE", "CELEBRATE AGAIN", WhatsApp)
  // ---------------------------------------------------------------------------
  const btnCelebrate = document.getElementById('btn-celebrate');
  const btnCelebrateAgain = document.getElementById('btn-celebrate-again');
  const greetingSection = document.getElementById('greeting');
  const whatsappBtn = document.getElementById('btn-whatsapp-share');

  function getCleanSiteUrl() {
    return window.location.protocol === 'https:'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://pim-freshers-2026.vercel.app/';
  }

  function updateShareLinks(studentFullName) {
    if (!whatsappBtn) return;
    const siteUrl = getCleanSiteUrl();
    const intro =
      studentFullName && studentFullName !== 'MCA Star'
        ? `*${studentFullName}* is celebrating *Freshers Day 2026* at *Poornaprajna Institute of Management – Dept. of MCA*!`
        : `Celebrate *Freshers Day 2026* with *Poornaprajna Institute of Management – Dept. of MCA*!`;

    const shareText =
      `${intro}\n\n` +
      `*Date:* 28 November 2026\n` +
      `*Time:* 9:15 AM\n` +
      `*Venue:* Prajna Hall\n\n` +
      `_Learn • Lead • Excel — Together Towards a Brighter Future_\n` +
      `${siteUrl}`;
    whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  }

  updateShareLinks(displayName);

  function triggerBigCelebration() {
    fireConfettiBurst(240);
    setTimeout(() => fireConfettiBurst(150), 420);
  }

  if (btnCelebrate) {
    btnCelebrate.addEventListener('click', () => {
      triggerBigCelebration();
      showCelebrationToast(`Welcome, ${displayName}! You are part of the Poornaprajna family!`);
      if (greetingSection) {
        setTimeout(() => {
          greetingSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }, 520);
      }
    });
  }

  if (btnCelebrateAgain) {
    btnCelebrateAgain.addEventListener('click', () => {
      triggerBigCelebration();
      showCelebrationToast('Meet • Mingle • Celebrate — Happy Freshers Day 2026!');
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Icon-Only Music Button (Zero Autoplay; Gentle Web Audio Chime on Tap)
  // ---------------------------------------------------------------------------
  const musicToggle = document.getElementById('music-toggle');
  let audioCtx = null;
  let musicInterval = null;
  let isMusicPlaying = false;

  const MELODY_NOTES = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 659.25];
  let noteStep = 0;

  function playChimeNote(freq) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  function stopMusic() {
    isMusicPlaying = false;
    clearInterval(musicInterval);
    musicInterval = null;
    if (musicToggle) {
      musicToggle.setAttribute('aria-pressed', 'false');
      musicToggle.setAttribute('title', 'Play celebration music');
    }
  }

  function startMusic() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      showCelebrationToast('Audio chime is not supported on this browser.');
      return;
    }

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isMusicPlaying = true;
    noteStep = 0;
    playChimeNote(MELODY_NOTES[noteStep % MELODY_NOTES.length]);
    noteStep += 1;

    musicInterval = setInterval(() => {
      if (!isMusicPlaying) return;
      playChimeNote(MELODY_NOTES[noteStep % MELODY_NOTES.length]);
      noteStep += 1;
    }, 520);

    if (musicToggle) {
      musicToggle.setAttribute('aria-pressed', 'true');
      musicToggle.setAttribute('title', 'Pause celebration music');
    }
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (isMusicPlaying) {
        stopMusic();
      } else {
        startMusic();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Scroll Reveal Observer
  // ---------------------------------------------------------------------------
  const scrollRevealEls = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    scrollRevealEls.forEach((el) => observer.observe(el));
  } else {
    scrollRevealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ---------------------------------------------------------------------------
  // 9. PWA Service Worker Registration
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Non-blocking: PWA caching is optional enhancement
      });
    });
  }
})();
