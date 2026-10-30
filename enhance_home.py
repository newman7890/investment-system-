with open('desktop-home.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make search interactive
search_old = '<input class="w-full pl-10 pr-4 py-2.5 bg-[#EEF0F3] hover:bg-[#E2E5E9] focus:bg-white text-sm font-medium text-[#0A0B0D] placeholder-[#5B616E] rounded-full border border-transparent focus:border-coinbase-blue focus:ring-1 focus:ring-coinbase-blue transition-all" placeholder="Search for an asset" type="text"/>'
search_new = '<input id="asset-search-input" oninput="filterAssets(this.value)" class="w-full pl-10 pr-4 py-2.5 bg-[#EEF0F3] hover:bg-[#E2E5E9] focus:bg-white text-sm font-medium text-[#0A0B0D] placeholder-[#5B616E] rounded-full border border-transparent focus:border-coinbase-blue focus:ring-1 focus:ring-coinbase-blue transition-all" placeholder="Search for an asset" type="text"/>'
if search_old in content:
    content = content.replace(search_old, search_new)

# Add search filtering and quick top-up modal script
home_script = '''
<!-- Deposit Modal -->
<div id="deposit-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
  <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in duration-200">
    <div class="w-16 h-16 rounded-full bg-blue-50 text-coinbase-blue flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
      S$
    </div>
    <h3 class="text-xl font-bold text-gray-900 mb-1">Top up SGD Wallet</h3>
    <p class="text-sm text-gray-500 mb-6">Deposit funds instantly via PayNow or FAST bank transfer</p>
    
    <div class="bg-gray-50 rounded-2xl p-4 text-left space-y-3 mb-6 border border-gray-100 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Method</span>
        <span class="font-bold text-gray-900">FAST Transfer</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Current Balance</span>
        <span class="font-bold text-gray-900">S$0.00</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Processing Time</span>
        <span class="font-bold text-green-600">Instant</span>
      </div>
    </div>

    <div class="flex gap-3">
      <button onclick="document.getElementById('deposit-modal').classList.add('hidden')" class="flex-1 py-3 px-4 rounded-full border border-gray-200 hover:bg-gray-50 font-bold text-sm text-gray-700 transition-colors cursor-pointer">
        Close
      </button>
      <button onclick="alert('Virtual account details copied to clipboard!')" class="flex-1 py-3 px-4 rounded-full bg-coinbase-blue hover:bg-blue-700 font-bold text-sm text-white transition-colors cursor-pointer shadow-sm">
        Copy Account
      </button>
    </div>
  </div>
</div>

<script>
  function filterAssets(query) {
    const q = query.toLowerCase().trim();
    const rows = document.querySelectorAll('[data-purpose="prices-watchlist-table"] .space-y-2 > div');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  }

  // Hook Top up button
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim() === 'Top up SGD wallet') {
      btn.addEventListener('click', () => {
        document.getElementById('deposit-modal').classList.remove('hidden');
      });
    }
  });
</script>
'''

if '<!-- Deposit Modal -->' not in content:
    content = content.replace('</body>', home_script + '\n</body>')

with open('desktop-home.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Enhanced desktop-home.html with search and deposit modal")

