/* Renderer: baut aus den Projektdaten editierbare Blöcke und verteilt sie
   per Messung auf echte A4-Seiten (Spalten werden unabhängig voneinander gefüllt). */
(function () {
  const CV = (window.CV = window.CV || {});
  const { h, icon, sanitize } = CV;

  const pd = (e) => e.preventDefault();
  const move = (arr, i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return true;
  };
  const dupItem = (it) => {
    const c = CV.clone(it);
    c.id = CV.uid();
    return c;
  };
  const FIRST_KEY = { timeline: 'title', skills: 'name', languages: 'name', tags: 'name', facts: 'label' };

  function plainPaste(e) {
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, t);
  }
  function richPaste(e) {
    e.preventDefault();
    const cd = e.clipboardData || window.clipboardData;
    const html = cd.getData('text/html');
    const txt = cd.getData('text/plain');
    if (html) document.execCommand('insertHTML', false, sanitize(html));
    else document.execCommand('insertHTML', false, CV.escapeHTML(txt).replace(/\r?\n/g, '<br>'));
  }
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }

  function Renderer(project, docType, opts) {
    opts = opts || {};
    this.P = project;
    this.docType = docType;
    this.edit = opts.edit !== false;
    this.cb = opts.cb || {};
    this.preview = false;
    this.root = h('div.paper');
    this.pages = [];
    this.blocks = { head: [], side: [], main: [] };
    this.pendingFocus = null;
    this._timer = 0;
  }
  CV.Renderer = Renderer;
  const R = Renderer.prototype;

  Object.defineProperty(R, 'T', { get() { return CV.TEMPLATES[this.P.design.template] || CV.TEMPLATES.modern; } });

  /* ---------- Design -> CSS-Variablen / Klassen ---------- */
  R.applyDesign = function () {
    const D = this.P.design, T = this.T, F = CV.FONTS[D.font] || CV.FONTS.inter, r = this.root;
    const noedit = !this.edit || this.preview;
    r.className = ['paper', 'tpl-' + T.id, 'doc-' + this.docType, 'sk-' + D.skills, 'ps-' + D.photoShape,
      D.icons ? 'icons' : 'noicons', D.caps ? 'caps' : 'nocaps', noedit ? 'noedit' : ''].filter(Boolean).join(' ');
    const set = (k, v) => r.style.setProperty(k, v);
    set('--accent', D.accent);
    set('--on-accent', CV.onColor(D.accent));
    set('--fs', D.size);
    set('--lh', D.lh);
    set('--pm', D.margin + 'mm');
    set('--sg', D.gap);
    set('--font-body', F.body);
    set('--font-head', F.head);
    this.layout = this.docType === 'cv' ? T.layout : 'single';
    this.headRegion = this.docType === 'cv' ? T.headRegion : this.docType === 'letter';
  };

  R.colNames = function () {
    return this.layout === 'single' ? ['main'] : this.layout === 'side-left' ? ['side', 'main'] : ['main', 'side'];
  };

  R.setPreview = function (on) {
    this.preview = !!on;
    this.root.classList.toggle('noedit', !this.edit || this.preview);
    if (this.edit) this.root.querySelectorAll('.ed').forEach((e) => (e.contentEditable = on ? 'false' : 'true'));
    this.paginate();
  };

  /* ---------- Seiten ---------- */
  R.newPage = function () {
    const body = h('div.page-body');
    const cols = {};
    for (const c of this.colNames()) {
      cols[c] = h('div.col.col-' + c);
      body.appendChild(cols[c]);
    }
    const head = h('div.page-head');
    const el = h('div.page.layout-' + this.layout, head, body);
    return { el, head, body, cols };
  };
  R.getPage = function (i) {
    while (this.pages.length <= i) {
      const p = this.newPage();
      p.el.dataset.n = this.pages.length + 1;
      this.pages.push(p);
      this.root.appendChild(p.el);
    }
    return this.pages[i];
  };

  /* ---------- Build ---------- */
  R.build = function () {
    const oldH = this.root.offsetHeight;
    if (oldH) this.root.style.minHeight = oldH + 'px';
    this.applyDesign();
    this.root.textContent = '';
    this.pages = [];
    this.blocks = { head: [], side: [], main: [] };
    if (this.docType === 'cv') this.buildCV();
    else if (this.docType === 'letter') this.buildLetter();
    else this.buildCover();
    this.getPage(0);
    this.paginate();
    this.root.style.minHeight = '';
    if (this.pendingFocus) {
      const f = this.pendingFocus;
      this.pendingFocus = null;
      this.applyFocus(f);
    }
  };

  R.applyFocus = function (f) {
    if (!f || !this.edit) return;
    let scope = f.id ? this.root.querySelector('[data-id="' + f.id + '"]') : null;
    if (!scope) return;
    let t = f.key ? scope.querySelector('.ed[data-key="' + f.key + '"]') || (scope.matches('.ed[data-key="' + f.key + '"]') ? scope : null) : null;
    if (!t) t = scope.querySelector('.ed');
    if (!t) return;
    t.focus({ preventScroll: false });
    CV.setCaret(t, f.pos == null ? 'end' : f.pos);
    t.scrollIntoView({ block: 'nearest' });
  };

  R.touch = function () {
    if (this.cb.touch) this.cb.touch();
    this.schedulePaginate();
  };
  R.schedulePaginate = function () {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.paginate(), 90);
  };
  R.restructure = function (focus) {
    if (this.cb.restructure) this.cb.restructure(focus);
    else {
      this.pendingFocus = focus || null;
      this.build();
    }
  };

  /* ---------- Editierbare Felder ---------- */
  R.focusNext = function (el, dir) {
    const all = Array.from(this.root.querySelectorAll('.ed[contenteditable="true"]'));
    const n = all[all.indexOf(el) + (dir || 1)];
    if (n) {
      n.focus();
      CV.setCaret(n, dir < 0 ? 'end' : 0);
    }
  };

  R.ed = function (obj, key, o) {
    o = o || {};
    const el = document.createElement(o.tag || 'span');
    el.className = 'ed' + (o.cls ? ' ' + o.cls : '');
    el.dataset.ph = o.ph || '';
    el.dataset.key = key;
    el.textContent = obj[key] || '';
    if (!this.edit) return el;
    el.contentEditable = this.preview ? 'false' : 'true';
    el.spellcheck = true;
    el.lang = 'de';
    el.addEventListener('input', () => {
      let v = el.textContent.replace(/[\n\xa0]/g, ' ');
      if (!v.trim()) {
        v = '';
        if (el.childNodes.length) el.textContent = '';
      }
      obj[key] = v;
      if (o.onInput) o.onInput(v, el);
      this.touch();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (o.onEnter) o.onEnter(e, el);
        else this.focusNext(el, 1);
      } else if (e.key === 'Backspace' && o.onBackspaceEmpty && !el.textContent) {
        e.preventDefault();
        o.onBackspaceEmpty();
      }
    });
    el.addEventListener('paste', plainPaste);
    return el;
  };

  R.rich = function (obj, key, o) {
    o = o || {};
    const el = h('div.ed.rt' + (o.cls ? '.' + o.cls.split(' ').join('.') : ''), { 'data-ph': o.ph || '', 'data-key': key });
    el.innerHTML = sanitize(obj[key] || '');
    if (!this.edit) return el;
    el.contentEditable = this.preview ? 'false' : 'true';
    el.spellcheck = true;
    el.lang = 'de';
    el.addEventListener('input', () => {
      let html = sanitize(el.innerHTML);
      if (!el.textContent.trim() && !el.querySelector('li')) {
        html = '';
        if (el.innerHTML !== '') el.innerHTML = '';
      }
      obj[key] = html;
      this.touch();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && o.onEnter) o.onEnter(e, el);
      else if (e.key === 'Backspace' && o.onBackspaceStart) o.onBackspaceStart(e, el);
    });
    el.addEventListener('paste', richPaste);
    el.addEventListener('focus', () => this.cb.richFocus && this.cb.richFocus(el));
    el.addEventListener('blur', () => this.cb.richBlur && this.cb.richBlur(el));
    return el;
  };

  /* ---------- UI-Bausteine (nur im Editor) ---------- */
  R.blk = function (cls, attrs, ...kids) {
    return h('div', Object.assign({ class: 'blk ' + cls }, attrs || {}), ...kids);
  };
  R.tb = function (btns) {
    if (!this.edit) return null;
    return h('div.ui.tb', btns.filter(Boolean).map((b) =>
      h('button', {
        type: 'button', title: b.t, class: b.cls || '', onmousedown: pd,
        onclick: (e) => { e.stopPropagation(); b.fn(); },
      }, icon(b.i, 13))
    ));
  };
  R.xbtn = function (arr, i) {
    if (!this.edit) return null;
    return h('button.ui.xb', {
      type: 'button', title: 'Entfernen', onmousedown: pd,
      onclick: (e) => { e.stopPropagation(); arr.splice(i, 1); this.restructure(); },
    }, icon('x', 9));
  };
  R.itemTb = function (arr, i, kind) {
    return this.tb([
      { i: 'up', t: 'Nach oben', fn: () => move(arr, i, -1) && this.restructure({ id: arr[i - 1].id }) },
      { i: 'down', t: 'Nach unten', fn: () => move(arr, i, 1) && this.restructure({ id: arr[i + 1].id }) },
      { i: 'copy', t: 'Duplizieren', fn: () => { arr.splice(i + 1, 0, dupItem(arr[i])); this.restructure({ id: arr[i + 1].id }); } },
      { i: 'plus', t: 'Eintrag darunter einfügen', fn: () => { const n = CV.newItem(kind); arr.splice(i + 1, 0, n); this.restructure({ id: n.id, key: FIRST_KEY[kind] }); } },
      { i: 'trash', t: 'Eintrag entfernen', cls: 'danger', fn: () => { arr.splice(i, 1); this.restructure(); } },
    ]);
  };

  /* ---------- Foto / Kontakte / Kopf ---------- */
  R.photo = function () {
    const p = this.P.person.photo;
    const el = h('div.photo' + (p && p.src ? '' : '.empty'));
    if (p && p.src) {
      const img = h('img', { src: p.src, alt: 'Bewerbungsfoto', draggable: 'false' });
      img.style.transform = 'translate(' + (p.x || 0) + '%,' + (p.y || 0) + '%) scale(' + (p.zoom || 1) + ')';
      el.appendChild(img);
    } else el.appendChild(h('span.ph-photo', icon('user', 28), h('i', 'Foto')));
    if (this.edit) {
      el.title = 'Klicken oder Bild hierher ziehen';
      el.addEventListener('click', () => !this.preview && this.cb.pickPhoto && this.cb.pickPhoto());
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop');
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && this.cb.pickPhoto) this.cb.pickPhoto(f);
      });
    }
    return el;
  };

  R.contactList = function () {
    const P = this.P.person, list = P.contacts;
    const ul = h('ul.contact');
    list.forEach((c, i) => {
      if (!c.value && !this.edit) return;
      const ct = CV.CONTACT_TYPES[c.type] || CV.CONTACT_TYPES.other;
      ul.appendChild(h('li.ct', { 'data-type': c.type, 'data-id': c.id },
        icon(c.type === 'email' ? 'mail' : c.type, 14),
        this.ed(c, 'value', {
          cls: 'ct-val', ph: ct.ph,
          onEnter: () => { const n = CV.newContact('other'); list.splice(i + 1, 0, n); this.restructure({ id: n.id, key: 'value' }); },
          onBackspaceEmpty: () => { list.splice(i, 1); this.restructure(i > 0 ? { id: list[i - 1].id, key: 'value' } : null); },
        })
      ));
    });
    return ul;
  };

  R.headBlock = function (opts) {
    const P = this.P.person;
    const head = this.blk('head', { 'data-hv': this.T.headVariant });
    if (opts.photo) head.appendChild(this.photo());
    head.appendChild(h('div.head-main',
      h('div.name', this.ed(P, 'firstName', { cls: 'fn', ph: 'Vorname' }), ' ', this.ed(P, 'lastName', { cls: 'ln', ph: 'Nachname' })),
      this.ed(P, 'jobTitle', { tag: 'div', cls: 'jobtitle', ph: 'Berufsbezeichnung' })
    ));
    if (opts.contact) head.appendChild(this.contactList());
    return head;
  };

  /* ---------- Lebenslauf ---------- */
  R.colOf = function (sec) {
    if (this.layout === 'single') return 'main';
    return sec.col || (this.T.sideTypes.includes(sec.type) ? 'side' : 'main');
  };

  R.buildCV = function () {
    const T = this.T, D = this.P.design, P = this.P.person, secs = this.P.docs.cv.sections;
    const hasSide = this.layout !== 'single';
    const head = this.headBlock({ photo: T.photoIn === 'head' && D.photo, contact: T.contactIn === 'head' });
    if (T.headRegion) this.blocks.head.push(head);
    else this.blocks.main.push(head);
    if (hasSide) {
      if (T.photoIn === 'side' && D.photo) this.blocks.side.push(this.blk('side-photo', {}, this.photo()));
      if (T.contactIn === 'side') {
        this.blocks.side.push(this.blk('keep blk-title sec-contact', {}, this.ed(P, 'contactTitle', { tag: 'h2', cls: 'sec-title', ph: 'Kontakt' })));
        this.blocks.side.push(this.blk('blk-body side-contact', {}, this.contactList()));
      }
    }
    secs.forEach((sec, i) => {
      if (sec.hidden) return;
      this.blocks[this.colOf(sec)].push(...this.sectionBlocks(sec, i));
    });
  };

  R.sectionBlocks = function (sec, idx) {
    const ST = CV.SECTION_TYPES[sec.type], secs = this.P.docs.cv.sections, col = this.colOf(sec);
    const hasSide = this.layout !== 'single', out = [];
    const kind = ST.kind, listy = kind !== 'text';
    const addAfter = (i) => {
      const n = CV.newItem(kind);
      sec.items.splice(i + 1, 0, n);
      this.restructure({ id: n.id, key: FIRST_KEY[kind] });
    };
    const removeAt = (i) => {
      sec.items.splice(i, 1);
      this.restructure(i > 0 ? { id: sec.items[i - 1].id, key: FIRST_KEY[kind] } : null);
    };
    const swap = (dir) => {
      let j = idx + dir;
      while (j >= 0 && j < secs.length) {
        if (!secs[j].hidden && (!hasSide || this.colOf(secs[j]) === col)) break;
        j += dir;
      }
      if (j < 0 || j >= secs.length) return;
      [secs[idx], secs[j]] = [secs[j], secs[idx]];
      this.restructure({ id: sec.id });
    };

    out.push(this.blk('keep blk-title sec-' + sec.type, { 'data-id': sec.id },
      this.ed(sec, 'title', { tag: 'h2', cls: 'sec-title', ph: 'Überschrift' }),
      this.tb([
        { i: 'up', t: 'Abschnitt nach oben', fn: () => swap(-1) },
        { i: 'down', t: 'Abschnitt nach unten', fn: () => swap(1) },
        hasSide && { i: 'swap', t: 'In andere Spalte verschieben', fn: () => { sec.col = col === 'side' ? 'main' : 'side'; this.restructure({ id: sec.id }); } },
        listy && { i: 'plus', t: 'Eintrag hinzufügen', fn: () => { const n = CV.newItem(kind); sec.items.push(n); this.restructure({ id: n.id, key: FIRST_KEY[kind] }); } },
        { i: 'eyeoff', t: 'Abschnitt ausblenden', fn: () => { sec.hidden = true; this.restructure(); } },
        { i: 'trash', t: 'Abschnitt löschen', cls: 'danger', fn: () => { secs.splice(idx, 1); this.restructure(); } },
      ])
    ));

    if (kind === 'text') {
      out.push(this.blk('blk-body', {}, this.rich(sec, 'text', { cls: 'sec-text', ph: ST.ph })));
    } else if (kind === 'timeline') {
      const ph = ST.ph;
      sec.items.forEach((it, i) => {
        out.push(this.blk('blk-entry', { 'data-id': it.id },
          h('div.entry',
            this.ed(it, 'date', { tag: 'div', cls: 'e-date', ph: ph.date }),
            h('div.e-body',
              this.ed(it, 'title', { tag: 'div', cls: 'e-title', ph: ph.title }),
              h('div.e-sub', this.ed(it, 'org', { cls: 'e-org', ph: ph.org }), this.ed(it, 'place', { cls: 'e-place', ph: ph.place })),
              this.rich(it, 'text', { cls: 'e-text', ph: ph.text })
            )
          ),
          this.itemTb(sec.items, i, 'timeline')
        ));
      });
    } else if (kind === 'skills') {
      const list = h('div.skills');
      sec.items.forEach((it, i) => list.appendChild(h('div.sk', { 'data-id': it.id },
        this.ed(it, 'name', { cls: 'sk-name', ph: ST.ph, onEnter: () => addAfter(i), onBackspaceEmpty: () => removeAt(i) }),
        this.meter(it), this.xbtn(sec.items, i))));
      out.push(this.blk('blk-body', {}, list));
    } else if (kind === 'languages') {
      const list = h('div.langs');
      sec.items.forEach((it, i) => list.appendChild(h('div.lang', { 'data-id': it.id },
        this.ed(it, 'name', { cls: 'lang-name', ph: ST.ph, onBackspaceEmpty: () => removeAt(i) }),
        this.ed(it, 'level', { cls: 'lang-level', ph: 'Niveau', onEnter: () => addAfter(i) }),
        this.xbtn(sec.items, i))));
      out.push(this.blk('blk-body', {}, list));
    } else if (kind === 'tags') {
      const list = h('div.tags');
      sec.items.forEach((it, i) => list.appendChild(h('span.tag', { 'data-id': it.id },
        this.ed(it, 'name', { ph: ST.ph, onEnter: () => addAfter(i), onBackspaceEmpty: () => removeAt(i) }),
        this.xbtn(sec.items, i))));
      out.push(this.blk('blk-body', {}, list));
    } else if (kind === 'facts') {
      const list = h('div.facts');
      sec.items.forEach((it, i) => list.appendChild(h('div.fact', { 'data-id': it.id },
        this.ed(it, 'label', { cls: 'fact-label', ph: 'Angabe', onBackspaceEmpty: () => removeAt(i) }),
        this.ed(it, 'value', { cls: 'fact-value', ph: 'Wert', onEnter: () => addAfter(i) }),
        this.xbtn(sec.items, i))));
      out.push(this.blk('blk-body', {}, list));
    }
    return out;
  };

  R.meter = function (it) {
    const m = h('span.lvl');
    for (let n = 1; n <= 5; n++) {
      const d = h('i', { class: n <= it.level ? 'on' : '' });
      if (this.edit) {
        d.addEventListener('click', (e) => {
          if (this.preview) return;
          e.stopPropagation();
          it.level = it.level === n ? n - 1 : n;
          Array.from(m.children).forEach((c, k) => c.classList.toggle('on', k < it.level));
          this.touch();
        });
      }
      m.appendChild(d);
    }
    return m;
  };

  /* ---------- Anschreiben ---------- */
  R.buildLetter = function () {
    const P = this.P.person, L = this.P.docs.letter, M = this.blocks.main;
    this.blocks.head.push(this.headBlock({ photo: false, contact: true }));

    const addr = (P.contacts.find((c) => c.type === 'address') || {}).value;
    const senderLine = [CV.fullName(P), addr].filter(Boolean).join(' · ');
    const rc = L.recipient;
    M.push(this.blk('lt-recipient', {},
      senderLine ? h('div.lt-sender', senderLine) : null,
      this.ed(rc, 'company', { tag: 'div', cls: 'rc-line rc-strong', ph: 'Firma' }),
      this.ed(rc, 'contact', { tag: 'div', cls: 'rc-line', ph: 'Ansprechperson' }),
      this.ed(rc, 'street', { tag: 'div', cls: 'rc-line', ph: 'Straße Nr.' }),
      this.ed(rc, 'city', { tag: 'div', cls: 'rc-line', ph: 'PLZ Ort' })
    ));
    M.push(this.blk('lt-meta', {}, this.ed(L, 'place', { ph: 'Ort' }), h('span.lt-comma', ','), ' ', this.ed(L, 'date', { ph: 'Datum' })));
    M.push(this.blk('lt-subject', {}, this.ed(L, 'subject', { tag: 'div', cls: 'lt-subject-text', ph: 'Betreff' })));
    M.push(this.blk('lt-salutation', {}, this.ed(L, 'salutation', { tag: 'div', ph: 'Anrede' })));

    const body = L.body;
    body.forEach((par, i) => {
      M.push(this.blk('lt-p', { 'data-id': par.id },
        this.rich(par, 'text', {
          cls: 'lt-text', ph: 'Absatz schreiben …',
          onEnter: (e, el) => this.splitPar(e, el, body, i),
          onBackspaceStart: (e, el) => this.mergePar(e, el, body, i),
        }),
        this.tb([
          { i: 'up', t: 'Absatz nach oben', fn: () => move(body, i, -1) && this.restructure({ id: par.id }) },
          { i: 'down', t: 'Absatz nach unten', fn: () => move(body, i, 1) && this.restructure({ id: par.id }) },
          { i: 'plus', t: 'Absatz darunter einfügen', fn: () => { const n = { id: CV.uid(), text: '' }; body.splice(i + 1, 0, n); this.restructure({ id: n.id, key: 'text' }); } },
          { i: 'trash', t: 'Absatz löschen', cls: 'danger', fn: () => { body.splice(i, 1); if (!body.length) body.push({ id: CV.uid(), text: '' }); this.restructure(); } },
        ])
      ));
    });

    const S = L.signature;
    const sign = h('div.lt-sign' + (S.mode === 'image' ? '.is-img' : ''));
    if (S.mode === 'image' && S.image) sign.appendChild(h('img', { src: S.image, alt: 'Unterschrift' }));
    else if (S.mode === 'script') sign.appendChild(h('span.sig-script', CV.fullName(P)));
    if (this.edit && S.mode === 'image') {
      sign.title = 'Klicken, um eine Unterschrift hochzuladen';
      sign.addEventListener('click', () => !this.preview && this.cb.pickSignature && this.cb.pickSignature());
    }
    M.push(this.blk('lt-closing', {},
      this.ed(L, 'closing', { tag: 'div', cls: 'lt-close-text', ph: 'Grußformel' }), sign,
      h('div.lt-name', this.ed(P, 'firstName', { ph: 'Vorname' }), ' ', this.ed(P, 'lastName', { ph: 'Nachname' }))
    ));
    M.push(this.blk('lt-enc', {}, this.ed(L, 'enclosures', { tag: 'div', ph: 'Anlagen: …' })));
  };

  R.splitPar = function (e, el, body, i) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const rg = sel.getRangeAt(0);
    const node = rg.startContainer.nodeType === 3 ? rg.startContainer.parentNode : rg.startContainer;
    if (node.closest && node.closest('li')) return; // Listen: Standardverhalten
    e.preventDefault();
    if (e.shiftKey) { document.execCommand('insertLineBreak'); return; }
    rg.deleteContents();
    const tail = document.createRange();
    tail.selectNodeContents(el);
    tail.setStart(rg.endContainer, rg.endOffset);
    const tmp = document.createElement('div');
    tmp.appendChild(tail.extractContents());
    body[i].text = sanitize(el.innerHTML);
    const n = { id: CV.uid(), text: sanitize(tmp.innerHTML) };
    body.splice(i + 1, 0, n);
    this.restructure({ id: n.id, key: 'text', pos: 0 });
  };
  R.mergePar = function (e, el, body, i) {
    const sel = window.getSelection();
    if (i === 0 || !sel.isCollapsed || CV.caretOffset(el) !== 0) return;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode);
    if (node && node.closest && node.closest('li')) return;
    e.preventDefault();
    const prev = body[i - 1];
    const len = CV.htmlToText(prev.text).length;
    prev.text = sanitize(prev.text + el.innerHTML);
    body.splice(i, 1);
    this.restructure({ id: prev.id, key: 'text', pos: len });
  };

  /* ---------- Deckblatt ---------- */
  R.buildCover = function () {
    const D = this.P.design, P = this.P.person, C = this.P.docs.cover, M = this.blocks.main;
    M.push(this.blk('cv-top', {}, this.ed(C, 'title', { tag: 'div', cls: 'cv-title', ph: 'Titel' })));
    M.push(this.blk('cv-pos', {},
      this.ed(C, 'position', { tag: 'div', cls: 'cv-position', ph: 'als …' }),
      this.ed(C, 'company', { tag: 'div', cls: 'cv-company', ph: 'bei …' })));
    if (D.photo) M.push(this.blk('cv-photo', {}, this.photo()));
    M.push(this.blk('cv-person', {},
      h('div.name', this.ed(P, 'firstName', { cls: 'fn', ph: 'Vorname' }), ' ', this.ed(P, 'lastName', { cls: 'ln', ph: 'Nachname' })),
      this.ed(P, 'jobTitle', { tag: 'div', cls: 'jobtitle', ph: 'Berufsbezeichnung' })));
    M.push(this.blk('cv-contact', {}, this.contactList()));
    const list = h('ul.cv-enc-list');
    C.enclosures.forEach((en, i) => list.appendChild(h('li', { 'data-id': en.id },
      this.ed(en, 'name', {
        ph: 'Anlage',
        onEnter: () => { const n = { id: CV.uid(), name: '' }; C.enclosures.splice(i + 1, 0, n); this.restructure({ id: n.id, key: 'name' }); },
        onBackspaceEmpty: () => { C.enclosures.splice(i, 1); this.restructure(i > 0 ? { id: C.enclosures[i - 1].id, key: 'name' } : null); },
      }), this.xbtn(C.enclosures, i))));
    M.push(this.blk('cv-enc', {}, this.ed(C, 'enclosuresTitle', { tag: 'div', cls: 'cv-enc-title', ph: 'Anlagen' }), list));
  };

  /* ---------- Pagination ---------- */
  R.captureSel = function () {
    const s = window.getSelection();
    if (!s.rangeCount || !this.root.contains(s.anchorNode)) return null;
    const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentNode : s.anchorNode;
    const el = n.closest && n.closest('.ed');
    if (!el) return null;
    return { el, off: CV.caretOffset(el), collapsed: s.isCollapsed };
  };

  R.paginate = function () {
    const root = this.root;
    if (!root.isConnected || !root.offsetWidth) { this._need = true; return; }
    this._need = false;
    const s = root.getBoundingClientRect().width / root.offsetWidth || 1;
    const cols = this.colNames();
    const sel = this.edit ? this.captureSel() : null;
    const p0 = this.getPage(0);
    if (this.headRegion) this.blocks.head.forEach((b) => { if (b.parentNode !== p0.head) p0.head.appendChild(b); });
    for (const c of cols) for (const b of this.blocks[c]) if (!b.parentNode) p0.cols[c].appendChild(b);

    const availCache = {};
    const avail = (p, c) => {
      const k = p + c;
      if (availCache[k] == null) {
        const el = this.getPage(p).cols[c], cs = getComputedStyle(el);
        availCache[k] = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      }
      return availCache[k];
    };

    const plan = {};
    let total = 1;
    for (const c of cols) {
      const list = this.blocks[c];
      const hm = new Map(list.map((b) => [b, b.getBoundingClientRect().height / s]));
      const pages = [[]];
      let used = 0, p = 0;
      for (const b of list) {
        const hh = hm.get(b);
        if (pages[p].length && used + hh > avail(p, c) + 0.5) {
          const carry = [];
          while (pages[p].length > 1 && pages[p][pages[p].length - 1].classList.contains('keep')) carry.unshift(pages[p].pop());
          p++;
          pages[p] = carry;
          used = carry.reduce((a, x) => a + hm.get(x), 0);
        }
        pages[p].push(b);
        used += hh;
      }
      plan[c] = pages;
      total = Math.max(total, pages.length);
    }

    let moved = false;
    for (let k = 0; k < total; k++) {
      const pg = this.getPage(k);
      for (const c of cols) {
        const want = plan[c][k] || [];
        let ref = pg.cols[c].firstChild;
        for (const b of want) {
          if (b === ref) ref = ref.nextSibling;
          else { pg.cols[c].insertBefore(b, ref); moved = true; }
        }
      }
    }
    while (this.pages.length > total) this.pages.pop().el.remove();

    if (moved && sel && sel.collapsed) {
      const cur = window.getSelection();
      if (!cur.rangeCount || !sel.el.contains(cur.anchorNode)) {
        sel.el.focus({ preventScroll: true });
        CV.setCaret(sel.el, sel.off);
      }
    }
    if (this.cb.paginated) this.cb.paginated(total, this);
  };

  R.destroy = function () {
    clearTimeout(this._timer);
    this.root.remove();
  };
})();
