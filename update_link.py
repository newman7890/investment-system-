with open('desktop-asset-bitcoin.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('href="desktop-home.html"', 'href="index.html"')

with open('desktop-asset-bitcoin.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated home link in desktop-asset-bitcoin.html to index.html')

