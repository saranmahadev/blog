#!/usr/bin/env python3
"""Regenerate design/preview/*.html (static, light theme) from design/mock/*.dc.html.

The .dc.html files are Design-canvas sources (they need the canvas runtime). This
strips the template syntax so each artboard opens as a plain page in a browser.
Run from the repo root:  python3 design/tools/build-previews.py
"""
import glob, os, re, shutil

GF = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?'
      'family=Archivo:wdth,wght@62..125,100..900&family=Space+Mono:wght@400;700&'
      'family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..600&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap" rel="stylesheet">')
SKIP = {'Palettes', 'Palettes2'}  # interactive pickers; not meaningful as static pages

os.makedirs('design/preview', exist_ok=True)
for css in ('mock.css', 'site.css', 'imaxt-cover.css'):
    shutil.copy(f'design/mock/{css}', f'design/preview/{css}')
for f in sorted(glob.glob('design/mock/*.dc.html')):
    name = os.path.basename(f).replace('.dc.html', '')
    if name in SKIP:
        continue
    s = open(f).read()
    body = re.search(r'<x-dc>(.*)</x-dc>', s, re.S).group(1)
    body = re.sub(r'<helmet>(.*?)</helmet>', lambda m: re.sub(r'<link[^>]*>', '', m.group(1)), body, flags=re.S)
    body = re.sub(r'</?sc-(?:if|for)[^>]*>', '', body)
    body = (body.replace('{{theme}}', 'light').replace('{{accentLt}}', '#6AAD91')
                .replace('{{onAccent}}', '#ffffff').replace('{{accent}}', '#0F7B4D'))
    body = re.sub(r'\{\{[^}]+\}\}', '', body)
    title = re.search(r'<title>(.*?)</title>', s).group(1)
    open(f'design/preview/{name}.html', 'w').write(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{title}</title><link rel="stylesheet" href="{"site.css" if name.startswith("Imaxt") else "mock.css"}">'
        f'<link rel="stylesheet" href="imaxt-cover.css">{GF}</head>'
        f'<body style="margin:0">{body}</body></html>')
print('done')
