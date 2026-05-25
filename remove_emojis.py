import os
import re

# Comprehensive emoji regex pattern
emoji_pattern = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F700-\U0001F77F"  # alchemical symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251" 
    "\U00002600-\U000026FF"  # Misc symbols
    "\U0000FE00-\U0000FE0F"  # Variation Selectors
    "\U0000200D"              # Zero Width Joiner
    "\U000020E3"
    "]+",
    flags=re.UNICODE
)

# Files to process
target_files = [
    "architecture-map.html",
    "dev-dashboard.html",
]

base_dir = r"D:\TomCodeX Inc\dashboard"

for fname in target_files:
    fpath = os.path.join(base_dir, fname)
    if not os.path.exists(fpath):
        print(f"SKIP: {fname} not found")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all emojis
    matches = emoji_pattern.findall(content)
    if matches:
        print(f"\n{fname}: Found {len(matches)} emoji(s)")
        unique_emojis = set(matches)
        for e in unique_emojis:
            count = content.count(e)
            print(f"  {repr(e)} x{count}")
    else:
        print(f"\n{fname}: No emojis found")

    # Remove emojis
    new_content = emoji_pattern.sub("", content)

    # Clean up any double spaces left behind
    new_content = re.sub(r"  +", " ", new_content)

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"  -> Emojis removed and file saved.")

print("\nDone!")
