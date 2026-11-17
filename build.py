#!/usr/bin/env python3
"""ALPA 粉体选型知识库 · 静态站生成器
零依赖前端：只用原生 JS，无构建、无 CDN。GitHub Pages 直接托管。
数据源：data/*.yaml 与 data/*.json → 注入 build/kb.json → 页面读取。
"""
import json, os, shutil, sys, yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
BUILD = os.path.join(ROOT, 'docs')


def load(name):
    p = os.path.join(DATA, name)
    with open(p, encoding='utf8') as f:
        return yaml.safe_load(f) if p.endswith('.yaml') else json.load(f)


def build_kb():
    products = load('products.yaml')
    decision = load('decision.yaml')
    industries = load('industries.yaml')
    materials = load('materials.json')
    mesh = load('mesh.json')

    # 反查：行业 → 产品 / 产品 → 行业
    prod_industries = {p['id']: [] for p in products['products']}
    for ind in industries['industries']:
        for pid in ind.get('products', []):
            if pid in prod_industries:
                prod_industries[pid].append(ind['id'])

    kb = {
        'families': products['families'],
        'products': products['products'],
        'decision': decision,
        'industries': industries['industries'],
        'materials': materials,
        'mesh': mesh,
        'index': {'prod_industries': prod_industries},
    }
    return kb


def main():
    kb = build_kb()
    os.makedirs(BUILD, exist_ok=True)
    with open(os.path.join(BUILD, 'kb.json'), 'w', encoding='utf8') as f:
        json.dump(kb, f, ensure_ascii=False, separators=(',', ':'))

    # 拷贝静态资源
    src = os.path.join(ROOT, 'site')
    for name in os.listdir(src):
        s = os.path.join(src, name)
        d = os.path.join(BUILD, name)
        if os.path.isdir(s):
            shutil.rmtree(d, ignore_errors=True)
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    n_p = len(kb['products'])
    n_i = len(kb['industries'])
    n_m = len(kb['materials'])
    print(f'built: {n_p} products / {n_i} industries / {n_m} materials -> {BUILD}')
    print(f'kb.json {os.path.getsize(os.path.join(BUILD, "kb.json"))} bytes')


if __name__ == '__main__':
    main()