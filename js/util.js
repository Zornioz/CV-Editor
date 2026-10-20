/* Allgemeine Hilfsfunktionen: DOM-Builder, Sanitizer, Caret, Modals, Toasts */
(function () {
  const CV = (window.CV = window.CV || {});

  CV.$ = (s, r) => (r || document).querySelector(s);
  CV.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /** Hyperscript: h('div.a.b#id', {attrs}, ...children) */
  CV.h = function (tag, props, ...kids) {
    if (props && (typeof props !== 'object' || props.nodeType || Array.isArray(props))) {
      kids.unshift(props);
      props = null;
    }
    const parts = tag.split(/(?=[.#])/);
    let name = 'div';
    if (parts[0] && !/^[.#]/.test(parts[0])) name = parts.shift();
    const el = document.createElement(name);
    for (const p of parts) {
      if (p[0] === '.') el.classList.add(p.slice(1));
      else if (p[0] === '#') el.id = p.slice(1);
    }
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') v.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        else if (k === 'style' && typeof v === 'object') {
          for (const [sk, sv] of Object.entries(v)) {
            if (sk.startsWith('--')) el.style.setProperty(sk, sv);
            else el.style[sk] = sv;
          }
        } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else if (c.nodeType) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };

  CV.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  CV.clone = (o) => JSON.parse(JSON.stringify(o));

  CV.debounce = function (fn, ms) {
    let t;
    const d = (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
    d.flush = (...a) => {
      clearTimeout(t);
      fn(...a);
    };
    d.cancel = () => clearTimeout(t);
    return d;
  };

  CV.escapeHTML = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- HTML-Sanitizer für Rich-Text-Felder ---------- */
  const ALLOWED = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', UL: 'ul', OL: 'ol', LI: 'li', P: 'p', BR: 'br', DIV: 'p' };
  CV.sanitize = function (html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    const out = document.createElement('div');
    (function walk(src, dst) {
      for (const n of src.childNodes) {
        if (n.nodeType === 3) dst.appendChild(document.createTextNode(n.nodeValue.replace(/\xa0/g, ' ')));
        else if (n.nodeType === 1) {
          const t = ALLOWED[n.tagName];
          if (t) {
            const e = document.createElement(t);
            if (t !== 'br') walk(n, e);
            dst.appendChild(e);
          } else if (!['SCRIPT', 'STYLE', 'TEMPLATE', 'META', 'TITLE'].includes(n.tagName)) walk(n, dst);
        }
      }
    })(doc.body, out);
    return out.innerHTML;
  };
  CV.htmlToText = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent || '';
  };

  /* ---------- Caret ---------- */
  CV.caretOffset = function (el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const r = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(r.endContainer, r.endOffset);
    return pre.toString().length;
  };
  CV.setCaret = function (el, off) {
    const sel = window.getSelection();
    const range = document.createRange();
    if (off == null || off === 'end') {
      range.selectNodeContents(el);
      range.collapse(false);
    } else {
      let left = off;
      let placed = false;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (left <= n.nodeValue.length) {
          range.setStart(n, left);
          range.collapse(true);
          placed = true;
          break;
        }
        left -= n.nodeValue.length;
      }
      if (!placed) {
        range.selectNodeContents(el);
        range.collapse(off === 0);
      }
    }
    sel.removeAllRanges();
    sel.addRange(range);
  };

  /* ---------- Farben ---------- */
  CV.hexToRgb = (hex) => {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  CV.luminance = (hex) => {
    const [r, g, b] = CV.hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  CV.onColor = (hex) => (CV.luminance(hex) > 0.42 ? '#111827' : '#ffffff');

  CV.today = () => {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  };

  CV.fullName = (p) => [p.firstName, p.lastName].filter(Boolean).join(' ');

  /* ---------- Toast ---------- */
  CV.toast = function (msg, ms) {
    const box = CV.$('#toasts');
    if (!box) return;
    const t = CV.h('div.toast', msg);
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 250);
    }, ms || 2600);
  };

  /* ---------- Modal ---------- */
  CV.modal = function (opts) {
    const h = CV.h;
    const close = () => {
      back.classList.remove('in');
      setTimeout(() => back.remove(), 160);
      document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const actions = (opts.actions || []).map((a) =>
      h(
        'button.btn' + (a.primary ? '.primary' : '') + (a.danger ? '.danger' : ''),
        {
          type: 'button',
          onclick: () => {
            const r = a.fn ? a.fn() : null;
            if (r !== false) close();
          },
        },
        a.label
      )
    );
    const back = h(
      'div.modal-back',
      { onmousedown: (e) => e.target === back && close() },
      h(
        'div.modal' + (opts.wide ? '.wide' : ''),
        h('div.modal-head', h('h3', opts.title || ''), h('button.icon-btn', { type: 'button', title: 'Schließen', onclick: close }, CV.icon('x', 16))),
        h('div.modal-body', opts.body),
        actions.length ? h('div.modal-foot', actions) : null
      )
    );
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('in'));
    document.addEventListener('keydown', onKey, true);
    return close;
  };

  CV.confirm = function (title, text, okLabel, fn, danger) {
    CV.modal({
      title,
      body: CV.h('p.modal-text', text),
      actions: [{ label: 'Abbrechen' }, { label: okLabel || 'OK', primary: !danger, danger: !!danger, fn }],
    });
  };

  /** Bild laden, auf max. Kantenlänge verkleinern -> JPEG/PNG-Data-URL */
  CV.loadImage = function (file, maxSide, keepAlpha) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const k = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          const ctx = c.getContext('2d');
          if (!keepAlpha) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
          }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  CV.download = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };
})();
