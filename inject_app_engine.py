import os

pages = [
    'desktop-home.html',
    'desktop-asset-bitcoin.html',
    'mobile-home.html',
    'mobile-asset-bitcoin.html'
]

css_tag = '<link rel="stylesheet" href="coinbase-app.css">\n'
js_tag = '<script src="coinbase-app.js"></script>\n'

for p in pages:
    if not os.path.exists(p):
        continue
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject CSS before </head> if not already there
    if 'coinbase-app.css' not in content:
        content = content.replace('</head>', css_tag + '</head>', 1)

    # Inject JS before </body> if not already there
    if 'coinbase-app.js' not in content:
        content = content.replace('</body>', js_tag + '</body>', 1)

    with open(p, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Injected into {p}')

