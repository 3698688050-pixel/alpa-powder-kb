#!/bin/sh
# 回归自检：构建 + 门禁 + 数据完整性
set -e
cd "$(dirname "$0")"
python3 build.py
echo "--- slopcheck (须 0 FAIL) ---"
fail=0
for f in docs/index.html docs/product.html docs/decision.html docs/materials.html docs/industry.html docs/path.html docs/glossary.html docs/product-list.html; do
  out=$(slopcheck "$f" 2>&1 | tail -3 | head -1)
  case "$out" in *"0 FAIL"*) echo "ok   $f";; *) echo "FAIL $f"; echo "$out"; fail=1;; esac
done
echo "--- 数据完整性 ---"
python3 - <<'PY'
import json
kb=json.load(open('docs/kb.json'))
ids={p['id'] for p in kb['products']}
bad=[(i['id'],x) for i in kb['industries'] for x in i.get('products',[]) if x not in ids]
print('产品',len(kb['products']),'行业',len(kb['industries']),'物料',len(kb['materials']),'问答',len(kb['decision']['quick_answers']))
print('悬空引用:',bad or '无')
assert not bad, bad
assert all(p.get('source') for p in kb['products']), '有产品缺 source'
print('每条产品均有出处 ✓')
PY
[ "$fail" -eq 0 ] && echo "ALL GREEN" || { echo "BLOCKED"; exit 1; }
