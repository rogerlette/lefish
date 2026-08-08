"""Construit la page publiée : l'application + la liste de clients livrée."""
import json, re, sys

app  = open('/home/user/lefish/lmt-coaching/autonome/index.html').read()
seed = json.load(open(sys.argv[2] if len(sys.argv) > 2
                      else '/tmp/claude-0/-home-user-lefish/cf0aa78f-b5a5-595b-a7d8-3d88a4a3f38d/scratchpad/LMT-39-clients.json'))
seed['version'] = 'lmt-39-2026-08-08'

body = app.split('<body>', 1)[1].rsplit('</body>', 1)[0].strip()
assert 'const SEED = null;' in body
body = body.replace('const SEED = null;',
                    'const SEED = ' + json.dumps(seed, ensure_ascii=False, separators=(',', ':')) + ';')

out = '<title>LMT Coaching</title>\n' + body + '\n'
open(sys.argv[1], 'w').write(out)
print('page construite :', len(out), 'octets ·', len(seed['clients']), 'clients embarqués')
