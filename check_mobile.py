with open('mobile-home.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("Length of mobile-home.html:", len(text))
print("First 300 chars:")
print(text[:300])

