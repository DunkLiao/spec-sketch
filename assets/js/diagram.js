/* =========================================================
 *  diagram.js  -  離線流程圖繪製器（mermaid flowchart 語法子集）
 *  風格：手繪素描（Hand-drawn / Sketchy），莫蘭迪配色
 *  若你之後把官方 mermaid.min.js 放進 assets/js/ 並在 index.html 引用，
 *  本檔會自動讓位給官方版本（偵測 window.mermaid）。
 * ========================================================= */
(function (global) {
  'use strict';

  var SHAPES = [
    { re: /^\[\[(.*)\]\]$/, s: 'subroutine' },
    { re: /^\[\((.*)\)\]$/, s: 'db' },
    { re: /^\(\((.*)\)\)$/, s: 'circle' },
    { re: /^\{(.*)\}$/, s: 'diamond' },
    { re: /^\((.*)\)$/, s: 'round' },
    { re: /^\[(.*)\]$/, s: 'rect' },
    { re: /^\/(.*)\/$/, s: 'para' },
    { re: /^>(.*)\]$/, s: 'flag' }
  ];

  /* ---------- 可重現的偽亂數（同一張圖每次繪製結果一致） ---------- */
  var _seed = 20260917;
  function rnd() {
    _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
    return _seed / 0x7fffffff;
  }
  function jit(n) { return (rnd() - 0.5) * n; }
  function resetSeed(s) { _seed = s || 20260917; }

  /* ---------- 手繪線段：以二次貝茲加入中點抖動 ---------- */
  function roughLine(x1, y1, x2, y2, amp) {
    amp = amp === undefined ? 1.9 : amp;
    var mx = (x1 + x2) / 2 + jit(amp * 2.2);
    var my = (y1 + y2) / 2 + jit(amp * 2.2);
    return 'M' + (x1 + jit(amp)).toFixed(1) + ',' + (y1 + jit(amp)).toFixed(1) +
      ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' +
      (x2 + jit(amp)).toFixed(1) + ',' + (y2 + jit(amp)).toFixed(1);
  }

  /* ---------- 手繪多邊形：每邊畫兩次形成素描感 ---------- */
  function roughPoly(pts, amp) {
    var d = '', i, n = pts.length;
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        d += roughLine(a[0], a[1], b[0], b[1], amp) + ' ';
      }
    }
    return d.trim();
  }

  function roundRectPts(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    var p = [], k = 6;
    function arc(cx, cy, a0, a1) {
      for (var i = 0; i <= k; i++) {
        var a = a0 + (a1 - a0) * i / k;
        p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    }
    if (r < 1) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    arc(x + w - r, y + r, -Math.PI / 2, 0);
    arc(x + w - r, y + h - r, 0, Math.PI / 2);
    arc(x + r, y + h - r, Math.PI / 2, Math.PI);
    arc(x + r, y + r, Math.PI, Math.PI * 1.5);
    return p;
  }

  function ellipsePts(cx, cy, rx, ry) {
    var p = [], n = 22;
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n;
      p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return p;
  }

  function parseFlow(src) {
    var lines = src.split('\n'), dir = 'TD', nodes = {}, order = [], edges = [];
    var head = lines[0] || '';
    var hm = head.match(/^\s*(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/i);
    if (hm) { dir = hm[1].toUpperCase(); lines = lines.slice(1); }
    else if (!/^\s*(flowchart|graph)/i.test(head)) return null;
    else lines = lines.slice(1);

    // 把換行接續的箭頭合併（支援多行寫法）
    var joined = [], buf = '';
    lines.forEach(function (l) {
      var t = l.trim();
      if (!t || /^%%/.test(t)) { if (buf) { joined.push(buf); buf = ''; } return; }
      if (/^(--|==|-\.)/.test(t) || /(--|==|-\.[^\n]*)>?\s*$/.test(buf)) {
        buf = buf ? buf + ' ' + t : t;
      } else {
        if (buf) joined.push(buf);
        buf = t;
      }
      if (/>\s*[^-=.>]+$/.test(buf) && !/(--|==|-\.)\s*$/.test(buf)) {
        joined.push(buf); buf = '';
      }
    });
    if (buf) joined.push(buf);

    function node(raw) {
      raw = raw.trim();
      var m = raw.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s*(.*)$/);
      if (!m) return null;
      var id = m[1], body = m[2].trim(), shape = 'rect', label = id;
      if (body) {
        for (var k = 0; k < SHAPES.length; k++) {
          var mm = body.match(SHAPES[k].re);
          if (mm) { shape = SHAPES[k].s; label = mm[1]; break; }
        }
      }
      label = label.replace(/^["']|["']$/g, '');
      if (!nodes[id]) { nodes[id] = { id: id, label: label, shape: shape }; order.push(id); }
      else if (body) { nodes[id].label = label; nodes[id].shape = shape; }
      return id;
    }

    joined.forEach(function (ln) {
      if (/^\s*(subgraph|end|classDef|class|style|click|linkStyle)\b/i.test(ln)) return;
      var re = /(.+?)\s*(-{2,}>|-{2,}|={2,}>|-\.->|-\.-)\s*(?:\|([^|]*)\|\s*)?(.+)/;
      var m = ln.match(re);
      if (m) {
        var a = node(m[1]);
        var rest = m[4], lbl = m[3] || '';
        var chain = [a];
        var cur = rest, style = /\./.test(m[2]) ? 'dash' : (/=/.test(m[2]) ? 'thick' : 'solid');
        var guard = 0;
        while (guard++ < 20) {
          var m2 = cur.match(re);
          if (m2) {
            chain.push(node(m2[1]));
            edges.push({ from: chain[chain.length - 2], to: chain[chain.length - 1], label: lbl, style: style });
            lbl = m2[3] || ''; style = /\./.test(m2[2]) ? 'dash' : (/=/.test(m2[2]) ? 'thick' : 'solid');
            cur = m2[4];
          } else {
            var last = node(cur);
            if (last) edges.push({ from: chain[chain.length - 1], to: last, label: lbl, style: style });
            break;
          }
        }
      } else {
        node(ln);
      }
    });

    if (!order.length) return null;
    return { dir: dir, nodes: nodes, order: order, edges: edges };
  }

  /* 分層（拓樸排序） */
  function layers(g) {
    var lv = {}, indeg = {};
    g.order.forEach(function (id) { indeg[id] = 0; });
    g.edges.forEach(function (e) { if (indeg[e.to] !== undefined) indeg[e.to]++; });
    var q = g.order.filter(function (id) { return indeg[id] === 0; });
    if (!q.length) q = [g.order[0]];
    q.forEach(function (id) { lv[id] = 0; });
    var seen = {}, guard = 0;
    while (q.length && guard++ < 5000) {
      var cur = q.shift();
      if (seen[cur]) continue;
      seen[cur] = 1;
      g.edges.forEach(function (e) {
        if (e.from === cur) {
          var nl = (lv[cur] || 0) + 1;
          if (lv[e.to] === undefined || lv[e.to] < nl) lv[e.to] = nl;
          q.push(e.to);
        }
      });
    }
    g.order.forEach(function (id) { if (lv[id] === undefined) lv[id] = 0; });
    var max = 0, buckets = [];
    g.order.forEach(function (id) { max = Math.max(max, lv[id]); });
    for (var i = 0; i <= max; i++) buckets.push([]);
    g.order.forEach(function (id) { buckets[lv[id]].push(id); });
    return buckets;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function widthOf(txt) {
    var w = 0;
    for (var i = 0; i < txt.length; i++) {
      w += /[\u4e00-\u9fff\uff00-\uffef]/.test(txt[i]) ? 15 : 8.2;
    }
    return Math.max(84, w + 38);
  }

  function render(src) {
    var g = parseFlow(src);
    if (!g) return null;
    resetSeed(20260917 + src.length * 7);
    var bk = layers(g);
    var horiz = (g.dir === 'LR' || g.dir === 'RL');
    var H = 46, GAPX = 44, GAPY = 56;
    var pos = {}, W = 0, Hh = 0;

    if (horiz) {
      var colX = 24;
      bk.forEach(function (col) {
        var cw = 0;
        col.forEach(function (id) { cw = Math.max(cw, widthOf(g.nodes[id].label)); });
        col.forEach(function (id, k) {
          var w = widthOf(g.nodes[id].label);
          pos[id] = { x: colX + (cw - w) / 2, y: 24 + k * (H + 30), w: w, h: H };
          Hh = Math.max(Hh, pos[id].y + H + 24);
        });
        colX += cw + 82;
        W = colX;
      });
    } else {
      var rowY = 24;
      bk.forEach(function (row) {
        var startX = 24;
        row.forEach(function (id) {
          var w = widthOf(g.nodes[id].label);
          pos[id] = { x: startX, y: rowY, w: w, h: H };
          startX += w + GAPX;
          W = Math.max(W, startX + 24);
        });
        rowY += H + GAPY;
        Hh = rowY;
      });
      bk.forEach(function (row) {
        if (!row.length) return;
        var minX = Math.min.apply(null, row.map(function (id) { return pos[id].x; }));
        var maxX = Math.max.apply(null, row.map(function (id) { return pos[id].x + pos[id].w; }));
        var off = (W - (maxX - minX)) / 2 - minX;
        row.forEach(function (id) { pos[id].x += off; });
      });
      Hh += 6;
    }
    W = Math.max(W, 340);

    var svg = ['<svg class="flow" viewBox="0 0 ' + Math.ceil(W) + ' ' + Math.ceil(Hh) +
      '" width="' + Math.ceil(W) + '" height="' + Math.ceil(Hh) +
      '" style="max-width:100%;height:auto" preserveAspectRatio="xMidYMin meet"' +
      ' xmlns="http://www.w3.org/2000/svg">',
      '<defs><marker id="ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" ' +
      'markerHeight="7.5" orient="auto-start-reverse">' +
      '<path d="M0.5,0.8 L9.6,5 L0.3,9.2 L2.6,5 z" class="arrow-head"/></marker></defs>'];

    /* ---- 連線 ---- */
    g.edges.forEach(function (e) {
      var a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      var x1, y1, x2, y2, d;
      if (horiz && b.x > a.x) {
        x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = b.x; y2 = b.y + b.h / 2;
        var mx = (x1 + x2) / 2;
        d = 'M' + x1 + ',' + (y1 + jit(1.4)) +
          ' C' + mx + ',' + (y1 + jit(2.4)) + ' ' + mx + ',' + (y2 + jit(2.4)) +
          ' ' + x2 + ',' + (y2 + jit(1.4));
      } else if (!horiz && b.y > a.y) {
        x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = b.x + b.w / 2; y2 = b.y;
        var my = (y1 + y2) / 2;
        d = 'M' + (x1 + jit(1.4)) + ',' + y1 +
          ' C' + (x1 + jit(2.6)) + ',' + my + ' ' + (x2 + jit(2.6)) + ',' + my +
          ' ' + (x2 + jit(1.4)) + ',' + y2;
      } else {
        x1 = a.x + a.w / 2; y1 = a.y + a.h / 2; x2 = b.x + b.w / 2; y2 = b.y + b.h / 2;
        d = roughLine(x1, y1, x2, y2, 2);
      }
      svg.push('<path d="' + d + '" class="edge edge-' + e.style + '" marker-end="url(#ah)"/>');
      if (e.label) {
        var lx = (x1 + x2) / 2, ly = (y1 + y2) / 2;
        var lw = widthOf(e.label) / 1.5;
        svg.push('<path d="' + roughPoly(roundRectPts(lx - lw / 2, ly - 11, lw, 21, 5), 1.1) +
          '" class="edge-lbl-bg"/>');
        svg.push('<text class="edge-lbl" x="' + lx + '" y="' + (ly + 4.5) + '">' +
          esc(e.label) + '</text>');
      }
    });

    /* ---- 節點 ---- */
    g.order.forEach(function (id) {
      var n = g.nodes[id], p = pos[id];
      if (!p) return;
      var cx = p.x + p.w / 2, cy = p.y + p.h / 2, pts, cls = 'node';
      if (n.shape === 'diamond') {
        pts = [[cx, p.y], [p.x + p.w, cy], [cx, p.y + p.h], [p.x, cy]];
        cls += ' node-diamond';
      } else if (n.shape === 'circle') {
        pts = ellipsePts(cx, cy, p.w / 2, p.h / 2);
        cls += ' node-circle';
      } else if (n.shape === 'db') {
        pts = roundRectPts(p.x, p.y, p.w, p.h, 13);
        cls += ' node-db';
      } else if (n.shape === 'para') {
        pts = [[p.x + 14, p.y], [p.x + p.w, p.y],
        [p.x + p.w - 14, p.y + p.h], [p.x, p.y + p.h]];
      } else if (n.shape === 'round') {
        pts = roundRectPts(p.x, p.y, p.w, p.h, 21);
        cls += ' node-round';
      } else {
        pts = roundRectPts(p.x, p.y, p.w, p.h, 7);
      }
      // 底色填塊（不抖動，避免露白）
      svg.push('<polygon class="' + cls + '-fill" points="' +
        pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') +
        '"/>');
      // 手繪外框
      svg.push('<path d="' + roughPoly(pts, 1.6) + '" class="' + cls + '-stroke"/>');
      svg.push('<text class="node-lbl" x="' + cx + '" y="' + (cy + 5) + '">' +
        esc(n.label) + '</text>');
    });

    svg.push('</svg>');
    return svg.join('');
  }

  function renderAll(root) {
    var boxes = (root || document).querySelectorAll('.mermaid-box');
    if (global.mermaid && typeof global.mermaid.render === 'function') {
      Array.prototype.forEach.call(boxes, function (b, i) {
        var src = b.querySelector('.mermaid-src');
        if (!src) return;
        try {
          global.mermaid.render('mmd-svg-' + Date.now() + '-' + i, src.textContent,
            function (svg) { b.innerHTML = svg; });
          return;
        } catch (e) { /* 掉回自製渲染 */ }
      });
    }
    Array.prototype.forEach.call(boxes, function (b) {
      var src = b.querySelector('.mermaid-src');
      if (!src) return;
      var code = src.textContent;
      var svg = null;
      try { svg = render(code); } catch (e) { svg = null; }
      if (svg) {
        b.innerHTML = '<div class="flow-wrap">' + svg +
          '<button class="flow-src-btn" type="button">原始碼</button>' +
          '<pre class="mermaid-src" hidden>' + esc(code) + '</pre></div>';
      } else {
        b.innerHTML = '<div class="code-wrap"><div class="code-bar">' +
          '<span class="code-lang">mermaid</span></div>' +
          '<pre class="code"><code>' + esc(code) + '</code></pre></div>';
      }
    });
  }

  global.Diagram = { render: render, renderAll: renderAll, parse: parseFlow };
})(window);
