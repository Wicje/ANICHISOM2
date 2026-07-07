import glob

files = glob.glob('components/**/*.tsx', recursive=True)
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    new_content = content.replace('\\`', '`').replace('\\${', '${')
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Fixed {f}")
