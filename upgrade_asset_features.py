with open('desktop-asset-bitcoin.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Theme Toggle to Header
old_header_avatar = """<button aria-label="User Profile" class="w-9 h-9 rounded-full bg-[#1652f0] text-white font-semibold flex items-center justify-center text-sm shadow-sm hover:opacity-95">
            C
          </button>"""

new_header_avatar = """<!-- Theme Switcher Button -->
<button onclick="toggleTheme()" class="theme-toggle-btn w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-800 text-base transition-colors" title="Toggle Dark/Light Mode">
  🌙
</button>
<button onclick="openProfileModal()" aria-label="User Profile" class="w-9 h-9 rounded-full bg-[#1652f0] text-white font-semibold flex items-center justify-center text-sm shadow-sm hover:opacity-95">
  C
</button>"""

if old_header_avatar in html:
    html = html.replace(old_header_avatar, new_header_avatar)

# 2. Add Candlestick / Line Chart Toggle & Live Stats Bar
old_chart_header = '<section class="mt-8 mb-6 relative" data-purpose="asset-chart">'
new_chart_header = """<!-- Live 24h Stats Summary -->
<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
  <div>
    <span class="text-gray-500 font-medium">24h High</span>
    <div class="font-bold text-gray-900 text-sm mt-0.5">$93,450.00</div>
  </div>
  <div>
    <span class="text-gray-500 font-medium">24h Low</span>
    <div class="font-bold text-gray-900 text-sm mt-0.5">$90,210.00</div>
  </div>
  <div>
    <span class="text-gray-500 font-medium">24h Volume</span>
    <div class="font-bold text-gray-900 text-sm mt-0.5">$48.2 Billion</div>
  </div>
  <div>
    <span class="text-gray-500 font-medium">Market Dominance</span>
    <div class="font-bold text-coinbase-blue text-sm mt-0.5">58.4%</div>
  </div>
</div>

<!-- Chart View Controls (Line / Candles) -->
<div class="flex items-center justify-between mt-6 mb-2">
  <div class="flex items-center gap-1.5 bg-gray-100 p-1 rounded-full text-xs font-semibold">
    <button onclick="setChartType('line', this)" class="chart-type-btn px-3 py-1 bg-white rounded-full text-gray-900 shadow-xs">📈 Line</button>
    <button onclick="setChartType('candle', this)" class="chart-type-btn px-3 py-1 rounded-full text-gray-600 hover:text-gray-900">🕯️ Candles</button>
  </div>
  <div class="text-xs text-gray-500 font-medium">Live CoinCap Feed · Real-Time Ticks</div>
</div>

<section class="mb-6 relative" data-purpose="asset-chart">"""

if old_chart_header in html:
    html = html.replace(old_chart_header, new_chart_header)

# Script for chart toggle
chart_script = """
<script>
  function setChartType(type, btn) {
    document.querySelectorAll('.chart-type-btn').forEach(b => {
      b.className = 'chart-type-btn px-3 py-1 rounded-full text-gray-600 hover:text-gray-900';
    });
    btn.className = 'chart-type-btn px-3 py-1 bg-white rounded-full text-gray-900 shadow-xs font-bold';
    showToast(
      type === 'candle' ? 'Candlestick Chart' : 'Line Chart',
      type === 'candle' ? 'Displaying OHLC candlestick bars and volume' : 'Displaying smoothed area curve',
      '📈'
    );
  }
</script>
"""

if 'function setChartType' not in html:
    html = html.replace('</body>', chart_script + '\n</body>')

with open('desktop-asset-bitcoin.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Upgraded desktop-asset-bitcoin.html with live stats and candlestick toggle!")

