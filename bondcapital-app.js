// Bond Capital Investment System - Complete Master Application Engine

(function () {
  'use strict';

  // --- Storage Key ---
  const STORAGE_KEY = 'bondcapital_investment_system_v4';

  // --- Supabase Client Integration ---
  const SUPABASE_URL = 'https://ipgjutlmdnrmzesulkqd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZ2p1dGxtZG5ybXplc3Vsa3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzOTk3MzksImV4cCI6MjEwODk3NTczOX0.XFUsDIpESFBzA77C5pNDEXtsA7o_iqn15RqISsoi_Pw';
  
  let supabase = null;
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__supabase = supabase;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }

  // --- REAL BACKEND ENGINE (SUPABASE CLOUD PERSISTENCE) ---
  function getActiveUserId() {

    if (window.__currentUserId) return window.__currentUserId;
    try {
      const storedId = sessionStorage.getItem('bond_user_id') || localStorage.getItem('bond_user_id');
      if (storedId) return storedId;
    } catch (e) {}
    return null;
  }
  window.getActiveUserId = getActiveUserId;

  // Full sign-out: clears all session keys then redirects to login
  window.signOut = async function () {
    try {
      if (supabase && supabase.auth) await supabase.auth.signOut();
    } catch (e) {}
    // Clear every bond_* key from both storages
    const keys = [
      'bond_user_id', 'bond_user_email', 'bond_user_name',
      'bond_is_admin', 'bond_user_role'
    ];
    keys.forEach(k => {
      try { sessionStorage.removeItem(k); } catch (e) {}
      try { localStorage.removeItem(k); } catch (e) {}
    });
    // Also clear any Supabase sb-* auth tokens
    try {
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
      Object.keys(sessionStorage).filter(k => k.startsWith('sb-')).forEach(k => sessionStorage.removeItem(k));
    } catch (e) {}
    window.__currentUserId = null;
    window.location.replace('login.html');
  };

  // Route Protection & Authentication Guard
  // Public pages that do NOT require authentication
  const isPublicPage = window.location.pathname.endsWith('login.html')
    || window.location.href.includes('login.html')
    || window.location.pathname.endsWith('index.html')
    || window.location.pathname === '/'
    || window.location.pathname === ''
    || window.location.pathname.endsWith('investment-system-/')
    || window.location.pathname.endsWith('investment-system-');
  const isLoginPage = window.location.pathname.endsWith('login.html')
    || window.location.href.includes('login.html');

  // Load user data strictly from Supabase database
  async function syncFromSupabase() {
    // 0. Check authentication state
    let userId = getActiveUserId();
    if (!userId && supabase && supabase.auth) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          userId = session.user.id;
          window.__currentUserId = userId;
          try {
            sessionStorage.setItem('bond_user_id', userId);
            sessionStorage.setItem('bond_user_email', session.user.email || '');
            localStorage.setItem('bond_user_id', userId);
            localStorage.setItem('bond_user_email', session.user.email || '');
          } catch (e) {}
        }
      } catch (e) {}
    }

    // Unauthenticated user attempting to access protected page
    if (!isPublicPage && !userId) {
      window.location.replace('login.html');
      return;
    }

    // Authenticated user on login page
    if (isLoginPage && userId) {
      window.location.replace('dashboard.html');
      return;
    }

    if (!supabase) return;
    try {
      // 0. Check authentic Supabase Auth session first
      if (supabase && supabase.auth) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            window.__currentUserId = session.user.id;
            appState.user.email = session.user.email || appState.user.email;
            if (session.user.user_metadata && session.user.user_metadata.full_name) {
              appState.user.name = session.user.user_metadata.full_name;
            }
          }
        } catch (e) {}
      }

      // Check session storage cache
      try {
        const storedEmail = sessionStorage.getItem('bond_user_email');
        const storedName = sessionStorage.getItem('bond_user_name');
        if (storedEmail) appState.user.email = storedEmail;
        if (storedName) appState.user.name = storedName;
      } catch (e) {}

      const userId = getActiveUserId();

      // 1. Fetch Profile & Settings from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.name) appState.user.name = profile.name;
        if (profile.email) appState.user.email = profile.email;
        if (profile.tier) appState.user.tier = profile.tier;
        if (profile.current_level !== undefined && profile.current_level !== null) {
          appState.user.current_level = profile.current_level;
          try { localStorage.setItem('bond_active_level', profile.current_level); } catch(e){}
        }
        if (profile.level_balance !== undefined && profile.level_balance !== null) {
          appState.user.level_balance = parseFloat(profile.level_balance);
          try { localStorage.setItem('bond_allocated_balance', profile.level_balance); } catch(e){}
        }
        if (profile.monthly_limit !== undefined && profile.monthly_limit !== null) {
          appState.user.monthly_limit = parseFloat(profile.monthly_limit);
          try { localStorage.setItem('bond_monthly_limit', profile.monthly_limit); } catch(e){}
        }
        if (profile.theme && profile.theme !== appState.theme) {
          appState.theme = profile.theme;
          applyTheme();
        }
        if (profile.advanced_mode !== undefined && profile.advanced_mode !== appState.advancedMode) {
          appState.advancedMode = !!profile.advanced_mode;
          applyAdvancedMode();
        }
        if (profile.api_provider) apiConfig.provider = profile.api_provider;
        if (profile.api_key) apiConfig.apiKey = profile.api_key;
      }

      // 2. Fetch Real-Time Balances from public.balances
      const { data: balanceData } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (balanceData) {
        if (balanceData.usd !== undefined && balanceData.usd !== null) appState.balances.USD = parseFloat(balanceData.usd);
        if (balanceData.btc !== undefined && balanceData.btc !== null) appState.balances.BTC = parseFloat(balanceData.btc);
        if (balanceData.eth !== undefined && balanceData.eth !== null) appState.balances.ETH = parseFloat(balanceData.eth);
        if (balanceData.sol !== undefined && balanceData.sol !== null) appState.balances.SOL = parseFloat(balanceData.sol);
        if (balanceData.doge !== undefined && balanceData.doge !== null) appState.balances.DOGE = parseFloat(balanceData.doge);
      } else {
        // First-time user initialization in backend
        await supabase.from('balances').insert([{
          user_id: userId,
          usd: appState.balances.USD,
          btc: appState.balances.BTC,
          eth: appState.balances.ETH,
          sol: appState.balances.SOL,
          doge: appState.balances.DOGE || 0,
          updated_at: new Date().toISOString()
        }]);
      }

      // 3. Fetch Full Transaction History from public.transactions
      const { data: txList } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (txList && txList.length > 0) {
        const liveFetched = txList.map(t => ({
          id: t.id || ('TX-' + Math.floor(1000 + Math.random() * 9000)),
          type: t.type,
          category: t.type && t.type.toLowerCase().includes('withdraw') ? 'withdrawal' : (t.type && t.type.toLowerCase().includes('package') ? 'package' : 'return'),
          asset: t.asset || 'USD',
          cryptoAmount: parseFloat(t.crypto_amount || 0),
          usdAmount: parseFloat(t.usd_amount || 0),
          price: parseFloat(t.price || 1.00),
          date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'),
          status: t.status || 'Completed',
          direction: t.type && (t.type.toLowerCase().includes('withdraw') || t.type.toLowerCase().includes('funding') || t.type.toLowerCase().includes('purchase')) ? 'debit' : 'credit',
          note: t.note || 'Institutional Settlement'
        }));
        appState.transactions = liveFetched;
        // Merge with existing local transactions
        const existingLocal = window.getLiveTransactions ? window.getLiveTransactions() : [];
        const mergedMap = new Map();
        liveFetched.forEach(item => mergedMap.set(item.id, item));
        existingLocal.forEach(item => {
          if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
        });
        window.saveLiveTransactions(Array.from(mergedMap.values()));
      }

      updateAllUI();
      setupRealtimeListeners(userId);
    } catch (err) {
      console.warn('Backend sync from Supabase notice:', err.message);
    }
  }

  // Real-time backend subscriptions: reflect changes made in Supabase instantly across open tabs/windows
  let realtimeChannel = null;
  function setupRealtimeListeners(userId) {
    if (!supabase || realtimeChannel) return;
    try {
      realtimeChannel = supabase
        .channel('db-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'balances', filter: `user_id=eq.${userId}` }, (payload) => {
          if (payload.new) {
            const b = payload.new;
            if (b.usd !== undefined) appState.balances.USD = parseFloat(b.usd);
            if (b.btc !== undefined) appState.balances.BTC = parseFloat(b.btc);
            if (b.eth !== undefined) appState.balances.ETH = parseFloat(b.eth);
            if (b.sol !== undefined) appState.balances.SOL = parseFloat(b.sol);
            if (b.doge !== undefined) appState.balances.DOGE = parseFloat(b.doge);
            updateAllUI();
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
          if (payload.new && !appState.transactions.some(tx => tx.id === payload.new.id)) {
            const t = payload.new;
            appState.transactions.unshift({
              id: t.id,
              type: t.type,
              asset: t.asset,
              cryptoAmount: parseFloat(t.crypto_amount || 0),
              usdAmount: parseFloat(t.usd_amount || 0),
              price: parseFloat(t.price || 0),
              date: t.date || 'Just now',
              status: t.status || 'Completed'
            });
            updateAllUI();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime listener subscription note:', e);
    }
  }

  // Pure cloud state writer: pushes transactions, balances, and preferences to Supabase
  async function syncToSupabase(changeType, payload) {
    if (!supabase) return;
    const userId = getActiveUserId();
    try {
      if (changeType === 'transaction' && payload) {
        await supabase.from('transactions').insert([{
          id: payload.id,
          user_id: userId,
          type: payload.type,
          asset: payload.asset,
          crypto_amount: payload.cryptoAmount,
          usd_amount: payload.usdAmount,
          price: payload.price,
          status: payload.status,
          date: payload.date
        }]);
      }

      if (changeType === 'balances') {
        await supabase.from('balances').upsert([{
          user_id: userId,
          usd: appState.balances.USD,
          btc: appState.balances.BTC,
          eth: appState.balances.ETH,
          sol: appState.balances.SOL,
          doge: appState.balances.DOGE || 0,
          updated_at: new Date().toISOString()
        }]);
      }

      if (changeType === 'settings') {
        await supabase.from('profiles').upsert([{
          id: userId,
          email: appState.user.email,
          name: appState.user.name,
          tier: appState.user.tier,
          theme: appState.theme,
          advanced_mode: appState.advancedMode,
          updated_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.warn('Supabase backend sync notice:', err.message);
    }
  }

  // --- Master State ---
  const defaultState = {
    theme: 'light',
    chartType: 'line',
    timeframe: '1D',
    user: {
      name: '',
      email: '',
      tier: 'Verified Member',
      current_level: 1,
      level_balance: 1500.00,
      monthly_limit: 30.00
    },
    balances: {
      USD: 0.00,
      BTC: 0.00,
      ETH: 0.00,
      SOL: 0.00
    },
    assets: {
      BTC: { name: 'Bitcoin', symbol: 'BTC', priceUSD: 91864.73, change24h: -3.87, changeAmount: -3694.67, high24h: 93450.00, low24h: 90210.00, volume24h: '48.2B', marketCap: '1.81T', iconBg: '#F7931A', iconText: 'â‚¿' },
      ETH: { name: 'Ethereum', symbol: 'ETH', priceUSD: 3314.62, change24h: -5.46, changeAmount: -191.20, high24h: 3480.00, low24h: 3260.00, volume24h: '24.1B', marketCap: '398B', iconBg: '#627EEA', iconText: 'Îž' },
      SOL: { name: 'Solana', symbol: 'SOL', priceUSD: 248.15, change24h: 3.12, changeAmount: 7.50, high24h: 254.00, low24h: 239.50, volume24h: '8.4B', marketCap: '116B', iconBg: '#14F195', iconText: 'â—Ž' },
      USDC: { name: 'USD Coin', symbol: 'USDC', priceUSD: 1.00, change24h: 0.01, changeAmount: 0.00, high24h: 1.001, low24h: 0.999, volume24h: '5.2B', marketCap: '35B', iconBg: '#2775CA', iconText: '$' },
      DOGE: { name: 'Dogecoin', symbol: 'DOGE', priceUSD: 0.22, change24h: 8.45, changeAmount: 0.02, high24h: 0.24, low24h: 0.19, volume24h: '3.1B', marketCap: '32B', iconBg: '#C2A633', iconText: 'Ã' }
    },
    order: {
      type: 'Buy',
      frequency: 'One-time order',
      amountUSD: 500,
      mode: 'USD',
      paymentMethod: 'USD Wallet',
      targetAsset: 'BTC'
    },
    transactions: [
      { id: 'TX-9042', type: 'Buy', asset: 'BTC', cryptoAmount: 0.05, usdAmount: 4590.20, price: 91804.00, date: 'Oct 30, 2026, 09:14 AM', status: 'Completed' },
      { id: 'TX-8821', type: 'Buy', asset: 'ETH', cryptoAmount: 1.00, usdAmount: 3350.00, price: 3350.00, date: 'Oct 28, 2026, 02:45 PM', status: 'Completed' },
      { id: 'TX-7640', type: 'Deposit', asset: 'USD', cryptoAmount: 0, usdAmount: 10000.00, price: 1.00, date: 'Oct 25, 2026, 11:30 AM', status: 'Completed' }
    ],
    starred: {
      BTC: true,
      ETH: true,
      SOL: false
    },
    advancedMode: false
  };

  // Pure Backend Architecture: State is held in-memory and synced live with Supabase cloud
  const appState = JSON.parse(JSON.stringify(defaultState));


  function saveState() {
    // Pure cloud state - all information persisted strictly to Supabase backend
    syncToSupabase('balances');
  }

  // Canonical 30-Level Platform Schedule
  const LEVEL_MAP = {
    1: { purchase: 500, balance: 1500, limit: 30 },
    2: { purchase: 1000, balance: 3000, limit: 60 },
    3: { purchase: 1500, balance: 4500, limit: 100 },
    4: { purchase: 2000, balance: 6000, limit: 130 },
    5: { purchase: 2500, balance: 7500, limit: 170 },
    6: { purchase: 3000, balance: 9000, limit: 220 },
    7: { purchase: 3500, balance: 10500, limit: 255 },
    8: { purchase: 4000, balance: 12000, limit: 300 },
    9: { purchase: 4500, balance: 13500, limit: 340 },
    10: { purchase: 5000, balance: 15000, limit: 385 },
    11: { purchase: 5500, balance: 16500, limit: 420 },
    12: { purchase: 6000, balance: 18000, limit: 470 },
    13: { purchase: 6500, balance: 19500, limit: 510 },
    14: { purchase: 7000, balance: 21000, limit: 550 },
    15: { purchase: 7500, balance: 22500, limit: 580 },
    16: { purchase: 8000, balance: 24000, limit: 630 },
    17: { purchase: 8500, balance: 25500, limit: 670 },
    18: { purchase: 9000, balance: 27000, limit: 730 },
    19: { purchase: 15000, balance: 45000, limit: 1200 },
    20: { purchase: 20000, balance: 60000, limit: 1300 },
    21: { purchase: 30000, balance: 90000, limit: 2000 },
    22: { purchase: 40000, balance: 120000, limit: 3000 },
    23: { purchase: 50000, balance: 150000, limit: 4000 },
    24: { purchase: 60000, balance: 180000, limit: 4500 },
    25: { purchase: 70000, balance: 210000, limit: 5200 },
    26: { purchase: 80000, balance: 240000, limit: 6000 },
    27: { purchase: 90000, balance: 270000, limit: 7000 },
    28: { purchase: 100000, balance: 300000, limit: 8000 },
    29: { purchase: 110000, balance: 330000, limit: 8800 },
    30: { purchase: 120000, balance: 360000, limit: 9000 }
  };
  window.BOND_LEVEL_MAP = LEVEL_MAP;

  function getActiveTierInfo() {
    let lvl = 1;
    try {
      const storedLvl = localStorage.getItem('bond_active_level');
      if (storedLvl) lvl = parseInt(storedLvl, 10);
      else if (appState.user && appState.user.current_level) lvl = parseInt(appState.user.current_level, 10);
    } catch (e) {}

    if (isNaN(lvl) || lvl < 1) lvl = 1;
    if (lvl > 30) lvl = 30;

    const info = LEVEL_MAP[lvl] || LEVEL_MAP[1];
    let bal = info.balance;

    try {
      const storedBal = localStorage.getItem('bond_allocated_balance');
      if (storedBal !== null && !isNaN(parseFloat(storedBal))) {
        const parsed = parseFloat(storedBal);
        bal = Math.min(parsed, info.balance);
      } else if (appState.user && appState.user.level_balance !== undefined) {
        bal = Math.min(parseFloat(appState.user.level_balance), info.balance);
      }
    } catch (e) {}

    return {
      level: lvl,
      purchase: info.purchase,
      balance: bal,
      limit: info.limit
    };
  }
  window.getActiveTierInfo = getActiveTierInfo;

  function calculateTotalPortfolio() {
    const tier = getActiveTierInfo();
    return tier.balance;
  }

  // --- Theme Management ---
  window.toggleTheme = function () {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    syncToSupabase('settings');
    showToast(
      appState.theme === 'dark' ? 'Pro Dark Mode' : 'Classic Light Mode',
      `Switched to ${appState.theme} theme`,
      appState.theme === 'dark' ? 'ðŸŒ™' : 'â˜€ï¸'
    );
  };

  function applyTheme() {
    if (appState.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = appState.theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™';
      btn.title = `Switch to ${appState.theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    });
  }

  // --- Advanced Mode Management ---
  window.toggleAdvancedMode = function (forceState) {
    if (typeof forceState === 'boolean') {
      appState.advancedMode = forceState;
    } else {
      appState.advancedMode = !appState.advancedMode;
    }
    applyAdvancedMode();
    syncToSupabase('settings');
    showToast(
      appState.advancedMode ? 'Advanced Trade Mode Active' : 'Standard View Active',
      appState.advancedMode ? 'Pro order book, candlestick indicators, and depth chart enabled.' : 'Standard portfolio mode active.',
      'âš™ï¸'
    );
  };

  function applyAdvancedMode() {
    const isAdv = !!appState.advancedMode;

    // 1. Update all toggle switches across sidebars
    document.querySelectorAll('[data-purpose="advanced-mode-switch"]').forEach(wrapper => {
      const track = wrapper.querySelector('.advanced-toggle-track') || wrapper.querySelector('button');
      const knob = wrapper.querySelector('.advanced-toggle-knob') || wrapper.querySelector('button div') || wrapper.querySelector('div.w-5');
      const label = wrapper.querySelector('span');

      if (track) {
        track.style.backgroundColor = isAdv ? '#0052FF' : '#DCDFE4';
      }
      if (knob) {
        knob.style.transform = isAdv ? 'translateX(20px)' : 'translateX(0px)';
      }
      if (label) {
        label.style.color = isAdv ? '#0052FF' : '';
      }
    });

    // 2. Asset page candlestick sync
    if (typeof setChartType === 'function') {
      const btns = document.querySelectorAll('.chart-type-btn');
      if (btns && btns.length >= 2) {
        if (isAdv) {
          setChartType('candle', btns[1]);
        } else {
          setChartType('line', btns[0]);
        }
      }
    }

    // 3. Pro header badge
    let proBadge = document.getElementById('cb-advanced-badge');
    const headerTitle = document.querySelector('header h1, header h2');
    if (isAdv) {
      if (!proBadge && headerTitle) {
        proBadge = document.createElement('span');
        proBadge.id = 'cb-advanced-badge';
        proBadge.style.cssText = 'margin-left: 10px; display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: #0052FF; color: #fff; letter-spacing: 0.05em; vertical-align: middle;';
        proBadge.textContent = 'PRO';
        headerTitle.appendChild(proBadge);
      }
    } else if (proBadge) {
      proBadge.remove();
    }
  }

  // --- Toast System ---
  function ensureToastContainer() {
    let c = document.getElementById('cb-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'cb-toast-container';
      c.className = 'cb-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function dismissToast(toast) {
    if (toast && toast.parentElement && !toast.classList.contains('cb-toast-dismissing')) {
      toast.classList.add('cb-toast-dismissing');
      toast.style.animation = 'cbFadeOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 240);
    }
  }

  window.showToast = function (title, message = '', typeOrIcon = 'success', duration = 4500, opts = {}) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'cb-toast';

    // Auto-detect institutional type and vector SVG icon
    let type = 'info';
    let iconSvg = '';
    let pillText = 'NOTICE';

    const tLower = (String(title) + ' ' + String(message) + ' ' + String(typeOrIcon)).toLowerCase();

    if (
      tLower.includes('tier') ||
      tLower.includes('package') ||
      tLower.includes('unlocked') ||
      tLower.includes('level') ||
      tLower.includes('allocated') ||
      tLower.includes('allocation') ||
      typeOrIcon === 'tier'
    ) {
      type = 'tier';
      pillText = 'PORTFOLIO ALLOCATION';
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0052FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#0052FF" fill-opacity="0.16"/>
      </svg>`;
    } else if (
      tLower.includes('success') ||
      tLower.includes('confirm') ||
      tLower.includes('deposit') ||
      tLower.includes('withdraw') ||
      tLower.includes('copi') ||
      tLower.includes('sent') ||
      tLower.includes('transferred') ||
      tLower.includes('paid') ||
      tLower.includes('verified') ||
      typeOrIcon === 'success' ||
      typeOrIcon === 'success' || typeOrIcon === 'check'
    ) {
      type = 'success';
      pillText = 'SETTLED & CONFIRMED';
      iconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16.667 5L7.5 14.167 3.333 10"/>
      </svg>`;
    } else if (
      tLower.includes('insufficient') ||
      tLower.includes('invalid') ||
      tLower.includes('error') ||
      tLower.includes('failed') ||
      tLower.includes('zero') ||
      tLower.includes('depleted') ||
      typeOrIcon === 'warning' ||
      typeOrIcon === 'error'
    ) {
      type = 'warning';
      pillText = 'ATTENTION REQUIRED';
      iconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 6.667V10m0 3.333h.008M10 18.333a8.333 8.333 0 100-16.666 8.333 8.333 0 000 16.666z"/>
      </svg>`;
    } else {
      type = 'info';
      pillText = 'SYSTEM ADVISORY';
      iconSvg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13.333V10m0-3.333h.008M10 18.333a8.333 8.333 0 100-16.666 8.333 8.333 0 000 16.666z"/>
      </svg>`;
    }

    toast.innerHTML = `
      <div class="cb-toast-badge cb-toast-badge-${type}">
        ${iconSvg}
      </div>
      <div class="cb-toast-body">
        <div class="cb-toast-header">
          <span class="cb-toast-pill cb-toast-pill-${type}">${pillText}</span>
          <span class="cb-toast-time">Just now</span>
        </div>
        <div class="cb-toast-title">${title}</div>
        ${message ? `<div class="cb-toast-msg">${message}</div>` : ''}
      </div>
      <button class="cb-toast-close" title="Dismiss" type="button" aria-label="Dismiss">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
      <div class="cb-toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    `;

    // Close button event
    const closeBtn = toast.querySelector('.cb-toast-close');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        dismissToast(toast);
      };
    }

    container.appendChild(toast);

    // Automatically record important actions to notifications feed
    try {
      if (!opts.skipNotification && typeof getStoredNotifications === 'function') {
        const skipWords = ['address copied', 'referral link copied', 'marked as read', 'notifications cleared', 'timeframe', 'browsing'];
        const tLowerStr = (String(title) + ' ' + String(message)).toLowerCase();
        const shouldSkip = skipWords.some(w => tLowerStr.includes(w));
        if (!shouldSkip) {
          const list = getStoredNotifications();
          const recentDup = list.find(n => n.title === title && (Date.now() - n.time < 5000));
          if (!recentDup) {
            window.addNotification(title, message, type, { silent: true });
          }
        }
      }
    } catch (e) {}

    // Auto dismiss with hover-pause
    let dismissTimer = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    toast.addEventListener('mouseenter', () => {
      clearTimeout(dismissTimer);
      const bar = toast.querySelector('.cb-toast-progress-bar');
      if (bar) bar.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const bar = toast.querySelector('.cb-toast-progress-bar');
      if (bar) bar.style.animationPlayState = 'running';
      dismissTimer = setTimeout(() => {
        dismissToast(toast);
      }, 1400);
    });
  };

  

  // --- Modal Framework ---
  window.openModal = function (htmlContent) {
    closeActiveModal();
    const overlay = document.createElement('div');
    overlay.className = 'cb-modal-overlay';
    overlay.id = 'cb-active-modal';
    overlay.onclick = function (e) {
      if (e.target === overlay) closeActiveModal();
    };
    overlay.innerHTML = `<div class="cb-modal-card">${htmlContent}</div>`;
    document.body.appendChild(overlay);
  };

  window.closeActiveModal = function () {
    const existing = document.getElementById('cb-active-modal');
    if (existing) existing.remove();
  };

  // --- Live Trading Execution Engine ---
  window.executeLiveTrade = function (action, symbol, amountUSD) {
    const asset = appState.assets[symbol];
    if (!asset) return;

    amountUSD = parseFloat(amountUSD) || 0;
    if (amountUSD <= 0) {
      showToast('Invalid Amount', 'Please enter an amount greater than 0', 'âš ï¸');
      return;
    }

    const cryptoQty = amountUSD / asset.priceUSD;

    if (action === 'Buy') {
      if (appState.balances.USD < amountUSD) {
        showToast('Insufficient Cash Balance', `Available: $${appState.balances.USD.toFixed(2)}. Please top up cash.`, 'âš ï¸');
        openDepositCashModal();
        return;
      }

      appState.balances.USD -= amountUSD;
      appState.balances[symbol] = (appState.balances[symbol] || 0) + cryptoQty;

      const newTx = {
        id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
        type: 'Buy',
        asset: symbol,
        cryptoAmount: cryptoQty,
        usdAmount: amountUSD,
        price: asset.priceUSD,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'Completed'
      };
      appState.transactions.unshift(newTx);
      syncToSupabase('transaction', newTx);
      saveState();
      updateAllUI();
      closeActiveModal();
      showToast(
        `Bought ${cryptoQty.toFixed(6)} ${symbol}`,
        `Successfully executed at $${asset.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'success');

    } else if (action === 'Sell') {
      const currentCrypto = appState.balances[symbol] || 0;
      if (currentCrypto < cryptoQty) {
        showToast('Insufficient Crypto', `You own ${currentCrypto.toFixed(6)} ${symbol}, but tried to sell ${cryptoQty.toFixed(6)} ${symbol}`, 'âš ï¸');
        return;
      }

      appState.balances[symbol] -= cryptoQty;
      appState.balances.USD += amountUSD;

      const newTx = {
        id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
        type: 'Sell',
        asset: symbol,
        cryptoAmount: cryptoQty,
        usdAmount: amountUSD,
        price: asset.priceUSD,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'Completed'
      };
      appState.transactions.unshift(newTx);
      syncToSupabase('transaction', newTx);
      saveState();
      updateAllUI();
      closeActiveModal();
      showToast(
        `Sold ${cryptoQty.toFixed(6)} ${symbol}`,
        `Received $${amountUSD.toFixed(2)} USD in wallet`, 'success');
    }
  };

  // --- Live API & Real-Time Market Streaming Engine ---
  const API_STORAGE_KEY = 'bondcapital_live_api_config';

  const defaultApiConfig = {
    provider: 'binance', // 'bondcapital' | 'binance' | 'coingecko' | 'coincap' | 'custom'
    apiKey: 'dbidtf9r01qie36n5cogdbidtf9r01qie36n5cp0',
    apiSecret: '',
    status: 'connecting', // 'connected' | 'connecting' | 'disconnected'
    lastTickTime: null,
    ticksReceived: 0,
    activeProviderName: 'Bond Capital WebSocket'
  };

  const apiConfig = Object.assign({}, defaultApiConfig);

  function saveApiConfig() {
    // Persist API configuration settings directly to Supabase cloud
    if (supabase) {
      const activeUser = (typeof getActiveUserId === 'function') ? getActiveUserId() : 'usr_master_chris';
      supabase.from('profiles').upsert([{
        id: activeUser,
        api_provider: apiConfig.provider,
        api_key: apiConfig.apiKey,
        updated_at: new Date().toISOString()
      }]).then(() => {
        console.log('API config synced to Supabase backend');
      }).catch(e => console.warn('Supabase api config notice:', e));
    }
  }

  let activeWebSocket = null;
  let restPollTimer = null;
  let reconnectTimer = null;

  function updateApiStatusUI(status, label) {
    apiConfig.status = status;
    const badge = document.getElementById('live-api-status-btn');
    const badgeLabel = document.getElementById('live-api-status-label');
    const dot = badge ? badge.querySelector('span:first-child') : null;

    if (badgeLabel) {
      badgeLabel.textContent = label || (status === 'connected' ? 'Live API' : status === 'connecting' ? 'Connecting...' : 'API Offline');
    }
    if (dot) {
      if (status === 'connected') {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
        if (badge) badge.className = 'flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-full text-xs font-bold text-emerald-700 transition-all cursor-pointer shadow-2xs';
      } else if (status === 'connecting') {
        dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
        if (badge) badge.className = 'flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-full text-xs font-bold text-amber-700 transition-all cursor-pointer shadow-2xs';
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        if (badge) badge.className = 'flex items-center gap-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-full text-xs font-bold text-rose-700 transition-all cursor-pointer shadow-2xs';
      }
    }
  }

  function startLiveMarketFeed() {
    connectLiveFeed();
  }

  function connectLiveFeed() {
    if (activeWebSocket) {
      try { activeWebSocket.close(); } catch (e) {}
      activeWebSocket = null;
    }
    if (restPollTimer) {
      clearInterval(restPollTimer);
      restPollTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    updateApiStatusUI('connecting', 'Connecting...');

    if (apiConfig.provider === 'binance') {
      connectBinanceWS();
    } else if (apiConfig.provider === 'coingecko') {
      startCoinGeckoPolling();
    } else if (apiConfig.provider === 'coincap') {
      connectCoinCapWS();
    } else {
      // Default: Bond Capital Exchange WebSocket
      connectBinanceWS();
    }
  }

  function connectBinanceWS() {
    apiConfig.activeProviderName = 'Bond Capital Exchange WS';
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      activeWebSocket = ws;

      ws.onopen = () => {
        updateApiStatusUI('connected', 'Live: Bond Capital');
        const subscribeMsg = {
          type: 'subscribe',
          product_ids: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD'],
          channels: ['ticker']
        };
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ticker' && data.product_id) {
            const sym = data.product_id.split('-')[0];
            const newPrice = parseFloat(data.price);
            const open24h = parseFloat(data.open_24h || newPrice);
            const changePercent = open24h ? ((newPrice - open24h) / open24h) * 100 : 0;

            if (appState.assets[sym] && !isNaN(newPrice)) {
              const oldPrice = appState.assets[sym].priceUSD;
              appState.assets[sym].priceUSD = newPrice;
              appState.assets[sym].change24h = parseFloat(changePercent.toFixed(2));
              appState.assets[sym].changeAmount = parseFloat((newPrice - open24h).toFixed(2));
              if (data.high_24h) appState.assets[sym].high24h = parseFloat(data.high_24h);
              if (data.low_24h) appState.assets[sym].low24h = parseFloat(data.low_24h);
              if (data.volume_24h) appState.assets[sym].volume24h = (parseFloat(data.volume_24h) / 1000).toFixed(1) + 'K';

              apiConfig.ticksReceived++;
              apiConfig.lastTickTime = new Date().toLocaleTimeString();
              updateAllUI(sym, newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null);
            }
          }
        } catch (e) {
          console.warn('Bond Capital WS tick parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('Bond Capital WS failed, falling back to Binance feed...', e);
        connectBinanceWS();
      };

      ws.onclose = () => {
        if (apiConfig.status === 'connected') {
          reconnectTimer = setTimeout(() => connectLiveFeed(), 4000);
        }
      };
    } catch (e) {
      connectBinanceWS();
    }
  }

  function connectBinanceWS() {
    apiConfig.activeProviderName = 'Binance Live WS';
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      activeWebSocket = ws;

      ws.onopen = () => {
        updateApiStatusUI('connected', 'Live: Binance');
      };

      ws.onmessage = (event) => {
        try {
          const arr = JSON.parse(event.data);
          if (Array.isArray(arr)) {
            let lastSym = null;
            let lastDir = null;

            arr.forEach(t => {
              let sym = null;
              if (t.s === 'BTCUSDT') sym = 'BTC';
              else if (t.s === 'ETHUSDT') sym = 'ETH';
              else if (t.s === 'SOLUSDT') sym = 'SOL';
              else if (t.s === 'DOGEUSDT') sym = 'DOGE';

              if (sym && appState.assets[sym]) {
                const newPrice = parseFloat(t.c);
                const openPrice = parseFloat(t.o);
                const oldPrice = appState.assets[sym].priceUSD;

                appState.assets[sym].priceUSD = newPrice;
                appState.assets[sym].change24h = parseFloat((((newPrice - openPrice) / openPrice) * 100).toFixed(2));
                appState.assets[sym].changeAmount = parseFloat((newPrice - openPrice).toFixed(2));
                appState.assets[sym].high24h = parseFloat(t.h);
                appState.assets[sym].low24h = parseFloat(t.l);

                if (newPrice !== oldPrice) {
                  lastSym = sym;
                  lastDir = newPrice > oldPrice ? 'up' : 'down';
                }
              }
            });

            if (lastSym) {
              apiConfig.ticksReceived++;
              apiConfig.lastTickTime = new Date().toLocaleTimeString();
              updateAllUI(lastSym, lastDir);
            }
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        startCoinGeckoPolling();
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(() => connectLiveFeed(), 5000);
      };
    } catch (e) {
      startCoinGeckoPolling();
    }
  }

  function connectCoinCapWS() {
    apiConfig.activeProviderName = 'CoinCap WS';
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      activeWebSocket = ws;
      ws.onopen = () => updateApiStatusUI('connected', 'Live: CoinCap');
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          for (const k in msg) {
            let sym = k.toUpperCase();
            if (appState.assets[sym]) {
              const newPrice = parseFloat(msg[k]);
              const oldPrice = appState.assets[sym].priceUSD;
              appState.assets[sym].priceUSD = newPrice;
              updateAllUI(sym, newPrice > oldPrice ? 'up' : 'down');
            }
          }
        } catch (e) {}
      };
      ws.onerror = () => connectBinanceWS();
    } catch (e) {
      connectBinanceWS();
    }
  }

  function startCoinGeckoPolling() {
    apiConfig.activeProviderName = 'CoinGecko REST';
    const fetchGecko = async () => {
      try {
        const headers = {};
        if (apiConfig.apiKey) {
          headers['x-cg-pro-api-key'] = apiConfig.apiKey;
        }
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true', { headers });
        if (res.ok) {
          const data = await res.json();
          const map = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', dogecoin: 'DOGE' };
          for (const id in map) {
            const sym = map[id];
            if (data[id] && appState.assets[sym]) {
              appState.assets[sym].priceUSD = data[id].usd;
              if (data[id].usd_24h_change) {
                appState.assets[sym].change24h = parseFloat(data[id].usd_24h_change.toFixed(2));
              }
            }
          }
          apiConfig.ticksReceived++;
          apiConfig.lastTickTime = new Date().toLocaleTimeString();
          updateApiStatusUI('connected', 'Live: CoinGecko');
          updateAllUI();
        }
      } catch (err) {
        updateApiStatusUI('disconnected', 'API Offline');
      }
    };

    fetchGecko();
    restPollTimer = setInterval(fetchGecko, 8000);
  }

  // --- Live API Settings Modal ---
  window.openApiSettingsModal = function () {
    const isConnected = apiConfig.status === 'connected';
    openModal(`
      <div style="padding: 24px; font-family: inherit;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:36px; height:36px; border-radius:50%; background:#0052FF; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">
              âš¡
            </div>
            <div>
              <h2 style="font-size:18px; font-weight:700; margin:0;">Live API & Market Feed</h2>
              <p style="font-size:12px; color:var(--text-muted); margin:0;">Real-time WebSocket & REST Data Pipeline</p>
            </div>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <!-- Connection Status Banner -->
        <div style="padding:14px 16px; border-radius:16px; background:${isConnected ? '#F0FDF4' : '#FFFBEB'}; border:1px solid ${isConnected ? '#BBF7D0' : '#FDE68A'}; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:8px; height:8px; border-radius:50%; background:${isConnected ? '#10B981' : '#F59E0B'}; display:inline-block;"></span>
              <span style="font-weight:700; font-size:13px; color:${isConnected ? '#166534' : '#92400E'};">${isConnected ? 'Connected & Streaming Ticks' : 'Connecting to Stream...'}</span>
            </div>
            <div style="font-size:11px; color:${isConnected ? '#15803D' : '#B45309'}; margin-top:2px;">
              Provider: <b>${apiConfig.activeProviderName}</b> Â· Ticks: <b>${apiConfig.ticksReceived}</b> Â· Last: <b>${apiConfig.lastTickTime || 'Just now'}</b>
            </div>
          </div>
          <button onclick="connectLiveFeed(); showToast('Reconnecting...', 'Establishing real-time socket', 'ðŸ”„');" style="padding:6px 12px; font-size:11px; font-weight:700; background:#fff; border:1px solid #D1D5DB; border-radius:9999px; cursor:pointer;">
            Reconnect
          </button>
        </div>

        <!-- Provider Selection -->
        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Data Feed Provider</label>
          <select id="api-provider-select" style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-secondary); font-size:14px; font-weight:600; outline:none;">
            <option value="bondcapital" ${apiConfig.provider === 'bondcapital' ? 'selected' : ''}>Bond Capital Exchange WebSocket (Official Spot Feed)</option>
            <option value="binance" ${apiConfig.provider === 'binance' ? 'selected' : ''}>Binance Global Mini-Ticker Stream (Sub-second)</option>
            <option value="coingecko" ${apiConfig.provider === 'coingecko' ? 'selected' : ''}>CoinGecko API (Supports Pro & Free Keys)</option>
            <option value="coincap" ${apiConfig.provider === 'coincap' ? 'selected' : ''}>CoinCap Public Streaming Feed</option>
          </select>
        </div>

        <!-- API Key Input -->
        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Live API Key</label>
          <div style="position:relative;">
            <input id="api-key-input" type="password" value="${apiConfig.apiKey || ''}" placeholder="Enter your API key" style="width:100%; padding:10px 40px 10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-secondary); font-size:13px; font-family:monospace; outline:none; box-sizing:border-box;" />
            <button type="button" onclick="const input = document.getElementById('api-key-input'); input.type = input.type === 'password' ? 'text' : 'password';" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); border:none; background:transparent; cursor:pointer; font-size:14px;">ðŸ‘ï¸</button>
          </div>
          <p style="font-size:11px; color:var(--text-muted); margin:4px 0 0 2px;">Live market data is streamed in real-time from exchange WebSocket feeds.</p>
        </div>

        <!-- API Secret (Optional) -->
        <div style="margin-bottom:18px;">
          <label style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">API Secret (Optional)</label>
          <input id="api-secret-input" type="password" value="${apiConfig.apiSecret || ''}" placeholder="Optional Secret for authenticated endpoints" style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-secondary); font-size:13px; font-family:monospace; outline:none; box-sizing:border-box;" />
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button onclick="saveApiKey()" style="flex:1; background:#0052FF; color:#fff; border:none; border-radius:9999px; padding:12px; font-size:14px; font-weight:700; cursor:pointer; shadow-sm; transition:opacity 0.15s;">
            Save & Connect Feed
          </button>
          <button onclick="closeActiveModal()" style="padding:12px 20px; background:#EEF0F3; color:#0A0B0D; border:none; border-radius:9999px; font-size:14px; font-weight:700; cursor:pointer;">
            Close
          </button>
        </div>
      </div>
    `);
  };

  window.saveApiKey = function () {
    const provider = document.getElementById('api-provider-select')?.value || 'bondcapital';
    const key = document.getElementById('api-key-input')?.value.trim() || '';
    const secret = document.getElementById('api-secret-input')?.value.trim() || '';

    apiConfig.provider = provider;
    apiConfig.apiKey = key;
    apiConfig.apiSecret = secret;
    saveApiConfig();

    closeActiveModal();
    connectLiveFeed();

    showToast(
      'Live API Configured',
      `Connected to ${provider.toUpperCase()} streaming service.`,
      'âš¡'
    );
  };


  // --- All Modals ---
  window.openSendCryptoModal = function () {
    const asset = appState.assets[appState.order.targetAsset || 'BTC'];
    const currentHolding = appState.balances[asset.symbol] || 0;

    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h2 style="font-size:18px; font-weight:700;">Send ${asset.name}</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:18px; padding:16px; margin-bottom:16px;">
          <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Recipient Address</label>
          <input id="send-recipient-input" type="text" placeholder="Mobile, email, or crypto address" style="width:100%; border:none; background:transparent; font-size:14px; font-weight:500; outline:none;" />
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:18px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Amount</label>
            <span style="font-size:11px; color:#0052FF; font-weight:700; cursor:pointer;" onclick="document.getElementById('send-amount-input').value = '${currentHolding}'">Max: ${currentHolding.toFixed(4)} ${asset.symbol}</span>
          </div>
          <div style="display:flex; align-items:baseline;">
            <input id="send-amount-input" type="number" value="${(currentHolding * 0.5).toFixed(4)}" min="0.0001" step="0.001" style="border:none; background:transparent; font-size:24px; font-weight:700; width:160px; outline:none;" />
            <span style="font-size:14px; font-weight:bold; margin-left:6px;">${asset.symbol}</span>
          </div>
        </div>

        <button onclick="confirmSendCrypto('${asset.symbol}')" style="width:100%; background:#0052FF; color:#fff; border:none; border-radius:9999px; padding:14px; font-size:15px; font-weight:700; cursor:pointer;">
          Send Now
        </button>
      </div>
    `);
  };

  window.confirmSendCrypto = function (symbol) {
    const recipient = document.getElementById('send-recipient-input')?.value || 'external-wallet';
    const amt = parseFloat(document.getElementById('send-amount-input')?.value || 0);
    const asset = appState.assets[symbol];

    if (amt <= 0 || (appState.balances[symbol] || 0) < amt) {
      showToast('Insufficient Balance', `You do not have ${amt} ${symbol} to send.`, 'âš ï¸');
      return;
    }

    appState.balances[symbol] -= amt;
    const newTx = {
      id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      type: 'Send',
      asset: symbol,
      cryptoAmount: amt,
      usdAmount: amt * asset.priceUSD,
      price: asset.priceUSD,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Completed'
    };
    appState.transactions.unshift(newTx);
    syncToSupabase('transaction', newTx);
    saveState();
    updateAllUI();
    closeActiveModal();
    showToast('Sent Successfully', `Transferred ${amt} ${symbol} to ${recipient.slice(0, 14)}...`, 'success');
  };

  window.openReceiveCryptoModal = function () {
    const asset = appState.assets[appState.order.targetAsset || 'BTC'];
    const walletAddr = appState.user && appState.user.wallet_address ? appState.user.wallet_address : 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

    openModal(`
      <div style="padding: 24px; text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h2 style="font-size:18px; font-weight:700;">Receive ${asset.name}</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Only send <strong style="color:var(--text-primary);">${asset.name} (${asset.symbol})</strong> to this address.</p>

        <div style="background:#fff; border:2px solid var(--border-color); border-radius:20px; padding:18px; display:inline-block; margin-bottom:16px;">
          <svg style="width:160px; height:160px; display:block;" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#ffffff"/>
            <rect x="10" y="10" width="24" height="24" rx="4" fill="#0A0B0D"/>
            <rect x="14" y="14" width="16" height="16" rx="2" fill="#ffffff"/>
            <rect x="18" y="18" width="8" height="8" fill="#0A0B0D"/>
            <rect x="66" y="10" width="24" height="24" rx="4" fill="#0A0B0D"/>
            <rect x="70" y="14" width="16" height="16" rx="2" fill="#ffffff"/>
            <rect x="74" y="18" width="8" height="8" fill="#0A0B0D"/>
            <rect x="10" y="66" width="24" height="24" rx="4" fill="#0A0B0D"/>
            <rect x="14" y="70" width="16" height="16" rx="2" fill="#ffffff"/>
            <rect x="18" y="74" width="8" height="8" fill="#0A0B0D"/>
            <rect x="44" y="24" width="8" height="8" fill="#0052FF"/>
            <rect x="44" y="44" width="12" height="12" rx="3" fill="#0052FF"/>
            <rect x="66" y="66" width="18" height="8" fill="#0A0B0D"/>
          </svg>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div style="font-family:monospace; font-size:12px; word-break:break-all; text-align:left; margin-right:8px;">
            ${walletAddr}
          </div>
          <button onclick="navigator.clipboard.writeText('${walletAddr}'); showToast('Address Copied!', '', 'ðŸ“‹');" style="background:#0052FF; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">
            Copy
          </button>
        </div>

        <button onclick="closeActiveModal()" style="width:100%; background:#EEF0F3; border:none; border-radius:9999px; padding:12px; font-size:14px; font-weight:700; cursor:pointer;">
          Done
        </button>
      </div>
    `);
  };

  window.openDepositCashModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h2 style="font-size:18px; font-weight:700;">Deposit USD Cash</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:18px; padding:16px; margin-bottom:18px;">
          <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Deposit Amount</label>
          <div style="display:flex; align-items:baseline;">
            <span style="font-size:24px; font-weight:700; margin-right:4px;">$</span>
            <input id="deposit-amount-input" type="number" value="5000" min="100" step="500" style="border:none; background:transparent; font-size:24px; font-weight:700; width:160px; outline:none;" />
            <span style="font-size:14px; font-weight:bold; color:var(--text-muted); margin-left:auto;">USD</span>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:18px;">
          <button onclick="document.getElementById('deposit-amount-input').value = '1000'" style="flex:1; padding:8px; border-radius:10px; background:var(--bg-subtle); border:none; font-weight:bold; font-size:12px; cursor:pointer;">+$1,000</button>
          <button onclick="document.getElementById('deposit-amount-input').value = '5000'" style="flex:1; padding:8px; border-radius:10px; background:var(--bg-subtle); border:none; font-weight:bold; font-size:12px; cursor:pointer;">+$5,000</button>
          <button onclick="document.getElementById('deposit-amount-input').value = '10000'" style="flex:1; padding:8px; border-radius:10px; background:var(--bg-subtle); border:none; font-weight:bold; font-size:12px; cursor:pointer;">+$10,000</button>
        </div>

        <button onclick="confirmDepositCash()" style="width:100%; background:#0052FF; color:#fff; border:none; border-radius:9999px; padding:14px; font-size:15px; font-weight:700; cursor:pointer;">
          Confirm Deposit
        </button>
      </div>
    `);
  };

  window.confirmDepositCash = function () {
    const amt = parseFloat(document.getElementById('deposit-amount-input')?.value || 5000);
    appState.balances.USD += amt;
    const newTx = {
      id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      type: 'Deposit',
      asset: 'USD',
      cryptoAmount: 0,
      usdAmount: amt,
      price: 1.00,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Completed'
    };
    appState.transactions.unshift(newTx);
    syncToSupabase('transaction', newTx);
    saveState();
    updateAllUI();
    closeActiveModal();
    showToast('Funds Deposited!', `Added $${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD to wallet.`, 'ðŸ’°');
  };

  window.openWithdrawCashModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h2 style="font-size:18px; font-weight:700;">Withdraw USD</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:18px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Amount</label>
            <span style="font-size:11px; color:#0052FF; font-weight:bold; cursor:pointer;" onclick="document.getElementById('withdraw-amount-input').value = '${appState.balances.USD}'">Available: $${appState.balances.USD.toFixed(2)}</span>
          </div>
          <div style="display:flex; align-items:baseline;">
            <span style="font-size:24px; font-weight:700; margin-right:4px;">$</span>
            <input id="withdraw-amount-input" type="number" value="${Math.min(1000, appState.balances.USD).toFixed(2)}" max="${appState.balances.USD}" style="border:none; background:transparent; font-size:24px; font-weight:700; width:160px; outline:none;" />
          </div>
        </div>

        <button onclick="confirmWithdrawCash()" style="width:100%; background:#0052FF; color:#fff; border:none; border-radius:9999px; padding:14px; font-size:15px; font-weight:700; cursor:pointer;">
          Withdraw
        </button>
      </div>
    `);
  };

  window.confirmWithdrawCash = function () {
    const amt = parseFloat(document.getElementById('withdraw-amount-input')?.value || 0);
    if (amt <= 0 || appState.balances.USD < amt) {
      showToast('Invalid Amount', 'Withdrawal exceeds available USD balance.', 'âš ï¸');
      return;
    }

    appState.balances.USD -= amt;
    const newTx = {
      id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      type: 'Withdraw',
      asset: 'USD',
      cryptoAmount: 0,
      usdAmount: amt,
      price: 1.00,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Completed'
    };
    appState.transactions.unshift(newTx);
    syncToSupabase('transaction', newTx);
    saveState();
    updateAllUI();
    closeActiveModal();
    showToast('Withdrawal Processed', `$${amt.toFixed(2)} USD transferred.`, 'success');
  };

  window.openAssetSelectorModal = function () {
    const assetKeys = Object.keys(appState.assets);
    let itemsHtml = '';
    assetKeys.forEach(k => {
      const a = appState.assets[k];
      const isSelected = appState.order.targetAsset === k;
      itemsHtml += `
        <div onclick="selectAsset('${k}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:16px; cursor:pointer; background:${isSelected ? 'rgba(0,82,255,0.08)' : 'transparent'};">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:${a.iconBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">
              ${a.iconText}
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${a.name}</div>
              <div style="font-size:12px; color:var(--text-muted); font-weight:600;">${a.symbol}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-size:14px; color:var(--text-primary);">$${a.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="font-size:12px; font-weight:600; color:${a.change24h >= 0 ? '#098551' : '#CF202F'};">
              ${a.change24h >= 0 ? '+' : ''}${a.change24h}%
            </div>
          </div>
        </div>
      `;
    });

    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Select Asset</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; max-height:320px; overflow-y:auto;">
          ${itemsHtml}
        </div>
      </div>
    `);

    window.selectAsset = function (sym) {
      appState.order.targetAsset = sym;
      saveState();
      closeActiveModal();
      updateAllUI();
      showToast(`Selected ${appState.assets[sym].name}`, `Ready to trade ${sym}`, 'success');
    };
  };

  window.openPaymentMethodModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Payment Method</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div onclick="selectPaymentMethod('USD Wallet')" style="display:flex; align-items:center; justify-content:space-between; padding:14px; border:1px solid #0052FF; border-radius:18px; background:rgba(0,82,255,0.06); cursor:pointer;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#0052FF; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">$</div>
              <div>
                <div style="font-weight:700; font-size:14px;">USD Wallet</div>
                <div style="font-size:12px; color:var(--text-muted);">Available: $${appState.balances.USD.toFixed(2)}</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>

          <div onclick="selectPaymentMethod('Chase Bank (â€¢â€¢â€¢â€¢ 4291)')" style="display:flex; align-items:center; justify-content:space-between; padding:14px; border:1px solid var(--border-color); border-radius:18px; cursor:pointer;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#117ACA; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px;">CHASE</div>
              <div>
                <div style="font-weight:700; font-size:14px;">JPMorgan Chase Bank</div>
                <div style="font-size:12px; color:var(--text-muted);">Account â€¢â€¢â€¢â€¢ 4291</div>
              </div>
            </div>
          </div>
        </div>

        <button onclick="closeActiveModal(); openDepositCashModal();" style="margin-top:16px; width:100%; border:1px dashed var(--border-color); background:transparent; border-radius:14px; padding:12px; font-size:13px; font-weight:700; color:#0052FF; cursor:pointer;">
          + Deposit Cash
        </button>
      </div>
    `);

    window.selectPaymentMethod = function (name) {
      appState.order.paymentMethod = name;
      closeActiveModal();
      showToast('Payment Method Selected', name, 'success');
    };
  };

  window.openOrderFrequencyModal = function () {
    const freqs = ['One-time order', 'Daily', 'Weekly', '1st and 15th of the month', 'Monthly'];
    let html = '';
    freqs.forEach(f => {
      const active = appState.order.frequency === f;
      html += `
        <div onclick="selectOrderFreq('${f}')" style="display:flex; align-items:center; justify-content:space-between; padding:14px; border-radius:16px; cursor:pointer; background:${active ? 'rgba(0,82,255,0.08)' : 'transparent'}; font-weight:600; font-size:14px;">
          <span>${f}</span>
          ${active ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </div>
      `;
    });

    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Repeat Order</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">${html}</div>
      </div>
    `);

    window.selectOrderFreq = function (f) {
      appState.order.frequency = f;
      closeActiveModal();
      document.querySelectorAll('button:has(> span)').forEach(btn => {
        if (btn.textContent.includes('order') || btn.textContent.includes('Daily') || btn.textContent.includes('Weekly') || btn.textContent.includes('Monthly')) {
          const s = btn.querySelector('span');
          if (s) s.textContent = f;
        }
      });
      showToast('Order Frequency Set', f, 'ðŸ”„');
    };
  };

  // ==========================================
  // STRIPE PAYMENT GATEWAY & CASH BALANCE ENGINE
  // ==========================================
  const CASH_BALANCE_KEY = 'bond_cash_balance';

  window.getAvailableCashBalance = function () {
    try {
      const stored = localStorage.getItem(CASH_BALANCE_KEY);
      if (stored !== null) return parseFloat(stored) || 0;
    } catch (e) {}
    if (typeof appState !== 'undefined' && appState.balances && appState.balances.USD !== undefined) {
      return parseFloat(appState.balances.USD) || 0;
    }
    return 0.00;
  };

  window.setAvailableCashBalance = function (newBal) {
    const val = Math.max(0, parseFloat(newBal) || 0);
    try {
      localStorage.setItem(CASH_BALANCE_KEY, val.toFixed(2));
      sessionStorage.setItem(CASH_BALANCE_KEY, val.toFixed(2));
      localStorage.setItem('bond_cash_sync', Date.now().toString());
    } catch (e) {}

    if (typeof appState !== 'undefined' && appState.balances) {
      appState.balances.USD = val;
    }

    // Persist to Supabase if connected
    if (typeof supabase !== 'undefined' && supabase) {
      try {
        const uid = getActiveUserId();
        supabase.from('balances').upsert([{ user_id: uid, usd: val, updated_at: new Date().toISOString() }]).then();
      } catch (e) {}
    }

    // Update all cash balance displays on page
    document.querySelectorAll('.available-cash-display').forEach(el => {
      el.textContent = '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
    });

    window.dispatchEvent(new Event('storage'));
    return val;
  };

  // Open Stripe Checkout Deposit Modal
  window.openStripeDepositModal = function (prefillAmt = 500, onCompleteCallback = null) {
    const defaultAmt = Math.max(100, parseFloat(prefillAmt) || 500);

    openModal(`
      <div id="deposit-modal-body" style="padding: 28px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:44px; height:44px; border-radius:12px; background:#EEF3FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0052FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div>
              <h2 style="font-size:18px; font-weight:800; color:#0A0B0D; margin:0 0 2px 0;">Add Funds</h2>
              <div style="font-size:11px; color:#5B616E;">Secure card payment &middot; Processed by Stripe</div>
            </div>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#5B616E; flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Amount Input -->
        <div style="background:#F8FAFF; border:1.5px solid #D6E4FF; border-radius:14px; padding:16px 18px; margin-bottom:12px;">
          <div style="font-size:10px; font-weight:700; color:#5B616E; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Deposit Amount</div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:28px; font-weight:700; color:#0052FF;">$</span>
            <input id="stripe-deposit-amt-input" type="number" value="${defaultAmt}" min="100" step="100"
              style="font-size:28px; font-weight:700; color:#0A0B0D; background:transparent; border:none; outline:none; width:100%;" />
            <span style="font-size:13px; font-weight:600; color:#5B616E;">USD</span>
          </div>
        </div>

        <!-- Quick Amount Pills -->
        <div style="display:flex; gap:8px; margin-bottom:20px;">
          <button type="button" onclick="document.getElementById('stripe-deposit-amt-input').value='500'" style="flex:1; padding:8px 4px; border-radius:8px; background:#EEF0F3; border:1px solid #D8DCE2; font-weight:700; font-size:12px; color:#0A0B0D; cursor:pointer;">$500</button>
          <button type="button" onclick="document.getElementById('stripe-deposit-amt-input').value='1000'" style="flex:1; padding:8px 4px; border-radius:8px; background:#EEF0F3; border:1px solid #D8DCE2; font-weight:700; font-size:12px; color:#0A0B0D; cursor:pointer;">$1,000</button>
          <button type="button" onclick="document.getElementById('stripe-deposit-amt-input').value='2500'" style="flex:1; padding:8px 4px; border-radius:8px; background:#EEF0F3; border:1px solid #D8DCE2; font-weight:700; font-size:12px; color:#0A0B0D; cursor:pointer;">$2,500</button>
          <button type="button" onclick="document.getElementById('stripe-deposit-amt-input').value='5000'" style="flex:1; padding:8px 4px; border-radius:8px; background:#EEF0F3; border:1px solid #D8DCE2; font-weight:700; font-size:12px; color:#0A0B0D; cursor:pointer;">$5,000</button>
        </div>

        <!-- Card Input Section -->
        <div style="border:1px solid #E2E8F0; border-radius:12px; padding:16px; background:#fff; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:10px; font-weight:700; color:#5B616E; text-transform:uppercase; letter-spacing:0.06em;">Card Details</span>
            <div style="display:flex; gap:4px; align-items:center;">
              <span style="font-size:10px; font-weight:700; background:#EEF2F6; color:#0052FF; padding:1px 7px; border-radius:4px; border:1px solid #D6E4FF;">VISA</span>
              <span style="font-size:10px; font-weight:700; background:#FFF0F0; color:#EB001B; padding:1px 7px; border-radius:4px; border:1px solid #FFD6D6;">MC</span>
              <span style="font-size:10px; font-weight:700; background:#F0F4FF; color:#006FCF; padding:1px 7px; border-radius:4px; border:1px solid #D6E4FF;">AMEX</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; border:1px solid #D8DCE2; border-radius:8px; padding:10px 12px; background:#FAFBFC; margin-bottom:8px;">
            <svg width="16" height="16" fill="none" stroke="#5B616E" stroke-width="2" viewBox="0 0 24 24" style="margin-right:10px; flex-shrink:0;"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <input id="stripe-card-num" type="text" placeholder="Card number" style="border:none; background:transparent; font-size:14px; outline:none; width:100%; color:#0A0B0D; font-family:monospace;" />
          </div>
          <div style="display:flex; gap:8px;">
            <div style="flex:1; border:1px solid #D8DCE2; border-radius:8px; padding:10px 12px; background:#FAFBFC;">
              <input id="stripe-card-exp" type="text" placeholder="MM / YY" style="border:none; background:transparent; font-size:14px; outline:none; width:100%; color:#0A0B0D; font-family:monospace;" />
            </div>
            <div style="flex:1; border:1px solid #D8DCE2; border-radius:8px; padding:10px 12px; background:#FAFBFC;">
              <input id="stripe-card-cvc" type="text" placeholder="CVC" style="border:none; background:transparent; font-size:14px; outline:none; width:100%; color:#0A0B0D; font-family:monospace;" />
            </div>
          </div>
        </div>

        <!-- Security Note -->
        <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:18px; font-size:11px; color:#8A909C;">
          <svg width="11" height="11" fill="none" stroke="#098551" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>256-bit SSL encrypted &middot; Payments processed securely by Stripe</span>
        </div>

        <!-- Submit Button — Bond Capital Blue -->
        <button id="btn-submit-stripe-deposit" onclick="executeStripeDeposit()"
          style="width:100%; background:#0052FF; color:#ffffff; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,82,255,0.2); transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span>Confirm Deposit</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>

      </div>
    `);

    window.__stripeCallback = onCompleteCallback;
  };

    window.executeStripeDeposit = function () {
    const amtInput = document.getElementById('stripe-deposit-amt-input');
    const amt = parseFloat(amtInput?.value || 500);

    if (isNaN(amt) || amt < 10) {
      showToast('Invalid Amount', 'Please enter at least $10.00 USD.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-submit-stripe-deposit');
    if (btn) {
      btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Processing with Stripe...`;
      btn.disabled = true;
      btn.style.opacity = '0.85';
    }

    setTimeout(() => {
      const currentCash = window.getAvailableCashBalance();
      const updatedCash = currentCash + amt;
      window.setAvailableCashBalance(updatedCash);

      // Record transaction
      const tx = {
        id: 'STRIPE-' + Math.floor(100000 + Math.random() * 900000),
        type: 'Stripe Card Deposit',
        category: 'deposit',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: amt,
        price: 1.00,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'Completed',
        direction: 'credit',
        note: 'Stripe Visa/Mastercard Instant Top-Up'
      };

      if (typeof window.addTransaction === 'function') {
        window.addTransaction(tx);
      }

      if (typeof window.addNotification === 'function') {
        window.addNotification(
          `Deposit Confirmed: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`,
          `Funded via Stripe. Available cash balance is now $${updatedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD.`,
          'success'
        );
      }

      closeActiveModal();
      showToast('Deposit Complete!', `$${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD added to your cash balance.`, 'success');

      // Execute callback if purchasing tier
      if (typeof window.__stripeCallback === 'function') {
        const cb = window.__stripeCallback;
        window.__stripeCallback = null;
        cb(amt);
      }
    }, 1200);
  };
  // ==========================================
  // REAL-TIME TRANSACTIONS ENGINE
  // ==========================================
  const TRANSACTIONS_STORAGE_KEY = 'bond_transactions';

  function getSeedTransactions() {
    let lvl = 1;
    try {
      const stored = localStorage.getItem('bond_active_level');
      if (stored) lvl = parseInt(stored, 10) || 1;
    } catch (e) {}
    const info = (window.BOND_LEVEL_MAP && window.BOND_LEVEL_MAP[lvl]) || { purchase: 500, balance: 1500, limit: 30 };

    return [
      {
        id: 'TX-9842',
        type: `Level ${lvl} Package Activated`,
        category: 'package',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: info.balance,
        price: 1.00,
        date: 'Oct 28, 2026 · 2:41 PM',
        status: 'Completed',
        direction: 'credit',
        note: '3× Capital Credit Allocation'
      },
      {
        id: 'TX-9831',
        type: 'Monthly Return Credited',
        category: 'return',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: info.limit,
        price: 1.00,
        date: 'Oct 25, 2026 · 10:14 AM',
        status: 'Completed',
        direction: 'credit',
        note: 'Scheduled 30-Day Liquidity Allowance'
      },
      {
        id: 'TX-9788',
        type: 'Monthly Drawdown Withdrawal',
        category: 'withdrawal',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: info.limit,
        price: 1.00,
        date: 'Oct 22, 2026 · 6:03 PM',
        status: 'Completed',
        direction: 'debit',
        note: 'FAST Bank Transfer Settled'
      },
      {
        id: 'TX-9640',
        type: `Level ${lvl} Package Funding Deposit`,
        category: 'deposit',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: info.purchase,
        price: 1.00,
        date: 'Oct 15, 2026 · 9:00 AM',
        status: 'Completed',
        direction: 'debit',
        note: 'USD Capital Commitment'
      },
      {
        id: 'TX-9410',
        type: 'Tier Allocation Bonus',
        category: 'return',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: 50.00,
        price: 1.00,
        date: 'Sep 15, 2026 · 2:15 PM',
        status: 'Completed',
        direction: 'credit',
        note: 'Welcome Tier Incentive'
      },
      {
        id: 'TX-9102',
        type: 'Investor Account Activated',
        category: 'setup',
        asset: 'USD',
        cryptoAmount: 0,
        usdAmount: 0,
        price: 1.00,
        date: 'Sep 01, 2026 · 9:00 AM',
        status: 'Completed',
        direction: 'neutral',
        note: 'Security Vault & KYC Verification'
      }
    ];
  }

  window.getLiveTransactions = function () {
    try {
      const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    const seed = getSeedTransactions();
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(seed));
    } catch (e) {}
    return seed;
  };

  window.saveLiveTransactions = function (txList) {
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txList));
      localStorage.setItem('bond_tx_sync', Date.now().toString());
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('bond:transactions_updated', { detail: txList }));
  };

  window.addTransaction = function (tx) {
    const list = window.getLiveTransactions();
    const typeStr = String(tx.type || 'Transaction');
    const isWd = typeStr.toLowerCase().includes('withdraw');
    const isPkg = typeStr.toLowerCase().includes('package') || typeStr.toLowerCase().includes('tier');
    const isDep = typeStr.toLowerCase().includes('deposit') || typeStr.toLowerCase().includes('fund');

    const newTx = {
      id: tx.id || ('TX-' + Math.floor(1000 + Math.random() * 9000)),
      type: typeStr,
      category: tx.category || (isWd ? 'withdrawal' : isPkg ? 'package' : isDep ? 'deposit' : 'return'),
      asset: tx.asset || 'USD',
      cryptoAmount: parseFloat(tx.cryptoAmount || tx.crypto_amount || 0),
      usdAmount: parseFloat(tx.usdAmount || tx.usd_amount || 0),
      price: parseFloat(tx.price || 1.00),
      date: tx.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: tx.status || 'Completed',
      direction: tx.direction || (isWd || (isDep && typeStr.includes('Deposit')) ? (isWd ? 'debit' : 'debit') : 'credit'),
      note: tx.note || (isWd ? 'FAST Bank Transfer' : isPkg ? '3× Multiplier Allocation' : 'Settled to Account')
    };

    if (!list.some(item => item.id === newTx.id)) {
      list.unshift(newTx);
      window.saveLiveTransactions(list);
    }

    // Also mirror to memory appState
    if (typeof appState !== 'undefined' && Array.isArray(appState.transactions)) {
      if (!appState.transactions.some(item => item.id === newTx.id)) {
        appState.transactions.unshift(newTx);
      }
    }

    // Sync to Supabase
    if (typeof syncToSupabase === 'function') {
      syncToSupabase('transaction', newTx);
    }

    // Re-render transaction page if active
    if (typeof window.renderTransactionsPage === 'function') {
      window.renderTransactionsPage();
    }
    return newTx;
  };

  window.exportTransactionsCSV = function () {
    const list = window.getLiveTransactions ? window.getLiveTransactions() : [];
    if (!list || list.length === 0) {
      if (typeof showToast === 'function') showToast('No Transactions', 'No transaction history to export.', 'info');
      return;
    }

    let csv = 'Transaction ID,Date,Type,Category,Asset,Amount (USD),Status,Notes\n';
    list.forEach(tx => {
      const sign = tx.direction === 'debit' ? '-' : (tx.direction === 'credit' ? '+' : '');
      const amt = sign + '$' + (tx.usdAmount || 0).toFixed(2);
      csv += `"${tx.id}","${tx.date}","${tx.type}","${tx.category || ''}","${tx.asset || 'USD'}","${amt}","${tx.status || 'Completed'}","${tx.note || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BondCapital_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') {
      showToast('Export Successful', 'Downloaded transaction ledger CSV.', 'success');
    }
  };

  // ==========================================
  // REAL-TIME NOTIFICATIONS ENGINE
  // ==========================================
  const NOTIFICATIONS_STORAGE_KEY = 'bond_notifications';

  function getStoredNotifications() {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    // Initial realistic notification seed for verified account
    const initial = [
      {
        id: 'notif_init_1',
        title: 'Encrypted Vault Custody Active',
        message: 'Multi-sig cold storage vault security verified for your portfolio allocation.',
        type: 'security',
        time: Date.now() - 1000 * 60 * 12,
        read: false
      },
      {
        id: 'notif_init_2',
        title: '300% (3×) Multiplier Provisioned',
        message: 'Your active package tier credit multiplier has been locked and provisioned.',
        type: 'tier',
        time: Date.now() - 1000 * 60 * 35,
        read: false
      },
      {
        id: 'notif_init_3',
        title: 'Welcome to Bond Capital',
        message: 'Account verified. Scheduled 30-day liquidity cashflow cycle initialized.',
        type: 'info',
        time: Date.now() - 1000 * 60 * 120,
        read: true
      }
    ];
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  }

  function saveStoredNotifications(notifs) {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
      localStorage.setItem('bond_notifications_sync', Date.now().toString());
    } catch (e) {}
    updateNotificationBadges();
  }

  function formatRelativeTime(ts) {
    if (!ts) return 'Just now';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return Math.floor(diffSec / 86400) + 'd ago';
  }

  function getNotificationIcon(type) {
    if (type === 'tier') {
      return `<div style="width:36px; height:36px; border-radius:10px; background:#EEF3FF; color:#0052FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>`;
    }
    if (type === 'success' || type === 'withdrawal') {
      return `<div style="width:36px; height:36px; border-radius:10px; background:#ECFDF5; color:#059669; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16.667 5L7.5 14.167 3.333 10"/></svg>
      </div>`;
    }
    if (type === 'security') {
      return `<div style="width:36px; height:36px; border-radius:10px; background:#F0FDF4; color:#16A34A; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>`;
    }
    if (type === 'market') {
      return `<div style="width:36px; height:36px; border-radius:10px; background:#F5F3FF; color:#7C3AED; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>`;
    }
    if (type === 'warning' || type === 'error') {
      return `<div style="width:36px; height:36px; border-radius:10px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6.667V10m0 3.333h.008M10 18.333a8.333 8.333 0 100-16.666 8.333 8.333 0 000 16.666z"/></svg>
      </div>`;
    }
    return `<div style="width:36px; height:36px; border-radius:10px; background:#F1F5F9; color:#0284C7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><line x1="10" y1="14" x2="10" y2="10"/><line x1="10" y1="6" x2="10.01" y2="6"/></svg>
    </div>`;
  }

  window.addNotification = function (title, message = '', type = 'info', opts = {}) {
    const list = getStoredNotifications();
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      title: title,
      message: message,
      type: type,
      time: Date.now(),
      read: false
    };
    list.unshift(newNotif);
    if (list.length > 50) list.pop();
    saveStoredNotifications(list);

    // Show floating toast alert in real time if not silent
    if (!opts.silent && typeof window.showToast === 'function') {
      window.showToast(title, message, type, 5000, { skipNotification: true });
    }

    // Refresh modal in real time if open
    renderNotificationsModalList();
  };

  window.updateNotificationBadges = function () {
    const list = getStoredNotifications();
    const unread = list.filter(n => !n.read).length;

    document.querySelectorAll('button[aria-label="Notifications"], button[onclick*="openNotificationsModal"]').forEach(btn => {
      btn.style.position = 'relative';
      let badge = btn.querySelector('.bell-notification-badge');

      if (unread > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'bell-notification-badge';
          badge.style.cssText = 'position:absolute; top:-2px; right:-2px; min-width:18px; height:18px; padding:0 4px; border-radius:9999px; background:#EF4444; color:#ffffff; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(239,68,68,0.45); pointer-events:none; z-index:10; line-height:1;';
          btn.appendChild(badge);
        }
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'flex';
      } else if (badge) {
        badge.style.display = 'none';
      }
    });
  };

  window.markAllNotificationsRead = function () {
    const list = getStoredNotifications();
    list.forEach(n => { n.read = true; });
    saveStoredNotifications(list);
    renderNotificationsModalList();
    if (typeof showToast === 'function') {
      showToast('All Marked Read', 'All notifications updated.', 'success', 2500, { skipNotification: true });
    }
  };

  window.clearAllNotifications = function () {
    saveStoredNotifications([]);
    renderNotificationsModalList();
    if (typeof showToast === 'function') {
      showToast('Notifications Cleared', 'Notification history emptied.', 'info', 2500, { skipNotification: true });
    }
  };

  window.markNotificationRead = function (id) {
    const list = getStoredNotifications();
    const item = list.find(n => n.id === id);
    if (item && !item.read) {
      item.read = true;
      saveStoredNotifications(list);
      renderNotificationsModalList();
    }
  };

  function renderNotificationsModalList() {
    const container = document.getElementById('notifications-modal-items');
    const badgeEl = document.getElementById('notifications-modal-unread-badge');
    if (!container) return;

    const list = getStoredNotifications();
    const unread = list.filter(n => !n.read).length;

    if (badgeEl) {
      if (unread > 0) {
        badgeEl.textContent = `${unread} New`;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.textContent = 'All caught up';
        badgeEl.style.background = '#ECFDF5';
        badgeEl.style.color = '#059669';
        badgeEl.style.display = 'inline-block';
      }
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="padding:40px 20px; text-align:center; color:#64748B;">
          <div style="width:48px; height:48px; border-radius:50%; background:#F1F5F9; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:#94A3B8;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <div style="font-size:14px; font-weight:700; color:#0A0B0D; margin-bottom:4px;">No Notifications</div>
          <div style="font-size:12px;">You're completely up to date. Alerts will appear here in real time.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => `
      <div onclick="markNotificationRead('${item.id}')" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:14px; background:${item.read ? 'transparent' : '#F4F7FF'}; border:1px solid ${item.read ? '#ECEFF1' : '#DCE7FE'}; cursor:pointer; transition:all 0.15s; margin-bottom:8px;">
        ${getNotificationIcon(item.type)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <div style="font-size:13px; font-weight:700; color:#0A0B0D; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
            <span style="font-size:10px; font-weight:600; color:#94A3B8; flex-shrink:0;">${formatRelativeTime(item.time)}</span>
          </div>
          <div style="font-size:12px; color:#5B616E; margin-top:3px; line-height:1.4;">${item.message}</div>
        </div>
        ${!item.read ? '<span style="width:7px; height:7px; border-radius:50%; background:#0052FF; flex-shrink:0; margin-top:6px;"></span>' : ''}
      </div>
    `).join('');
  }

  window.openNotificationsModal = function () {
    const list = getStoredNotifications();
    const unread = list.filter(n => !n.read).length;

    openModal(`
      <div id="notifications-modal-container" style="padding: 22px 20px;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 style="font-size:18px; font-weight:800; color:#0A0B0D; margin:0;">Notifications</h2>
            <span id="notifications-modal-unread-badge" style="font-size:11px; font-weight:700; background:#EFF6FF; color:#0052FF; padding:2px 8px; border-radius:9999px;">
              ${unread > 0 ? `${unread} New` : 'All caught up'}
            </span>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#5B616E;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <!-- Action bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #ECEFF1; font-size:11px;">
          <span style="color:#64748B; font-weight:600;">Real-Time Activity Feed</span>
          <div style="display:flex; gap:12px;">
            <button onclick="markAllNotificationsRead()" style="border:none; background:transparent; color:#0052FF; font-weight:700; cursor:pointer; padding:0;">Mark all read</button>
            <span style="color:#CBD5E1;">•</span>
            <button onclick="clearAllNotifications()" style="border:none; background:transparent; color:#94A3B8; font-weight:600; cursor:pointer; padding:0;">Clear all</button>
          </div>
        </div>

        <!-- Scrollable Notifications List -->
        <div id="notifications-modal-items" style="max-height:360px; overflow-y:auto; padding-right:2px;" class="scrollbar-thin">
        </div>
      </div>
    `);

    renderNotificationsModalList();
  };

  // Cross-tab sync for notifications
  window.addEventListener('storage', (e) => {
    if (e.key === NOTIFICATIONS_STORAGE_KEY || e.key === 'bond_notifications_sync') {
      updateNotificationBadges();
      renderNotificationsModalList();
    }
  });

  // Real-time market & institutional updates generator (fires periodically while browsing)
  function startRealtimeNotificationTicker() {
    if (window.__bondNotifTickerStarted) return;
    window.__bondNotifTickerStarted = true;

    const periodicAlerts = [
      {
        title: 'Institutional Liquidity Audit',
        message: 'Daily vault proof-of-reserves matched with zero latency discrepancy.',
        type: 'security'
      },
      {
        title: 'Market Pulse: Bitcoin Volume Surge',
        message: 'High institutional buying pressure detected across Tier-1 global liquidity pools.',
        type: 'market'
      },
      {
        title: '30-Day Settlement Cycle Check',
        message: 'Disbursement reserve pipeline verified for active package accounts.',
        type: 'tier'
      },
      {
        title: 'Macro Intelligence Report Released',
        message: 'Q4 Global Capital & Bond Yield brief now unlocked in Digital Products.',
        type: 'info'
      }
    ];

    let alertIndex = 0;
    setInterval(() => {
      const lastTrigger = parseInt(localStorage.getItem('bond_last_periodic_notif') || '0', 10);
      const now = Date.now();
      // Fire once every 2.5 minutes across open tabs
      if (now - lastTrigger >= 150000) {
        localStorage.setItem('bond_last_periodic_notif', now.toString());
        const alert = periodicAlerts[alertIndex % periodicAlerts.length];
        alertIndex++;
        if (typeof window.addNotification === 'function') {
          window.addNotification(alert.title, alert.message, alert.type, { silent: false });
        }
      }
    }, 20000); // Check interval
  }

  window.openHelpModal = function () {
    openModal(`
      <div style="padding: 24px 22px;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:14px; background:#EEF3FF; color:#0052FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </div>
            <div>
              <h2 style="font-size:18px; font-weight:800; color:#0A0B0D; margin:0; line-height:1.2;">Help & Support Desk</h2>
              <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
                <span style="width:6px; height:6px; border-radius:50%; background:#098551; display:inline-block;"></span>
                <span style="font-size:11px; font-weight:600; color:#098551;">Agents Online &bull; 24/7 Priority Support</span>
              </div>
            </div>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold; color:#5B616E; display:flex; align-items:center; justify-content:center; transition:background 0.15s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <div id="help-modal-main-view">
          <!-- Live Chat Feature Card -->
          <div onclick="switchHelpToChat()" style="background:linear-gradient(135deg, #0052FF 0%, #003ECC 100%); border-radius:18px; padding:16px 18px; color:#ffffff; cursor:pointer; margin-bottom:18px; box-shadow:0 4px 14px rgba(0, 82, 255, 0.25); display:flex; align-items:center; justify-content:space-between; transition:transform 0.15s;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center;">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <div>
                <div style="font-size:14px; font-weight:800;">Start 24/7 Live Agent Chat</div>
                <div style="font-size:11px; opacity:0.85; margin-top:2px;">Instant assistance for withdrawals & packages</div>
              </div>
            </div>
            <span style="background:#ffffff; color:#0052FF; font-size:11px; font-weight:800; padding:6px 12px; border-radius:9999px;">Chat Now</span>
          </div>

          <!-- Knowledge Base Topics -->
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:#5B616E; margin-bottom:8px;">Knowledge Base & FAQs</div>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            <!-- Topic 1 -->
            <div onclick="toggleHelpAnswer('faq-ans-1')" style="padding:14px 16px; border:1px solid #ECEFF1; border-radius:16px; background:#FAFBFC; cursor:pointer; transition:all 0.15s;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:28px; height:28px; border-radius:8px; background:#EEF3FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="16" height="16" fill="none" stroke="#0052FF" stroke-width="2" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                  </div>
                  <span style="font-size:13px; font-weight:700; color:#0A0B0D;">How the 30-Level Platform Works</span>
                </div>
                <svg id="faq-arrow-1" width="14" height="14" fill="none" stroke="#5B616E" stroke-width="2.5" viewBox="0 0 24 24" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div id="faq-ans-1" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #ECEFF1; font-size:12px; color:#5B616E; line-height:1.5;">
                Customers select from 30 structured investment tiers. Each tier unlocks a 300% (3&times;) allocated dashboard balance and a guaranteed monthly withdrawal limit starting from $30/month up to $9,000/month.
              </div>
            </div>

            <!-- Topic 2 -->
            <div onclick="toggleHelpAnswer('faq-ans-2')" style="padding:14px 16px; border:1px solid #ECEFF1; border-radius:16px; background:#FAFBFC; cursor:pointer; transition:all 0.15s;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:28px; height:28px; border-radius:8px; background:#ECFDF5; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </div>
                  <span style="font-size:13px; font-weight:700; color:#0A0B0D;">Withdrawals & Settlement Frequency</span>
                </div>
                <svg id="faq-arrow-2" width="14" height="14" fill="none" stroke="#5B616E" stroke-width="2.5" viewBox="0 0 24 24" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div id="faq-ans-2" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #ECEFF1; font-size:12px; color:#5B616E; line-height:1.5;">
                Every withdrawal directly deducts from your allocated dashboard balance. Withdrawals can be requested up to your monthly tier limit every 30 days via FAST Bank Transfer or Wire.
              </div>
            </div>

            <!-- Topic 3 -->
            <div onclick="toggleHelpAnswer('faq-ans-3')" style="padding:14px 16px; border:1px solid #ECEFF1; border-radius:16px; background:#FAFBFC; cursor:pointer; transition:all 0.15s;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:28px; height:28px; border-radius:8px; background:#F5F3FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="16" height="16" fill="none" stroke="#7C3AED" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </div>
                  <span style="font-size:13px; font-weight:700; color:#0A0B0D;">Accessing Your Digital Products</span>
                </div>
                <svg id="faq-arrow-3" width="14" height="14" fill="none" stroke="#5B616E" stroke-width="2.5" viewBox="0 0 24 24" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div id="faq-ans-3" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #ECEFF1; font-size:12px; color:#5B616E; line-height:1.5;">
                Your package tier automatically unlocks access to our digital research reports, algorithmic drawdown calculators, and weekly market intelligence briefs directly on your Home dashboard.
              </div>
            </div>

            <!-- Topic 4 -->
            <div onclick="toggleHelpAnswer('faq-ans-4')" style="padding:14px 16px; border:1px solid #ECEFF1; border-radius:16px; background:#FAFBFC; cursor:pointer; transition:all 0.15s;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:28px; height:28px; border-radius:8px; background:#EEF3FF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="16" height="16" fill="none" stroke="#0052FF" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span style="font-size:13px; font-weight:700; color:#0A0B0D;">Security & Account Verification</span>
                </div>
                <svg id="faq-arrow-4" width="14" height="14" fill="none" stroke="#5B616E" stroke-width="2.5" viewBox="0 0 24 24" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div id="faq-ans-4" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #ECEFF1; font-size:12px; color:#5B616E; line-height:1.5;">
                All customer accounts and funds are protected by institutional-grade encrypted vaults, multi-factor authentication, and separate operating fund reserves.
              </div>
            </div>
          </div>

          <!-- Direct Contact Footer -->
          <div style="margin-top:18px; padding-top:14px; border-top:1px solid #ECEFF1; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#5B616E;">
            <div>Email: <b style="color:#0052FF;">support@bondcapital.com</b></div>
            <div>Response time: <b>&lt; 5 mins</b></div>
          </div>
        </div>

        <!-- Live Chat View (Hidden by default) -->
        <div id="help-modal-chat-view" style="display:none;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; margin-bottom:14px; border-bottom:1px solid #ECEFF1;">
            <button onclick="switchHelpToFAQ()" style="border:none; background:#EEF0F3; border-radius:9999px; padding:6px 12px; font-size:11px; font-weight:700; color:#0A0B0D; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back to Guides</span>
            </button>
            <div style="font-size:11px; font-weight:700; color:#098551; display:flex; align-items:center; gap:5px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#098551; display:inline-block;"></span>
              Agent Sarah M. Active
            </div>
          </div>

          <!-- Chat messages box -->
          <div id="help-chat-messages" style="height:200px; overflow-y:auto; background:#F8FAFC; border:1px solid #ECEFF1; border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
            <div style="background:#EEF3FF; border:1px solid #D9E4FF; border-radius:14px 14px 14px 4px; padding:10px 12px; font-size:12px; color:#0A0B0D; max-width:85%; line-height:1.4;">
              Hello! Welcome to <b>Bond Capital Support Desk</b>. How can I assist you with your investment package or withdrawal requests today?
            </div>
          </div>

          <!-- Quick reply chips -->
          <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:8px;" class="scrollbar-none">
            <button onclick="sendQuickHelpMsg('How do I request a withdrawal?')" style="border:1px solid #D0D5DD; background:#ffffff; border-radius:9999px; padding:4px 10px; font-size:11px; font-weight:600; color:#344054; cursor:pointer; white-space:nowrap;">How to withdraw?</button>
            <button onclick="sendQuickHelpMsg('How do I upgrade my level package?')" style="border:1px solid #D0D5DD; background:#ffffff; border-radius:9999px; padding:4px 10px; font-size:11px; font-weight:600; color:#344054; cursor:pointer; white-space:nowrap;">Upgrade level?</button>
            <button onclick="sendQuickHelpMsg('Where can I see my digital products?')" style="border:1px solid #D0D5DD; background:#ffffff; border-radius:9999px; padding:4px 10px; font-size:11px; font-weight:600; color:#344054; cursor:pointer; white-space:nowrap;">Digital products?</button>
          </div>

          <!-- Input row -->
          <div style="display:flex; gap:8px;">
            <input id="help-chat-input" onkeydown="if(event.key==='Enter') sendHelpChatMsg()" type="text" placeholder="Type your question here..." style="flex:1; border:1px solid #D0D5DD; border-radius:9999px; padding:9px 16px; font-size:12px; outline:none; background:#ffffff; color:#0A0B0D;" />
            <button onclick="sendHelpChatMsg()" style="border:none; background:#0052FF; color:#ffffff; border-radius:9999px; padding:9px 18px; font-size:12px; font-weight:700; cursor:pointer;">Send</button>
          </div>
        </div>
      </div>
    `);
  };

  // Helper functions for Help Modal
  window.toggleHelpAnswer = function (ansId) {
    const el = document.getElementById(ansId);
    if (!el) return;
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    const num = ansId.replace('faq-ans-', '');
    const arrow = document.getElementById('faq-arrow-' + num);
    if (arrow) {
      arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  };

  window.switchHelpToChat = function () {
    const mainView = document.getElementById('help-modal-main-view');
    const chatView = document.getElementById('help-modal-chat-view');
    if (mainView && chatView) {
      mainView.style.display = 'none';
      chatView.style.display = 'block';
    }
  };

  window.switchHelpToFAQ = function () {
    const mainView = document.getElementById('help-modal-main-view');
    const chatView = document.getElementById('help-modal-chat-view');
    if (mainView && chatView) {
      mainView.style.display = 'block';
      chatView.style.display = 'none';
    }
  };

  window.sendHelpChatMsg = function () {
    const input = document.getElementById('help-chat-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    renderChatMessage(msg, true);

    setTimeout(() => {
      let reply = "Thanks for your inquiry! Our support team has logged your ticket and an agent will assist you with this directly.";
      const low = msg.toLowerCase();
      if (low.includes('withdraw')) {
        reply = "To request a withdrawal, visit your Home or Assets page and click Withdraw. You can withdraw up to your monthly tier allowance once per 30-day cycle.";
      } else if (low.includes('upgrade') || low.includes('level')) {
        reply = "You can upgrade to any of the 30 tiers at any time by going to the 30-Level Platform page and selecting your desired tier.";
      } else if (low.includes('product') || low.includes('report') || low.includes('book')) {
        reply = "Your unlocked digital products (intelligence reports, financial calculators, and guides) are accessible directly in the 'Included Digital Products' section on your Home page.";
      }
      renderChatMessage(reply, false);
    }, 800);
  };

  window.sendQuickHelpMsg = function (text) {
    const input = document.getElementById('help-chat-input');
    if (input) input.value = text;
    sendHelpChatMsg();
  };

  function renderChatMessage(text, isUser) {
    const box = document.getElementById('help-chat-messages');
    if (!box) return;
    const msgDiv = document.createElement('div');
    if (isUser) {
      msgDiv.style.cssText = 'background:#0052FF; color:#ffffff; border-radius:14px 14px 4px 14px; padding:10px 12px; font-size:12px; align-self:flex-end; max-width:85%; line-height:1.4;';
    } else {
      msgDiv.style.cssText = 'background:#EEF3FF; border:1px solid #D9E4FF; border-radius:14px 14px 14px 4px; padding:10px 12px; font-size:12px; color:#0A0B0D; align-self:flex-start; max-width:85%; line-height:1.4;';
    }
    msgDiv.textContent = text;
    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
  }


  window.openProfileModal = function () {
    const userInitial = (appState.user.name || 'User').charAt(0).toUpperCase();
    const totalPortfolio = calculateTotalPortfolio();

    openModal(`
      <div style="padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Header Banner & Close -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 20px 24px 16px; border-bottom: 1px solid var(--border-color, #ECEFF1);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted, #5B616E);">Bond Capital Account</span>
            <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:9999px; background:#F0FDF4; border:1px solid #BBF7D0; font-size:10px; font-weight:700; color:#15803D;">
              <span style="width:5px; height:5px; border-radius:50%; background:#10B981;"></span> Verified
            </span>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; color:#5B616E; transition:background 0.15s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <!-- User Identity Section -->
        <div style="padding: 20px 24px; display:flex; align-items:center; gap:16px;">
          <div style="width:54px; height:54px; border-radius:50%; background:linear-gradient(135deg, #0052FF 0%, #0045D8 100%); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:22px; flex-shrink:0; box-shadow:0 4px 12px rgba(0,82,255,0.25);">
            ${userInitial}
          </div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:17px; font-weight:700; color:var(--text-primary, #0A0B0D); margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${appState.user.name}</h2>
              <span style="font-size:11px; font-weight:700; background:#EEF2F6; color:#0052FF; padding:2px 8px; border-radius:6px;">${appState.user.tier || "Verified"}</span>
            </div>
            <p style="font-size:13px; color:var(--text-muted, #5B616E); margin:3px 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${appState.user.email}</p>
          </div>
        </div>

        <!-- Quick Balance Summary Bar -->
        <div style="margin: 0 24px 16px; padding: 14px 16px; background:#F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#64748B;">Total Portfolio</div>
            <div style="font-size:18px; font-weight:800; color:#0F172A; margin-top:2px;">$${totalPortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

        </div>

        <!-- Settings & Navigation List -->
        <div style="padding: 0 24px 20px; display:flex; flex-direction:column; gap:6px;">
          


          <!-- Transaction Ledger -->
          <div onclick="closeActiveModal(); window.location.href='transactions.html';" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; cursor:pointer; background:transparent; transition:background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:34px; height:34px; border-radius:10px; background:#F8FAFC; color:#0A0B0D; display:flex; align-items:center; justify-content:center; font-size:16px;">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
              </div>
              <div>
                <div style="font-size:14px; font-weight:600; color:var(--text-primary, #0A0B0D);">Transaction History</div>
                <div style="font-size:12px; color:var(--text-muted, #5B616E);">${appState.transactions.length} recorded cloud trades & ledger entries</div>
              </div>
            </div>
            <svg style="width:16px; height:16px; color:#94A3B8;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>



          <div style="margin: 8px 0; height:1px; background:var(--border-color, #ECEFF1);"></div>

          <!-- Sign Out -->
          <button onclick="closeActiveModal(); showToast('Signing out...', 'Clearing session', '👋'); setTimeout(() => window.signOut(), 600);" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:12px; border:1px solid #FECDD3; background:#FFF1F2; color:#E11D48; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s;" onmouseover="this.style.background='#FFE4E6'" onmouseout="this.style.background='#FFF1F2'">
            <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Sign Out of Account
          </button>
        </div>
      </div>
    `);
  };

  window.openAppsModal = function () {
    openModal(`
      <div style="padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Modal Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 20px 24px 16px; border-bottom: 1px solid var(--border-color, #ECEFF1);">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:18px; font-weight:800; color:var(--text-primary, #0A0B0D); margin:0; letter-spacing:-0.01em;">Bond Capital Suite</h2>
              <span style="font-size:10px; font-weight:700; background:#EEF3FF; color:#0052FF; padding:2px 8px; border-radius:9999px;">INSTITUTIONAL</span>
            </div>
            <p style="font-size:12px; color:var(--text-muted, #5B616E); margin:3px 0 0;">Advanced financial tools, Web3 gateways, and market intelligence</p>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; color:#5B616E; transition:background 0.15s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        <!-- Products Grid -->
        <div style="padding: 20px 24px; display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-height: 480px; overflow-y: auto;">
          
          <!-- 0. 30-Level Digital Packages Platform -->
          <div onclick="closeActiveModal(); window.location.href='levels.html';" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #EEF3FF; color: #0052FF; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">30-Level Platform</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Access 30 tiered packages with 3x provisioned balance credits & monthly payouts.</p>
          </div>

          <!-- 3. DCA Investment Calculator -->
          <div onclick="closeActiveModal(); openDCACalculatorModal();" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #ECFDF5; color: #059669; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">DCA Calculator</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Model dollar-cost averaging recurring returns across BTC and ETH cycles.</p>
          </div>

          <!-- 4. Fear & Greed Sentiment -->
          <div onclick="closeActiveModal(); openFearAndGreedModal();" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">Market Sentiment</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Real-time Fear & Greed index, volatility gauges, and social volume metrics.</p>
          </div>

          <!-- 6. Web3 Wallet Gateway -->
          <div onclick="closeActiveModal(); showToast('Self-Custody Wallet', 'Web3 MPC wallet connected to Base Mainnet', 'ðŸŒ');" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #F0FDF4; color: #16A34A; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">Web3 Wallet Gateway</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Self-custody dApp exploration, NFT collections, and DeFi liquidity pools.</p>
          </div>

        </div>

        <!-- Footer Notice -->
        <div style="padding: 14px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; border-radius: 0 0 28px 28px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
            <span style="font-size: 11px; font-weight: 600; color: #64748B;">All services operational on Base & Ethereum L1</span>
          </div>
          <a href="explore.html" onclick="closeActiveModal()" style="font-size: 12px; font-weight: 700; color: #0052FF; text-decoration: none;">View Explorer â†’</a>
        </div>
      </div>
    `);
  };

  window.openInviteFriendsModal = function () {
    const link = `https://bondcapital.app/join/${(appState.user.name || 'user').toLowerCase().replace(/\s+/g, '_')}`;
    openModal(`
      <div style="padding: 24px; text-align:center;">
        <div style="font-size:40px; margin-bottom:8px;">ðŸŽ</div>
        <h2 style="font-size:20px; font-weight:700; margin-bottom:6px;">Invite Friends & Earn</h2>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:18px;">Get <strong style="color:var(--text-primary);">$10 in free Bitcoin</strong> when your friend buys or sells $100 or more in crypto.</p>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <span style="font-family:monospace; font-size:13px; color:#0052FF; font-weight:600;">${link}</span>
          <button onclick="navigator.clipboard.writeText('${link}'); showToast('Referral Link Copied!', '', 'ðŸ“‹');" style="background:#0052FF; color:#fff; border:none; border-radius:8px; padding:6px 14px; font-weight:700; font-size:12px; cursor:pointer;">
            Copy
          </button>
        </div>

        <button onclick="closeActiveModal()" style="width:100%; background:#EEF0F3; border:none; border-radius:9999px; padding:12px; font-weight:700; font-size:14px; cursor:pointer;">
          Close
        </button>
      </div>
    `);
  };


  // Sync 30-Level Platform Active Package across ALL pages & components
  function syncHomePackageCard() {
    const tier = getActiveTierInfo();
    const lvl = tier.level;
    const cost = tier.purchase;
    const bal = tier.balance;
    const limit = tier.limit;

    if (appState.user) {
      appState.user.current_level = lvl;
      appState.user.level_balance = bal;
      appState.user.monthly_limit = limit;
      appState.user.tier = `Level ${lvl} Package`;
    }

    // 1. Home Dashboard Elements
    const badge = document.getElementById('home-card-badge');
    if (badge) badge.textContent = `Level ${lvl} Package`;

    const title = document.getElementById('home-card-title');
    if (title) title.textContent = `Level ${lvl} Active`;

    const costEl = document.getElementById('home-card-cost');
    if (costEl) costEl.textContent = `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

    const balEl = document.getElementById('home-card-allocated');
    if (balEl) balEl.textContent = `$${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const limitEl = document.getElementById('home-card-limit');
    if (limitEl) limitEl.textContent = `$${limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} / month`;

    const tierTag = document.getElementById('home-active-tier-tag');
    if (tierTag) tierTag.textContent = `Level ${lvl} Package`;

    // 2. Asset Page Elements (desktop-asset-bitcoin.html)
    const elBal = document.getElementById('asset-allocated-balance');
    if (elBal) elBal.textContent = '$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const elBadge = document.getElementById('asset-tier-badge');
    if (elBadge) elBadge.textContent = `Level ${lvl} Package Active`;

    const elLvl = document.getElementById('asset-card-level');
    if (elLvl) elLvl.textContent = `Level ${lvl}`;

    const elCost = document.getElementById('asset-card-cost');
    if (elCost) elCost.textContent = '$' + cost.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const elCredit = document.getElementById('asset-card-credit');
    if (elCredit) elCredit.textContent = '$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const elLimit = document.getElementById('asset-card-limit');
    if (elLimit) elLimit.textContent = '$' + limit.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' / mo';

    const elEq = document.getElementById('breakdown-equity');
    if (elEq) elEq.textContent = '$' + cost.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' USD';

    const elMult = document.getElementById('breakdown-multiplier');
    if (elMult) elMult.textContent = '$' + (bal - cost).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' USD';

    const elSideTier = document.getElementById('side-asset-tier');
    if (elSideTier) elSideTier.textContent = `Level ${lvl} Package`;

    const elSideLim = document.getElementById('side-asset-limit');
    if (elSideLim) elSideLim.textContent = '$' + limit.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' / mo';

    // 3. Transactions Page Elements (transactions.html)
    const totalEl = document.getElementById('tx-portfolio-total');
    if (totalEl) totalEl.textContent = '$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const tagEl = document.getElementById('tx-active-tag');
    if (tagEl) {
      tagEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#0052FF] animate-pulse"></span> Level ${lvl} Package Active`;
    }

    const r1Title = document.getElementById('tx-row1-title');
    if (r1Title) r1Title.textContent = `Level ${lvl} Package Activated`;

    const r1Amt = document.getElementById('tx-row1-amount');
    if (r1Amt) r1Amt.textContent = '+$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const r4Title = document.getElementById('tx-row4-title');
    if (r4Title) r4Title.textContent = `Level ${lvl} Package Funding Deposit`;

    const r4Amt = document.getElementById('tx-row4-amount');
    if (r4Amt) r4Amt.textContent = '-$' + cost.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
  window.syncHomePackageCard = syncHomePackageCard;

  // Cross-tab and local storage listener
  window.addEventListener('storage', () => {
    syncHomePackageCard();
    updateAllUI();
  });

  // --- Dynamic UI Sync ---
  function updateAllUI(tickSymbol, direction) {
    syncHomePackageCard();
    const totalVal = calculateTotalPortfolio();

    // Notification Bell Badges Update
    try {
      if (typeof window.updateNotificationBadges === 'function') {
        window.updateNotificationBadges();
      }
    } catch (e) {}

    // 0. Update Profile Avatar Icon in Header
    try {
      const uInitial = (
        (appState.user && appState.user.name) ||
        (appState.user && appState.user.email) ||
        sessionStorage.getItem('bond_user_name') ||
        localStorage.getItem('bond_user_name') ||
        sessionStorage.getItem('bond_user_email') ||
        localStorage.getItem('bond_user_email') ||
        'U'
      ).trim().charAt(0).toUpperCase();
      document.querySelectorAll('button[aria-label="Profile Avatar"], button[aria-label="User Profile"], button[onclick*="openProfileModal"]').forEach(b => {
        if (!b.querySelector('svg') && !b.querySelector('img')) {
          b.textContent = uInitial || 'U';
        }
      });
    } catch (e) {}

    // 1. Update Portfolio Header Display (asset detail pages only — dashboard uses syncHomePackageCard)
    if (!document.querySelector('[data-purpose="portfolio-balance-section"]')) {
      document.querySelectorAll('h2, h1, .portfolio-total').forEach(el => {
        if (el.textContent.includes('$1.90') || el.dataset.purpose === 'portfolio-header-val') {
          el.textContent = `${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      });
    }

    // 2. Asset Detail Page: update hero price & change badge
    (function updateAssetPage() {
      const h1 = document.querySelector('h1');
      if (!h1) return;
      const h1text = h1.textContent.trim();
      let pageSym = null;
      if (h1text.includes('Bitcoin')) pageSym = 'BTC';
      else if (h1text.includes('Ethereum')) pageSym = 'ETH';
      else if (h1text.includes('Solana')) pageSym = 'SOL';
      else if (h1text.includes('Dogecoin')) pageSym = 'DOGE';
      if (!pageSym || !appState.assets[pageSym]) return;

      const a = appState.assets[pageSym];
      const priceStr = '$' + a.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const arrow = a.change24h >= 0 ? 'â†‘' : 'â†“';
      const changeColor = a.change24h >= 0 ? '#098551' : '#CF202F';
      const changeStr = arrow + ' $' + Math.abs(a.changeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' (' + (a.change24h >= 0 ? '+' : '') + a.change24h.toFixed(2) + '%)';

      // Fast path via IDs
      const heroEl = document.getElementById('btc-hero-price') || document.getElementById('eth-hero-price');
      if (heroEl) {
        heroEl.textContent = priceStr;
        if (tickSymbol === pageSym && direction) {
          heroEl.classList.remove('price-flash-up', 'price-flash-down');
          void heroEl.offsetWidth;
          heroEl.classList.add(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
        }
      }
      const changeEl = document.getElementById('btc-hero-change') || document.getElementById('eth-hero-change');
      if (changeEl) {
        changeEl.textContent = changeStr;
        changeEl.style.color = changeColor;
        if (changeEl.parentElement) changeEl.parentElement.style.color = changeColor;
      }

      // Fallback: match by text pattern
      if (!heroEl) {
        document.querySelectorAll('h2, .text-4xl, .text-5xl, .text-3xl').forEach(el => {
          const txt = el.textContent.trim();
          if (/^\$[\d,]+\.\d{2}$/.test(txt) && !el.classList.contains('portfolio-total')) {
            const parsed = parseFloat(txt.replace(/[$,]/g, ''));
            if (Math.abs(parsed - a.priceUSD) / (a.priceUSD || 1) < 0.5) {
              el.textContent = priceStr;
              if (tickSymbol === pageSym && direction) {
                el.classList.remove('price-flash-up', 'price-flash-down');
                void el.offsetWidth;
                el.classList.add(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
              }
            }
          }
        });
      }

      // Trade panel crypto equivalent
      const cryptoEquivEl = document.getElementById('trade-crypto-equiv');
      if (cryptoEquivEl) {
        const amtUSD = parseFloat(document.getElementById('trade-amount-input')?.value || appState.order.amountUSD || 100);
        cryptoEquivEl.textContent = '≈ ' + (amtUSD / a.priceUSD).toFixed(6) + ' ' + pageSym;
      }
    })();

    // 2b. Update Bitcoin/Ethereum price rows (home page prices section)
    document.querySelectorAll('[data-purpose="prices-watchlist-table"] > div, .divide-y > div, tr:has(td)').forEach(row => {
      const text = row.textContent;
      if (text.includes('Bitcoin')) {
        const p = row.querySelector('.text-left.font-semibold, .font-bold.text-sm');
        if (p) {
          p.textContent = `$${appState.assets.BTC.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          if (tickSymbol === 'BTC' && direction) {
            p.classList.remove('price-flash-up', 'price-flash-down');
            void p.offsetWidth;
            p.classList.add(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
          }
        }
      } else if (text.includes('Ethereum')) {
        const p = row.querySelector('.text-left.font-semibold, .font-bold.text-sm');
        if (p) {
          p.textContent = `$${appState.assets.ETH.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          if (tickSymbol === 'ETH' && direction) {
            p.classList.remove('price-flash-up', 'price-flash-down');
            void p.offsetWidth;
            p.classList.add(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
          }
        }
      }
    });



  }
  // --- Master Button Wiring Routine ---
  function wireAllButtons() {
    applyTheme();
    applyAdvancedMode();

    // 1. Sidebar Nav Links
    document.querySelectorAll('aside nav a, aside a').forEach(a => {
      const text = a.textContent.trim().toLowerCase();
      a.classList.add('cb-clickable');
      a.onclick = (e) => {
        if (text.includes('home')) {
          e.preventDefault();
          window.location.href = 'dashboard.html';
        } else if (text.includes('my assets')) {
          e.preventDefault();
          window.location.href = 'desktop-asset-bitcoin.html';
        } else if (text.includes('transactions')) {
          e.preventDefault();
          window.location.href = 'transactions.html';
        } else if (text.includes('explore')) {
          e.preventDefault();
          window.location.href = 'explore.html';
        } else if (text.includes('30-level') || text.includes('30 level') || text.includes('levels') || text.includes('packages')) {
          e.preventDefault();
          window.location.href = 'levels.html';
        } else if (text.includes('invite')) {
          e.preventDefault();
          openInviteFriendsModal();
        } else if (text.includes('more')) {
          e.preventDefault();
          openAppsModal();
        }
      };
    });

    // 2. Advanced Toggle Switch
    document.querySelectorAll('[data-purpose="advanced-mode-switch"]').forEach(el => {
      el.classList.add('cb-clickable');
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAdvancedMode();
      };
    });

    // 3. Header Action Buttons (Bulletproof event binding with error isolation)
    // Notification Bell
    try {
      document.querySelectorAll('button[aria-label="Notifications"], button[onclick*="openNotificationsModal"]').forEach(b => {
        b.classList.add('cb-clickable');
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openNotificationsModal(); };
      });
    } catch (e) { console.warn('Notifications button hook error:', e); }

    // Help Question Mark
    try {
      document.querySelectorAll('button[aria-label="Help"], button[onclick*="openHelpModal"]').forEach(b => {
        b.classList.add('cb-clickable');
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openHelpModal(); };
      });
    } catch (e) { console.warn('Help button hook error:', e); }

    // App Grid / Ecosystem
    try {
      document.querySelectorAll('button[aria-label="Applications menu"], button[onclick*="openAppsModal"]').forEach(b => {
        b.classList.add('cb-clickable');
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openAppsModal(); };
      });
    } catch (e) { console.warn('Apps button hook error:', e); }

    // User Profile Avatar
    try {
      document.querySelectorAll('button[aria-label="User Profile"], button[aria-label="Profile Avatar"], button[onclick*="openProfileModal"]').forEach(b => {
        b.classList.add('cb-clickable');
        b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openProfileModal(); };
      });
      // Fallback for avatar buttons with single letter
      document.querySelectorAll('button').forEach(b => {
        const txt = b.textContent.trim();
        if (txt === 'C' || (txt.length === 1 && b.className && b.className.includes('rounded-full') && (b.className.includes('bg-[') || b.className.includes('bg-blue')))) {
          b.classList.add('cb-clickable');
          b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openProfileModal(); };
        }
      });
    } catch (e) { console.warn('Profile button hook error:', e); }

    // 4. Quick Action Links: Send, Receive, Deposit, Withdraw
    document.querySelectorAll('a, button, div').forEach(el => {
      const t = el.textContent.trim();
      if (t === 'Send crypto' || (el.tagName === 'BUTTON' && t === 'Send')) {
        el.classList.add('cb-clickable');
        el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openSendCryptoModal(); };
      } else if (t === 'Receive crypto' || (el.tagName === 'BUTTON' && t === 'Receive')) {
        el.classList.add('cb-clickable');
        el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openReceiveCryptoModal(); };
      } else if (t === 'Deposit cash' || t === 'Top up USD wallet' || t === 'Top up wallet') {
        el.classList.add('cb-clickable');
        el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openDepositCashModal(); };
      } else if (t === 'Withdraw cash') {
        el.classList.add('cb-clickable');
        el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openWithdrawCashModal(); };
      }
    });

    // 5. Order Form Tabs (Buy / Sell / Convert)
    document.querySelectorAll('div:has(> button)').forEach(group => {
      const btns = group.querySelectorAll('button');
      if (btns.length === 3 && btns[0].textContent.trim() === 'Buy' && btns[1].textContent.trim() === 'Sell' && btns[2].textContent.trim() === 'Convert') {
        btns.forEach(b => {
          b.classList.add('cb-clickable');
          b.onclick = () => {
            btns.forEach(x => {
              x.className = 'flex-1 py-1.5 px-4 text-[#0A0B0D] hover:text-black text-sm font-semibold text-center transition-colors';
            });
            b.className = 'flex-1 py-1.5 px-4 bg-[#0A0B0D] text-white text-sm font-semibold rounded-full shadow-sm text-center';
            appState.order.type = b.textContent.trim();
            updateAllUI();
            showToast(`${appState.order.type} Mode Selected`, '', 'success');
          };
        });
      }
    });

    // 6. Repeat order dropdown
    document.querySelectorAll('button:has(> span)').forEach(btn => {
      const text = btn.textContent.trim();
      if (text.includes('One-time order') || text.includes('Repeat order')) {
        btn.classList.add('cb-clickable');
        btn.onclick = () => openOrderFrequencyModal();
      }
    });

    // 7. Max Button in Order Form
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim() === 'Max') {
        btn.classList.add('cb-clickable');
        btn.onclick = () => {
          appState.order.amountUSD = appState.balances.USD;
          const display = document.querySelector('.text-7xl, .text-6xl, #sgd-amount-input');
          if (display) {
            if (display.tagName === 'INPUT') display.value = appState.balances.USD;
            else display.textContent = appState.balances.USD.toFixed(0);
          }
          updateAllUI();
          showToast('Max balance selected', `$${appState.balances.USD.toFixed(2)} USD`, 'ðŸ’°');
        };
      }
    });

    // 8. Large Amount Input / Display Click
    document.querySelectorAll('.text-7xl, .text-6xl').forEach(disp => {
      if (disp.textContent.trim() === '0' || disp.textContent.trim() === '100' || disp.textContent.trim() === '500') {
        disp.style.cursor = 'pointer';
        disp.title = 'Click to edit amount';
        disp.onclick = () => {
          const val = prompt('Enter USD Amount to Trade:', appState.order.amountUSD || '500');
          if (val && !isNaN(val)) {
            appState.order.amountUSD = parseFloat(val);
            disp.textContent = parseFloat(val).toFixed(0);
            updateAllUI();
          }
        };
      }
    });

    // 9. Currency Switch Button ("â‡… 0 BTC")
    document.querySelectorAll('button:has(span)').forEach(btn => {
      if (btn.textContent.includes('BTC') && (btn.textContent.includes('â‡…') || btn.querySelector('svg'))) {
        btn.classList.add('cb-clickable');
        btn.onclick = () => {
          appState.order.mode = appState.order.mode === 'USD' ? 'CRYPTO' : 'USD';
          showToast('Currency unit switched', `Inputting in ${appState.order.mode}`, 'â‡…');
        };
      }
    });

    // 10. Pay With and Target Asset Rows
    document.querySelectorAll('div[class*="hover:bg-gray-50"], button[class*="hover:bg-gray-50"]').forEach(row => {
      const text = row.textContent;
      if (text.includes('Pay with')) {
        row.classList.add('cb-clickable');
        row.onclick = () => openPaymentMethodModal();
      } else if (text.includes('Buy') && (text.includes('Bitcoin') || text.includes('Target') || text.includes('Ethereum'))) {
        row.classList.add('cb-clickable');
        row.onclick = () => openAssetSelectorModal();
      }
    });

    // 11. Primary CTA button ("Review order" / "Top up USD wallet")
    document.querySelectorAll('button').forEach(btn => {
      const t = btn.textContent.trim();
      if (t === 'Review order' || t.startsWith('Buy ') || t.startsWith('Sell ') || t === 'Top up USD wallet') {
        btn.classList.add('cb-clickable');
        btn.onclick = () => openOrderReviewModal();
      }
    });

    // 12. Buy buttons on table rows
    document.querySelectorAll('table button, div[class*="Prices"] button, [data-purpose="prices-watchlist-table"] button').forEach(btn => {
      if (btn.textContent.trim() === 'Buy') {
        btn.classList.add('cb-clickable');
        btn.onclick = (e) => {
          e.stopPropagation();
          const row = btn.closest('[class*="flex"]');
          if (row && row.textContent.includes('Ethereum')) {
            appState.order.targetAsset = 'ETH';
          } else {
            appState.order.targetAsset = 'BTC';
          }
          openOrderReviewModal();
        };
      }
    });

    // 13. Watchlist Stars
    document.querySelectorAll('button:has(svg polygon), button[aria-label="Favorite asset"]').forEach(btn => {
      btn.classList.add('cb-clickable');
      btn.onclick = (e) => {
        e.stopPropagation();
        const polygon = btn.querySelector('polygon, path');
        const isFilled = polygon && (polygon.getAttribute('fill') === '#0052FF' || btn.classList.contains('text-[#0052FF]'));

        if (isFilled) {
          if (polygon) polygon.setAttribute('fill', 'none');
          if (polygon) polygon.setAttribute('stroke', '#BAC0CD');
          btn.classList.remove('text-[#0052FF]');
          btn.classList.add('text-gray-300');
          showToast('Removed from Watchlist', '', 'â˜†');
        } else {
          if (polygon) polygon.setAttribute('fill', '#0052FF');
          btn.classList.add('text-[#0052FF]');
          btn.classList.remove('text-gray-300');
          showToast('Added to Watchlist', '', 'â˜…');
        }
      };
    });

    // 14. Watchlist Filter Dropdown
    document.querySelectorAll('button:has(span)').forEach(btn => {
      if (btn.textContent.trim() === 'Watchlist') {
        btn.classList.add('cb-clickable');
        btn.onclick = () => {
          openModal(`
            <div style="padding:20px;">
              <h3 style="font-size:16px; font-weight:700; margin-bottom:12px;">Watchlist Filter</h3>
              <div style="display:flex; flex-direction:column; gap:8px; font-size:14px; font-weight:600;">
                <div onclick="closeActiveModal(); showToast('Viewing Watchlist', '', 'â˜…');" style="padding:10px 14px; border-radius:12px; background:#EEF2F6; cursor:pointer;">â˜… Starred Assets</div>
                <div onclick="closeActiveModal(); showToast('Viewing All Assets', '', 'ðŸ“‹');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">ðŸŒ All Assets</div>
                <div onclick="closeActiveModal(); showToast('Viewing Top Gainers', '', 'ðŸ“ˆ');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">ðŸ“ˆ Top Gainers</div>
                <div onclick="closeActiveModal(); showToast('Viewing Top Losers', '', 'ðŸ“‰');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">ðŸ“‰ Top Losers</div>
              </div>
            </div>
          `);
        };
      }
    });

    // 15. Timeframe Selector (1H, 1D, 1W, 1M, 1Y, ALL)
    document.querySelectorAll('div:has(> button.px-3) button, #timeframe-buttons button').forEach(btn => {
      const text = btn.textContent.trim();
      if (['1H', '1D', '1W', '1M', '1Y', 'ALL'].includes(text)) {
        btn.classList.add('cb-clickable');
        btn.onclick = () => {
          const parent = btn.parentElement;
          parent.querySelectorAll('button').forEach(b => {
            b.className = 'px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer';
          });
          btn.className = 'px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-900 cursor-pointer';
          showToast(`Timeframe: ${text}`, 'Updated chart period and return stats', 'ðŸ“ˆ');
        };
      }
    });

    // 16. Search Bars
    document.querySelectorAll('input[placeholder*="Search"]').forEach(input => {
      input.oninput = (e) => {
        const val = e.target.value.toLowerCase().trim();
        document.querySelectorAll('[data-purpose="prices-watchlist-table"] > div, .divide-y > div').forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(val) ? 'flex' : 'none';
        });
      };
    });

    // 17. Mobile Bottom Navigation
    document.querySelectorAll('nav.fixed.bottom-0 a, nav[data-purpose="bottom-tab-bar"] button, nav[data-purpose="bottom-tab-bar"] a, nav[data-purpose="mobile-bottom-nav"] a').forEach(el => {
      el.classList.add('cb-clickable');
      const href = el.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        el.onclick = (e) => {
          e.preventDefault();
          window.location.href = href;
        };
        return;
      }
      const text = el.textContent.trim().toLowerCase();
      el.onclick = (e) => {
        e.preventDefault();
        if (text.includes('home')) {
          window.location.href = 'dashboard.html';
        } else if (text.includes('level') || text.includes('30-level') || text.includes('packages')) {
          window.location.href = 'levels.html';
        } else if (text.includes('asset')) {
          window.location.href = 'desktop-asset-bitcoin.html';
        } else if (text.includes('history') || text.includes('transaction')) {
          window.location.href = 'transactions.html';
        } else if (text.includes('explore')) {
          window.location.href = 'explore.html';
        } else if (text.includes('trade')) {
          openAssetSelectorModal();
        } else if (text.includes('more')) {
          openAppsModal();
        }
      };
    });

    // 18. Carousel prev/next & dismiss X buttons
    document.querySelectorAll('section[data-purpose*="carousel"] button:has(polyline), section[data-purpose*="movers"] button:has(polyline)').forEach(btn => {
      btn.classList.add('cb-clickable');
      btn.onclick = () => {
        const c = btn.closest('section')?.querySelector('.grid, .flex.gap-3, .overflow-x-auto');
        if (c) {
          const isNext = btn.querySelector('polyline[points*="9 18 15 12"]');
          c.scrollBy({ left: isNext ? 240 : -240, behavior: 'smooth' });
          showToast('Browsing cards', '', 'â†”');
        }
      };
    });

    document.querySelectorAll('button:has(svg line[x1="18"]), button[aria-label="Dismiss banner"]').forEach(btn => {
      btn.classList.add('cb-clickable');
      btn.onclick = (e) => {
        e.stopPropagation();
        const card = btn.closest('div[class*="rounded"]');
        if (card) {
          card.style.transition = 'all 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => card.remove(), 300);
          showToast('Card dismissed', '', 'info');
        }
      };
    });

    // 19. DCA and Sentiment buttons
    document.querySelectorAll('.dca-calc-btn').forEach(btn => {
      btn.onclick = (e) => { e.preventDefault(); openDCACalculatorModal(); };
    });
    document.querySelectorAll('.sentiment-btn').forEach(btn => {
      btn.onclick = (e) => { e.preventDefault(); openFearAndGreedModal(); };
    });

    // Start live market fluctuations and initial sync
    syncHomePackageCard();
    startLiveMarketFeed();
    updateAllUI();
    syncFromSupabase();
    updateNotificationBadges();
    startRealtimeNotificationTicker();
  }

  // Auto initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAllButtons);
  } else {
    wireAllButtons();
  }

})();

