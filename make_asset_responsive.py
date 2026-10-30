import re

with open('desktop-asset-bitcoin.html', 'r', encoding='utf-8') as f:
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
if '.pb-safe' not in html:
    html = html.replace('.no-scrollbar {', mobile_css + '\n    .no-scrollbar {')

# 3. Make Desktop Left Sidebar hide on screens smaller than lg (1024px)
html = html.replace(
    'aside class="w-64 border-r border-gray-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-white select-none"',
    'aside class="hidden lg:flex w-64 border-r border-gray-200 flex-col justify-between shrink-0 h-screen sticky top-0 bg-white select-none"'
)

# 4. Make Desktop Top Bar responsive with back button for mobile
desktop_header_target = '<header class="h-20 border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">'
mobile_header_html = """<!-- Mobile Top App Bar (Visible on mobile/tablet < 1024px) -->
<header class="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-xs">
  <div class="flex items-center space-x-2.5">
    <button onclick="window.location.href='index.html'" aria-label="Go back" class="p-1 -ml-1 text-slate-700 hover:text-slate-900 transition-colors" type="button">
      <svg class="w-6 h-6 stroke-[2.25]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.75 19.5L8.25 12l7.5-7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="flex items-center space-x-1.5">
      <h1 class="text-xl font-bold tracking-tight text-slate-900">Bitcoin</h1>
      <button onclick="showToast('Added to Favorites', 'Bitcoin saved', '★')" aria-label="Favorite asset" class="text-coinbase-blue p-1 rounded-full" type="button">
        <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      </button>
    </div>
  </div>
  <div class="flex items-center space-x-2">
    <button onclick="openNotificationsModal()" class="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative" type="button">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
    </button>
    <button onclick="openProfileModal()" class="w-8 h-8 rounded-full bg-[#1652f0] text-white font-semibold flex items-center justify-center text-xs shadow-sm">C</button>
  </div>
</header>

<!-- Desktop TopBar (Hidden on mobile) -->
<header class="hidden lg:flex h-20 border-b border-gray-200 px-8 items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">"""

html = html.replace(desktop_header_target, mobile_header_html)

# 5. Make Right Trade Sidebar hide on screens smaller than xl (< 1280px)
html = html.replace(
    'aside class="w-[420px] p-8 flex flex-col shrink-0"',
    'aside class="hidden xl:flex w-[420px] p-8 flex-col shrink-0"'
)

# 6. Make main padding responsive: px-4 sm:px-6 lg:px-8
html = html.replace(
    'main class="flex-1 px-8 py-6 max-w-5xl border-r border-gray-200"',
    'main class="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl border-r border-gray-200 overflow-x-hidden"'
)

# 7. Add mobile trade button and mobile bottom bar
# (Trade button is placed in normal flow, NOT fixed/floating)
mobile_bottom_nav = """<!-- Mobile Fixed Bottom Navigation Bar -->
<nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#ECEFF1] px-3 pt-2 pb-safe z-40 flex justify-around items-center text-[10px] font-semibold text-[#5B616E] shadow-lg">
  <a class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center" href="index.html">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    <span>Home</span>
  </a>
  <a class="flex flex-col items-center gap-1 text-[#0052FF] flex-1 text-center" href="desktop-asset-bitcoin.html">
    <svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
    <span>Assets</span>
  </a>
  <a onclick="openAssetSelectorModal()" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
    <span>Trade</span>
  </a>
  <a onclick="showToast('Explore Cryptos', 'Browsing top trending tokens', '🔍')" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    <span>Explore</span>
  </a>
  <a onclick="openAppsModal()" class="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 flex-1 text-center cursor-pointer" href="#">
    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
    <span>More</span>
  </a>
</nav>
"""

html = html.replace('<!-- END: BottomDarkFooter -->', '<!-- END: BottomDarkFooter -->\n' + mobile_bottom_nav)

with open('desktop-asset-bitcoin.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Successfully optimized desktop-asset-bitcoin.html for mobile screen!")

