/* =========================================================
 *  md.js  -  輕量 Markdown 解析器（純 JS，無外部相依）
 *  支援：標題 / 粗斜體 / 刪除線 / 行內碼 / 程式碼區塊 /
 *        表格 / 清單(含巢狀) / 引言 / 分隔線 / 連結 / 圖片 /
 *        任務清單 / mermaid 區塊標記 / 自動錨點
 * ========================================================= */
(function (global) {
  'use strict';

  var SQL_KW = ('select|from|where|and|or|not|in|exists|join|left|right|inner|outer|full|on|' +
    'group|by|order|having|union|all|insert|into|values|update|set|delete|create|table|view|' +
    'alter|drop|index|as|case|when|then|else|end|null|is|like|between|distinct|count|sum|avg|' +
    'min|max|round|nvl|decode|to_char|to_date|to_number|substr|trim|with|partition|over|' +
    'rownum|desc|asc|cast|coalesce|primary|key|foreign|references|constraint|number|varchar2|' +
    'date|clob|commit|rollback').split('|');

  var JS_KW = ('var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|' +
    'new|this|typeof|instanceof|try|catch|finally|throw|class|extends|super|import|export|' +
    'default|async|await|yield|null|undefined|true|false|delete|in|of').split('|');

  var VBA_KW = ('Sub|End|Function|Dim|As|Set|If|Then|Else|ElseIf|For|Each|Next|To|Do|Loop|' +
    'While|Wend|Select|Case|With|Exit|On|Error|GoTo|Resume|Const|Public|Private|ByVal|ByRef|' +
    'Option|Explicit|String|Long|Integer|Double|Boolean|Variant|Object|Nothing|True|False|' +
    'Call|ReDim|Preserve|Range|Cells|Workbook|Worksheet').split('|');

  var CS_KW = ('using|namespace|public|private|protected|internal|class|struct|interface|void|' +
    'string|int|long|double|decimal|bool|var|new|return|if|else|foreach|for|while|switch|case|' +
    'break|continue|try|catch|finally|throw|static|readonly|const|async|await|null|true|false|' +
    'this|base|override|virtual|abstract|get|set').split('|');

  var KW_MAP = {
    sql: SQL_KW, plsql: SQL_KW, oracle: SQL_KW,
    js: JS_KW, javascript: JS_KW, json: JS_KW,
    vb: VBA_KW, vba: VBA_KW, basic: VBA_KW,
    cs: CS_KW, csharp: CS_KW, 'c#': CS_KW
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 程式碼高亮（自製，離線） ---------- */
  function highlight(code, lang) {
    lang = (lang || '').toLowerCase();
    var kws = KW_MAP[lang];
    var html = esc(code);
    var store = [];
    // 以私有區字元當佔位符，避免後續的數字/關鍵字規則吃掉索引
    function keep(cls, txt) {
      store.push('<span class="tok-' + cls + '">' + txt + '</span>');
      return String.fromCharCode(0xE000 + store.length - 1);
    }
    // 註解
    html = html.replace(/(--[^\n]*|\/\/[^\n]*|#[^\n]*|'[^\n]*(?=\n|$))/g, function (m) {
      if (lang === 'sql' && m.charAt(0) === '#') return m;
      return keep('cmt', m);
    });
    html = html.replace(/\/\*[\s\S]*?\*\//g, function (m) { return keep('cmt', m); });
    // 字串
    html = html.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;|'[^'\n]*')/g, function (m) {
      return keep('str', m);
    });
    // 關鍵字
    if (kws && kws.length) {
      var re = new RegExp('\\b(' + kws.join('|') + ')\\b', 'gi');
      html = html.replace(re, function (m) { return keep('kw', m); });
    }
    // 數字
    html = html.replace(/(^|[^\w$\uE000-\uF8FF])(\d+(?:\.\d+)?)\b/g,
      function (_, pre, n) { return pre + keep('num', n); });
    // 還原（可能巢狀，重複展開直到沒有佔位符）
    for (var g = 0; g < 6 && /[\uE000-\uF8FF]/.test(html); g++) {
      html = html.replace(/[\uE000-\uF8FF]/g, function (ch) {
        return store[ch.charCodeAt(0) - 0xE000];
      });
    }
    return html;
  }

  /* ---------- 行內語法 ---------- */
  function inline(s) {
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) {
      codes.push('<code class="inline">' + esc(c) + '</code>');
      return '\u0001' + (codes.length - 1) + '\u0001';
    });
    s = esc(s);
    // 圖片
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
      '<img src="$2" alt="$1">');
    // 連結
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
      var ext = /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + u + '"' + ext + '>' + t + '</a>';
    });
    // 裸網址
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return codes[+i]; });
    return s;
  }

  function slug(t) {
    return String(t).trim().toLowerCase()
      .replace(/[`*_~\[\]()#!]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]/g, '');
  }

  /* ---------- 主解析 ---------- */
  function parse(src, opts) {
    opts = opts || {};
    var toc = [];
    var lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var out = [];
    var i = 0, mid = 0;

    function listBlock(baseIndent) {
      var html = '';
      var first = lines[i];
      var ordered = /^\s*\d+[.)]\s+/.test(first);
      html += ordered ? '<ol>' : '<ul>';
      while (i < lines.length) {
        var ln = lines[i];
        if (!/^\s*(?:[-*+]|\d+[.)])\s+/.test(ln)) {
          if (/^\s*$/.test(ln) &&
            i + 1 < lines.length &&
            /^\s{2,}(?:[-*+]|\d+[.)])\s+/.test(lines[i + 1])) { i++; continue; }
          break;
        }
        var indent = ln.match(/^\s*/)[0].length;
        if (indent < baseIndent) break;
        if (indent >= baseIndent + 2) { html += listBlock(indent); continue; }
        var isOrd = /^\s*\d+[.)]\s+/.test(ln);
        if (isOrd !== ordered && indent === baseIndent) break;
        var txt = ln.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
        var task = '';
        var m = txt.match(/^\[([ xX])\]\s+/);
        if (m) {
          task = '<input type="checkbox" disabled' +
            (m[1].toLowerCase() === 'x' ? ' checked' : '') + '> ';
          txt = txt.replace(/^\[([ xX])\]\s+/, '');
        }
        html += '<li' + (task ? ' class="task"' : '') + '>' + task + inline(txt);
        i++;
        // 續行
        while (i < lines.length &&
          /^\s+\S/.test(lines[i]) &&
          !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
          html += '<br>' + inline(lines[i].trim());
          i++;
        }
        if (i < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
          var nx = lines[i].match(/^\s*/)[0].length;
          if (nx >= baseIndent + 2) { html += listBlock(nx); }
        }
        html += '</li>';
      }
      html += ordered ? '</ol>' : '</ul>';
      return html;
    }

    while (i < lines.length) {
      var line = lines[i];

      /* 程式碼 / mermaid 區塊 */
      var fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w#+-]*)\s*$/);
      if (fence) {
        var mark = fence[1].charAt(0), len = fence[1].length, lang = fence[2] || '';
        var buf = [];
        i++;
        while (i < lines.length) {
          var e = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/);
          if (e && e[1].charAt(0) === mark && e[1].length >= len) { i++; break; }
          buf.push(lines[i]); i++;
        }
        var code = buf.join('\n');
        if (/^mermaid$/i.test(lang)) {
          out.push('<div class="mermaid-box" id="mmd' + (mid++) + '">' +
            '<pre class="mermaid-src">' + esc(code) + '</pre></div>');
        } else {
          out.push('<div class="code-wrap">' +
            '<div class="code-bar"><span class="code-lang">' +
            esc(lang || 'text') + '</span>' +
            '<button class="code-copy" type="button">複製</button></div>' +
            '<pre class="code"><code>' + highlight(code, lang) + '</code></pre></div>');
        }
        continue;
      }

      /* 標題 */
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lv = h[1].length, txt = h[2].replace(/\s*#+\s*$/, '');
        var id = slug(txt) || ('h-' + toc.length);
        var n = 2, tid = id;
        while (toc.some(function (t) { return t.id === tid; })) { tid = id + '-' + (n++); }
        toc.push({ level: lv, text: txt.replace(/[`*_]/g, ''), id: tid });
        out.push('<h' + lv + ' id="' + tid + '">' + inline(txt) +
          '<a class="anchor" href="#' + tid + '">#</a></h' + lv + '>');
        i++; continue;
      }

      /* 分隔線 */
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) { out.push('<hr>'); i++; continue; }

      /* 表格 */
      if (/\|/.test(line) && i + 1 < lines.length &&
        /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        var cut = function (r) {
          return r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) {
            return c.trim();
          });
        };
        var head = cut(line), al = cut(lines[i + 1]).map(function (c) {
          if (/^:.*:$/.test(c)) return 'center';
          if (/:$/.test(c)) return 'right';
          return 'left';
        });
        i += 2;
        var t = '<div class="table-wrap"><table><thead><tr>';
        head.forEach(function (c, k) {
          t += '<th style="text-align:' + (al[k] || 'left') + '">' + inline(c) + '</th>';
        });
        t += '</tr></thead><tbody>';
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
          var cells = cut(lines[i]);
          t += '<tr>';
          cells.forEach(function (c, k) {
            t += '<td style="text-align:' + (al[k] || 'left') + '">' + inline(c) + '</td>';
          });
          t += '</tr>'; i++;
        }
        out.push(t + '</tbody></table></div>');
        continue;
      }

      /* 引言 */
      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^\s*>\s?/, '')); i++;
        }
        var cls = '';
        var flag = q[0] || '';
        if (/^\s*(\[!NOTE\]|注意|備註)/i.test(flag)) cls = ' note';
        if (/^\s*(\[!WARNING\]|警告|注意事項)/i.test(flag)) cls = ' warn';
        if (/^\s*(\[!TIP\]|提示)/i.test(flag)) cls = ' tip';
        q[0] = flag.replace(/^\s*\[![A-Z]+\]\s*/i, '');
        out.push('<blockquote class="bq' + cls + '">' +
          parse(q.join('\n')).html + '</blockquote>');
        continue;
      }

      /* 清單 */
      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
        out.push(listBlock(line.match(/^\s*/)[0].length));
        continue;
      }

      /* 空行 */
      if (/^\s*$/.test(line)) { i++; continue; }

      /* 原生 HTML */
      if (/^\s*<(\/?)(div|table|img|br|hr|p|span|details|summary|section)/i.test(line)) {
        out.push(line); i++; continue;
      }

      /* 段落 */
      var p = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
        !/^\s*(#{1,6}\s|>|\s*(?:[-*+]|\d+[.)])\s|`{3,}|~{3,})/.test(lines[i])) {
        p.push(lines[i]); i++;
      }
      if (p.length) out.push('<p>' + inline(p.join('\n')).replace(/\n/g, '<br>') + '</p>');
      else i++;
    }

    return { html: out.join('\n'), toc: toc };
  }

  global.MD = { parse: parse, highlight: highlight, slug: slug, escape: esc };

})(window);
