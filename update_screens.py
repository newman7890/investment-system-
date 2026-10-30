import os

# Helper to add switcher and update links
def update_desktop_home():
    with open('desktop-home.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Link Bitcoin row to desktop-asset-bitcoin.html
    old_btc = '<div class="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors">'
    new_btc = '<div onclick="window.location.href=\'desktop-asset-bitcoin.html\'" title="Click to view Bitcoin details" class="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors hover:shadow-sm">'
    content = content.replace(old_btc, new_btc, 1)

    # Link My Assets in sidebar to desktop-asset-bitcoin.html
    old_assets = '<span>My assets</span>'
    new_assets = '<span>My assets</span>'

    # Switcher
    switcher = '''
<!-- View Switcher Floating Pill -->
<div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: rgba(10, 11, 13, 0.94); backdrop-filter: blur(10px); padding: 8px 14px; border-radius: 9999px; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #fff;">
  <span style="opacity: 0.6; font-weight: 500;">Screens:</span>
  <a href="desktop-home.html" style="color: #3888FF; font-weight: 700; text-decoration: none; padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,0.12);">Desktop Home</a>
  <a href="desktop-asset-bitcoin.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Desktop BTC</a>
  <a href="mobile-home.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Mobile Home</a>
  <a href="mobile-asset-bitcoin.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Mobile BTC</a>
  <a href="index.html" style="color: #10B981; font-weight: 700; text-decoration: none; padding: 4px 8px; border-radius: 8px; background: rgba(16, 185, 129, 0.15);">App Hub</a>
</div>
'''
    if '<!-- View Switcher Floating Pill -->' not in content:
        content = content.replace('</body>', switcher + '\n</body>')

    with open('desktop-home.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated desktop-home.html")

def update_desktop_asset():
    with open('desktop-asset-bitcoin.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Link Logo & Home link to desktop-home.html
    content = content.replace('<a aria-label="Coinbase Home" class="inline-flex items-center mb-8" href="#">',
                              '<a aria-label="Coinbase Home" class="inline-flex items-center mb-8" href="desktop-home.html">')
    
    content = content.replace('<a class="flex items-center gap-4 px-3 py-2.5 rounded-lg text-gray-900 font-medium hover:bg-gray-100 transition-colors" href="#">\n<svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24">\n<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round"></path>\n</svg>\n<span class="text-sm">Home</span>',
                              '<a class="flex items-center gap-4 px-3 py-2.5 rounded-lg text-gray-900 font-medium hover:bg-gray-100 transition-colors" href="desktop-home.html">\n<svg class="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24">\n<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke-linecap="round" stroke-linejoin="round"></path>\n</svg>\n<span class="text-sm">Home</span>')

    switcher = '''
<!-- View Switcher Floating Pill -->
<div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: rgba(10, 11, 13, 0.94); backdrop-filter: blur(10px); padding: 8px 14px; border-radius: 9999px; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #fff;">
  <span style="opacity: 0.6; font-weight: 500;">Screens:</span>
  <a href="desktop-home.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Desktop Home</a>
  <a href="desktop-asset-bitcoin.html" style="color: #3888FF; font-weight: 700; text-decoration: none; padding: 4px 8px; border-radius: 8px; background: rgba(255,255,255,0.12);">Desktop BTC</a>
  <a href="mobile-home.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Mobile Home</a>
  <a href="mobile-asset-bitcoin.html" style="color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 8px;">Mobile BTC</a>
  <a href="index.html" style="color: #10B981; font-weight: 700; text-decoration: none; padding: 4px 8px; border-radius: 8px; background: rgba(16, 185, 129, 0.15);">App Hub</a>
</div>
'''
    if '<!-- View Switcher Floating Pill -->' not in content:
        content = content.replace('</body>', switcher + '\n</body>')

    with open('desktop-asset-bitcoin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated desktop-asset-bitcoin.html")

def update_mobile_home():
    with open('mobile-home.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Link Bitcoin item to mobile-asset-bitcoin.html
    old_btc = '<div class="py-3.5 flex items-center justify-between">'
    new_btc = '<div onclick="window.location.href=\'mobile-asset-bitcoin.html\'" title="Click to view Bitcoin details" class="py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 px-2 rounded-xl transition-colors">'
    content = content.replace(old_btc, new_btc, 1)

    # Link Assets tab
    content = content.replace('<span>Assets</span>\n</a>', '<span>Assets</span>\n</a>', 1)

    switcher = '''
<!-- View Switcher Floating Pill -->
<div style="position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); z-index: 9999; background: rgba(10, 11, 13, 0.94); backdrop-filter: blur(10px); padding: 6px 12px; border-radius: 9999px; display: flex; align-items: center; gap: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #fff; white-space: nowrap;">
  <a href="desktop-home.html" style="color: #fff; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Desktop</a>
  <span style="opacity: 0.3;">|</span>
  <a href="mobile-home.html" style="color: #3888FF; font-weight: 700; text-decoration: none; padding: 3px 6px; border-radius: 6px; background: rgba(255,255,255,0.12);">Mobile Home</a>
  <a href="mobile-asset-bitcoin.html" style="color: #fff; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Mobile BTC</a>
  <span style="opacity: 0.3;">|</span>
  <a href="index.html" style="color: #10B981; font-weight: 700; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Hub</a>
</div>
'''
    if '<!-- View Switcher Floating Pill -->' not in content:
        content = content.replace('</body>', switcher + '\n</body>')

    with open('mobile-home.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated mobile-home.html")

def update_mobile_asset():
    with open('mobile-asset-bitcoin.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Link back button to mobile-home.html
    old_back = '<button aria-label="Go back" class="p-1 -ml-1 text-slate-700 hover:text-slate-900 transition-colors" type="button">'
    new_back = '<button onclick="window.location.href=\'mobile-home.html\'" aria-label="Go back" class="p-1 -ml-1 text-slate-700 hover:text-slate-900 transition-colors" type="button">'
    content = content.replace(old_back, new_back)

    # Link Home tab in bottom nav
    old_home_tab = '<button class="flex flex-col items-center justify-center w-14 py-1 text-slate-400 hover:text-slate-900 transition-colors" type="button">'
    new_home_tab = '<button onclick="window.location.href=\'mobile-home.html\'" class="flex flex-col items-center justify-center w-14 py-1 text-slate-400 hover:text-slate-900 transition-colors" type="button">'
    content = content.replace(old_home_tab, new_home_tab, 1)

    switcher = '''
<!-- View Switcher Floating Pill -->
<div style="position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); z-index: 9999; background: rgba(10, 11, 13, 0.94); backdrop-filter: blur(10px); padding: 6px 12px; border-radius: 9999px; display: flex; align-items: center; gap: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #fff; white-space: nowrap;">
  <a href="desktop-home.html" style="color: #fff; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Desktop</a>
  <span style="opacity: 0.3;">|</span>
  <a href="mobile-home.html" style="color: #fff; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Mobile Home</a>
  <a href="mobile-asset-bitcoin.html" style="color: #3888FF; font-weight: 700; text-decoration: none; padding: 3px 6px; border-radius: 6px; background: rgba(255,255,255,0.12);">Mobile BTC</a>
  <span style="opacity: 0.3;">|</span>
  <a href="index.html" style="color: #10B981; font-weight: 700; text-decoration: none; padding: 3px 6px; border-radius: 6px;">Hub</a>
</div>
'''
    if '<!-- View Switcher Floating Pill -->' not in content:
        content = content.replace('</body>', switcher + '\n</body>')

    with open('mobile-asset-bitcoin.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated mobile-asset-bitcoin.html")

update_desktop_home()
update_desktop_asset()
update_mobile_home()
update_mobile_asset()

