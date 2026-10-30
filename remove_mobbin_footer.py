import re

files = ['index.html', 'desktop-home.html', 'desktop-asset-bitcoin.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()

    # Remove footer containing Mobbin
    content = re.sub(r'<!-- BEGIN: (StickyFooter|BottomDarkFooter) -->\s*<footer[^>]*>.*?</footer>\s*<!-- END: (StickyFooter|BottomDarkFooter) -->', '', content, flags=re.DOTALL)
    # Fallback to remove any remaining footer with Mobbin
    content = re.sub(r'<footer[^>]*>.*?Mobbin.*?</footer>\s*', '', content, flags=re.DOTALL)

    with open(f, 'w', encoding='utf-8') as fp:
        fp.write(content)

    print(f'Removed Mobbin footer from {f}')

