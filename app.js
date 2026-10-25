/**
 * SakuCart - Smart Grocery & Budget Safety Tracker
 * Core Application Logic & State Engine
 * Tailored for Boarding House Students (Rian)
 */

(() => {
  'use strict';

  // =========================================================================
  // CONSTANTS & INITIAL STORAGE STATE
  // =========================================================================
  const STORAGE_KEYS = {
    CART: 'sakucart_current_cart',
    BUDGET: 'sakucart_budget_settings',
    DATABASE: 'sakucart_price_db',
    HISTORY: 'sakucart_history_sessions'
  };

  // Realistic Seed Items for Rian's monthly boarding house shopping
  const DEFAULT_PRICE_DATABASE = {
    'Beras Ramos 5kg': 64000,
    'Minyak Goreng 2L': 36000,
    'Telur Ayam 1kg': 26500,
    'Indomie Goreng 1 Dus': 115000,
    'Sabun Cuci Rinso 750g': 18000,
    'Pasta Gigi Pepsodent 190g': 14000,
    'Pembersih Lantai Wipol 750ml': 16500,
    'Kecap Manis Bango 520ml': 22000,
    'Gula Pasir 1kg': 17500,
    'Sabun Mandi Lifebuoy 4x85g': 19000
  };

  const DEFAULT_BUDGET = {
    totalLimit: 500000,
    warningThreshold: 85 // Percent
  };

  // Pre-seed sample history from previous month (September 2026) so Rian immediately has comparative data
  const DEFAULT_HISTORY = [
    {
      id: 'hist-sep-2026',
      date: '1 Sep 2026',
      total: 443000,
      budget: 500000,
      itemsCount: 7,
      items: [
        { name: 'Beras Ramos 5kg', qty: 1, unit: 'kg', unitPrice: 64000, subtotal: 64000 },
        { name: 'Minyak Goreng 2L', qty: 1, unit: 'liter', unitPrice: 36000, subtotal: 36000 },
        { name: 'Telur Ayam 1kg', qty: 2, unit: 'kg', unitPrice: 26500, subtotal: 53000 },
        { name: 'Indomie Goreng 1 Dus', qty: 1, unit: 'dus', unitPrice: 115000, subtotal: 115000 },
        { name: 'Sabun Cuci Rinso 750g', qty: 2, unit: 'pack', unitPrice: 18000, subtotal: 36000 },
        { name: 'Pasta Gigi Pepsodent 190g', qty: 1, unit: 'pcs', unitPrice: 14000, subtotal: 14000 },
        { name: 'Pembersih Lantai Wipol 750ml', qty: 1, unit: 'botol', unitPrice: 16500, subtotal: 16500 }
      ]
    }
  ];

  // Pre-seed active cart with typical items Rian is holding in the supermarket trolley
  const DEFAULT_INITIAL_CART = [
    {
      id: 'cart-item-1',
      name: 'Beras Ramos 5kg',
      category: 'Beras & Pokok',
      unit: 'kg',
      qty: 1,
      unitPrice: 68000, // +4000 (Naik!)
      discountInput: '',
      netUnitPrice: 68000,
      subtotal: 68000,
      prevPrice: 64000
    },
    {
      id: 'cart-item-2',
      name: 'Minyak Goreng 2L',
      category: 'Minyak & Bumbu',
      unit: 'liter',
      qty: 1,
      unitPrice: 33000, // -3000 (Turun!)
      discountInput: '',
      netUnitPrice: 33000,
      subtotal: 33000,
      prevPrice: 36000
    },
    {
      id: 'cart-item-3',
      name: 'Pembersih Lantai Wipol 750ml',
      category: 'Sabun & Cuci',
      unit: 'botol',
      qty: 1,
      unitPrice: 22000,
      discountInput: '50+20', // Diskon bertingkat! Rp 22.000 -> 11.000 -> 8.800
      netUnitPrice: 8800,
      subtotal: 8800,
      prevPrice: 16500
    },
    {
      id: 'cart-item-4',
      name: 'Telur Ayam 1kg',
      category: 'Beras & Pokok',
      unit: 'kg',
      qty: 2,
      unitPrice: 29000, // +2500 (Naik!)
      discountInput: '',
      netUnitPrice: 29000,
      subtotal: 58000,
      prevPrice: 26500
    }
  ];

  // =========================================================================
  // APPLICATION STATE
  // =========================================================================
  let cart = [];
  let budgetSettings = { ...DEFAULT_BUDGET };
  let priceDatabase = { ...DEFAULT_PRICE_DATABASE };
  let historySessions = [];
  let activeCategoryFilter = 'all';

  // =========================================================================
  // AUDIO SYNTHESIZER (Web Audio API for touch haptics and alerts)
  // =========================================================================
  const audioCtx = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

  function playTone(freq, duration, type = 'sine', gainVal = 0.08) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay restrictions or errors safely ignored
    }
  }

  function playSound(type) {
    if (type === 'tap') playTone(600, 0.05, 'triangle', 0.05);
    else if (type === 'success') {
      playTone(523.25, 0.08, 'sine');
      setTimeout(() => playTone(659.25, 0.12, 'sine'), 80);
    } else if (type === 'warning') {
      playTone(320, 0.15, 'sawtooth', 0.1);
      setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.1), 160);
    }
  }

  function triggerVibration(pattern = [60]) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================
  function formatIDR(amount) {
    const val = Math.round(Number(amount) || 0);
    return 'Rp ' + val.toLocaleString('id-ID');
  }

  function showToast(text, icon = '✨') {
    const toast = document.getElementById('toastNotice');
    const toastText = document.getElementById('toastText');
    const toastIcon = document.getElementById('toastIcon');
    if (!toast) return;

    toastText.textContent = text;
    toastIcon.textContent = icon;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // =========================================================================
  // F-03: TIERED DISCOUNT CALCULATOR ENGINE
  // Mathematical logic for stacked discounts (e.g., "50+20", "30+10+5", "25", "15000")
  // =========================================================================
  function calculateDiscount(basePrice, discountInput) {
    const price = Number(basePrice) || 0;
    if (!discountInput || price <= 0) {
      return {
        netPrice: price,
        discountSaved: 0,
        effectivePercent: 0,
        isDiscounted: false,
        breakdownText: 'Harga normal tanpa diskon'
      };
    }

    const cleanInput = String(discountInput).trim().replace(/%/g, '');

    // Case 1: Stacked/Tiered percentage discounts separated by '+' (e.g. "50+20" or "30+10+5")
    if (cleanInput.includes('+')) {
      const parts = cleanInput.split('+').map(p => parseFloat(p.trim())).filter(p => !isNaN(p) && p > 0);
      if (parts.length > 0) {
        let currentPrice = price;
        const steps = [];
        parts.forEach((pct, index) => {
          const cut = currentPrice * (pct / 100);
          currentPrice -= cut;
          steps.push(`Diskon ${index + 1} (${pct}%): sisa Rp ${Math.round(currentPrice).toLocaleString('id-ID')}`);
        });

        const netPrice = Math.max(0, Math.round(currentPrice));
        const discountSaved = price - netPrice;
        const effectivePercent = Math.round((discountSaved / price) * 1000) / 10;

        return {
          netPrice,
          discountSaved,
          effectivePercent,
          isDiscounted: true,
          breakdownText: `${cleanInput}% Bertingkat (Hemat Rp ${discountSaved.toLocaleString('id-ID')} / ${effectivePercent}% Nett)`
        };
      }
    }

    // Case 2: Single percentage discount (e.g., "25" -> 25%)
    const singlePct = parseFloat(cleanInput);
    if (!isNaN(singlePct) && singlePct > 0 && singlePct <= 100 && cleanInput.length <= 3) {
      const discountSaved = Math.round(price * (singlePct / 100));
      const netPrice = Math.max(0, price - discountSaved);
      return {
        netPrice,
        discountSaved,
        effectivePercent: singlePct,
        isDiscounted: true,
        breakdownText: `Diskon ${singlePct}% (Hemat Rp ${discountSaved.toLocaleString('id-ID')})`
      };
    }

    // Case 3: Fixed cash cut nominal discount (e.g. "15000" -> Potongan Rp 15.000)
    const nominalCut = parseFloat(cleanInput.replace(/[^0-9]/g, ''));
    if (!isNaN(nominalCut) && nominalCut > 0) {
      const netPrice = Math.max(0, price - nominalCut);
      const discountSaved = Math.min(price, nominalCut);
      const effectivePercent = Math.round((discountSaved / price) * 1000) / 10;
      return {
        netPrice,
        discountSaved,
        effectivePercent,
        isDiscounted: true,
        breakdownText: `Potongan Langsung Rp ${nominalCut.toLocaleString('id-ID')} (${effectivePercent}%)`
      };
    }

    // Fallback if unrecognized
    return {
      netPrice: price,
      discountSaved: 0,
      effectivePercent: 0,
      isDiscounted: false,
      breakdownText: 'Harga normal'
    };
  }

  // =========================================================================
  // F-04: REALTIME PRICE FLUCTUATION DETECTION VS. LAST MONTH
  // Instant visual comparator with Arrow Up (↑ Red), Arrow Down (↓ Green), Equal (=)
  // =========================================================================
  function compareWithPreviousPrice(currentNetPrice, prevPrice) {
    const cur = Number(currentNetPrice) || 0;
    const prev = Number(prevPrice) || 0;

    if (!prev || prev <= 0) {
      return {
        status: 'new',
        symbol: '★',
        badgeClass: 'price-tag-new',
        shortText: 'Baru',
        fullText: 'Barang baru (belum ada data bulan lalu)',
        diff: 0,
        percent: 0
      };
    }

    const diff = cur - prev;
    const percent = Math.round((Math.abs(diff) / prev) * 100);

    if (diff > 0) {
      // Price increased (Inflation / Red Up Arrow)
      return {
        status: 'up',
        symbol: '↑',
        badgeClass: 'price-tag-up',
        shortText: `↑ +${formatIDR(diff)} (+${percent}%)`,
        fullText: `↑ Naik Rp ${diff.toLocaleString('id-ID')} (+${percent}%) vs Bulan Lalu`,
        diff,
        percent
      };
    } else if (diff < 0) {
      // Price decreased (Deflation / Green Down Arrow)
      const absDiff = Math.abs(diff);
      return {
        status: 'down',
        symbol: '↓',
        badgeClass: 'price-tag-down',
        shortText: `↓ -${formatIDR(absDiff)} (-${percent}%)`,
        fullText: `↓ Turun Rp ${absDiff.toLocaleString('id-ID')} (-${percent}%) vs Bulan Lalu`,
        diff,
        percent
      };
    } else {
      // Price remained constant (Equal)
      return {
        status: 'equal',
        symbol: '=',
        badgeClass: 'price-tag-equal',
        shortText: '= Stabil',
        fullText: '= Harga sama persis dengan bulan lalu',
        diff: 0,
        percent: 0
      };
    }
  }

  // =========================================================================
  // STORAGE MANAGEMENT (Local & Offline Data)
  // =========================================================================
  function loadStateFromStorage() {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      cart = savedCart ? JSON.parse(savedCart) : [...DEFAULT_INITIAL_CART];

      const savedBudget = localStorage.getItem(STORAGE_KEYS.BUDGET);
      budgetSettings = savedBudget ? JSON.parse(savedBudget) : { ...DEFAULT_BUDGET };

      const savedDb = localStorage.getItem(STORAGE_KEYS.DATABASE);
      priceDatabase = savedDb ? JSON.parse(savedDb) : { ...DEFAULT_PRICE_DATABASE };

      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      historySessions = savedHistory ? JSON.parse(savedHistory) : [...DEFAULT_HISTORY];
    } catch (e) {
      console.warn('Storage read fallback', e);
      cart = [...DEFAULT_INITIAL_CART];
      budgetSettings = { ...DEFAULT_BUDGET };
      priceDatabase = { ...DEFAULT_PRICE_DATABASE };
      historySessions = [...DEFAULT_HISTORY];
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {}
  }

  function saveBudgetToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budgetSettings));
    } catch (e) {}
  }

  function saveDatabaseToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(priceDatabase));
    } catch (e) {}
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historySessions));
    } catch (e) {}
  }

  // =========================================================================
  // F-05: BUDGET SAFETY CAP CONTROLLER (Real-time dynamic monitoring)
  // =========================================================================
  function updateBudgetSafetyController() {
    const totalSpent = cart.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    const limit = Number(budgetSettings.totalLimit) || 500000;
    const remaining = limit - totalSpent;
    const usagePercent = limit > 0 ? (totalSpent / limit) * 100 : 0;
    const roundedPercent = Math.min(999, Math.round(usagePercent));

    // Elements
    const safetyCard = document.getElementById('budgetSafetyCard');
    const safetyBadge = document.getElementById('safetyBadge');
    const safetyIcon = document.getElementById('safetyIcon');
    const safetyText = document.getElementById('safetyText');
    const budgetLimitHeader = document.getElementById('budgetLimitHeader');
    const cartTotalDisplay = document.getElementById('cartTotalDisplay');
    const walletRemainingDisplay = document.getElementById('walletRemainingDisplay');
    const budgetProgressBar = document.getElementById('budgetProgressBar');
    const budgetUsagePercent = document.getElementById('budgetUsagePercent');
    const safetyAlertBanner = document.getElementById('safetyAlertBanner');
    const safetyAlertIcon = document.getElementById('safetyAlertIcon');
    const safetyAlertText = document.getElementById('safetyAlertText');

    if (!safetyCard) return;

    // Numerical updates
    budgetLimitHeader.textContent = formatIDR(limit);
    cartTotalDisplay.textContent = formatIDR(totalSpent);
    walletRemainingDisplay.textContent = formatIDR(remaining);
    budgetUsagePercent.textContent = `Terpakai: ${roundedPercent}%`;
    budgetProgressBar.style.width = `${Math.min(100, usagePercent)}%`;

    // Dynamic State Thresholding:
    // Safe: < 75%
    // Warning: 75% - 95%
    // Danger: >= 95% or remaining < 0
    safetyCard.classList.remove('state-safe', 'state-warning', 'state-danger');
    safetyBadge.classList.remove('badge-safe', 'badge-warning', 'badge-danger');
    safetyAlertBanner.classList.remove('safe', 'warning', 'danger');
    walletRemainingDisplay.classList.remove('warning', 'danger');

    if (totalSpent > limit) {
      // OVERBUDGET (CRITICAL DANGER)
      safetyCard.classList.add('state-danger');
      safetyBadge.classList.add('badge-danger');
      safetyAlertBanner.classList.add('danger');
      walletRemainingDisplay.classList.add('danger');

      safetyIcon.textContent = '🚨';
      safetyText.textContent = 'AWAS OVERBUDGET (KAS KURANG)';
      budgetProgressBar.style.backgroundColor = 'var(--color-danger)';
      safetyAlertIcon.textContent = '🛑';
      safetyAlertText.textContent = `BAHAYA DI KASIR! Total belanja melebihi kas dompet sebesar ${formatIDR(Math.abs(remaining))}. Kurangi barang sebelum mengantre!`;

      triggerVibration([120, 80, 120]);
    } else if (usagePercent >= (budgetSettings.warningThreshold || 85)) {
      // APPROACHING LIMIT (WARNING ZONE)
      safetyCard.classList.add('state-warning');
      safetyBadge.classList.add('badge-warning');
      safetyAlertBanner.classList.add('warning');
      walletRemainingDisplay.classList.add('warning');

      safetyIcon.textContent = '⚠️';
      safetyText.textContent = 'WASPADA (SALDO MENIPIS)';
      budgetProgressBar.style.backgroundColor = 'var(--color-warning)';
      safetyAlertIcon.textContent = '⚡';
      safetyAlertText.textContent = `Hati-hati! Tersisa ${formatIDR(remaining)} sebelum uang belanja habis. Hanya beli kebutuhan primer!`;
    } else {
      // HEALTHY & SAFE
      safetyCard.classList.add('state-safe');
      safetyBadge.classList.add('badge-safe');
      safetyAlertBanner.classList.add('safe');

      safetyIcon.textContent = '🛡️';
      safetyText.textContent = 'AMAN (KAS TERKENDALI)';
      budgetProgressBar.style.backgroundColor = 'var(--color-safe)';
      safetyAlertIcon.textContent = '💡';
      safetyAlertText.textContent = `Bagus Rian! Belanjaan aman terkendali, sisa dompet masih ${formatIDR(remaining)}.`;
    }
  }

  // =========================================================================
  // F-01 & F-02: RENDER SHOPPING CART ITEMS (TOUCH-FRIENDLY ONE-HAND ERGONOMICS)
  // =========================================================================
  function renderCart() {
    const container = document.getElementById('cartItemsList');
    const cartCountTag = document.getElementById('cartCountTag');
    const navCartBadge = document.getElementById('navCartBadge');
    const finishSessionCard = document.getElementById('finishSessionCard');
    const allCount = document.getElementById('allCount');

    if (!container) return;

    // Filter items
    const filteredItems = activeCategoryFilter === 'all'
      ? cart
      : cart.filter(item => item.category === activeCategoryFilter);

    // Update count badges
    if (cartCountTag) cartCountTag.textContent = `(${cart.length} barang)`;
    if (allCount) allCount.textContent = cart.length;

    if (navCartBadge) {
      if (cart.length > 0) {
        navCartBadge.textContent = cart.length;
        navCartBadge.style.display = 'flex';
      } else {
        navCartBadge.style.display = 'none';
      }
    }

    if (finishSessionCard) {
      finishSessionCard.style.display = cart.length > 0 ? 'block' : 'none';
    }

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <strong style="color:var(--text-main); font-size:0.95rem;">Troli Belanja Masih Kosong</strong>
          <p style="font-size:0.75rem; max-width:240px; margin:0 auto; line-height:1.4;">
            ${activeCategoryFilter === 'all' 
              ? 'Mulai masukkan barang kebutuhan kos bulanan dengan menekan tombol hijau di atas.' 
              : `Tidak ada barang dalam kategori "${activeCategoryFilter}".`}
          </p>
        </div>
      `;
      updateBudgetSafetyController();
      return;
    }

    container.innerHTML = '';

    filteredItems.forEach(item => {
      // Comparison vs previous month
      const prevRefPrice = item.prevPrice !== undefined ? item.prevPrice : (priceDatabase[item.name] || 0);
      const comparison = compareWithPreviousPrice(item.netUnitPrice, prevRefPrice);

      // Discount info
      const hasDiscount = item.discountInput && item.discountInput.trim() !== '';
      const discCalc = calculateDiscount(item.unitPrice, item.discountInput);

      const card = document.createElement('article');
      card.className = 'cart-item-card';
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="cart-item-top">
          <div class="item-info">
            <div class="item-title">${escapeHtml(item.name)}</div>
            <div class="item-meta-row">
              <span class="item-category-tag">${escapeHtml(item.category || 'Umum')}</span>
              <span class="item-unit-tag">${escapeHtml(item.unit || 'pcs')}</span>
              
              <!-- F-04: Realtime Price Fluctuation Tag -->
              <span class="price-comparison-tag ${comparison.badgeClass}" title="${comparison.fullText}">
                ${comparison.shortText}
              </span>

              <!-- F-03: Tiered Discount Pill -->
              ${hasDiscount ? `
                <span class="discount-badge-pill" title="${discCalc.breakdownText}">
                  🏷️ ${escapeHtml(item.discountInput)}%
                </span>
              ` : ''}
            </div>
          </div>
          <button class="item-delete-btn" data-action="delete" data-id="${item.id}" title="Hapus dari troli">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>

        <div class="cart-item-bottom">
          <div class="price-details-col">
            <div class="item-unit-calc">
              <span>${formatIDR(item.netUnitPrice)} / ${escapeHtml(item.unit || 'satuan')}</span>
              ${hasDiscount ? `<span class="item-strike-price">${formatIDR(item.unitPrice)}</span>` : ''}
            </div>
            <div class="item-subtotal-price">${formatIDR(item.subtotal)}</div>
          </div>

          <!-- F-02: Touch-friendly One-hand Stepper -->
          <div class="stepper-control">
            <button type="button" class="stepper-btn" data-action="decrease" data-id="${item.id}" aria-label="Kurangi">-</button>
            <input type="number" class="stepper-input" data-id="${item.id}" value="${item.qty}" min="1" max="999" aria-label="Jumlah Qty">
            <button type="button" class="stepper-btn" data-action="increase" data-id="${item.id}" aria-label="Tambah">+</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    updateBudgetSafetyController();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // F-02: QUANTITY STEPPER LOGIC & ITEM MANIPULATION
  // =========================================================================
  function updateItemQty(itemId, newQty) {
    const qty = Math.max(1, Math.min(999, parseInt(newQty, 10) || 1));
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    item.qty = qty;
    item.subtotal = item.netUnitPrice * item.qty;

    playSound('tap');
    saveCartToStorage();
    renderCart();
  }

  function deleteItem(itemId) {
    const item = cart.find(i => i.id === itemId);
    const itemName = item ? item.name : 'Barang';
    cart = cart.filter(i => i.id !== itemId);
    playSound('tap');
    saveCartToStorage();
    renderCart();
    showToast(`Dihapus: ${itemName}`, '🗑️');
  }

  // =========================================================================
  // ITEM MODAL: REAL-TIME CALCULATION & AUTOCOMPLETION
  // =========================================================================
  const itemModal = document.getElementById('itemModal');
  const itemForm = document.getElementById('itemForm');
  const formItemUnitPrice = document.getElementById('formItemUnitPrice');
  const formItemQty = document.getElementById('formItemQty');
  const formItemDiscount = document.getElementById('formItemDiscount');
  const formItemPrevPrice = document.getElementById('formItemPrevPrice');
  const formItemName = document.getElementById('formItemName');

  function openItemModal(itemToEdit = null) {
    if (!itemModal) return;

    if (itemToEdit) {
      document.getElementById('modalTitle').textContent = 'Edit Barang Belanja';
      document.getElementById('formItemId').value = itemToEdit.id;
      document.getElementById('formItemName').value = itemToEdit.name;
      document.getElementById('formItemCategory').value = itemToEdit.category;
      document.getElementById('formItemUnit').value = itemToEdit.unit;
      document.getElementById('formItemQty').value = itemToEdit.qty;
      document.getElementById('formItemUnitPrice').value = itemToEdit.unitPrice;
      document.getElementById('formItemDiscount').value = itemToEdit.discountInput || '';
      document.getElementById('formItemPrevPrice').value = itemToEdit.prevPrice || '';
    } else {
      document.getElementById('modalTitle').textContent = 'Tambah Barang Belanjaan';
      itemForm.reset();
      document.getElementById('formItemId').value = '';
      document.getElementById('formItemQty').value = 1;
    }

    updateModalPreview();
    itemModal.classList.add('open');
  }

  function closeItemModal() {
    if (itemModal) itemModal.classList.remove('open');
  }

  function updateModalPreview() {
    const unitPrice = parseFloat(formItemUnitPrice.value) || 0;
    const qty = parseInt(formItemQty.value, 10) || 1;
    const discountInput = formItemDiscount.value.trim();
    const prevPriceInput = parseFloat(formItemPrevPrice.value) || 0;

    const discountRes = calculateDiscount(unitPrice, discountInput);
    const netUnitPrice = discountRes.netPrice;
    const subtotal = netUnitPrice * qty;

    const comparison = compareWithPreviousPrice(netUnitPrice, prevPriceInput);

    // Update modal preview UI elements
    const previewFluctuation = document.getElementById('modalPreviewFluctuation');
    const previewNetUnitPrice = document.getElementById('modalPreviewNetUnitPrice');
    const previewSubtotal = document.getElementById('modalPreviewSubtotal');
    const previewQtyLabel = document.getElementById('modalPreviewQtyLabel');

    if (previewFluctuation) {
      previewFluctuation.className = `price-comparison-tag ${comparison.badgeClass}`;
      previewFluctuation.textContent = comparison.fullText;
    }

    if (previewNetUnitPrice) {
      previewNetUnitPrice.textContent = formatIDR(netUnitPrice);
    }

    if (previewSubtotal) {
      previewSubtotal.textContent = formatIDR(subtotal);
    }

    if (previewQtyLabel) {
      previewQtyLabel.textContent = qty;
    }
  }

  function saveItemFromModal() {
    const name = formItemName.value.trim();
    const unitPrice = parseFloat(formItemUnitPrice.value) || 0;
    const qty = parseInt(formItemQty.value, 10) || 1;

    if (!name) {
      showToast('Harap isi nama produk!', '⚠️');
      formItemName.focus();
      return;
    }

    if (unitPrice <= 0) {
      showToast('Harga barang harus lebih dari 0!', '⚠️');
      formItemUnitPrice.focus();
      return;
    }

    const category = document.getElementById('formItemCategory').value;
    const unit = document.getElementById('formItemUnit').value;
    const discountInput = formItemDiscount.value.trim();
    const prevPrice = parseFloat(formItemPrevPrice.value) || (priceDatabase[name] || 0);

    const discountRes = calculateDiscount(unitPrice, discountInput);
    const netUnitPrice = discountRes.netPrice;
    const subtotal = netUnitPrice * qty;

    const existingId = document.getElementById('formItemId').value;

    if (existingId) {
      const idx = cart.findIndex(i => i.id === existingId);
      if (idx !== -1) {
        cart[idx] = {
          ...cart[idx],
          name,
          category,
          unit,
          qty,
          unitPrice,
          discountInput,
          netUnitPrice,
          subtotal,
          prevPrice
        };
      }
      showToast(`Diperbarui: ${name}`, '✏️');
    } else {
      const newItem = {
        id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name,
        category,
        unit,
        qty,
        unitPrice,
        discountInput,
        netUnitPrice,
        subtotal,
        prevPrice
      };
      cart.unshift(newItem);
      playSound('success');
      showToast(`Dimasukkan ke troli: ${name}`, '🛒');
    }

    // Also update price database for auto-lookup
    if (prevPrice > 0) {
      priceDatabase[name] = prevPrice;
      saveDatabaseToStorage();
    }

    saveCartToStorage();
    renderCart();
    closeItemModal();
  }

  // =========================================================================
  // F-03: TAB 2 - STANDALONE TIERED DISCOUNT CALCULATOR
  // =========================================================================
  function initTieredDiscountCalculator() {
    const basePriceInput = document.getElementById('calcBasePrice');
    const discountInput = document.getElementById('calcDiscountInput');
    const resOriginalPrice = document.getElementById('resOriginalPrice');
    const resDiscountSaved = document.getElementById('resDiscountSaved');
    const resEffectivePercent = document.getElementById('resEffectivePercent');
    const resFinalPrice = document.getElementById('resFinalPrice');

    function runCalculation() {
      const price = parseFloat(basePriceInput.value) || 0;
      const disc = discountInput.value;

      const result = calculateDiscount(price, disc);

      resOriginalPrice.textContent = formatIDR(price);
      resDiscountSaved.textContent = `- ${formatIDR(result.discountSaved)}`;
      resEffectivePercent.textContent = `${result.effectivePercent}% Bersih`;
      resFinalPrice.textContent = formatIDR(result.netPrice);
    }

    if (basePriceInput) basePriceInput.addEventListener('input', runCalculation);
    if (discountInput) discountInput.addEventListener('input', runCalculation);

    // Preset chips
    document.querySelectorAll('.discount-preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        discountInput.value = val;
        playSound('tap');
        runCalculation();
      });
    });

    // Run initial demo calculation
    basePriceInput.value = 100000;
    discountInput.value = '50+20';
    runCalculation();
  }

  // =========================================================================
  // BONUS: PROMO DUEL / UNIT PRICE COMPARATOR
  // Solves Rian's dilemma: 3 x 1L pouch @ 18k vs 5L jeriken @ 85k
  // =========================================================================
  function initPromoDuel() {
    const sizeA = document.getElementById('duelSizeA');
    const unitA = document.getElementById('duelUnitA');
    const priceA = document.getElementById('duelPriceA');
    const perUnitA = document.getElementById('duelPerUnitA');
    const cardA = document.getElementById('duelCardA');

    const sizeB = document.getElementById('duelSizeB');
    const unitB = document.getElementById('duelUnitB');
    const priceB = document.getElementById('duelPriceB');
    const perUnitB = document.getElementById('duelPerUnitB');
    const cardB = document.getElementById('duelCardB');

    const winnerTitle = document.getElementById('duelWinnerTitle');
    const savingsDesc = document.getElementById('duelSavingsDesc');

    function calculateDuel() {
      const sA = parseFloat(sizeA.value) || 0;
      const pA = parseFloat(priceA.value) || 0;
      const sB = parseFloat(sizeB.value) || 0;
      const pB = parseFloat(priceB.value) || 0;

      const rateA = sA > 0 ? pA / sA : 0;
      const rateB = sB > 0 ? pB / sB : 0;

      const uA = unitA.value.trim() || 'Satuan';
      const uB = unitB.value.trim() || 'Satuan';

      perUnitA.textContent = `${formatIDR(rateA)} / ${uA}`;
      perUnitB.textContent = `${formatIDR(rateB)} / ${uB}`;

      cardA.classList.remove('winner');
      cardB.classList.remove('winner');

      const crownA = cardA.querySelector('.winner-crown-badge');
      if (crownA) crownA.remove();
      const crownB = cardB.querySelector('.winner-crown-badge');
      if (crownB) crownB.remove();

      if (rateA <= 0 || rateB <= 0) {
        winnerTitle.textContent = 'Masukkan data kedua pilihan';
        savingsDesc.textContent = 'Bandingkan harga dan volume untuk menentukan mana yang paling hemat.';
        return;
      }

      if (Math.abs(rateA - rateB) < 1) {
        winnerTitle.textContent = '⚖️ Harganya Seimbang / Sama!';
        savingsDesc.textContent = 'Kedua pilihan memiliki harga satuan yang persis sama. Pilih kemasan yang lebih praktis dibawa.';
      } else if (rateA < rateB) {
        cardA.classList.add('winner');
        const badge = document.createElement('span');
        badge.className = 'winner-crown-badge';
        badge.textContent = 'LEBIH HEMAT';
        cardA.appendChild(badge);

        const diff = rateB - rateA;
        const pct = Math.round((diff / rateB) * 1000) / 10;
        winnerTitle.textContent = '🏆 Pilihan A Jauh Lebih Hemat!';
        savingsDesc.textContent = `Hemat ${formatIDR(diff)} per ${uA} (Lebih murah ${pct}%). Ambil Pilihan A!`;
      } else {
        cardB.classList.add('winner');
        const badge = document.createElement('span');
        badge.className = 'winner-crown-badge';
        badge.textContent = 'LEBIH HEMAT';
        cardB.appendChild(badge);

        const diff = rateA - rateB;
        const pct = Math.round((diff / rateA) * 1000) / 10;
        winnerTitle.textContent = '🏆 Pilihan B Jauh Lebih Hemat!';
        savingsDesc.textContent = `Hemat ${formatIDR(diff)} per ${uB} (Lebih murah ${pct}%). Ambil Pilihan B!`;
      }
    }

    [sizeA, unitA, priceA, sizeB, unitB, priceB].forEach(input => {
      if (input) input.addEventListener('input', calculateDuel);
    });

    calculateDuel();
  }

  // =========================================================================
  // F-06: HISTORY & INFLATION SUMMARY
  // =========================================================================
  function renderHistory() {
    const listContainer = document.getElementById('historyListContainer');
    const sessionsCount = document.getElementById('historySessionsCount');
    const statPriceUp = document.getElementById('statPriceUp');
    const statPriceDown = document.getElementById('statPriceDown');
    const statPriceSame = document.getElementById('statPriceSame');

    if (!listContainer) return;

    if (sessionsCount) sessionsCount.textContent = `(${historySessions.length} arsip)`;

    // Calculate inflation counters across current cart vs database
    let upCount = 0;
    let downCount = 0;
    let sameCount = 0;

    cart.forEach(item => {
      const prev = item.prevPrice || priceDatabase[item.name] || 0;
      if (prev > 0) {
        if (item.netUnitPrice > prev) upCount++;
        else if (item.netUnitPrice < prev) downCount++;
        else sameCount++;
      }
    });

    if (statPriceUp) statPriceUp.textContent = upCount;
    if (statPriceDown) statPriceDown.textContent = downCount;
    if (statPriceSame) statPriceSame.textContent = sameCount;

    if (historySessions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <p style="font-size:0.8rem; color:var(--text-muted);">Belum ada arsip belanja bulanan tersimpan.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    historySessions.forEach(session => {
      const card = document.createElement('div');
      card.className = 'history-month-card';

      const itemsListHtml = (session.items || []).slice(0, 4).map(it => {
        return `${escapeHtml(it.name)} (${it.qty}x)`;
      }).join(', ');

      const extraItems = (session.items || []).length > 4 ? ` dan ${(session.items || []).length - 4} barang lainnya...` : '';

      card.innerHTML = `
        <div class="history-card-header">
          <span class="history-date">📅 ${escapeHtml(session.date)}</span>
          <span class="history-total-tag">${formatIDR(session.total)}</span>
        </div>
        <p class="history-items-summary">
          <strong>${(session.items || []).length} Barang:</strong> ${itemsListHtml}${extraItems}
        </p>
      `;

      listContainer.appendChild(card);
    });
  }

  // =========================================================================
  // CHECKOUT & ARCHIVE SHOPPING SESSION
  // =========================================================================
  function completeAndArchiveShopping() {
    if (cart.length === 0) {
      showToast('Troli belanja masih kosong!', '⚠️');
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    const newSession = {
      id: 'session-' + Date.now(),
      date: dateFormatted,
      total,
      budget: budgetSettings.totalLimit,
      itemsCount: cart.length,
      items: JSON.parse(JSON.stringify(cart))
    };

    // Update priceDatabase with this month's prices to become official reference for next month!
    cart.forEach(item => {
      if (item.name && item.netUnitPrice > 0) {
        priceDatabase[item.name] = item.netUnitPrice;
      }
    });

    historySessions.unshift(newSession);
    saveHistoryToStorage();
    saveDatabaseToStorage();

    // Reset current cart for next shopping
    cart = [];
    saveCartToStorage();
    renderCart();
    renderHistory();

    playSound('success');
    showToast(`Sukses disimpan ke Arsip ${dateFormatted}!`, '🎉');

    // Switch to history tab to celebrate
    switchTab('tabHistory');
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  function switchTab(targetTabId) {
    document.querySelectorAll('.tab-pane').forEach(tab => {
      tab.classList.remove('active');
    });

    const activePane = document.getElementById(targetTabId);
    if (activePane) activePane.classList.add('active');

    document.querySelectorAll('.nav-tab-item').forEach(btn => {
      if (btn.dataset.tab === targetTabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (targetTabId === 'tabHistory') {
      renderHistory();
    }
  }

  // =========================================================================
  // EVENT LISTENERS INITIALIZATION
  // =========================================================================
  function initEventListeners() {
    // Bottom Navigation Tabs
    document.querySelectorAll('.nav-tab-item').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        playSound('tap');
        const tabId = tabBtn.dataset.tab;
        switchTab(tabId);
      });
    });

    // Category Filter Chips
    const categoryChipsContainer = document.getElementById('categoryChipsContainer');
    if (categoryChipsContainer) {
      categoryChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        playSound('tap');

        categoryChipsContainer.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        activeCategoryFilter = chip.dataset.category || 'all';
        renderCart();
      });
    }

    // Cart Steppers & Delete delegation
    const cartList = document.getElementById('cartItemsList');
    if (cartList) {
      cartList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;

        const item = cart.find(i => i.id === id);
        if (!item) return;

        if (action === 'increase') {
          updateItemQty(id, item.qty + 1);
        } else if (action === 'decrease') {
          if (item.qty > 1) {
            updateItemQty(id, item.qty - 1);
          } else {
            // Confirm delete if at 1
            deleteItem(id);
          }
        } else if (action === 'delete') {
          deleteItem(id);
        }
      });

      cartList.addEventListener('change', (e) => {
        if (e.target.classList.contains('stepper-input')) {
          const id = e.target.dataset.id;
          const val = parseInt(e.target.value, 10);
          updateItemQty(id, val);
        }
      });
    }

    // Clear Cart button
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => {
        if (cart.length === 0) return;
        if (confirm('Kosongkan semua barang dalam troli belanja?')) {
          cart = [];
          saveCartToStorage();
          renderCart();
          showToast('Troli dikosongkan', '🧹');
        }
      });
    }

    // Modal Triggers
    const openAddItemModalBtn = document.getElementById('openAddItemModalBtn');
    if (openAddItemModalBtn) {
      openAddItemModalBtn.addEventListener('click', () => {
        playSound('tap');
        openItemModal();
      });
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeItemModal);
    }

    // Close modal on click outside sheet
    if (itemModal) {
      itemModal.addEventListener('click', (e) => {
        if (e.target === itemModal) closeItemModal();
      });
    }

    // Modal Qty Steppers
    const modalQtyMinus = document.getElementById('modalQtyMinus');
    const modalQtyPlus = document.getElementById('modalQtyPlus');
    if (modalQtyMinus) {
      modalQtyMinus.addEventListener('click', () => {
        const val = Math.max(1, (parseInt(formItemQty.value, 10) || 1) - 1);
        formItemQty.value = val;
        playSound('tap');
        updateModalPreview();
      });
    }
    if (modalQtyPlus) {
      modalQtyPlus.addEventListener('click', () => {
        const val = (parseInt(formItemQty.value, 10) || 1) + 1;
        formItemQty.value = val;
        playSound('tap');
        updateModalPreview();
      });
    }

    // Modal inputs live preview
    [formItemUnitPrice, formItemQty, formItemDiscount, formItemPrevPrice].forEach(input => {
      if (input) {
        input.addEventListener('input', updateModalPreview);
      }
    });

    // Auto-fill previous price when item name is typed or selected from known database
    if (formItemName) {
      formItemName.addEventListener('input', () => {
        const typedName = formItemName.value.trim();
        // Check if exists in database
        for (const [knownName, prevPrice] of Object.entries(priceDatabase)) {
          if (knownName.toLowerCase() === typedName.toLowerCase()) {
            if (!formItemPrevPrice.value) {
              formItemPrevPrice.value = prevPrice;
              updateModalPreview();
            }
            break;
          }
        }
      });
    }

    // Modal Quick Autocomplete Suggestion Chips
    const quickSuggestionsChips = document.getElementById('quickSuggestionsChips');
    if (quickSuggestionsChips) {
      quickSuggestionsChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.sugg-chip');
        if (!chip) return;
        playSound('tap');

        formItemName.value = chip.dataset.name || '';
        document.getElementById('formItemCategory').value = chip.dataset.cat || 'Beras & Pokok';
        document.getElementById('formItemUnit').value = chip.dataset.unit || 'pcs';
        formItemUnitPrice.value = chip.dataset.price || '';
        formItemPrevPrice.value = chip.dataset.prev || '';
        formItemDiscount.value = '';

        updateModalPreview();
      });
    }

    // Modal Save Button
    const saveItemSubmitBtn = document.getElementById('saveItemSubmitBtn');
    if (saveItemSubmitBtn) {
      saveItemSubmitBtn.addEventListener('click', saveItemFromModal);
    }

    // Quick Budget Edit Button in Top Safety Header
    const quickEditBudgetBtn = document.getElementById('quickEditBudgetBtn');
    if (quickEditBudgetBtn) {
      quickEditBudgetBtn.addEventListener('click', () => {
        playSound('tap');
        switchTab('tabBudget');
      });
    }

    // Quick Promo Duel shortcut button
    const quickPromoDuelBtn = document.getElementById('quickPromoDuelBtn');
    if (quickPromoDuelBtn) {
      quickPromoDuelBtn.addEventListener('click', () => {
        playSound('tap');
        switchTab('tabPromo');
      });
    }

    // Checkout / Finish Shopping
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (confirm('Apakah Rian sudah selesai di kasir dan ingin mengarsipkan belanjaan bulan ini?')) {
          completeAndArchiveShopping();
        }
      });
    }

    // Settings Tab Budget Form
    const saveBudgetSettingBtn = document.getElementById('saveBudgetSettingBtn');
    const settingBudgetInput = document.getElementById('settingBudgetInput');
    const settingWarningThreshold = document.getElementById('settingWarningThreshold');

    if (saveBudgetSettingBtn) {
      saveBudgetSettingBtn.addEventListener('click', () => {
        const newLimit = parseFloat(settingBudgetInput.value) || 500000;
        const newThreshold = parseInt(settingWarningThreshold.value, 10) || 85;

        budgetSettings.totalLimit = newLimit;
        budgetSettings.warningThreshold = newThreshold;

        saveBudgetToStorage();
        updateBudgetSafetyController();
        playSound('success');
        showToast('Batas anggaran berhasil diperbarui!', '💰');
        switchTab('tabShopping');
      });
    }

    // Reset All Data Button
    const resetAllDataBtn = document.getElementById('resetAllDataBtn');
    if (resetAllDataBtn) {
      resetAllDataBtn.addEventListener('click', () => {
        if (confirm('Hapus bersih seluruh data keranjang, histori, dan database harga?')) {
          localStorage.clear();
          cart = [];
          historySessions = [];
          priceDatabase = {};
          budgetSettings = { ...DEFAULT_BUDGET };
          saveBudgetToStorage();
          saveCartToStorage();
          saveDatabaseToStorage();
          saveHistoryToStorage();
          renderCart();
          renderHistory();
          showToast('Data berhasil dibersihkan', '🧹');
        }
      });
    }

    // Load Sample Data Button
    const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
    if (loadSampleDataBtn) {
      loadSampleDataBtn.addEventListener('click', () => {
        cart = JSON.parse(JSON.stringify(DEFAULT_INITIAL_CART));
        priceDatabase = { ...DEFAULT_PRICE_DATABASE };
        historySessions = JSON.parse(JSON.stringify(DEFAULT_HISTORY));
        budgetSettings = { ...DEFAULT_BUDGET };

        saveCartToStorage();
        saveDatabaseToStorage();
        saveHistoryToStorage();
        saveBudgetToStorage();

        renderCart();
        renderHistory();
        playSound('success');
        showToast('Data simulasi belanja kos berhasil dimuat!', '🔄');
        switchTab('tabShopping');
      });
    }

    // Export Data JSON
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        const backup = {
          cart,
          budgetSettings,
          priceDatabase,
          historySessions,
          exportDate: new Date().toISOString()
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `SakuCart_Backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Data berhasil diekspor', '📥');
      });
    }
  }

  // =========================================================================
  // SERVICE WORKER REGISTRATION (OFFLINE PWA CAPABILITY)
  // =========================================================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('SakuCart ServiceWorker registered:', reg.scope);
          })
          .catch(err => {
            console.warn('ServiceWorker registration error:', err);
          });
      });
    }
  }

  // =========================================================================
  // BOOTSTRAP APP
  // =========================================================================
  function initApp() {
    loadStateFromStorage();
    renderCart();
    renderHistory();
    initTieredDiscountCalculator();
    initPromoDuel();
    initEventListeners();
    registerServiceWorker();

    // Set today's date in header
    const headerLiveDate = document.getElementById('headerLiveDate');
    if (headerLiveDate) {
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      headerLiveDate.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
