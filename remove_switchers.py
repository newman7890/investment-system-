import os
import shutil

# 1. Remove floating pill from all html files
files = [
    'desktop-home.html',
    'desktop-asset-bitcoin.html',
    'mobile-home.html',
    'mobile-asset-bitcoin.html'
]

for filename in files:
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove the floating switcher pill
        import re
        content = re.sub(r'<!-- View Switcher Floating Pill -->.*?</div>\s*', '', content, flags=re.DOTALL)

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned switcher from {filename}")

# 2. Make index.html directly be the clean desktop home page
shutil.copyfile('desktop-home.html', 'index.html')
print("Replaced index.html with desktop-home.html")

