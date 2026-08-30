"""Bundle the whole site into ONE standalone .html file.

    python3 tools/build-preview.py

Writes shosh-nail-preview.html next to the site. That single file contains every
page, stylesheet and script, so it can be emailed, put on any host, or opened by
double-clicking - useful for showing the site to someone before it is published.

It is only a viewer: file downloads (design image, backup export) are disabled in
some embedded viewers, so use the real site for those.
"""

import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT  = ROOT / 'shosh-nail-preview.html'
PAGES = ['index.html', 'design.html', 'shop.html', 'faq.html', 'admin.html', '404.html']

assets = {str(p.relative_to(ROOT)): p.read_text(encoding='utf-8')
          for p in sorted((ROOT / 'assets').rglob('*'))
          if p.is_file() and p.suffix in ('.css', '.js')}
pages = {n: (ROOT / n).read_text(encoding='utf-8') for n in PAGES}

def js(s):
    """JSON-encode, then neutralise </script> so the literal cannot close the tag."""
    return json.dumps(s).replace('</', '<\\/')

# Injected into every page. Kept as its own source string so nothing is escaped twice.
SHIM = r'''
(function () {
  function go(href) {
    var m = href.match(/^([A-Za-z0-9_.-]+\.html)(#.*)?$/);
    if (!m) return null;
    return m;
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if (/^(https?:|mailto:|tel:|blob:|data:|#)/.test(href)) return;
    var m = go(href);
    if (!m) return;
    e.preventDefault();
    parent.__go(m[1], m[2] || '');
  }, true);
})();
'''

SHELL = r'''
function build(name) {
  var html = PAGES[name] || PAGES['index.html'];
  var scripts = [];
  html = html.replace(/<link[^>]+href="(assets\/css\/[^"]+)"[^>]*>/g, function (m, path) {
    return ASSETS[path] ? '<style>' + ASSETS[path] + '</style>' : '';
  });
  /* Inline scripts are blocked by any still-pending stylesheet, so load the web
     font asynchronously. The page then renders immediately and the font swaps in. */
  html = html.replace(/<link([^>]*href="https:\/\/fonts\.googleapis\.com[^"]*")([^>]*)>/g,
    '<link$1$2 media="print" onload="this.media=\'all\'">');
  html = html.replace(/<script[^>]*src="(assets\/js\/[^"]+)"[^>]*><\/script>/g, function (m, path) {
    if (ASSETS[path]) scripts.push(ASSETS[path]);
    return '';
  });
  var tags = scripts.concat([SHIM]).map(function (s) {
    return '<scr' + 'ipt>' + s + '</scr' + 'ipt>';
  }).join('\n');
  return html.replace(/<\/body>/i, tags + '</body>');
}

/* A blob: URL is a real, same-origin URL, so pages inside the frame can use
   location.hash (the studio and the shop both rely on it) and localStorage,
   without the frame reloading itself into a blank document. */
var fr = document.getElementById('fr');
var lastURL = '';
window.__go = function (name, hash) {
  var url = URL.createObjectURL(new Blob([build(name)], { type: 'text/html' }));
  var prev = lastURL;
  lastURL = url;
  fr.src = url + (hash || '');
  if (prev) setTimeout(function () { try { URL.revokeObjectURL(prev); } catch (e) {} }, 4000);
  var want = '#' + name.replace('.html', '') + (hash || '');
  if (location.hash !== want) history.replaceState(null, '', want);
};

var raw = (location.hash || '').replace(/^#/, '');
var page = raw.split('#')[0];
var rest = raw.slice(page.length);
if (!/^(index|design|shop|faq|admin|404)$/.test(page)) { page = 'index'; rest = ''; }
fr.addEventListener('load', function () {
  var boot = document.getElementById('boot');
  if (boot) boot.remove();
});
__go(page + '.html', rest);
'''

parts = [
  '<title>شوش نيل — Shosh Nail</title>',
  # The shell is deliberately invisible: the site inside carries its own identity
  # (rose/plum/gold, Reem Kufi + Tajawal, RTL-first). All this does is hold the
  # frame and paint a matching ground so nothing flashes through on either theme.
  '<style>'
  ':root{--ground:#FCF7F5;--mark:#A85A73}'
  '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#171014;--mark:#E29BB0}}'
  ':root[data-theme="dark"]{--ground:#171014;--mark:#E29BB0}'
  'html,body{margin:0;height:100%;background:var(--ground)}'
  '#fr{border:0;width:100%;height:100vh;height:100dvh;display:block;background:var(--ground)}'
  '#boot{position:fixed;inset:0;display:grid;place-items:center;gap:14px;z-index:9;'
  'background:var(--ground);color:var(--mark);align-content:center;'
  "font:600 15px/1.7 'Tajawal',system-ui,-apple-system,sans-serif}"
  '#boot svg{width:34px;height:34px;animation:bp 1.6s var(--e,cubic-bezier(.4,0,.2,1)) infinite}'
  '@keyframes bp{0%,100%{opacity:.45;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}'
  '@media (prefers-reduced-motion:reduce){#boot svg{animation:none;opacity:1}}'
  '</style>',
  '<div id="boot">'
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" '
  'd="M12 2.6c3.1 0 4.9 1.9 4.9 4.7 0 2.6-.6 4.9-1 7.1-.5 2.8-1 5.3-3.9 5.3s-3.4-2.5-3.9-5.3'
  'c-.4-2.2-1-4.5-1-7.1 0-2.8 1.8-4.7 4.9-4.7Z"/></svg>'
  '<span>جاري تحميل شوش نيل…</span></div>',
  '<iframe id="fr" title="شوش نيل — Shosh Nail"></iframe>',
  '<scr' + 'ipt>',
  'var ASSETS={};var PAGES={};',
]
for k, v in assets.items():
    parts.append('ASSETS[%s]=%s;' % (js(k), js(v)))
for k, v in pages.items():
    parts.append('PAGES[%s]=%s;' % (js(k), js(v)))
parts.append('var SHIM=%s;' % js(SHIM))
parts.append(SHELL)
parts.append('</scr' + 'ipt>')

OUT.write_text('\n'.join(parts), encoding='utf-8')
print('written', OUT.name, round(OUT.stat().st_size / 1048576, 2), 'MB')
