import os
import re

dir_path = r"c:\Users\banda\OneDrive\Desktop\XYZZ\AI-Study-Buddy\frontend"

html_files = []
for root, _, files in os.walk(dir_path):
    if "node_modules" in root: continue
    for f in files:
        if f.endswith(".html"):
            html_files.append(os.path.join(root, f))
            
for path in html_files:
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
    
    content = re.sub(r'<canvas\s+id="particle-canvas"[^>]*>\s*</canvas>', '', content, flags=re.IGNORECASE|re.DOTALL)
    content = re.sub(r'<canvas\s+id="particle-canvas"[^>]*>', '', content, flags=re.IGNORECASE)
    
    content = re.sub(r'<div\s+id="hero-glow"[^>]*>\s*</div>', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<div\s+id="hero-glow"[^>]*>', '', content, flags=re.IGNORECASE)

    content = re.sub(r'#hero\s*::before\s*\{[^}]+\}', '', content, flags=re.MULTILINE|re.DOTALL)
    content = re.sub(r'#hero-glow\s*\{[^}]+\}', '', content, flags=re.MULTILINE|re.DOTALL)
    content = re.sub(r'#particle-canvas\s*\{[^}]+\}', '', content, flags=re.MULTILINE|re.DOTALL)

    content = re.sub(r'\(\s*function\(\s*\)\s*\{\s*const\s*cv\s*=\s*\$\(\'particle-canvas\'\).*?\}\)\(\);', '', content, flags=re.DOTALL)
    
    if '<script src="js/global-bg.js">' not in content:
        content = re.sub(r'(</body>)', r'<script src="js/global-bg.js"></script>\n\g<1>', content, flags=re.IGNORECASE)
        
    with open(path, "w", encoding="utf-8") as file:
        file.write(content)

js_files = ["js/quiz.js", "js/questions.js"]
for js in js_files:
    path = os.path.join(dir_path, js)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        content = re.sub(r'\(\s*function\(\s*\)\s*\{\s*const\s*cv\s*=\s*document\.getElementById\(\'particle-canvas\'\).*?\}\)\(\);', '', content, flags=re.DOTALL)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
            
print("Done")
