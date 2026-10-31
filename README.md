# Investment System (NexusPro Platform)

An investment and cryptocurrency trading interface built directly from high-fidelity designs generated via Google Stitch (Project `11711854523150939165`).

---

## 🚀 Live Entry Points

| File | Description | Highlights |
| :--- | :--- | :--- |
| **[`index.html`](index.html)** | **Interactive Suite Hub** | Switch between Desktop, Mobile Device Preview, and Split Screen side-by-side mode. |
| **[`desktop-home.html`](desktop-home.html)** | **Desktop Home View** | Portfolio balance (S$1.90), chart summary, For You promos, live searchable asset watchlist (Bitcoin, Ethereum), and SGD order sidebar. |
| **[`desktop-asset-bitcoin.html`](desktop-asset-bitcoin.html)** | **Desktop Bitcoin Detail** | Real-time interactive chart with timeframes (1H, 1D, 1W, 1M, 1Y, ALL), SGD-to-BTC trade calculator, order review modal, and balance breakdown. |
| **[`mobile-home.html`](mobile-home.html)** | **Mobile iOS Home View** | Mobile portfolio card, quick action pills (Buy, Sell, Convert, Send, Receive), swipeable promos, asset list, and bottom tab bar. |
| **[`mobile-asset-bitcoin.html`](mobile-asset-bitcoin.html)** | **Mobile Bitcoin Detail** | Mobile price header, vector area chart, balance card, and full in-drawer trade execution interface. |

---

## ⚡ Features & Interactivity

1. **Interactive Order Execution**:
   - Live SGD amount input with instant calculated conversion to BTC at current spot price (`S$91,864.73 SGD/BTC`).
   - `Max` button presets available cash balance.
   - Segmented `Buy / Sell / Convert` tab switching.
   - `Review order` confirmation modal with full fee & order summary breakdown.
2. **Interactive Timeframes**:
   - Switch between `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL` to dynamically adjust price trend statistics.
3. **Live Watchlist Search**:
   - Instant search filtering on the Prices watchlist table.
4. **Deposit / Top Up Modal**:
   - Interactive modal for SGD Wallet top-ups via FAST/PayNow.
5. **Seamless Cross-Navigation**:
   - Clicking Bitcoin on any Home screen immediately routes to the Asset Detail view.
   - Back button and sidebar "Home" link navigate back seamlessly.
   - Floating navigation pill on all standalone screens allows one-click switching.

---

## 💻 Running the Application

You can open `index.html` directly in any web browser, or serve it with Python:

```bash
# Start local development server
python -m http.server 3000
```

Then visit [http://localhost:3000](http://localhost:3000) in your browser.

