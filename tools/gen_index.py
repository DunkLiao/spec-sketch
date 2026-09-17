#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
gen_index.py  —  掃描 specs/ 目錄，自動產生 spec-index.json

用法：
    python tools/gen_index.py            （在網站根目錄執行）
    或直接雙擊 tools/gen_index.bat

規則：
    specs/<專案資料夾>/<檔名>.md
    * 專案資料夾名稱 = 左側選單的專案名稱
    * 文件標題取自檔案第一個 # 標題，取不到則用檔名
    * SPEC.md 會自動排在該專案第一個
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPECS = os.path.join(ROOT, 'specs')
OUT = os.path.join(ROOT, 'spec-index.json')

# ===== 站台名稱（可自行修改）=====
SITE = {
    "title": "規格文件庫",
    "subtitle": "SPEC Document Portal"
}
# =================================

ENCODINGS = ['utf-8-sig', 'utf-8', 'cp950', 'big5', 'gb18030']


def read_text(path):
    for enc in ENCODINGS:
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, LookupError):
            continue
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()


def get_title(path):
    try:
        txt = read_text(path)
    except Exception:
        return None
    in_fence = False
    for line in txt.splitlines()[:80]:
        if re.match(r'^\s*(```|~~~)', line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r'^\s*#\s+(.+?)\s*#*\s*$', line)
        if m:
            return re.sub(r'[`*_]', '', m.group(1)).strip()
    return None


def sort_key(name):
    base = name.lower()
    pri = 0 if base in ('spec.md', 'readme.md', 'index.md') else 1
    return (pri, base)


def main():
    if not os.path.isdir(SPECS):
        print('[ERROR] 找不到 specs 資料夾：%s' % SPECS)
        sys.exit(1)

    projects = []
    total = 0
    for proj in sorted(os.listdir(SPECS)):
        pdir = os.path.join(SPECS, proj)
        if not os.path.isdir(pdir) or proj.startswith('.'):
            continue
        files = [f for f in os.listdir(pdir)
                 if f.lower().endswith('.md') and not f.startswith('.')]
        if not files:
            continue
        files.sort(key=sort_key)
        entry = {"project": proj, "files": []}
        for f in files:
            entry["files"].append({
                "file": f,
                "title": get_title(os.path.join(pdir, f)) or os.path.splitext(f)[0]
            })
            total += 1
        projects.append(entry)

    data = {"site": SITE, "projects": projects}
    with open(OUT, 'w', encoding='utf-8') as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)

    print('索引已產生：%s' % OUT)
    print('專案 %d 個，文件 %d 份' % (len(projects), total))
    for p in projects:
        print('  - %s (%d)' % (p['project'], len(p['files'])))


if __name__ == '__main__':
    main()
