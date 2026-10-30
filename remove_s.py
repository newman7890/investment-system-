import os

files = [
    'index.html',
    'desktop-home.html',
    'desktop-asset-bitcoin.html',
    'mobile-home.html',
    'mobile-asset-bitcoin.html',
    'coinbase-app.js'
]

for filename in files:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace S$ with $
    content = content.replace('S$', '$')

    # Replace SGD with USD
    content = content.replace('SGD', 'USD')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {filename}')

