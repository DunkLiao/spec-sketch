/* =========================================================
 *  app.js  -  SPEC 文件站主程式
 * ========================================================= */
(function () {
  'use strict';

  var CFG = null;
  var INDEX = [];
  var current = { project: null, file: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    bindUI();
    loadIndex();
  });

  function loadIndex() {
    fetchText('spec-index.json')
      .then(function (txt) {
        var data = JSON.parse(txt);
        CFG = data.site || {};
        INDEX = data.projects || [];
        applySite();
        buildMenu();
        buildIndexPage();
        preloadForSearch();
        routeFromHash();
      })
      .catch(function (e) {
        $('#content').innerHTML =
          '<div class="err"><h2>無法載入 spec-index.json</h2>' +
          '<p>請確認檔案存在，且網站是以 <b>HTTP 方式</b> 開啟（IIS / 本機伺服器）。</p>' +
          '<p>若你直接用 <code>file://</code> 點開 index.html，瀏覽器會因安全限制擋下 fetch。</p>' +
          '<p>快速啟動：雙擊 <code>start_server.bat</code></p>' +
          '<pre class="code"><code>' + esc(String(e)) + '</code></pre></div>';
      });
  }

  function applySite() {
    if (CFG.title) {
      $('#site-title').textContent = CFG.title;
      document.title = CFG.title;
    }
    if (CFG.subtitle) $('#site-sub').textContent = CFG.subtitle;
  }

  function fetchText(url) {
    return fetch(encodeURI(url) + '?t=' + Date.now()).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText + ' → ' + url);
      return r.text();
    });
  }

  /* ---------------- 左側選單 ---------------- */
  function buildMenu() {
    var html = '';
    INDEX.forEach(function (p, pi) {
      html += '<div class="grp" data-grp="' + pi + '">' +
        '<div class="grp-h" data-toggle="' + pi + '">' +
        '<span class="caret">▸</span><span class="grp-name">' + esc(p.project) + '</span>' +
        '<span class="grp-cnt">' + p.files.length + '</span></div><div class="grp-b">';
      p.files.forEach(function (f) {
        var name = typeof f === 'string' ? f : f.file;
        var title = (typeof f === 'string' ? f : (f.title || f.file)).replace(/\.md$/i, '');
        html += '<a class="doc-link" href="#/' + encodeURIComponent(p.project) + '/' +
          encodeURIComponent(name) + '" data-p="' + esc(p.project) + '" data-f="' +
          esc(name) + '">' + esc(title) + '</a>';
      });
      html += '</div></div>';
    });
    $('#menu').innerHTML = html;
    $$('#menu .grp-h').forEach(function (h) {
      h.addEventListener('click', function () {
        h.parentNode.classList.toggle('open');
      });
    });
  }

  /* ---------------- 首頁 ---------------- */
  function buildIndexPage() {
    var total = INDEX.reduce(function (a, p) { return a + p.files.length; }, 0);
    var cards = INDEX.map(function (p) {
      var lis = p.files.slice(0, 6).map(function (f) {
        var name = typeof f === 'string' ? f : f.file;
        var t = (typeof f === 'string' ? f : (f.title || f.file)).replace(/\.md$/i, '');
        return '<a href="#/' + encodeURIComponent(p.project) + '/' + encodeURIComponent(name) +
          '">' + esc(t) + '</a>';
      }).join('');
      var more = p.files.length > 6 ? '<span class="more">+' + (p.files.length - 6) + '</span>' : '';
      return '<div class="card"><h3>' + esc(p.project) + '</h3>' +
        '<div class="card-files">' + lis + more + '</div>' +
        '<div class="card-foot">' + p.files.length + ' 份文件</div></div>';
    }).join('');

    window.__homeHTML =
      '<div class="home"><h1>' + esc(CFG.title || '規格文件庫') + '</h1>' +
      '<p class="home-sub">' + esc(CFG.subtitle || '') + '</p>' +
      '<div class="stats"><div class="stat"><b>' + INDEX.length + '</b><span>專案</span></div>' +
      '<div class="stat"><b>' + total + '</b><span>文件</span></div>' +
      '<div class="stat"><b>0</b><span>資料庫</span></div></div>' +
      '<div class="cards">' + cards + '</div></div>';
  }

  /* ---------------- 搜尋索引預載 ---------------- */
  function preloadForSearch() {
    var jobs = [];
    INDEX.forEach(function (p) {
      p.files.forEach(function (f) {
        var name = typeof f === 'string' ? f : f.file;
        var title = (typeof f === 'string' ? f : (f.title || f.file)).replace(/\.md$/i, '');
        var path = 'specs/' + p.project + '/' + name;
        jobs.push(fetchText(path).then(function (md) {
          SpecSearch.add({ project: p.project, file: name, path: path, title: title, raw: md });
        }).catch(function () { }));
      });
    });
    Promise.all(jobs).then(function () {
      SpecSearch.setReady(true);
      $('#search').placeholder = '搜尋全部 ' + SpecSearch.docs().length + ' 份文件…（Ctrl+K）';
    });
  }

  /* ---------------- 路由 ---------------- */
  window.addEventListener('hashchange', routeFromHash);

  function routeFromHash() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (!h) { showHome(); return; }
    var parts = h.split('/');
    var anchor = '';
    if (parts.length >= 2) {
      var last = parts[parts.length - 1];
      if (last.indexOf('#') === 0) { anchor = last.substr(1); parts.pop(); }
      loadDoc(parts[0], parts.slice(1).join('/'), anchor);
    } else showHome();
  }

  function showHome() {
    current = { project: null, file: null };
    $('#content').innerHTML = window.__homeHTML || '';
    $('#toc').innerHTML = '';
    $('#crumb').innerHTML = '首頁';
    $$('#menu .doc-link').forEach(function (a) { a.classList.remove('active'); });
    window.scrollTo(0, 0);
  }

  function loadDoc(project, file, anchor) {
    var path = 'specs/' + project + '/' + file;
    $('#content').innerHTML = '<div class="loading">載入中…</div>';
    fetchText(path).then(function (md) {
      current = { project: project, file: file };
      var r = MD.parse(md);
      $('#content').innerHTML =
        '<article class="doc">' + r.html +
        '<div class="doc-foot">檔案位置：<code>' + esc(path) + '</code></div></article>';
      buildTOC(r.toc);
      $('#crumb').innerHTML = '<a href="#/">首頁</a> <i>/</i> ' + esc(project) +
        ' <i>/</i> <b>' + esc(file.replace(/\.md$/i, '')) + '</b>';
      Diagram.renderAll($('#content'));
      bindCopy();
      bindFlowSrc();
      markActive(project, file);
      if (anchor) {
        var el = document.getElementById(anchor);
        if (el) el.scrollIntoView();
      } else window.scrollTo(0, 0);
      closeSearch();
    }).catch(function (e) {
      $('#content').innerHTML = '<div class="err"><h2>找不到文件</h2><p><code>' +
        esc(path) + '</code></p><pre class="code"><code>' + esc(String(e)) +
        '</code></pre></div>';
    });
  }

  function markActive(p, f) {
    $$('#menu .doc-link').forEach(function (a) {
      var on = a.getAttribute('data-p') === p && a.getAttribute('data-f') === f;
      a.classList.toggle('active', on);
      if (on) {
        var grp = a.closest('.grp');
        if (grp) grp.classList.add('open');
      }
    });
  }

  /* ---------------- 右側目錄 ---------------- */
  function buildTOC(toc) {
    if (!toc || toc.length < 2) { $('#toc').innerHTML = ''; return; }
    var min = Math.min.apply(null, toc.map(function (t) { return t.level; }));
    var html = '<div class="toc-h">本頁目錄</div>';
    toc.forEach(function (t) {
      if (t.level - min > 2) return;
      html += '<a class="toc-i lv' + (t.level - min) + '" href="#' + t.id + '">' +
        esc(t.text) + '</a>';
    });
    $('#toc').innerHTML = html;
    $$('#toc .toc-i').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = document.getElementById(a.getAttribute('href').substr(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    bindScrollSpy();
  }

  function bindScrollSpy() {
    var items = $$('#toc .toc-i');
    if (!items.length) return;
    var onScroll = function () {
      var best = null, bestTop = -1e9;
      items.forEach(function (a) {
        var el = document.getElementById(a.getAttribute('href').substr(1));
        if (!el) return;
        var top = el.getBoundingClientRect().top - 90;
        if (top <= 0 && top > bestTop) { bestTop = top; best = a; }
      });
      items.forEach(function (a) { a.classList.toggle('on', a === best); });
    };
    window.removeEventListener('scroll', window.__spy);
    window.__spy = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- 互動 ---------------- */
  function bindUI() {
    var box = $('#search');
    var timer = null;
    box.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { doSearch(box.value); }, 140);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { box.value = ''; closeSearch(); box.blur(); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); box.focus(); box.select();
      }
    });
    $('#theme').addEventListener('click', toggleTheme);
    $('#menu-btn').addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    $('#print-btn').addEventListener('click', function () { window.print(); });
    $('#expand-btn').addEventListener('click', function () {
      var anyClosed = $$('#menu .grp').some(function (g) { return !g.classList.contains('open'); });
      $$('#menu .grp').forEach(function (g) { g.classList.toggle('open', anyClosed); });
    });
    $('#results').addEventListener('click', function (e) {
      var a = e.target.closest('.res');
      if (!a) return;
      location.hash = a.getAttribute('data-href');
      closeSearch();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-box')) closeSearch();
    });
  }

  function doSearch(q) {
    var box = $('#results');
    if (!q || q.trim().length < 1) { closeSearch(); return; }
    if (!SpecSearch.isReady()) {
      box.innerHTML = '<div class="res-info">索引建立中，請稍候…</div>';
      box.hidden = false; return;
    }
    var res = SpecSearch.query(q, 25);
    if (!res.length) {
      box.innerHTML = '<div class="res-info">查無結果：' + esc(q) + '</div>';
      box.hidden = false; return;
    }
    box.innerHTML = '<div class="res-info">找到 ' + res.length + ' 筆</div>' +
      res.map(function (r) {
        var d = r.doc;
        return '<div class="res" data-href="#/' + encodeURIComponent(d.project) + '/' +
          encodeURIComponent(d.file) + '">' +
          '<div class="res-t">' + esc(d.title) + '</div>' +
          '<div class="res-p">' + esc(d.project) + ' / ' + esc(d.file) + '</div>' +
          '<div class="res-s">' + r.snippet + '</div></div>';
      }).join('');
    box.hidden = false;
  }

  function closeSearch() { $('#results').hidden = true; }

  function bindCopy() {
    $$('#content .code-copy').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.closest('.code-wrap').querySelector('code').innerText;
        var ok = function () { b.textContent = '已複製'; setTimeout(function () { b.textContent = '複製'; }, 1400); };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(code).then(ok);
        } else {
          var ta = document.createElement('textarea');
          ta.value = code; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); ok(); } catch (e) { }
          document.body.removeChild(ta);
        }
      });
    });
  }

  function bindFlowSrc() {
    $$('#content .flow-src-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var pre = b.parentNode.querySelector('.mermaid-src');
        pre.hidden = !pre.hidden;
        b.textContent = pre.hidden ? '原始碼' : '收合';
      });
    });
  }

  /* ---------------- 主題 ---------------- */
  function initTheme() {
    var t = localStorage.getItem('spec-theme');
    if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    var nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nx);
    localStorage.setItem('spec-theme', nx);
    if (current.project && current.file) Diagram.renderAll(document.getElementById('content'));
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
