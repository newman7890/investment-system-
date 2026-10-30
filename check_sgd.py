with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'.{0,15}SGD.{0,25}', text)
for m in matches:
    print(m)
print(f'Total SGD in index.html: {len(matches)}')

