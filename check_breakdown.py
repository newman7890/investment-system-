with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'Asset Breakdown Rows' in l:
        print(''.join(lines[i:i+60]))
        break

