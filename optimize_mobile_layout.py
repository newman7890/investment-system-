with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Responsive sparkline on top balance
old_top_spark = '<div class="w-64 h-16 flex items-end">'
new_top_spark = '<div class="w-28 sm:w-64 h-14 sm:h-16 flex items-end shrink-0">'
content = content.replace(old_top_spark, new_top_spark)

# 2. Responsive Asset Breakdown Rows (Crypto & Cash)
old_crypto_staking = '<div class="text-left w-48">\n<span class="text-xs text-[#5B616E] font-medium block">Staking</span>\n<span class="text-sm font-semibold text-[#098551]">Earn up to 2.45% APY</span>\n</div>'
new_crypto_staking = '<div class="hidden sm:block text-left w-48 shrink-0">\n<span class="text-xs text-[#5B616E] font-medium block">Staking</span>\n<span class="text-sm font-semibold text-[#098551]">Earn up to 2.45% APY</span>\n</div>'
content = content.replace(old_crypto_staking, new_crypto_staking)

old_cash_earn = '<div class="text-left w-48">\n<span class="text-xs text-[#5B616E] font-medium block">Earn</span>\n<span class="text-sm font-semibold text-[#098551]">Earn up to 4.70% APY</span>\n</div>'
new_cash_earn = '<div class="hidden sm:block text-left w-48 shrink-0">\n<span class="text-xs text-[#5B616E] font-medium block">Earn</span>\n<span class="text-sm font-semibold text-[#098551]">Earn up to 4.70% APY</span>\n</div>'
content = content.replace(old_cash_earn, new_cash_earn)

# 3. Optimize Prices rows for mobile
# Bitcoin row
old_btc_row = """<!-- Bitcoin Row -->
<div onclick="window.location.href='desktop-asset-bitcoin.html'" title="Click to view Bitcoin details" class="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors hover:shadow-sm">
<!-- Coin icon & title -->
<div class="flex items-center gap-3.5 w-44">
<div class="w-9 h-9 rounded-full bg-[#F7931A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    ₿
                  </div>
<div>
<h5 class="font-bold text-[15px] text-[#0A0B0D] leading-tight">Bitcoin</h5>
<span class="text-xs font-semibold text-[#5B616E]">BTC</span>
</div>
</div>
<!-- Price -->
<div class="w-32 text-left font-semibold text-[15px] text-[#0A0B0D]">
                  $91,694.54
                </div>
<!-- Red Sparkline -->
<div class="w-24 h-6">
<svg class="w-full h-full" fill="none" viewbox="0 0 100 24">
<path d="M 0 4 Q 15 2, 25 10 T 50 18 T 75 14 T 100 22" fill="none" stroke="#CF202F" stroke-linecap="round" stroke-width="2"></path>
</svg>
</div>
<!-- 24h change -->
<div class="w-20 text-right text-sm font-semibold text-[#CF202F] flex items-center justify-end gap-1">
<span>↘</span>
<span>4.38%</span>
</div>
<!-- Buy Action Button -->
<div>
<button class="px-4 py-1.5 rounded-full text-[#0052FF] hover:bg-blue-50 font-bold text-sm transition-colors">
                    Buy
                  </button>
</div>
<!-- Star & Handle -->
<div class="flex items-center gap-3 text-[#5B616E]">"""

new_btc_row = """<!-- Bitcoin Row -->
<div onclick="window.location.href='desktop-asset-bitcoin.html'" title="Click to view Bitcoin details" class="flex items-center justify-between py-3 px-2 sm:px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors hover:shadow-sm gap-2">
<!-- Coin icon & title -->
<div class="flex items-center gap-2.5 sm:gap-3.5 w-auto sm:w-44 shrink-0">
<div class="w-9 h-9 rounded-full bg-[#F7931A] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                    ₿
                  </div>
<div>
<h5 class="font-bold text-sm sm:text-[15px] text-[#0A0B0D] leading-tight">Bitcoin</h5>
<span class="text-xs font-semibold text-[#5B616E]">BTC</span>
</div>
</div>
<!-- Sparkline -->
<div class="hidden sm:block w-20 md:w-24 h-6 shrink-0">
<svg class="w-full h-full" fill="none" viewbox="0 0 100 24">
<path d="M 0 4 Q 15 2, 25 10 T 50 18 T 75 14 T 100 22" fill="none" stroke="#CF202F" stroke-linecap="round" stroke-width="2"></path>
</svg>
</div>
<!-- Price & Change (Mobile-friendly stacked or desktop-aligned) -->
<div class="text-right sm:text-left sm:w-32 shrink-0">
  <div class="font-bold text-sm sm:text-[15px] text-[#0A0B0D] leading-tight">$91,694.54</div>
  <div class="sm:hidden text-xs font-semibold text-[#CF202F]">↘ 4.38%</div>
</div>
<!-- 24h change (Desktop) -->
<div class="hidden sm:flex w-20 text-right text-sm font-semibold text-[#CF202F] items-center justify-end gap-1 shrink-0">
<span>↘</span>
<span>4.38%</span>
</div>
<!-- Buy Action Button -->
<div class="shrink-0">
<button class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#0052FF] sm:bg-transparent text-white sm:text-[#0052FF] hover:bg-blue-600 sm:hover:bg-blue-50 font-bold text-xs sm:text-sm transition-colors shadow-xs sm:shadow-none">
                    Buy
                  </button>
</div>
<!-- Star & Handle (Desktop) -->
<div class="hidden md:flex items-center gap-3 text-[#5B616E] shrink-0">"""

