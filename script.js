/**
 * ASHOK MENDONSA — FULL-STACK SOFTWARE ENGINEER PORTFOLIO
 * CSP-Compliant Vanilla JS (Zero inline scripts/styles, anti-scraper email protection)
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Dynamic Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 2. Toast Feedback
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  // 3. Dark / Light Theme Toggle
  const html = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('fport_theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  function toggleTheme() {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('fport_theme', next);
    showToast(`Switched to ${next} theme`);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // 4. Mobile Menu Drawer
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const open = mobileDrawer.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileDrawer.setAttribute('aria-hidden', String(!open));
    });

    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileDrawer.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // 5. Scroll Progress & Navigation Scrollspy
  const progressBar = document.getElementById('scroll-progress-bar');
  const navLinks = document.querySelectorAll('.primary-nav .nav-link');
  const sections = document.querySelectorAll('main section[id]');

  function onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar && docHeight > 0) {
      const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      progressBar.style.width = `${pct}%`;
    }

    let currentId = 'overview';
    sections.forEach(sec => {
      if (scrollTop >= sec.offsetTop - 130) {
        currentId = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 6. Scroll Reveal Observer
  const revealEls = document.querySelectorAll('.reveal-on-scroll');
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  // 7. Bot & Scraper Protection: Honeypot + Human-Triggered Email Decryption
  const emailDisplay = document.getElementById('email-display-text');
  const heroCopyBtn = document.getElementById('hero-copy-email');
  const contactCopyBtn = document.getElementById('contact-copy-btn');
  const secureEmailCard = document.getElementById('secure-email-card');
  const botCatcher = document.getElementById('bot-catcher-input');
  let botFlagged = false;
  let lastActionTime = 0;

  if (botCatcher) {
    botCatcher.addEventListener('input', () => {
      if (botCatcher.value.trim().length > 0) {
        botFlagged = true;
      }
    });
  }

  function decryptEmail(event) {
    if (botFlagged) return null;
    if (event && event.isTrusted === false) return null;

    const u = emailDisplay ? emailDisplay.dataset.u : 'YXNob2ttZW5kb25zYS5tY2EuMjAyNQ==';
    const h = emailDisplay ? emailDisplay.dataset.h : 'cGltLmFjLmlu';
    try {
      return `${atob(u)}@${atob(h)}`;
    } catch {
      return null;
    }
  }

  function copyVerifiedEmail(event) {
    if (event) event.preventDefault();

    const now = Date.now();
    if (now - lastActionTime < 400) return;
    lastActionTime = now;

    const email = decryptEmail(event);
    if (!email) {
      showToast('Automated access blocked.');
      return;
    }

    if (emailDisplay) {
      emailDisplay.textContent = email;
      emailDisplay.classList.add('revealed-email');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email)
        .then(() => showToast(`Copied ${email} to clipboard`))
        .catch(() => showToast(`Email: ${email}`));
    } else {
      showToast(`Email: ${email}`);
    }
  }

  if (heroCopyBtn) heroCopyBtn.addEventListener('click', copyVerifiedEmail);
  if (contactCopyBtn) {
    contactCopyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyVerifiedEmail(e);
    });
  }
  if (secureEmailCard) secureEmailCard.addEventListener('click', copyVerifiedEmail);

  // 8. Project Filter Tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      projectCards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  // 9. Skills Filter Tabs
  const skillFilterBtns = document.querySelectorAll('.skill-filter-btn');
  const skillDomains = document.querySelectorAll('.skill-domain');

  skillFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      skillFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.skillCat;
      skillDomains.forEach(dom => {
        const show = cat === 'all' || dom.dataset.skillDomain === cat;
        dom.classList.toggle('is-hidden', !show);
      });
    });
  });

  // 10. Project Architecture Modal (Interview Walkthrough)
  const bpModal = document.getElementById('blueprint-modal');
  const bpTitle = document.getElementById('bp-modal-title');
  const bpEyebrow = document.getElementById('bp-modal-eyebrow');
  const bpBody = document.getElementById('bp-modal-body');
  const bpClose = document.getElementById('bp-modal-close');

  const projectBlueprints = {
    furniture: {
      eyebrow: 'Full-Stack Web Architecture',
      title: 'Bespoke Furniture E-Commerce Web Platform',
      nodes: [
        { layer: 'Frontend', title: 'ES6+ JS & CSS3 Grid UI' },
        { layer: 'Backend', title: 'Modular PHP Controllers' },
        { layer: 'Database', title: '3NF MySQL + PDO Queries' },
        { layer: 'Automation', title: 'Python Batch ETL Scripts' }
      ],
      challenge: 'Build a custom furniture commerce platform from scratch with strict relational integrity, secure session auth, and fast bulk catalog maintenance.',
      decisions: [
        'Designed a 3NF normalized MySQL schema with foreign-key constraints for ACID order transactions.',
        'Implemented parameterized PDO SQL queries, input sanitization, and session auth to prevent SQL injection.',
        'Wrote Python utility scripts for automated catalog ingestion, schema verification, and stock synchronization.',
        'Built responsive CSS3 Grid layouts with zero external UI framework dependencies.'
      ],
      stack: ['PHP', 'JavaScript (ES6+)', 'Python', 'MySQL (3NF)', 'CSS3 Grid', 'REST APIs']
    },
    edupulse: {
      eyebrow: 'Data & Predictive Analytics Architecture',
      title: 'EduPulse AI — Academic Risk & Pattern Detection',
      nodes: [
        { layer: 'Data Sources', title: 'Attendance & Quiz Logs' },
        { layer: 'Preprocessing', title: 'Pandas & NumPy Scaling' },
        { layer: 'ML Pipeline', title: 'Scikit-Learn Classifiers' },
        { layer: 'Reporting', title: 'Faculty Risk-Tier Alerts' }
      ],
      challenge: 'Detect early academic decline patterns across longitudinal coursework records so faculty can intervene before final exams.',
      decisions: [
        'Engineered automated Pandas and NumPy pipelines for missing-value imputation, encoding, and scaling.',
        'Evaluated supervised classification models using K-Fold cross-validation and precision-recall metrics.',
        'Stratified students into clear risk tiers with rule-based alert thresholds for faculty decision support.'
      ],
      stack: ['Python', 'Scikit-Learn', 'Pandas', 'NumPy', 'Data Mining', 'K-Fold CV']
    },
    grocery: {
      eyebrow: 'Mobile Application Architecture',
      title: 'Mobile Grocery Delivery Application',
      nodes: [
        { layer: 'UI Layer', title: 'Activities & Filters' },
        { layer: 'State', title: 'MVVM ViewModel + LiveData' },
        { layer: 'Local Store', title: 'Room / SQLite Cache' },
        { layer: 'Backend Sync', title: 'REST Inventory & Checkout' }
      ],
      challenge: 'Deliver responsive catalog browsing and reliable shopping cart persistence even on intermittent mobile connections.',
      decisions: [
        'Adopted MVVM separation so UI state survives configuration changes via lifecycle-aware ViewModels.',
        'Indexed Room / SQLite local cart tables for fast recovery and offline-first ordering.',
        'Offloaded database reads and stock validation to background threads.',
        'Collaborated in agile team sprints using structured Git branching and pull request reviews.'
      ],
      stack: ['Java', 'Kotlin', 'Android SDK', 'Room DB', 'SQLite', 'RESTful APIs', 'Git']
    }
  };

  function openBlueprintModal(key) {
    const data = projectBlueprints[key];
    if (!data || !bpModal || !bpBody) return;

    if (bpEyebrow) bpEyebrow.textContent = data.eyebrow;
    if (bpTitle) bpTitle.textContent = data.title;
    bpBody.innerHTML = '';

    const diag = document.createElement('div');
    diag.className = 'bp-diagram';
    const flow = document.createElement('div');
    flow.className = 'bp-flow';

    data.nodes.forEach((node, idx) => {
      const box = document.createElement('div');
      box.className = 'bp-node';
      const l = document.createElement('span');
      l.className = 'bp-node-layer';
      l.textContent = node.layer;
      const t = document.createElement('div');
      t.className = 'bp-node-title';
      t.textContent = node.title;
      box.append(l, t);
      flow.appendChild(box);

      if (idx < data.nodes.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'bp-arrow';
        arr.textContent = '→';
        flow.appendChild(arr);
      }
    });
    diag.appendChild(flow);

    const grid = document.createElement('div');
    grid.className = 'bp-details-grid';

    const chalBox = document.createElement('div');
    chalBox.className = 'bp-box';
    const chalH = document.createElement('h4');
    chalH.textContent = 'Problem & Goal';
    const chalP = document.createElement('p');
    chalP.textContent = data.challenge;
    chalBox.append(chalH, chalP);

    const stackBox = document.createElement('div');
    stackBox.className = 'bp-box';
    const stackH = document.createElement('h4');
    stackH.textContent = 'Technologies Used';
    const stackTags = document.createElement('div');
    stackTags.className = 'tech-tag-row bp-tags-inline';
    data.stack.forEach(s => {
      const sp = document.createElement('span');
      sp.textContent = s;
      stackTags.appendChild(sp);
    });
    stackBox.append(stackH, stackTags);
    grid.append(chalBox, stackBox);

    const decBox = document.createElement('div');
    decBox.className = 'bp-box';
    const decH = document.createElement('h4');
    decH.textContent = 'Key Engineering Decisions';
    const ul = document.createElement('ul');
    data.decisions.forEach(d => {
      const li = document.createElement('li');
      li.textContent = d;
      ul.appendChild(li);
    });
    decBox.append(decH, ul);

    bpBody.append(diag, grid, decBox);

    bpModal.classList.add('open');
    bpModal.setAttribute('aria-hidden', 'false');
  }

  function closeBlueprintModal() {
    if (!bpModal) return;
    bpModal.classList.remove('open');
    bpModal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.btn-blueprint').forEach(btn => {
    btn.addEventListener('click', () => openBlueprintModal(btn.dataset.project));
  });
  if (bpClose) bpClose.addEventListener('click', closeBlueprintModal);
  if (bpModal) {
    bpModal.addEventListener('click', (e) => {
      if (e.target === bpModal) closeBlueprintModal();
    });
  }

  // Always-visible Scroll to Top Button
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  }

  // Secret Easter Egg (Unlocked by pressing '.' or clicking the footer dot)
  const eggModal = document.getElementById('easter-egg-modal');
  const eggClose = document.getElementById('egg-modal-close');
  const secretDotBtn = document.getElementById('secret-dot-trigger');
  const eggGrid = document.getElementById('egg-grid');
  const eggScoreEl = document.getElementById('egg-score');
  const eggTimerEl = document.getElementById('egg-timer');
  const eggBestEl = document.getElementById('egg-best');
  const eggStartBtn = document.getElementById('egg-start-btn');
  const eggStatusEl = document.getElementById('egg-status-msg');
  const eggLangBtns = document.querySelectorAll('.egg-lang-btn');
  const eggGreetingBanner = document.getElementById('egg-greeting-banner');
  const eggLangNote = document.getElementById('egg-lang-note');

  let eggScore = 0;
  let eggTime = 20;
  let eggBest = Number(localStorage.getItem('fport_egg_best') || 0);
  let eggTickTimer = null;
  let eggSpawnTimer = null;
  let eggPlaying = false;
  const eggCells = [];

  if (eggBestEl) eggBestEl.textContent = String(eggBest);

  if (eggGrid) {
    for (let i = 0; i < 12; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'egg-cell';
      cell.textContent = `NODE ${i + 1}`;
      cell.dataset.state = 'idle';
      cell.addEventListener('click', () => {
        if (!eggPlaying) return;
        if (cell.dataset.state === 'bug') {
          eggScore += 10;
          cell.dataset.state = 'idle';
          cell.className = 'egg-cell';
          cell.textContent = 'FIXED';
        } else if (cell.dataset.state === 'api') {
          eggScore = Math.max(0, eggScore - 5);
          cell.dataset.state = 'idle';
          cell.className = 'egg-cell';
          cell.textContent = 'OOPS';
        }
        if (eggScoreEl) eggScoreEl.textContent = String(eggScore);
      });
      eggGrid.appendChild(cell);
      eggCells.push(cell);
    }
  }

  function clearEggBoard() {
    eggCells.forEach((cell, idx) => {
      cell.dataset.state = 'idle';
      cell.className = 'egg-cell';
      cell.textContent = `NODE ${idx + 1}`;
    });
  }

  function stopEggGame() {
    eggPlaying = false;
    clearInterval(eggTickTimer);
    clearInterval(eggSpawnTimer);
    clearEggBoard();
    if (eggStartBtn) eggStartBtn.textContent = 'Play Again';
  }

  function spawnEggTile() {
    clearEggBoard();
    const bugIdx = Math.floor(Math.random() * eggCells.length);
    const bugCell = eggCells[bugIdx];
    bugCell.dataset.state = 'bug';
    bugCell.className = 'egg-cell is-bug';
    bugCell.textContent = 'BUG';

    if (Math.random() > 0.35) {
      let apiIdx = Math.floor(Math.random() * eggCells.length);
      if (apiIdx === bugIdx) apiIdx = (bugIdx + 1) % eggCells.length;
      const apiCell = eggCells[apiIdx];
      apiCell.dataset.state = 'api';
      apiCell.className = 'egg-cell is-api';
      apiCell.textContent = 'API OK';
    }
  }

  function startEggGame() {
    stopEggGame();
    eggPlaying = true;
    eggScore = 0;
    eggTime = 20;
    if (eggScoreEl) eggScoreEl.textContent = '0';
    if (eggTimerEl) eggTimerEl.textContent = '20s';
    if (eggStartBtn) eggStartBtn.textContent = 'Restart';
    if (eggStatusEl) eggStatusEl.textContent = 'Squash red BUG tiles (+10) and spare green API OK nodes (-5)!';

    spawnEggTile();
    eggSpawnTimer = setInterval(spawnEggTile, 750);
    eggTickTimer = setInterval(() => {
      eggTime -= 1;
      if (eggTimerEl) eggTimerEl.textContent = `${eggTime}s`;
      if (eggTime <= 0) {
        stopEggGame();
        if (eggScore > eggBest) {
          eggBest = eggScore;
          localStorage.setItem('fport_egg_best', String(eggBest));
          if (eggBestEl) eggBestEl.textContent = String(eggBest);
          if (eggStatusEl) eggStatusEl.textContent = `New High Score: ${eggScore} pts! Production is spotless.`;
        } else {
          if (eggStatusEl) eggStatusEl.textContent = `Round complete! Final score: ${eggScore} pts.`;
        }
      }
    }, 1000);
  }

  function openEggModal() {
    if (!eggModal) return;
    eggModal.classList.add('open');
    eggModal.setAttribute('aria-hidden', 'false');
    showToast('Secret Developer Arcade unlocked!');
  }

  function closeEggModal() {
    if (!eggModal) return;
    stopEggGame();
    eggModal.classList.remove('open');
    eggModal.setAttribute('aria-hidden', 'true');
  }

  if (eggStartBtn) eggStartBtn.addEventListener('click', startEggGame);
  if (eggClose) eggClose.addEventListener('click', closeEggModal);
  if (secretDotBtn) secretDotBtn.addEventListener('click', openEggModal);
  if (eggModal) {
    eggModal.addEventListener('click', (e) => {
      if (e.target === eggModal) closeEggModal();
    });
  }

  eggLangBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      eggLangBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (eggGreetingBanner) eggGreetingBanner.textContent = btn.dataset.phrase || '';
      if (eggLangNote) eggLangNote.textContent = btn.dataset.note || '';
    });
  });

  // Keyboard shortcuts: '.' toggles Easter Egg, Escape closes modals, T toggles theme
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Escape') {
      if (bpModal && bpModal.classList.contains('open')) closeBlueprintModal();
      if (eggModal && eggModal.classList.contains('open')) closeEggModal();
      return;
    }

    if (!isTyping && e.key === '.') {
      e.preventDefault();
      if (eggModal && eggModal.classList.contains('open')) {
        closeEggModal();
      } else {
        openEggModal();
      }
      return;
    }

    if (!isTyping && e.key.toLowerCase() === 't') {
      toggleTheme();
    }
  });
});
