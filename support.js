/* Runtime mínimo para os arquivos .dc.html do protótipo AGrisk fora do canvas. */
(function () {
  try { const st = document.createElement("style"); st.textContent = "x-dc{display:none}"; document.head.appendChild(st); } catch (e) {}
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(p) { const n = typeof p === 'function' ? p(this.state) : p; if (n && Object.keys(n).every((k) => this.state[k] === n[k])) return; this.state = Object.assign({}, this.state, n); this.__render && this.__render(); }
    forceUpdate() { this.__render && this.__render(); }
  }
  window.DCLogic = DCLogic;
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const EXACT = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  function get(scope, path) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function interp(str, scope) { return str.replace(HOLE, (_, p) => { const v = get(scope, p); return v == null ? '' : String(v); }); }
  function processChildren(parent, scope) { Array.from(parent.childNodes).forEach((n) => processNode(n, scope)); }
  function processNode(node, scope) {
    if (node.nodeType === 3) { if (node.nodeValue.indexOf('{{') > -1) node.nodeValue = interp(node.nodeValue, scope); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = get(scope, (node.getAttribute('list') || '').replace(/[{}]/g, '')) || [];
      const as = node.getAttribute('as') || 'item';
      const frag = document.createDocumentFragment();
      list.forEach((item, i) => {
        const s = Object.assign({}, scope, { [as]: item, $index: i });
        Array.from(node.childNodes).forEach((c) => { const cl = c.cloneNode(true); frag.appendChild(cl); processNode(cl, s); });
      });
      node.replaceWith(frag); return;
    }
    if (tag === 'sc-if') {
      const v = get(scope, (node.getAttribute('value') || '').replace(/[{}]/g, ''));
      if (v) { const frag = document.createDocumentFragment(); Array.from(node.childNodes).forEach((c) => frag.appendChild(c)); Array.from(frag.childNodes).forEach((c) => processNode(c, scope)); node.replaceWith(frag); }
      else node.remove();
      return;
    }
    Array.from(node.attributes).forEach((a) => {
      if (a.name.indexOf('hint-') === 0) { node.removeAttribute(a.name); return; }
      if (a.value.indexOf('{{') < 0) return;
      const m = a.value.match(EXACT);
      if (a.name.indexOf('on') === 0 && m) {
        const fn = get(scope, m[1]); node.removeAttribute(a.name);
        if (typeof fn === 'function') node.addEventListener(a.name.slice(2), fn);
        return;
      }
      node.setAttribute(a.name, interp(a.value, scope));
    });
    processChildren(node, scope);
  }
  function boot() {
    const host = document.querySelector('x-dc'); if (!host) return;
    const helmet = host.querySelector('helmet');
    if (helmet) { Array.from(helmet.children).forEach((c) => document.head.appendChild(c)); helmet.remove(); }
    const tpl = document.createElement('template'); tpl.innerHTML = host.innerHTML;
    const scr = document.querySelector('script[data-dc-script]');
    let Comp = DCLogic;
    if (scr) { try { Comp = new Function('DCLogic', scr.textContent + '\n;return Component;')(DCLogic); } catch (e) { console.error(e); } }
    const inst = new Comp({});
    if (!inst.state) inst.state = {};
    const mount = document.createElement('div'); mount.className = 'dc-root';
    host.replaceWith(mount);
    inst.__render = function () {
      const vals = inst.renderVals ? inst.renderVals() : {};
      const frag = tpl.content.cloneNode(true);
      Array.from(frag.childNodes).forEach((c) => processNode(c, vals));
      mount.replaceChildren(frag);
    };
    inst.__render();
    if (inst.componentDidMount) inst.componentDidMount();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
