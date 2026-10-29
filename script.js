/**
 * Ashok Mendonsa — Clean, Fast Portfolio Script
 * Size: ~1.2KB, Zero Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Current Year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 2. Dark/Light Theme Switcher
  const themeBtn = document.getElementById('theme-btn');
  const themeText = document.getElementById('theme-text');
  const savedTheme = localStorage.getItem('ashok-theme') || 'light';
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('ashok-theme', next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeText) {
      themeText.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
  }

  // 3. One-Click Copy to Clipboard with Animated Toast
  document.querySelectorAll('.copy-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      if (!text) return;

      const originalText = btn.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        showToast(`Copied to clipboard: ${text}`);
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Copied: ${text}`);
      });
    });
  });

  // 4. Toast Notification Engine
  function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._tTimer);
    window._tTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
});
