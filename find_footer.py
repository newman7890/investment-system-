import os
import re

files = ['index.html', 'desktop-home.html', 'desktop-asset-bitcoin.html', 'mobile-home.html', 'mobile-asset-bitcoin.html']

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
        mobbin_count = content.count('Mobbin')
        footer_count = len(re.findall(r'<footer[^>]*>.*?</footer>', content, re.DOTALL))
        print(f'{f}: {mobbin_count} Mobbin occurrences, {footer_count} footer elements')

