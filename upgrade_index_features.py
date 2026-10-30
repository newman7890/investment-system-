import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Dark Mode & Tools Buttons to Header
# Mobile Header
old_mobile_hdr_end = """    <button onclick="openProfileModal()" aria-label="Profile Avatar" class="w-8 h-8 rounded-full bg-[#2C6ECB] text-white flex items-center justify-center font-bold text-xs ml-1 shadow-sm" type="button">
      C
    </button>
  </div>
</header>"""

new_mobile_hdr_end = """    <button onclick="toggleTheme()" class="theme-toggle-btn p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-sm" title="Toggle Theme" type="button">
      🌙
    </button>
    <button onclick="openProfileModal()" aria-label="Profile Avatar" class="w-8 h-8 rounded-full bg-[#2C6ECB] text-white flex items-center justify-center font-bold text-xs ml-1 shadow-sm" type="button">
      C
    </button>
  </div>
</header>"""

if old_mobile_hdr_end in html:
    html = html.replace(old_mobile_hdr_end, new_mobile_hdr_end)

# Desktop Header
old_desktop_avatar = """<button class="w-10 h-10 rounded-full bg-[#2C6ECB] text-white flex items-center justify-center font-medium text-sm hover:opacity-90">
            C
          </button>"""

new_desktop_avatar = """<!-- DCA Calculator Quick Button -->
<button onclick="openDCACalculatorModal()" class="dca-calc-btn flex items-center gap-1.5 px-3.5 py-2 bg-[#EEF0F3] hover:bg-[#E2E5E9] rounded-full text-xs font-bold text-[#0A0B0D] transition-colors" title="Calculate Dollar Cost Averaging">
  <span>📊</span>
  <span>DCA Calc</span>
</button>
<!-- Market Sentiment Gauge Button -->
<button onclick="openFearAndGreedModal()" class="sentiment-btn flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold transition-colors" title="Fear & Greed Index">
  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
  <span>Greed 74</span>
</button>
<!-- Theme Switcher Button -->
<button onclick="toggleTheme()" class="theme-toggle-btn w-10 h-10 rounded-full bg-[#EEF0F3] hover:bg-[#E2E5E9] flex items-center justify-center text-[#0A0B0D] text-lg transition-colors" title="Toggle Dark/Light Mode">
  🌙
</button>
<button onclick="openProfileModal()" class="w-10 h-10 rounded-full bg-[#2C6ECB] text-white flex items-center justify-center font-medium text-sm hover:opacity-90">
  C
</button>"""

if old_desktop_avatar in html:
    html = html.replace(old_desktop_avatar, new_desktop_avatar, 1)

# 2. Add Live P&L and Asset Allocation Visualizer under Portfolio Balance Section
old_balance_h2 = '<h2 class="text-4xl font-semibold tracking-tight text-[#0A0B0D]">$1.90</h2>'
new_balance_h2 = """<div>
  <div class="flex items-baseline gap-3">
    <h2 class="portfolio-total text-4xl font-extrabold tracking-tight text-[#0A0B0D]">$28,750.40</h2>
    <span class="inline-flex items-center text-xs font-bold text-[#098551] bg-green-50 px-2 py-0.5 rounded-full">
      ▲ +$1,420.50 (+5.20%) Today
    </span>
  </div>
  <div class="text-xs text-[#5B616E] font-medium mt-1">Total Net Portfolio Valuation</div>
</div>"""

if old_balance_h2 in html:
    html = html.replace(old_balance_h2, new_balance_h2)

# Add Asset Allocation Visual Bar
allocation_bar = """<!-- Visual Asset Allocation Bar -->
<div class="mt-4 mb-2 p-4 bg-[#F5F8FF] rounded-2xl border border-[#ECEFF1]">
  <div class="flex items-center justify-between text-xs font-bold text-[#5B616E] mb-2">
    <span>Asset Allocation</span>
    <span class="text-[#0052FF] cursor-pointer hover:underline" onclick="openDCACalculatorModal()">Smart Rebalance</span>
  </div>
  <!-- Multi-color Segmented Progress Bar -->
  <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
    <div style="width: 48%;" class="bg-[#F7931A] h-full" title="Bitcoin: 48%"></div>
    <div style="width: 17%;" class="bg-[#627EEA] h-full" title="Ethereum: 17%"></div>
    <div style="width: 10%;" class="bg-[#14F195] h-full" title="Solana: 10%"></div>
    <div style="width: 25%;" class="bg-[#0052FF] h-full" title="USD Cash: 25%"></div>
  </div>
  <!-- Legend -->
  <div class="flex flex-wrap items-center gap-4 mt-2 text-[11px] font-semibold text-[#0A0B0D]">
    <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#F7931A]"></span> Bitcoin 48%</div>
    <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#627EEA]"></span> Ethereum 17%</div>
    <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#14F195]"></span> Solana 10%</div>
    <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#0052FF]"></span> USD Cash 25%</div>
  </div>
</div>"""

html = html.replace('<!-- Asset Breakdown Rows (Crypto & Cash) -->', allocation_bar + '\n<!-- Asset Breakdown Rows (Crypto & Cash) -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Upgraded index.html with live tools, theme toggle, and allocation visuals!")

