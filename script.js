/**
 * Ashok Mendonsa — Portfolio JavaScript
 * Lightweight, Vanilla ES6+, Zero Dependencies.
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------------------
  // 1. Dynamic Year in Footer
  // -------------------------------------------------------------------------
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // -------------------------------------------------------------------------
  // 2. Minimal Dark Mode Theme Engine
  // -------------------------------------------------------------------------
  const themeBtn = document.getElementById('theme-btn');
  const metaThemeColorDark = document.querySelector('meta[name="theme-color"][media*="dark"]');
  const metaThemeColorLight = document.querySelector('meta[name="theme-color"][media*="light"]');

  function getPreferredTheme() {
    const saved = localStorage.getItem('ashok-theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  }

  // Initialize theme
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Toggle button click listener
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem('ashok-theme', nextTheme);
    });
  }

  // Listen for OS theme change only if user has not explicitly chosen
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('ashok-theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // -------------------------------------------------------------------------
  // 3. Mobile Navigation Drawer
  // -------------------------------------------------------------------------
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuToggleBtn && mobileMenu) {
    menuToggleBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    function openMobileMenu() {
      mobileMenu.classList.add('open');
      menuToggleBtn.setAttribute('aria-expanded', 'true');
      mobileMenu.setAttribute('aria-hidden', 'false');
    }

    function closeMobileMenu() {
      mobileMenu.classList.remove('open');
      menuToggleBtn.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    }

    // Auto-close when clicking any link inside mobile nav
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close mobile menu if window resized to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  // -------------------------------------------------------------------------
  // 4. Interactive Skills Category Filter
  // -------------------------------------------------------------------------
  const filterTabs = document.querySelectorAll('.filter-tab');
  const skillCards = document.querySelectorAll('.skill-card');

  if (filterTabs.length > 0 && skillCards.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Toggle active tab
        filterTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const filter = tab.getAttribute('data-filter');

        skillCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.25s ease';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // -------------------------------------------------------------------------
  // 5. One-Click Copy to Clipboard with Visual Feedback
  // -------------------------------------------------------------------------
  const copyButtons = document.querySelectorAll('.copy-trigger');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      const originalHTML = btn.innerHTML;

      const successFeedback = () => {
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copied!</span>
        `;
        showToast(`Copied to clipboard: ${textToCopy}`);

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalHTML;
        }, 2000);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
          .then(successFeedback)
          .catch(() => fallbackCopy(textToCopy, successFeedback));
      } else {
        fallbackCopy(textToCopy, successFeedback);
      }
    });
  });

  function fallbackCopy(text, callback) {
    try {
      const tempInput = document.createElement('input');
      tempInput.style.position = 'fixed';
      tempInput.style.left = '-9999px';
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      callback();
    } catch (e) {
      showToast('Could not copy automatically. Please copy manually.');
    }
  }

  // -------------------------------------------------------------------------
  // 6. Minimal Toast Notification Engine
  // -------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // -------------------------------------------------------------------------
  // 7. ScrollSpy: Highlight Active Section in Navigation
  // -------------------------------------------------------------------------
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (sections.length > 0 && navLinks.length > 0) {
    window.addEventListener('scroll', () => {
      let currentSectionId = '';
      const scrollY = window.pageYOffset;

      sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.offsetHeight;
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
          currentSectionId = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${currentSectionId}`) {
          link.style.color = 'var(--text)';
          link.style.background = 'var(--bg-subtle)';
        } else {
          link.style.color = '';
          link.style.background = '';
        }
      });
    }, { passive: true });
  }
});
