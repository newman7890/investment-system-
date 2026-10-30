files = ['index.html', 'desktop-home.html', 'desktop-asset-bitcoin.html', 'mobile-home.html', 'mobile-asset-bitcoin.html', 'coinbase-app.js']

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        c = fp.read()
    s_count = c.count('S$')
    print(f'{f}: {s_count} occurrences of S$')

