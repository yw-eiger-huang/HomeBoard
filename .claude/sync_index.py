"""
PostToolUse hook: syncs index.html from Code/board_viz.html when board_viz.html is edited.
Reads Claude Code hook JSON from stdin.
"""
import sys
import json

data = json.load(sys.stdin)
fp = data.get('tool_input', {}).get('file_path', '')

if 'board_viz.html' not in fp:
    sys.exit(0)

src = 'D:/CodeSpace/HomeBoard/Code/board_viz.html'
dst = 'D:/CodeSpace/HomeBoard/index.html'

with open(src, encoding='utf-8') as f:
    content = f.read()

content = content.replace('href="board_viz.css"', 'href="Code/board_viz.css"')
content = content.replace('src="board_viz.js"', 'src="Code/board_viz.js"')

with open(dst, 'w', encoding='utf-8') as f:
    f.write(content)

print('index.html synced from Code/board_viz.html')