content = content.replace(old_btc_row, new_btc_row)

# Ethereum row
old_eth_row = """<!-- Ethereum Row -->
<div class="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors">
<!-- Coin icon & title -->
<div class="flex items-center gap-3.5 w-44">
<div class="w-9 h-9 rounded-full bg-[#627EEA] text-white flex items-center justify-center font-bold text-base shadow-sm">
<svg class="w-5 h-5 fill-current" viewbox="0 0 32 32">
<path d="M16 2L6 17.5L16 22.5L26 17.5L16 2Z" fill-opacity="0.8"></path>
<path d="M16 23.5L6 18.5L16 31L26 18.5L16 23.5Z"></path>
</svg>
</div>
<div>
<h5 class="font-bold text-[15px] text-[#0A0B0D] leading-tight">Ethereum</h5>
<span class="text-xs font-semibold text-[#5B616E]">ETH</span>
</div>
</div>
<!-- Price -->
<div class="w-32 text-left font-semibold text-[15px] text-[#0A0B0D]">
                  $3,314.62
                </div>
<!-- Blue/Purple Sparkline -->
<div class="w-24 h-6">
<svg class="w-full h-full" fill="none" viewbox="0 0 100 24">
<path d="M 0 6 Q 18 4, 30 18 T 60 16 T 85 22 T 100 20" fill="none" stroke="#627EEA" stroke-linecap="round" stroke-width="2"></path>
</svg>
</div>
<!-- 24h change -->
<div class="w-20 text-right text-sm font-semibold text-[#CF202F] flex items-center justify-end gap-1">
<span>↘</span>
<span>5.46%</span>
</div>
<!-- Buy Action Button -->
<div>
<button class="px-4 py-1.5 rounded-full text-[#0052FF] hover:bg-blue-50 font-bold text-sm transition-colors">
                    Buy
                  </button>
</div>
<!-- Star & Handle -->
<div class="flex items-center gap-3 text-[#5B616E]">"""

new_eth_row = """<!-- Ethereum Row -->
<div class="flex items-center justify-between py-3 px-2 sm:px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors hover:shadow-sm gap-2">
<!-- Coin icon & title -->
<div class="flex items-center gap-2.5 sm:gap-3.5 w-auto sm:w-44 shrink-0">
<div class="w-9 h-9 rounded-full bg-[#627EEA] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
<svg class="w-5 h-5 fill-current" viewbox="0 0 32 32">
<path d="M16 2L6 17.5L16 22.5L26 17.5L16 2Z" fill-opacity="0.8"></path>
<path d="M16 23.5L6 18.5L16 31L26 18.5L16 23.5Z"></path>
</svg>
</div>
<div>
<h5 class="font-bold text-sm sm:text-[15px] text-[#0A0B0D] leading-tight">Ethereum</h5>
<span class="text-xs font-semibold text-[#5B616E]">ETH</span>
</div>
</div>
<!-- Sparkline -->
<div class="hidden sm:block w-20 md:w-24 h-6 shrink-0">
<svg class="w-full h-full" fill="none" viewbox="0 0 100 24">
<path d="M 0 6 Q 18 4, 30 18 T 60 16 T 85 22 T 100 20" fill="none" stroke="#627EEA" stroke-linecap="round" stroke-width="2"></path>
</svg>
</div>
<!-- Price & Change (Mobile-friendly stacked or desktop-aligned) -->
<div class="text-right sm:text-left sm:w-32 shrink-0">
  <div class="font-bold text-sm sm:text-[15px] text-[#0A0B0D] leading-tight">$3,314.62</div>
  <div class="sm:hidden text-xs font-semibold text-[#CF202F]">↘ 5.46%</div>
</div>
<!-- 24h change (Desktop) -->
<div class="hidden sm:flex w-20 text-right text-sm font-semibold text-[#CF202F] items-center justify-end gap-1 shrink-0">
<span>↘</span>
<span>5.46%</span>
</div>
<!-- Buy Action Button -->
<div class="shrink-0">
<button class="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#0052FF] sm:bg-transparent text-white sm:text-[#0052FF] hover:bg-blue-600 sm:hover:bg-blue-50 font-bold text-xs sm:text-sm transition-colors shadow-xs sm:shadow-none">
                    Buy
                  </button>
</div>
<!-- Star & Handle (Desktop) -->
<div class="hidden md:flex items-center gap-3 text-[#5B616E] shrink-0">"""

content = content.replace(old_eth_row, new_eth_row)

# 4. Hide desktop sticky footer on mobile since mobile has its own bottom navigation bar
content = content.replace(
    'footer class="h-14 bg-[#14151A] px-6 flex items-center justify-between text-white shrink-0 z-50" data-purpose="site-sticky-footer"',
    'footer class="hidden lg:flex h-14 bg-[#14151A] px-6 items-center justify-between text-white shrink-0 z-30" data-purpose="site-sticky-footer"'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Optimized layout for mobile in index.html")

