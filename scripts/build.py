import json, os, re
CONFIG='data/config.json'
OUT='.'
def load(p): return json.load(open(p)) if os.path.exists(p) else {}
def build():
    c = load(CONFIG)
    if not c: return
    t = "<!DOCTYPE html><html><body><h1>{{H1}}</h1>{{CONTENT}}</body></html>"
    for p in c.get('pages', []):
        d = os.path.join(OUT, p['slug']) if p['slug']!='home' else OUT
        os.makedirs(d, exist_ok=True)
        h = t.replace('{{H1}}', p['title']).replace('{{CONTENT}}', p.get('content',''))
        with open(os.path.join(d, 'index.html'), 'w') as f: f.write(h)
if __name__ == "__main__": build()