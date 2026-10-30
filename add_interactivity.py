import os

def enhance_desktop_asset():
    with open('desktop-asset-bitcoin.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Enhance timeframe buttons with data attributes and ids
    old_timeframes = '''<div class="flex items-center gap-1">
<button class="px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900">1H</button>
<button class="px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-900">1D</button>
<button class="px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900">1W</button>
<button class="px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900">1M</button>
<button class="px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900">1Y</button>
<button class="px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900">ALL</button>
</div>'''

    new_timeframes = '''<div class="flex items-center gap-1" id="timeframe-buttons">
<button onclick="selectTimeframe(this, '1H', '-1.12%', 'S$1,042.10')" class="tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer">1H</button>
<button onclick="selectTimeframe(this, '1D', '-3.87%', 'S$3,694.67')" class="tf-btn px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-900 cursor-pointer">1D</button>
<button onclick="selectTimeframe(this, '1W', '+5.24%', 'S$4,520.30')" class="tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer">1W</button>
<button onclick="selectTimeframe(this, '1M', '+12.80%', 'S$10,410.50')" class="tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer">1M</button>
<button onclick="selectTimeframe(this, '1Y', '+142.15%', 'S$53,800.00')" class="tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer">1Y</button>
<button onclick="selectTimeframe(this, 'ALL', '+820.40%', 'S$81,500.00')" class="tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer">ALL</button>
</div>'''

    if old_timeframes in content:
        content = content.replace(old_timeframes, new_timeframes)

    # Make Order Amount interactive with an input field
    old_amount = '''<div class="flex items-center justify-between mb-4">
<div class="flex items-baseline">
<span class="text-7xl font-bold tracking-tight text-gray-900 leading-none">0</span>
<span class="text-6xl font-light text-gray-300 ml-2 tracking-tight">SGD</span>
</div>
<button class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 rounded-full transition-colors">
                Max
              </button>
</div>'''

    new_amount = '''<div class="flex items-center justify-between mb-4">
<div class="flex items-baseline flex-1">
  <input type="number" id="sgd-amount-input" value="100" min="0" step="10" class="text-6xl font-bold tracking-tight text-gray-900 leading-none w-48 border-b-2 border-transparent focus:border-blue-600 focus:outline-none p-0 bg-transparent" placeholder="0"/>
  <span class="text-5xl font-light text-gray-400 ml-2 tracking-tight">SGD</span>
</div>
<button id="max-btn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 rounded-full transition-colors cursor-pointer">
  Max
</button>
</div>'''

    if old_amount in content:
        content = content.replace(old_amount, new_amount)

    # Order Tabs
    old_tabs = '''<div class="flex items-center gap-1.5 mb-6">
<button class="px-5 py-2 text-sm font-semibold rounded-full bg-black text-white shadow-sm">
                Buy
              </button>
<button class="px-5 py-2 text-sm font-semibold rounded-full text-gray-700 hover:bg-gray-100 transition-colors">
                Sell
              </button>
<button class="px-5 py-2 text-sm font-semibold rounded-full text-gray-700 hover:bg-gray-100 transition-colors">
                Convert
              </button>
</div>'''

    new_tabs = '''<div class="flex items-center gap-1.5 mb-6" id="trade-action-tabs">
<button onclick="setTradeTab(this, 'Buy')" class="trade-tab px-5 py-2 text-sm font-semibold rounded-full bg-black text-white shadow-sm cursor-pointer">
  Buy
</button>
<button onclick="setTradeTab(this, 'Sell')" class="trade-tab px-5 py-2 text-sm font-semibold rounded-full text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
  Sell
</button>
<button onclick="setTradeTab(this, 'Convert')" class="trade-tab px-5 py-2 text-sm font-semibold rounded-full text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
  Convert
</button>
</div>'''

    if old_tabs in content:
        content = content.replace(old_tabs, new_tabs)

    # Review Order button
    old_review_btn = '<button class="w-full py-4 rounded-full bg-[#8aa8f8] hover:bg-coinbase-blue text-white font-semibold text-sm flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer">'
    new_review_btn = '<button onclick="showOrderModal()" id="review-order-btn" class="w-full py-4 rounded-full bg-coinbase-blue hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer">'

    if old_review_btn in content:
        content = content.replace(old_review_btn, new_review_btn)

    # Script for interactive logic + modal
    interactive_script = '''
<!-- Interactive Modal for Orders -->
<div id="order-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
  <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in duration-200">
    <div class="w-16 h-16 rounded-full bg-blue-50 text-coinbase-blue flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
      ₿
    </div>
    <h3 class="text-xl font-bold text-gray-900 mb-1" id="modal-title">Confirm Order</h3>
    <p class="text-sm text-gray-500 mb-6" id="modal-desc">Review your order details below</p>
    
    <div class="bg-gray-50 rounded-2xl p-4 text-left space-y-3 mb-6 border border-gray-100 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Action</span>
        <span class="font-bold text-gray-900" id="modal-action">Buy Bitcoin</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Pay Amount</span>
        <span class="font-bold text-gray-900" id="modal-sgd">S$100.00 SGD</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Est. Receive</span>
        <span class="font-bold text-coinbase-blue" id="modal-btc">0.001088 BTC</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Coinbase Fee</span>
        <span class="font-bold text-green-600">S$0.00 (Promo)</span>
      </div>
    </div>

    <div class="flex gap-3">
      <button onclick="closeOrderModal()" class="flex-1 py-3 px-4 rounded-full border border-gray-200 hover:bg-gray-50 font-bold text-sm text-gray-700 transition-colors cursor-pointer">
        Cancel
      </button>
      <button onclick="executeOrder()" class="flex-1 py-3 px-4 rounded-full bg-coinbase-blue hover:bg-blue-700 font-bold text-sm text-white transition-colors cursor-pointer shadow-sm">
        Confirm
      </button>
    </div>
  </div>
</div>

<script>
  const BTC_RATE = 91864.73;
  let currentAction = 'Buy';

  const sgdInput = document.getElementById('sgd-amount-input');
  const btcDisplay = document.querySelector('span:has(+ svg), .trade-card span') || document.body;

  function updateConversion() {
    const val = parseFloat(sgdInput?.value || 0);
    const btc = (val / BTC_RATE).toFixed(6);
    const btcElements = document.querySelectorAll('span');
    btcElements.forEach(el => {
      if (el.textContent && el.textContent.includes('BTC') && (el.textContent.includes('0 BTC') || el.textContent.includes('BTC'))) {
        el.textContent = `${btc} BTC`;
      }
    });
  }

  if (sgdInput) {
    sgdInput.addEventListener('input', updateConversion);
    updateConversion();
  }

  document.getElementById('max-btn')?.addEventListener('click', () => {
    if (sgdInput) {
      sgdInput.value = 1.15;
      updateConversion();
    }
  });

  function setTradeTab(btn, action) {
    currentAction = action;
    document.querySelectorAll('.trade-tab').forEach(b => {
      b.className = 'trade-tab px-5 py-2 text-sm font-semibold rounded-full text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer';
    });
    btn.className = 'trade-tab px-5 py-2 text-sm font-semibold rounded-full bg-black text-white shadow-sm cursor-pointer';
    const revBtn = document.getElementById('review-order-btn');
    if (revBtn) revBtn.querySelector('span').textContent = `${action} Bitcoin`;
  }

  function selectTimeframe(btn, tf, changeStr, valStr) {
    document.querySelectorAll('.tf-btn').forEach(b => {
      b.className = 'tf-btn px-3 py-1.5 text-xs font-semibold rounded-full text-gray-600 hover:text-gray-900 cursor-pointer';
    });
    btn.className = 'tf-btn px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-900 cursor-pointer';
    
    const changeBadge = document.querySelector('.text-coinbase-red span');
    if (changeBadge) {
      changeBadge.textContent = `${valStr} (${changeStr})`;
    }
  }

  function showOrderModal() {
    const val = parseFloat(sgdInput?.value || 0);
    const btc = (val / BTC_RATE).toFixed(6);
    document.getElementById('modal-action').textContent = `${currentAction} Bitcoin`;
    document.getElementById('modal-sgd').textContent = `S$${val.toFixed(2)} SGD`;
    document.getElementById('modal-btc').textContent = `${btc} BTC`;
    document.getElementById('order-modal').classList.remove('hidden');
  }

  function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
  }

  function executeOrder() {
    const action = currentAction;
    const modal = document.getElementById('order-modal');
    modal.querySelector('.bg-white').innerHTML = `
      <div class="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 text-3xl font-bold">✓</div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">Order Submitted!</h3>
      <p class="text-sm text-gray-500 mb-6">Your ${action} order has been queued successfully on the investment ledger.</p>
      <button onclick="window.location.reload()" class="w-full py-3 rounded-full bg-coinbase-blue text-white font-bold text-sm">Done</button>
    `;
  }
</script>
'''

    if '<!-- Interactive Modal for Orders -->' not in content:
        content = content.replace('</body>', interactive_script + '\n</body>')

    with open('desktop-asset-bitcoin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Enhanced desktop-asset-bitcoin.html with interactivity")

enhance_desktop_asset()

