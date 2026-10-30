import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update viewport meta tag for mobile devices with safe-area
html = re.sub(
    r'<meta content="width=device-width, initial-scale=1.0" name="viewport"/>',
    r'<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"/>',
    html
)

# 2. Add mobile styles to <style>
mobile_css = """
    /* Mobile safe-area and responsive adjustments */
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    @media (max-width: 1023px) {
      body {
        padding-bottom: 70px;
      }
    }
"""
html = html.replace('/* Custom scrollbars */', mobile_css + '\n    /* Custom scrollbars */')

# 3. Make Desktop Left Sidebar hide on screens smaller than lg (1024px)
html = html.replace(
    'aside class="w-[232px] border-r border-[#ECEFF1] flex flex-col justify-between shrink-0 bg-white px-4 py-5"',
    'aside class="hidden lg:flex w-[232px] border-r border-[#ECEFF1] flex-col justify-between shrink-0 bg-white px-4 py-5 h-screen sticky top-0"'
)

# 4. Make Desktop Top Bar hide on mobile, and add Mobile Top Bar
desktop_header_target = '<header class="h-20 px-8 flex items-center justify-between shrink-0 bg-white" data-purpose="top-navigation-bar">'
mobile_header_html = """<!-- Mobile Top App Bar (Visible on mobile/tablet < 1024px) -->
<header class="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 py-3 border-b border-[#ECEFF1] flex items-center justify-between gap-3 shadow-xs">
  <div class="flex items-center gap-2">
    <div class="w-9 h-9 rounded-full bg-[#0052FF] flex items-center justify-center text-white font-bold text-lg shadow-sm">
      <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm0 14.8a4.8 4.8 0 110-9.6 4.8 4.8 0 010 9.6z"/>
      </svg>
    </div>
  </div>
  <div class="flex-1 relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M16.65 11a5.65 5.65 0 11-11.3 0 5.65 5.65 0 0111.3 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
    </div>
    <input oninput="filterAssets(this.value)" class="w-full bg-[#EEF0F3] text-sm text-gray-800 placeholder-gray-500 rounded-full pl-9 pr-3 py-1.5 border-none focus:ring-2 focus:ring-[#0052FF] focus:bg-white transition-all" placeholder="Search an asset" type="search"/>
  </div>
  <div class="flex items-center space-x-1">
    <button onclick="openNotificationsModal()" aria-label="Notifications" class="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative" type="button">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
      <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0052FF] rounded-full ring-2 ring-white"></span>
    </button>
    <button onclick="openProfileModal()" aria-label="Profile Avatar" class="w-8 h-8 rounded-full bg-[#2C6ECB] text-white flex items-center justify-center font-bold text-xs ml-1 shadow-sm" type="button">
      C
    </button>
  </div>
</header>

<!-- Desktop TopBar (Hidden on mobile) -->
<header class="hidden lg:flex h-20 px-8 items-center justify-between shrink-0 bg-white" data-purpose="top-navigation-bar">"""

html = html.replace(desktop_header_target, mobile_header_html)

# 5. Make Desktop Right Order Panel hide on screens smaller than xl (1280px)
html = html.replace(
    'aside class="w-[430px] border-l border-[#ECEFF1] px-8 py-4 shrink-0 flex flex-col justify-between" data-purpose="trade-order-card"',
    'aside class="hidden xl:flex w-[430px] border-l border-[#ECEFF1] px-8 py-4 shrink-0 flex-col justify-between" data-purpose="trade-order-card"'
)

# 6. Adjust main padding on mobile: from px-8 to px-4 sm:px-6 lg:px-8
html = html.replace(
    'div class="flex-1 px-8 pb-12 pt-2 overflow-x-hidden min-w-0"',
    'div class="flex-1 px-4 sm:px-6 lg:px-8 pb-12 pt-2 overflow-x-hidden min-w-0"'
)

# 7. Add Quick Action Pills for mobile right under the Portfolio balance section
mobile_pills = """<!-- Mobile Quick Action Pills (Visible on mobile/tablet < 1024px) -->
<section class="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-3 my-2" data-purpose="mobile-quick-actions">
  <button onclick="openOrderReviewModal()" class="flex items-center gap-1.5 px-4 py-2 bg-[#0052FF] text-white font-semibold text-xs rounded-full shadow-sm hover:bg-[#0045D8] whitespace-nowrap active:scale-95 transition-all">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
    Buy
  </button>
  <button onclick="openOrderReviewModal()" class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-xs rounded-full whitespace-nowrap active:scale-95 transition-all">Sell</button>
  <button onclick="openOrderReviewModal()" class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-xs rounded-full whitespace-nowrap active:scale-95 transition-all">Convert</button>
  <button onclick="openSendCryptoModal()" class="flex items-center gap-1 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-xs rounded-full whitespace-nowrap active:scale-95 transition-all">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
    Send
  </button>
  <button onclick="openReceiveCryptoModal()" class="flex items-center gap-1 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-xs rounded-full whitespace-nowrap active:scale-95 transition-all">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
    Receive
  </button>
</section>
"""

html = html.replace('<!-- END: PortfolioBalanceChart -->', '<!-- END: PortfolioBalanceChart -->\n' + mobile_pills)

# 8. Make promo cards grid responsive (1 col on mobile, 2 cols on tablet/desktop)
html = html.replace(
    'class="grid grid-cols-2 gap-4"',
    'class="grid grid-cols-1 sm:grid-cols-2 gap-4"'
)

# 9. Add Mobile Fixed Bottom Navigation Bar
mobile_bottom_nav = """<!-- Mobile Fixed Bottom Navigation Bar (Visible on mobile/tablet < 1024px) -->
<nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#ECEFF1] px-3 pt-2 pb-safe z-40 flex justify-around items-center text-[10px] font-semibold text-[#5B616E] shadow-lg" data-purpose="mobile-bottom-nav">
  <a class="flex flex-col items-center gap-1 text-[#0052FF] flex-1 text-center" href="index.html">
    <svg class="w-5 h-5 fill-[#0052FF]" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    <span>Home</span>
  </a>
  <a class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center" href="desktop-asset-bitcoin.html">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
    <span>Assets</span>
  </a>
  <a onclick="openAssetSelectorModal()" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>Trade</span>
  </a>
  <a onclick="showToast('Explore Cryptos', 'Browsing top trending tokens on Coinbase', '🔍')" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    <span>Explore</span>
  </a>
  <a onclick="openAppsModal()" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
    <span>More</span>
  </a>
</nav>
"""

html = html.replace('<!-- END: StickyFooter -->', '<!-- END: StickyFooter -->\n' + mobile_bottom_nav)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Successfully optimized index.html for mobile screen!")

