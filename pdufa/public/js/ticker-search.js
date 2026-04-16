/**
 * Ticker Search — Dan Sfera Biotech Catalyst Calendar
 * Autocomplete + financial data modal
 */
(function () {
  'use strict';

  const BASE = (window._pdufaBase || '').replace(/\/$/, '');

  // ── DOM refs (populated on DOMContentLoaded) ──
  let input, clearBtn, dropdown, overlay, modal, modalContent, closeBtn;

  // ── State ──
  let debounceTimer = null;
  let currentResults = [];
  let selectedIdx = -1;
  let activeRequest = null; // abort controller for stock fetch

  // ── Helpers ──
  function fmt(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtBig(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + fmt(n, 0);
  }

  function fmtVol(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function catalystTypeLabel(type) {
    const map = { pdufa: 'PDUFA', adcom: 'AdCom', trial_readout: 'Trial Readout', conference: 'Conference', earnings: 'Earnings' };
    return map[type] || type;
  }

  function catalystTypeClass(type) {
    const map = { pdufa: 'catalyst-teal', adcom: 'catalyst-orange', trial_readout: 'catalyst-purple', conference: 'catalyst-green', earnings: 'catalyst-blue' };
    return map[type] || 'catalyst-teal';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return Math.abs(diff) + 'd ago';
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day';
    return diff + ' days';
  }

  // ── Autocomplete ──
  function showDropdown(results) {
    currentResults = results;
    selectedIdx = -1;
    dropdown.innerHTML = '';

    if (!results.length) {
      dropdown.innerHTML = '<div class="ticker-ac-empty">No results found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    results.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'ticker-ac-item';
      item.dataset.idx = i;
      item.innerHTML =
        '<span class="ticker-ac-symbol">' + escHtml(r.symbol) + '</span>' +
        '<span class="ticker-ac-name">' + escHtml(r.name) + '</span>' +
        (r.exchange ? '<span class="ticker-ac-exchange">' + escHtml(r.exchange) + '</span>' : '') +
        (r.hasCatalyst ? '<span class="ticker-ac-badge">📅 Catalyst</span>' : '');
      item.addEventListener('mousedown', function (e) {
        e.preventDefault(); // prevent blur
        selectResult(r);
      });
      dropdown.appendChild(item);
    });

    dropdown.classList.remove('hidden');
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
    selectedIdx = -1;
  }

  function highlightItem(idx) {
    const items = dropdown.querySelectorAll('.ticker-ac-item');
    items.forEach((el, i) => el.classList.toggle('ticker-ac-selected', i === idx));
  }

  function selectResult(r) {
    input.value = r.symbol;
    hideDropdown();
    clearBtn.classList.remove('hidden');
    loadStock(r.symbol);
  }

  function doSearch(q) {
    if (!q || q.length < 1) { hideDropdown(); return; }
    fetch(BASE + '/api/search?q=' + encodeURIComponent(q))
      .then(res => res.json())
      .then(data => {
        if (data.success && document.activeElement === input) {
          showDropdown(data.results || []);
        }
      })
      .catch(() => {}); // silent fail
  }

  // ── Stock Modal ──
  function showModal() {
    var ov = overlay || document.getElementById('ticker-modal-overlay');
    if (!ov) return;
    ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Re-apply close button handler each time (failsafe for any init edge cases)
    var btn = document.getElementById('ticker-modal-close');
    if (btn) btn.onclick = function (e) { e.stopPropagation(); hideModal(); };
  }

  function hideModal() {
    // Null-safe: works even if init() never ran
    var ov = overlay || document.getElementById('ticker-modal-overlay');
    if (ov) ov.classList.add('hidden');
    document.body.style.overflow = '';
    if (activeRequest) { activeRequest.abort(); activeRequest = null; }
  }

  function setModalContent(html) {
    modalContent.innerHTML = html;
  }

  function loadStock(ticker) {
    // Show loading state
    showModal();
    setModalContent(
      '<div class="ticker-loading">' +
        '<div class="ticker-spinner"></div>' +
        '<div>Loading <strong>' + escHtml(ticker) + '</strong>…</div>' +
      '</div>'
    );

    if (activeRequest) activeRequest.abort();
    const ctrl = new AbortController();
    activeRequest = ctrl;

    fetch(BASE + '/api/stock/' + encodeURIComponent(ticker), { signal: ctrl.signal })
      .then(res => res.json())
      .then(resp => {
        if (activeRequest !== ctrl) return; // stale
        activeRequest = null;
        renderStockModal(resp);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        activeRequest = null;
        setModalContent('<div class="ticker-error">Failed to load data. Please try again.</div>');
      });
  }

  function renderStockModal(resp) {
    if (!resp.success) {
      if (resp.noApiKey) {
        setModalContent('<div class="ticker-error ticker-error-soft">Financial data is not available. <span>Contact support to enable live stock quotes.</span></div>');
      } else {
        setModalContent('<div class="ticker-error">' + escHtml(resp.message || 'No data available.') + '</div>');
      }
      return;
    }

    const d = resp.data;
    const priceChange = d.changesPercentage != null
      ? (d.changesPercentage >= 0 ? '+' : '') + fmt(d.changesPercentage, 2) + '%'
      : null;
    const priceClass = d.changesPercentage != null
      ? (d.changesPercentage >= 0 ? 'price-up' : 'price-down')
      : '';
    const changeAbs = d.change != null
      ? (d.change >= 0 ? '+' : '') + fmt(d.change, 2)
      : null;

    // Build header
    let html = '<div class="ts-modal-header">';
    if (d.image) {
      html += '<img class="ts-company-logo" src="' + escHtml(d.image) + '" alt="' + escHtml(d.companyName) + ' logo" onerror="this.style.display=\'none\'">';
    }
    html += '<div class="ts-header-text">';
    html += '<h2 id="ticker-modal-title" class="ts-company-name">' + escHtml(d.companyName) + '</h2>';
    html += '<div class="ts-ticker-row">';
    html += '<span class="ts-ticker-badge">' + escHtml(d.ticker) + '</span>';
    if (d.exchange) html += '<span class="ts-exchange">' + escHtml(d.exchange) + '</span>';
    if (d.sector) html += '<span class="ts-sector">' + escHtml(d.sector) + '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>'; // ts-modal-header

    // Price section
    if (d.price != null) {
      html += '<div class="ts-price-section">';
      html += '<div class="ts-price">$' + fmt(d.price, 2) + '</div>';
      if (priceChange) {
        html += '<div class="ts-price-change ' + priceClass + '">' + changeAbs + ' (' + priceChange + ')' + '</div>';
      }
      html += '</div>';
    }

    // Stats grid
    html += '<div class="ts-stats-grid">';

    const stats = [
      { label: 'Market Cap', value: fmtBig(d.marketCap) },
      { label: '52-Wk Range', value: d.weekLow52 != null && d.weekHigh52 != null ? '$' + fmt(d.weekLow52, 2) + ' – $' + fmt(d.weekHigh52, 2) : '—' },
      { label: 'Avg Volume', value: fmtVol(d.avgVolume) },
      { label: 'Volume', value: fmtVol(d.volume) },
      { label: 'Beta', value: d.beta != null ? fmt(d.beta, 2) : '—' },
      { label: 'Industry', value: d.industry || '—' },
    ];

    stats.forEach(s => {
      html += '<div class="ts-stat">';
      html += '<div class="ts-stat-label">' + escHtml(s.label) + '</div>';
      html += '<div class="ts-stat-value">' + escHtml(s.value) + '</div>';
      html += '</div>';
    });

    html += '</div>'; // ts-stats-grid

    // Catalysts section
    if (d.catalysts && d.catalysts.length > 0) {
      html += '<div class="ts-section ts-catalysts-section">';
      html += '<h3 class="ts-section-title">📅 Catalysts on Calendar</h3>';
      html += '<div class="ts-catalyst-list">';
      d.catalysts.forEach(c => {
        const typeClass = catalystTypeClass(c.catalyst_type);
        const typeLabel = catalystTypeLabel(c.catalyst_type);
        const drugLabel = c.brand_name || c.drug_name;
        const du = daysUntil(c.pdufa_date);
        html += '<a class="ts-catalyst-item" href="' + BASE + '/drug/' + encodeURIComponent(c.slug) + '">';
        html += '<div class="ts-catalyst-left">';
        html += '<span class="ts-catalyst-type ' + typeClass + '">' + escHtml(typeLabel) + '</span>';
        html += '<div class="ts-catalyst-drug">' + escHtml(drugLabel) + '</div>';
        if (c.indication) html += '<div class="ts-catalyst-indication">' + escHtml(c.indication) + '</div>';
        html += '</div>';
        html += '<div class="ts-catalyst-right">';
        html += '<div class="ts-catalyst-date">' + escHtml(formatDate(c.pdufa_date)) + '</div>';
        if (du) html += '<div class="ts-catalyst-days">' + escHtml(du) + '</div>';
        html += '</div>';
        html += '</a>';
      });
      html += '</div>';
      html += '</div>';
    }

    // Description section
    if (d.description) {
      const desc = d.description.length > 600 ? d.description.slice(0, 600) + '…' : d.description;
      html += '<div class="ts-section">';
      html += '<h3 class="ts-section-title">About</h3>';
      html += '<p class="ts-description">' + escHtml(desc) + '</p>';
      html += '</div>';
    }

    // Footer links
    if (d.website) {
      html += '<div class="ts-modal-footer">';
      html += '<a class="ts-link" href="' + escHtml(d.website) + '" target="_blank" rel="noopener">↗ ' + escHtml(d.website.replace(/^https?:\/\//, '')) + '</a>';
      html += '</div>';
    }

    setModalContent(html);
  }

  // ── Keyboard Nav ──
  function handleKeydown(e) {
    if (dropdown.classList.contains('hidden')) {
      if (e.key === 'Enter' && input.value.trim()) {
        loadStock(input.value.trim().toUpperCase());
      }
      return;
    }
    const items = dropdown.querySelectorAll('.ticker-ac-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      highlightItem(selectedIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      highlightItem(selectedIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && selectedIdx < currentResults.length) {
        selectResult(currentResults[selectedIdx]);
      } else if (input.value.trim()) {
        hideDropdown();
        loadStock(input.value.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  }

  // ── Init ──
  function init() {
    input = document.getElementById('ticker-search-input');
    clearBtn = document.getElementById('ticker-search-clear');
    dropdown = document.getElementById('ticker-autocomplete');
    overlay = document.getElementById('ticker-modal-overlay');
    modal = document.getElementById('ticker-modal');
    modalContent = document.getElementById('ticker-modal-content');
    closeBtn = document.getElementById('ticker-modal-close');

    if (!input) return; // not on a page with the header

    input.addEventListener('input', function () {
      const q = this.value.trim();
      clearBtn.classList.toggle('hidden', !q);
      clearTimeout(debounceTimer);
      if (!q) { hideDropdown(); return; }
      debounceTimer = setTimeout(() => doSearch(q), 300);
    });

    input.addEventListener('keydown', handleKeydown);

    input.addEventListener('blur', function () {
      // Delay so mousedown on dropdown can fire first
      setTimeout(hideDropdown, 150);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.classList.add('hidden');
        hideDropdown();
        input.focus();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal);
    }

    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideModal();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) hideModal();
      // Slash key focuses search (if not in an input)
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // ── Failsafe: document-level delegation for close button ──
  // This runs regardless of init() success — guarantees the X always works.
  document.addEventListener('click', function (e) {
    if (!e.target) return;
    // Close button click (handles any init failure)
    if (e.target.id === 'ticker-modal-close' || (e.target.closest && e.target.closest('#ticker-modal-close'))) {
      hideModal();
      e.stopPropagation();
      return;
    }
    // Click directly on overlay background (outside modal panel)
    if (e.target.id === 'ticker-modal-overlay') {
      hideModal();
    }
  });

  // ── Failsafe: ESC key always dismisses modal ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('ticker-modal-overlay');
      if (ov && !ov.classList.contains('hidden')) hideModal();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
