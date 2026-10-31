// Bond Capital Investment System - Complete Master Application Engine

(function () {
  'use strict';

  // --- Storage Key ---
  const STORAGE_KEY = 'coinbase_investment_system_v3';

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
    if (supabase && supabase.auth) {
      const u = supabase.auth.getUser ? null : null; // async checked below
    }
    return window.__currentUserId || 'usr_master_chris';
  }

  // Load user data strictly from Supabase database
  async function syncFromSupabase() {
    if (!supabase) return;
    try {
      // 0. Check authentic Supabase Auth session first
      if (supabase.auth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          window.__currentUserId = session.user.id;
          appState.user.email = session.user.email || appState.user.email;
          if (session.user.user_metadata && session.user.user_metadata.full_name) {
            appState.user.name = session.user.user_metadata.full_name;
          }
        }
      }

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
        if (profile.current_level !== undefined && profile.current_level !== null) appState.user.current_level = profile.current_level;
        if (profile.level_balance !== undefined && profile.level_balance !== null) appState.user.level_balance = parseFloat(profile.level_balance);
        if (profile.monthly_limit !== undefined && profile.monthly_limit !== null) appState.user.monthly_limit = parseFloat(profile.monthly_limit);
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
        appState.transactions = txList.map(t => ({
          id: t.id || ('TX-' + Math.floor(1000 + Math.random() * 9000)),
          type: t.type,
          asset: t.asset,
          cryptoAmount: parseFloat(t.crypto_amount || 0),
          usdAmount: parseFloat(t.usd_amount || 0),
          price: parseFloat(t.price || 0),
          date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'),
          status: t.status || 'Completed'
        }));
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
      tier: 'Level 3 Verified',
      current_level: 1,
      level_balance: 1500.00,
      monthly_limit: 30.00
    },
    balances: {
      USD: 10000.00,
      BTC: 0.15,
      ETH: 1.50,
      SOL: 12.00
    },
    assets: {
      BTC: { name: 'Bitcoin', symbol: 'BTC', priceUSD: 91864.73, change24h: -3.87, changeAmount: -3694.67, high24h: 93450.00, low24h: 90210.00, volume24h: '48.2B', marketCap: '1.81T', iconBg: '#F7931A', iconText: '₿' },
      ETH: { name: 'Ethereum', symbol: 'ETH', priceUSD: 3314.62, change24h: -5.46, changeAmount: -191.20, high24h: 3480.00, low24h: 3260.00, volume24h: '24.1B', marketCap: '398B', iconBg: '#627EEA', iconText: 'Ξ' },
      SOL: { name: 'Solana', symbol: 'SOL', priceUSD: 248.15, change24h: 3.12, changeAmount: 7.50, high24h: 254.00, low24h: 239.50, volume24h: '8.4B', marketCap: '116B', iconBg: '#14F195', iconText: '◎' },
      USDC: { name: 'USD Coin', symbol: 'USDC', priceUSD: 1.00, change24h: 0.01, changeAmount: 0.00, high24h: 1.001, low24h: 0.999, volume24h: '5.2B', marketCap: '35B', iconBg: '#2775CA', iconText: '$' },
      DOGE: { name: 'Dogecoin', symbol: 'DOGE', priceUSD: 0.22, change24h: 8.45, changeAmount: 0.02, high24h: 0.24, low24h: 0.19, volume24h: '3.1B', marketCap: '32B', iconBg: '#C2A633', iconText: 'Ð' }
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

  function calculateTotalPortfolio() {
    let total = appState.balances.USD;
    for (const sym in appState.assets) {
      const bal = appState.balances[sym] || 0;
      total += bal * appState.assets[sym].priceUSD;
    }
    return total;
  }

  // --- Theme Management ---
  window.toggleTheme = function () {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    syncToSupabase('settings');
    showToast(
      appState.theme === 'dark' ? 'Pro Dark Mode' : 'Classic Light Mode',
      `Switched to ${appState.theme} theme`,
      appState.theme === 'dark' ? '🌙' : '☀️'
    );
  };

  function applyTheme() {
    if (appState.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = appState.theme === 'dark' ? '☀️' : '🌙';
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
      '⚙️'
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

  window.showToast = function (title, message = '', icon = '✓') {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'cb-toast';
    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:28px; height:28px; border-radius:50%; background:#0052FF; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; shrink:0;">
          ${icon}
        </div>
        <div>
          <div style="font-weight:600; font-size:13px; color:#fff;">${title}</div>
          ${message ? `<div style="font-size:12px; color:#9BA2B0; margin-top:2px;">${message}</div>` : ''}
        </div>
      </div>
      <button style="background:none; border:none; color:#9BA2B0; cursor:pointer; font-size:16px; padding:4px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'cbFadeOut 0.25s forwards';
        setTimeout(() => toast.remove(), 250);
      }
    }, 3800);
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
      showToast('Invalid Amount', 'Please enter an amount greater than 0', '⚠️');
      return;
    }

    const cryptoQty = amountUSD / asset.priceUSD;

    if (action === 'Buy') {
      if (appState.balances.USD < amountUSD) {
        showToast('Insufficient Cash Balance', `Available: $${appState.balances.USD.toFixed(2)}. Please top up cash.`, '⚠️');
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
        `Successfully executed at $${asset.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        '✓'
      );

    } else if (action === 'Sell') {
      const currentCrypto = appState.balances[symbol] || 0;
      if (currentCrypto < cryptoQty) {
        showToast('Insufficient Crypto', `You own ${currentCrypto.toFixed(6)} ${symbol}, but tried to sell ${cryptoQty.toFixed(6)} ${symbol}`, '⚠️');
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
        `Received $${amountUSD.toFixed(2)} USD in wallet`,
        '✓'
      );
    }
  };

  // --- Live API & Real-Time Market Streaming Engine ---
  const API_STORAGE_KEY = 'coinbase_live_api_config';

  const defaultApiConfig = {
    provider: 'coinbase', // 'bondcapital' | 'binance' | 'coingecko' | 'coincap' | 'custom'
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
      connectCoinbaseWS();
    }
  }

  function connectCoinbaseWS() {
    apiConfig.activeProviderName = 'Bond Capital Exchange WS';
    try {
      const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
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
      const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
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
      ws.onerror = () => connectCoinbaseWS();
    } catch (e) {
      connectCoinbaseWS();
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
              ⚡
            </div>
            <div>
              <h2 style="font-size:18px; font-weight:700; margin:0;">Live API & Market Feed</h2>
              <p style="font-size:12px; color:var(--text-muted); margin:0;">Real-time WebSocket & REST Data Pipeline</p>
            </div>
          </div>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
        </div>

        <!-- Connection Status Banner -->
        <div style="padding:14px 16px; border-radius:16px; background:${isConnected ? '#F0FDF4' : '#FFFBEB'}; border:1px solid ${isConnected ? '#BBF7D0' : '#FDE68A'}; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:8px; height:8px; border-radius:50%; background:${isConnected ? '#10B981' : '#F59E0B'}; display:inline-block;"></span>
              <span style="font-weight:700; font-size:13px; color:${isConnected ? '#166534' : '#92400E'};">${isConnected ? 'Connected & Streaming Ticks' : 'Connecting to Stream...'}</span>
            </div>
            <div style="font-size:11px; color:${isConnected ? '#15803D' : '#B45309'}; margin-top:2px;">
              Provider: <b>${apiConfig.activeProviderName}</b> · Ticks: <b>${apiConfig.ticksReceived}</b> · Last: <b>${apiConfig.lastTickTime || 'Just now'}</b>
            </div>
          </div>
          <button onclick="connectLiveFeed(); showToast('Reconnecting...', 'Establishing real-time socket', '🔄');" style="padding:6px 12px; font-size:11px; font-weight:700; background:#fff; border:1px solid #D1D5DB; border-radius:9999px; cursor:pointer;">
            Reconnect
          </button>
        </div>

        <!-- Provider Selection -->
        <div style="margin-bottom:14px;">
          <label style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:6px;">Data Feed Provider</label>
          <select id="api-provider-select" style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid var(--border-color); background:var(--bg-secondary); font-size:14px; font-weight:600; outline:none;">
            <option value="coinbase" ${apiConfig.provider === 'coinbase' ? 'selected' : ''}>Bond Capital Exchange WebSocket (Official Spot Feed)</option>
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
            <button type="button" onclick="const input = document.getElementById('api-key-input'); input.type = input.type === 'password' ? 'text' : 'password';" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); border:none; background:transparent; cursor:pointer; font-size:14px;">👁️</button>
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
    const provider = document.getElementById('api-provider-select')?.value || 'coinbase';
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
      '⚡'
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
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
      showToast('Insufficient Balance', `You do not have ${amt} ${symbol} to send.`, '⚠️');
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
    showToast('Sent Successfully', `Transferred ${amt} ${symbol} to ${recipient.slice(0, 14)}...`, '✓');
  };

  window.openReceiveCryptoModal = function () {
    const asset = appState.assets[appState.order.targetAsset || 'BTC'];
    const walletAddr = appState.user && appState.user.wallet_address ? appState.user.wallet_address : 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

    openModal(`
      <div style="padding: 24px; text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h2 style="font-size:18px; font-weight:700;">Receive ${asset.name}</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
          <button onclick="navigator.clipboard.writeText('${walletAddr}'); showToast('Address Copied!', '', '📋');" style="background:#0052FF; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer;">
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
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
    showToast('Funds Deposited!', `Added $${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD to wallet.`, '💰');
  };

  window.openWithdrawCashModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h2 style="font-size:18px; font-weight:700;">Withdraw USD</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
      showToast('Invalid Amount', 'Withdrawal exceeds available USD balance.', '⚠️');
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
    showToast('Withdrawal Processed', `$${amt.toFixed(2)} USD transferred.`, '✓');
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
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
      showToast(`Selected ${appState.assets[sym].name}`, `Ready to trade ${sym}`, '✓');
    };
  };

  window.openPaymentMethodModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Payment Method</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
            <span style="color:#0052FF; font-weight:bold;">✓</span>
          </div>

          <div onclick="selectPaymentMethod('Chase Bank (•••• 4291)')" style="display:flex; align-items:center; justify-content:space-between; padding:14px; border:1px solid var(--border-color); border-radius:18px; cursor:pointer;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#117ACA; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px;">CHASE</div>
              <div>
                <div style="font-weight:700; font-size:14px;">JPMorgan Chase Bank</div>
                <div style="font-size:12px; color:var(--text-muted);">Account •••• 4291</div>
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
      showToast('Payment Method Selected', name, '✓');
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
          ${active ? '<span style="color:#0052FF; font-weight:bold;">✓</span>' : ''}
        </div>
      `;
    });

    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Repeat Order</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
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
      showToast('Order Frequency Set', f, '🔄');
    };
  };

  window.openNotificationsModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Notifications</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="background:var(--bg-secondary); border-left:4px solid #0052FF; padding:12px; border-radius:8px;">
            <div style="font-weight:700; font-size:13px; color:var(--text-primary);">Market Update: Bitcoin</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Bitcoin price is $${appState.assets.BTC.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}. 24h volume high.</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Live</div>
          </div>
          <div style="background:var(--bg-secondary); padding:12px; border-radius:8px;">
            <div style="font-weight:700; font-size:13px; color:var(--text-primary);">Zero Fee Trading Active</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Zero fees enabled across all crypto trades on your account.</div>
          </div>
        </div>

        <button onclick="closeActiveModal(); showToast('Notifications marked as read', '', '✓');" style="margin-top:16px; width:100%; background:#EEF0F3; border:none; border-radius:9999px; padding:10px; font-size:13px; font-weight:700; cursor:pointer;">
          Mark all as read
        </button>
      </div>
    `);
  };

  window.openHelpModal = function () {
    openModal(`
      <div style="padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:700;">Help & Support</h2>
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold;">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
          <div onclick="closeActiveModal(); showToast('Trading guide opened', '', 'ℹ');" style="padding:14px; border:1px solid var(--border-color); border-radius:14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <span style="font-weight:600;">How to buy and sell crypto</span>
            <span>→</span>
          </div>
          <div onclick="closeActiveModal(); showToast('Connecting to 24/7 Agent', '', '💬');" style="padding:14px; border:1px solid var(--border-color); border-radius:14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <span style="font-weight:600;">Chat with 24/7 Live Support</span>
            <span>💬</span>
          </div>
        </div>
      </div>
    `);
  };

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
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; color:#5B616E; transition:background 0.15s;">✕</button>
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
          <div style="text-align:right;">
            <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:#64748B;">Cash (USD)</div>
            <div style="font-size:15px; font-weight:700; color:#098551; margin-top:2px;">$${appState.balances.USD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <!-- Settings & Navigation List -->
        <div style="padding: 0 24px 20px; display:flex; flex-direction:column; gap:6px;">
          
          <!-- Manage Balances -->
          <div onclick="closeActiveModal(); openDepositCashModal();" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; cursor:pointer; background:transparent; transition:background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:34px; height:34px; border-radius:10px; background:#EFF6FF; color:#0052FF; display:flex; align-items:center; justify-content:center; font-size:16px;">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <div style="font-size:14px; font-weight:600; color:var(--text-primary, #0A0B0D);">Deposit / Top Up Cash</div>
                <div style="font-size:12px; color:var(--text-muted, #5B616E);">Add funds via wire, ACH, or instant transfer</div>
              </div>
            </div>
            <svg style="width:16px; height:16px; color:#94A3B8;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

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

          <!-- Live API Settings -->
          <div onclick="closeActiveModal(); openApiSettingsModal();" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; cursor:pointer; background:transparent; transition:background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:34px; height:34px; border-radius:10px; background:#ECFDF5; color:#059669; display:flex; align-items:center; justify-content:center; font-size:16px;">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <div style="font-size:14px; font-weight:600; color:var(--text-primary, #0A0B0D);">Live Market Feed & API</div>
                <div style="font-size:12px; color:var(--text-muted, #5B616E);">Bond Capital WebSocket & REST integration</div>
              </div>
            </div>
            <span style="font-size:11px; font-weight:700; color:#059669; background:#D1FAE5; padding:2px 8px; border-radius:9999px;">Active</span>
          </div>

          <!-- Theme Toggle -->
          <div onclick="toggleTheme();" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; cursor:pointer; background:transparent; transition:background 0.15s;" onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:34px; height:34px; border-radius:10px; background:#FFFBEB; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:16px;">
                <svg style="width:18px; height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <div style="font-size:14px; font-weight:600; color:var(--text-primary, #0A0B0D);">Appearance</div>
                <div style="font-size:12px; color:var(--text-muted, #5B616E);">Currently in ${appState.theme === 'dark' ? 'Pro Dark' : 'Classic Light'} mode</div>
              </div>
            </div>
            <span style="font-size:12px; font-weight:700; color:#0052FF;">Switch</span>
          </div>

          <div style="margin: 8px 0; height:1px; background:var(--border-color, #ECEFF1);"></div>

          <!-- Sign Out -->
          <button onclick="closeActiveModal(); if (supabase && supabase.auth) supabase.auth.signOut(); showToast('Signed out', 'Session finished', '👋'); setTimeout(() => { window.location.href = 'login.html'; }, 600);" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:12px; border:1px solid #FECDD3; background:#FFF1F2; color:#E11D48; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s;" onmouseover="this.style.background='#FFE4E6'" onmouseout="this.style.background='#FFF1F2'">
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
          <button onclick="closeActiveModal()" style="border:none; background:#EEF0F3; border-radius:50%; width:32px; height:32px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; color:#5B616E; transition:background 0.15s;">✕</button>
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

          <!-- 1. Perpetuals Trading -->
          <div onclick="closeActiveModal(); window.location.href='perpetuals.html';" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #EEF3FF; color: #0052FF; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">Perpetuals Trading</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Trade crypto futures with up to 10x leverage and sub-second execution.</p>
          </div>

          <!-- 2. Bond Capital Elite -->
          <div onclick="closeActiveModal(); window.location.href='coinbase-one.html';" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #F8FAFC; color: #0A0B0D; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">Bond Capital Elite</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Zero trading fees, $1M protection guarantee, and priority 24/7 support.</p>
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

          <!-- 5. Learning Rewards -->
          <div onclick="closeActiveModal(); window.location.href='learning-rewards.html';" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #F3E8FF; color: #7C3AED; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0A0B0D; margin-bottom: 3px;">Learning Rewards</div>
            <p style="font-size: 11px; color: #5B616E; line-height: 1.4; margin: 0;">Complete interactive protocol modules and earn free crypto rewards.</p>
          </div>

          <!-- 6. Web3 Wallet Gateway -->
          <div onclick="closeActiveModal(); showToast('Self-Custody Wallet', 'Web3 MPC wallet connected to Base Mainnet', '🌐');" style="padding: 16px; border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#0052FF'; this.style.boxShadow='0 4px 14px rgba(0,82,255,0.08)';" onmouseout="this.style.borderColor='#E2E8F0'; this.style.boxShadow='none';">
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
          <a href="explore.html" onclick="closeActiveModal()" style="font-size: 12px; font-weight: 700; color: #0052FF; text-decoration: none;">View Explorer →</a>
        </div>
      </div>
    `);
  };

  window.openInviteFriendsModal = function () {
    const link = `https://bondcapital.app/join/${(appState.user.name || 'user').toLowerCase().replace(/\s+/g, '_')}`;
    openModal(`
      <div style="padding: 24px; text-align:center;">
        <div style="font-size:40px; margin-bottom:8px;">🎁</div>
        <h2 style="font-size:20px; font-weight:700; margin-bottom:6px;">Invite Friends & Earn</h2>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:18px;">Get <strong style="color:var(--text-primary);">$10 in free Bitcoin</strong> when your friend buys or sells $100 or more in crypto.</p>

        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <span style="font-family:monospace; font-size:13px; color:#0052FF; font-weight:600;">${link}</span>
          <button onclick="navigator.clipboard.writeText('${link}'); showToast('Referral Link Copied!', '', '📋');" style="background:#0052FF; color:#fff; border:none; border-radius:8px; padding:6px 14px; font-weight:700; font-size:12px; cursor:pointer;">
            Copy
          </button>
        </div>

        <button onclick="closeActiveModal()" style="width:100%; background:#EEF0F3; border:none; border-radius:9999px; padding:12px; font-weight:700; font-size:14px; cursor:pointer;">
          Close
        </button>
      </div>
    `);
  };

  // --- Dynamic UI Sync ---
  function updateAllUI(tickSymbol, direction) {
    const totalVal = calculateTotalPortfolio();

    // 1. Update Portfolio Header Display
    document.querySelectorAll('h2, h1, .portfolio-total').forEach(el => {
      if (el.textContent.includes('$1.90') || el.classList.contains('portfolio-total') || el.dataset.purpose === 'portfolio-header-val') {
        el.textContent = `$${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    });

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
      const arrow = a.change24h >= 0 ? '↑' : '↓';
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
          window.location.href = 'index.html';
        } else if (text.includes('my assets')) {
          e.preventDefault();
          window.location.href = 'desktop-asset-bitcoin.html';
        } else if (text.includes('transactions')) {
          e.preventDefault();
          window.location.href = 'transactions.html';
        } else if (text.includes('explore')) {
          e.preventDefault();
          window.location.href = 'explore.html';
        } else if (text.includes('perpetuals')) {
          e.preventDefault();
          window.location.href = 'perpetuals.html';
        } else if (text.includes('learning')) {
          e.preventDefault();
          window.location.href = 'learning-rewards.html';
        } else if (text.includes('bond capital elite') || text.includes('elite') || text.includes('bondcapital')) {
          e.preventDefault();
          window.location.href = 'coinbase-one.html';
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

    // 3. Header Action Buttons
    // Notification Bell
    document.querySelectorAll('button:has(svg path[d*="M18 8A6 6 0"]), button[aria-label="Notifications"], button:has(svg path[d*="M15 17h5"])').forEach(b => {
      b.classList.add('cb-clickable');
      b.onclick = (e) => { e.stopPropagation(); openNotificationsModal(); };
    });

    // Help Question Mark
    document.querySelectorAll('button:has(svg path[d*="M9.09 9a3 3"]), button[aria-label="Help"]').forEach(b => {
      b.classList.add('cb-clickable');
      b.onclick = (e) => { e.stopPropagation(); openHelpModal(); };
    });

    // App Grid
    document.querySelectorAll('button:has(svg circle[cx="5"]), button[aria-label="Applications menu"]').forEach(b => {
      b.classList.add('cb-clickable');
      b.onclick = (e) => { e.stopPropagation(); openAppsModal(); };
    });

    // User Profile Avatar
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.trim() === 'C' || b.getAttribute('aria-label') === 'User Profile' || b.getAttribute('aria-label') === 'Profile Avatar') {
        b.classList.add('cb-clickable');
        b.onclick = (e) => { e.stopPropagation(); openProfileModal(); };
      }
    });

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
            showToast(`${appState.order.type} Mode Selected`, '', '✓');
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
          showToast('Max balance selected', `$${appState.balances.USD.toFixed(2)} USD`, '💰');
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

    // 9. Currency Switch Button ("⇅ 0 BTC")
    document.querySelectorAll('button:has(span)').forEach(btn => {
      if (btn.textContent.includes('BTC') && (btn.textContent.includes('⇅') || btn.querySelector('svg'))) {
        btn.classList.add('cb-clickable');
        btn.onclick = () => {
          appState.order.mode = appState.order.mode === 'USD' ? 'CRYPTO' : 'USD';
          showToast('Currency unit switched', `Inputting in ${appState.order.mode}`, '⇅');
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
        const isFilled = polygon && (polygon.getAttribute('fill') === '#0052FF' || btn.classList.contains('text-coinbase-blue'));

        if (isFilled) {
          if (polygon) polygon.setAttribute('fill', 'none');
          if (polygon) polygon.setAttribute('stroke', '#BAC0CD');
          btn.classList.remove('text-coinbase-blue');
          btn.classList.add('text-gray-300');
          showToast('Removed from Watchlist', '', '☆');
        } else {
          if (polygon) polygon.setAttribute('fill', '#0052FF');
          btn.classList.add('text-coinbase-blue');
          btn.classList.remove('text-gray-300');
          showToast('Added to Watchlist', '', '★');
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
                <div onclick="closeActiveModal(); showToast('Viewing Watchlist', '', '★');" style="padding:10px 14px; border-radius:12px; background:#EEF2F6; cursor:pointer;">★ Starred Assets</div>
                <div onclick="closeActiveModal(); showToast('Viewing All Assets', '', '📋');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">🌐 All Assets</div>
                <div onclick="closeActiveModal(); showToast('Viewing Top Gainers', '', '📈');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">📈 Top Gainers</div>
                <div onclick="closeActiveModal(); showToast('Viewing Top Losers', '', '📉');" style="padding:10px 14px; border-radius:12px; cursor:pointer;">📉 Top Losers</div>
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
          showToast(`Timeframe: ${text}`, 'Updated chart period and return stats', '📈');
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
    document.querySelectorAll('nav.fixed.bottom-0 a, nav[data-purpose="bottom-tab-bar"] button, nav[data-purpose="mobile-bottom-nav"] a').forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      el.classList.add('cb-clickable');
      el.onclick = (e) => {
        e.preventDefault();
        if (text.includes('home')) {
          window.location.href = 'index.html';
        } else if (text.includes('asset')) {
          window.location.href = 'desktop-asset-bitcoin.html';
        } else if (text.includes('trade')) {
          openAssetSelectorModal();
        } else if (text.includes('explore')) {
          showToast('Explore Cryptos', 'Browsing top trending tokens on Bond Capital', '🔍');
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
          showToast('Browsing cards', '', '↔');
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
          showToast('Card dismissed', '', '✕');
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
    startLiveMarketFeed();
    updateAllUI();
    syncFromSupabase();
  }

  // Auto initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAllButtons);
  } else {
    wireAllButtons();
  }

})();
