/* =========================================================
 *  search.js  -  離線全文搜尋（支援中文 bi-gram + 英數字詞）
 *  無需 Lunr.js，無需資料庫，索引建在瀏覽器記憶體
 * ========================================================= */
(function (global) {
  'use strict';

  var docs = [];          // {id, project, file, title, text, lower}
  var idx = {};           // token -> {docId: freq}
  var ready = false;

  function tokenize(s) {
    var t = [], lower = s.toLowerCase();
    var m = lower.match(/[a-z0-9_\.]{2,}/g);
    if (m) t = t.concat(m);
    var cjk = lower.match(/[\u4e00-\u9fff]+/g);
    if (cjk) {
      cjk.forEach(function (seg) {
        if (seg.length === 1) { t.push(seg); return; }
        for (var i = 0; i < seg.length - 1; i++) t.push(seg.substr(i, 2));
        for (var j = 0; j < seg.length - 2; j++) t.push(seg.substr(j, 3));
      });
    }
    return t;
  }

  function plain(md) {
    return String(md)
      .replace(/```[\s\S]*?```/g, function (b) { return b.replace(/```/g, ' '); })
      .replace(/[#>*_`~|\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function add(doc) {
    var id = docs.length;
    var text = plain(doc.raw);
    docs.push({
      id: id, project: doc.project, file: doc.file, path: doc.path,
      title: doc.title || doc.file, text: text, lower: text.toLowerCase(),
      raw: doc.raw
    });
    var toks = tokenize(doc.title + ' ' + doc.project + ' ' + text);
    toks.forEach(function (tk) {
      if (!idx[tk]) idx[tk] = {};
      idx[tk][id] = (idx[tk][id] || 0) + 1;
    });
    tokenize(doc.title + ' ' + doc.project).forEach(function (tk) {
      idx[tk][id] += 8;
    });
  }

  function query(q, limit) {
    limit = limit || 30;
    q = String(q || '').trim();
    if (!q) return [];
    var toks = tokenize(q);
    var score = {};
    toks.forEach(function (tk) {
      var post = idx[tk];
      if (!post) return;
      var idf = Math.log(1 + docs.length / Object.keys(post).length);
      for (var d in post) {
        score[d] = (score[d] || 0) + post[d] * idf;
      }
    });
    var ql = q.toLowerCase();
    docs.forEach(function (d) {
      if (d.lower.indexOf(ql) >= 0) score[d.id] = (score[d.id] || 0) + 60;
      if (d.title.toLowerCase().indexOf(ql) >= 0) score[d.id] = (score[d.id] || 0) + 120;
    });
    var res = Object.keys(score).map(function (d) {
      return { doc: docs[d], score: score[d], snippet: snippet(docs[d], q) };
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, limit);
  }

  function snippet(doc, q) {
    var ql = q.toLowerCase(), pos = doc.lower.indexOf(ql);
    if (pos < 0) {
      var toks = tokenize(q);
      for (var i = 0; i < toks.length; i++) {
        pos = doc.lower.indexOf(toks[i]);
        if (pos >= 0) { ql = toks[i]; break; }
      }
    }
    if (pos < 0) return doc.text.substr(0, 110) + '…';
    var s = Math.max(0, pos - 45);
    var raw = doc.text.substr(s, 150);
    var esc = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var re = new RegExp('(' + ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return (s > 0 ? '…' : '') + esc.replace(re, '<mark>$1</mark>') + '…';
  }

  global.SpecSearch = {
    add: add,
    query: query,
    docs: function () { return docs; },
    setReady: function (v) { ready = v; },
    isReady: function () { return ready; },
    reset: function () { docs = []; idx = {}; ready = false; }
  };
})(window);
