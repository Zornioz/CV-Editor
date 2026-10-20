/* App: Zustand, Speicherung, Historie, Seitenleiste, Druck */
(function () {
  const CV = window.CV;
  const { h, $, $$, icon, toast, debounce } = CV;

  const KEY_INDEX = 'cvstudio:index';
  const KEY_P = 'cvstudio:p:';
  const DOCS = [
    { id: 'cover', label: 'Deckblatt', ico: 'cover' },
    { id: 'letter', label: 'Anschreiben', ico: 'letter' },
    { id: 'cv', label: 'Lebenslauf', ico: 'cvdoc' },
  ];

  const S = {
    proj: null, index: [], docType: 'cv', tab: 'design',
    zoomMode: 'fit', zoom: 1, scale: 1, preview: false,
    renderer: null, hist: [], hi: -1, pages: 1, richEl: null, warned: false,
  };
  CV.S = S;

  /* ---------- Storage ---------- */
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

  function loadIndex() {
    try { return JSON.parse(lsGet(KEY_INDEX)) || { current: null, list: [] }; } catch (e) { return { current: null, list: [] }; }
  }
  function saveIndex() { lsSet(KEY_INDEX, JSON.stringify({ current: S.proj.id, list: S.index })); }
  function loadProject(id) {
    try { const raw = lsGet(KEY_P + id); return raw ? CV.normalize(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function saveProject() {
    S.proj.updated = Date.now();
    const ok = lsSet(KEY_P + S.proj.id, JSON.stringify(S.proj));
    let e = S.index.find((x) => x.id === S.proj.id);
    if (!e) { e = { id: S.proj.id }; S.index.push(e); }
    e.name = S.proj.name; e.updated = S.proj.updated;
    saveIndex();
    if (!ok && !S.warned) {
      S.warned = true;
      toast('Browser-Speicher voll – bitte Projekt als JSON exportieren (Menü ⋯).', 6000);
    }
  }
  const saveSoon = debounce(saveProject, 350);

  /* ---------- Historie ---------- */
  function commit() {
    // Zeitstempel gehört nicht zum Dokumentzustand (sonst würde Redo nach jedem Speichern verworfen)
    const j = JSON.stringify(S.proj, (k, v) => (k === 'updated' ? undefined : v));
    if (S.hist[S.hi] === j) return;
    S.hist = S.hist.slice(0, S.hi + 1);
    S.hist.push(j);
    S.hi++;
    if (S.hist.length > 80) { S.hist.shift(); S.hi--; }
    updateTop();
  }
  const histSoon = debounce(commit, 700);
  function resetHistory() { S.hist = []; S.hi = -1; commit(); }
  function restoreHist() {
    S.proj = JSON.parse(S.hist[S.hi]);
    S.renderer.P = S.proj;
    S.renderer.build();
    refreshPanel();
    saveProject();
    updateTop();
  }
  function undo() { histSoon.cancel(); commit(); if (S.hi > 0) { S.hi--; restoreHist(); } }
  function redo() { histSoon.cancel(); commit(); if (S.hi < S.hist.length - 1) { S.hi++; restoreHist(); } }

  /* ---------- Renderer-Callbacks ---------- */
  function onTouch() {
    saveSoon(); histSoon(); syncPanel(); checkSoon();
    if (S.tab === 'design') thumbsSoon();
  }
  function onRestructure(focus) {
    histSoon.cancel();
    commit();
    saveProject();
    S.renderer.pendingFocus = focus || null;
    S.renderer.build();
    refreshPanel();
    updateTop();
  }
  function onPaginated(total) {
    S.pages = total;
    const el = $('#pageCount');
    const warn = (S.docType === 'letter' && total > 1) || (S.docType === 'cv' && total > 2);
    el.textContent = total + (total === 1 ? ' Seite' : ' Seiten');
    el.classList.toggle('warn', warn);
    el.title = warn ? (S.docType === 'letter' ? 'Ein Anschreiben sollte auf eine Seite passen.' : 'Ein Lebenslauf umfasst idealerweise 1–2 Seiten.') : 'Seitenanzahl des aktuellen Dokuments';
    updateBox();
    checkSoon();
  }
  /** Eingabe im Seitenformular -> Dokument neu aufbauen */
  const rebuildSoon = debounce(() => S.renderer && S.renderer.build(), 120);
  function formChanged() { rebuildSoon(); saveSoon(); histSoon(); checkSoon(); }
  /** Strukturänderung (Liste, Abschnitte …) */
  function structural(focus) { onRestructure(focus); }

  function mountRenderer() {
    if (S.renderer) S.renderer.destroy();
    hideRichbar();
    const r = new CV.Renderer(S.proj, S.docType, {
      edit: true,
      cb: { touch: onTouch, restructure: onRestructure, paginated: onPaginated, richFocus: showRichbar, richBlur: hideRichbar, pickPhoto, pickSignature },
    });
    S.renderer = r;
    $('#zoomInner').appendChild(r.root);
    r.build();
    if (S.preview) r.setPreview(true);
    if (S.ro) S.ro.disconnect();
    S.ro = new ResizeObserver(updateBox);
    S.ro.observe(r.root);
    applyZoom();
  }

  /* ---------- Zoom ---------- */
  function fitScale() {
    const w = $('#stage').clientWidth - 56;
    const pw = (S.renderer && S.renderer.root.offsetWidth) || 794;
    return Math.max(0.3, Math.min(1.15, w / pw));
  }
  function applyZoom() {
    S.scale = S.zoomMode === 'fit' ? fitScale() : S.zoom;
    $('#zoomInner').style.transform = 'scale(' + S.scale + ')';
    $('#zoomLabel').textContent = Math.round(S.scale * 100) + ' %';
    updateBox();
    positionRichbar();
  }
  function updateBox() {
    if (!S.renderer) return;
    const r = S.renderer.root, box = $('#zoomBox');
    box.style.width = r.offsetWidth * S.scale + 'px';
    box.style.height = r.offsetHeight * S.scale + 'px';
  }
  function zoomBy(f) {
    S.zoomMode = 'manual';
    S.zoom = Math.max(0.3, Math.min(2, (S.scale || 1) * f));
    applyZoom();
  }

  /* ---------- Rich-Text-Leiste ---------- */
  const RB = [
    ['bold', 'Fett (Strg+B)', 'bold'], ['italic', 'Kursiv (Strg+I)', 'italic'], ['underline', 'Unterstrichen (Strg+U)', 'underline'], '|',
    ['insertUnorderedList', 'Aufzählung', 'list'], ['insertOrderedList', 'Nummerierung', 'olist'], '|',
    ['removeFormat', 'Formatierung entfernen', 'clear'],
  ];
  function buildRichbar() {
    const bar = $('#richbar');
    RB.forEach((b) => {
      if (b === '|') return bar.appendChild(h('span.sep'));
      bar.appendChild(h('button', {
        type: 'button', title: b[1], onmousedown: (e) => e.preventDefault(),
        onclick: () => { document.execCommand(b[0]); },
      }, icon(b[2], 15)));
    });
  }
  function showRichbar(el) { S.richEl = el; $('#richbar').hidden = false; positionRichbar(); }
  function hideRichbar() { S.richEl = null; const b = $('#richbar'); if (b) b.hidden = true; }
  function positionRichbar() {
    const bar = $('#richbar'), el = S.richEl;
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect(), st = $('#stage').getBoundingClientRect();
    if (r.bottom < st.top + 10 || r.top > st.bottom - 10) { bar.style.visibility = 'hidden'; return; }
    bar.style.visibility = '';
    const w = bar.offsetWidth || 220;
    let top = r.top - 38;
    if (top < st.top + 4) top = Math.min(r.bottom + 6, st.bottom - 40);
    const left = Math.max(st.left + 6, Math.min(r.right - w, st.right - w - 14));
    bar.style.top = top + 'px';
    bar.style.left = left + 'px';
  }

  /* ---------- Bilder ---------- */
  function pickFile(cb) {
    const inp = $('#fileImage');
    inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); inp.value = ''; };
    inp.click();
  }
  function pickPhoto(file) {
    const go = async (f) => {
      try {
        const src = await CV.loadImage(f, 900, false);
        S.proj.person.photo = { src, zoom: 1, x: 0, y: 0 };
        structural();
        toast('Foto eingefügt');
      } catch (e) { toast('Das Bild konnte nicht gelesen werden.'); }
    };
    if (file && file.name !== undefined) go(file); else pickFile(go);
  }
  function pickSignature() {
    pickFile(async (f) => {
      try {
        S.proj.docs.letter.signature.image = await CV.loadImage(f, 700, true);
        S.proj.docs.letter.signature.mode = 'image';
        structural();
      } catch (e) { toast('Das Bild konnte nicht gelesen werden.'); }
    });
  }

  /* ============================================================
     Seitenleiste
     ============================================================ */
  const group = (title, body, open) => h('details.grp', { open: open === false ? null : '' }, h('summary', title), h('div.grp-body', body));
  const ibtn = (ico, title, fn, cls) => h('button.icon-btn' + (cls ? '.' + cls : ''), { type: 'button', title, onclick: (e) => { e.stopPropagation(); fn(); } }, icon(ico, 15));

  function fText(label, obj, key, o) {
    o = o || {};
    const inp = h(o.multi ? 'textarea' : 'input', { type: o.multi ? null : 'text', placeholder: o.ph || '', 'data-sync': '' });
    inp.value = obj[key] || '';
    inp._sync = () => { if (document.activeElement !== inp) inp.value = obj[key] || ''; };
    inp.addEventListener('input', () => { obj[key] = inp.value; formChanged(); });
    return h('div.field', h('label', label), inp);
  }
  function seg(opts, val, fn) {
    return h('div.seg', opts.map(([v, l]) => h('button', { type: 'button', class: v === val ? 'active' : '', onclick: () => fn(v) }, l)));
  }
  function range(label, min, max, step, val, fmt, fn) {
    const out = h('span', fmt(val));
    const inp = h('input', { type: 'range', min, max, step, value: val });
    inp.addEventListener('input', () => { const v = +inp.value; out.textContent = fmt(v); fn(v); });
    return h('div.range', h('div.rhead', h('span', label), out), inp);
  }
  function toggle(label, val, fn) {
    const inp = h('input', { type: 'checkbox' });
    inp.checked = !!val;
    inp.addEventListener('change', () => fn(inp.checked));
    return h('label.toggle', h('span', label), inp);
  }

  function syncPanel() { $$('[data-sync]', $('#panelBody')).forEach((el) => el._sync && el._sync()); }

  function renderTabs() {
    const warns = S.checks ? S.checks.filter((c) => c.lvl === 'warn').length : 0;
    const box = $('#ptabs');
    box.textContent = '';
    [['design', 'Design', 'palette'], ['content', 'Inhalt', 'pen'], ['check', 'Check', 'check']].forEach(([id, label, ico]) => {
      box.appendChild(h('button', { type: 'button', class: S.tab === id ? 'active' : '', onclick: () => { S.tab = id; renderTabs(); refreshPanel(); } },
        icon(ico, 15), label, id === 'check' && warns ? h('span.badge', String(warns)) : null));
    });
  }

  function refreshPanel() {
    const body = $('#panelBody'), top = body.scrollTop;
    const content = S.tab === 'design' ? panelDesign() : S.tab === 'content' ? panelContent() : panelCheck();
    body.textContent = '';
    body.appendChild(content);
    body.scrollTop = top;
    if (S.tab === 'design') renderThumbs();
  }

  /* ---------- Design-Tab ---------- */
  function designSet(patch, o) {
    o = o || {};
    const D = S.proj.design;
    Object.assign(D, patch);
    if (o.custom) D.custom = true;
    if (o.rebuild) S.renderer.build();
    else { S.renderer.applyDesign(); S.renderer.paginate(); }
    histSoon.cancel(); commit(); saveSoon();
    if (o.refresh) refreshPanel(); else thumbsSoon();
  }
  function setTemplate(id) {
    const D = S.proj.design;
    D.template = id;
    if (!D.custom) Object.assign(D, CV.TEMPLATES[id].d);
    S.renderer.build();
    histSoon.cancel(); commit(); saveSoon();
    refreshPanel();
  }

  function panelDesign() {
    const D = S.proj.design, stack = h('div.stack');
    const grid = h('div.tpl-grid');
    CV.TEMPLATE_ORDER.forEach((id) => {
      const T = CV.TEMPLATES[id];
      grid.appendChild(h('button.tpl-card' + (D.template === id ? '.active' : ''), { type: 'button', onclick: () => setTemplate(id) },
        h('div.thumb', { 'data-tpl': id }), h('div.tpl-name', T.name), h('div.tpl-tag', T.tag)));
    });
    stack.appendChild(group('Vorlage', [
      grid,
      h('div.hint', 'Die Vorschau zeigt Ihre eigenen Daten. Das Design gilt für Deckblatt, Anschreiben und Lebenslauf.'),
    ]));

    const sw = h('div.swatches');
    CV.PALETTE.forEach((c) => sw.appendChild(h('button.swatch' + (D.accent.toLowerCase() === c.c ? '.active' : ''), {
      type: 'button', title: c.n, style: { background: c.c }, onclick: () => designSet({ accent: c.c }, { custom: true, refresh: true }),
    })));
    const picker = h('input', { type: 'color', value: D.accent, title: 'Eigene Farbe' });
    picker.addEventListener('input', () => designSet({ accent: picker.value }, { custom: true }));
    picker.addEventListener('change', () => refreshPanel());
    stack.appendChild(group('Farbe', [sw, h('div.colorrow', picker, h('span.hint', 'Eigene Farbe wählen – Texte passen sich automatisch an.'))]));

    const fl = h('div.fontlist');
    Object.entries(CV.FONTS).forEach(([id, f]) => fl.appendChild(h('button.fontopt' + (D.font === id ? '.active' : ''), {
      type: 'button', onclick: () => designSet({ font: id }, { custom: true, refresh: true }),
    }, h('b', { style: { fontFamily: f.head } }, f.name), h('small', f.note))));
    stack.appendChild(group('Schrift', fl, false));

    stack.appendChild(group('Abstände & Größe', [
      range('Schriftgröße', 8.5, 12, 0.5, D.size, (v) => v + ' pt', (v) => designSet({ size: v })),
      range('Zeilenabstand', 1.2, 1.8, 0.05, D.lh, (v) => v.toFixed(2), (v) => designSet({ lh: v })),
      range('Seitenrand', 8, 28, 1, D.margin, (v) => v + ' mm', (v) => designSet({ margin: v })),
      range('Abstand zwischen Abschnitten', 0.5, 1.9, 0.1, D.gap, (v) => v.toFixed(1) + '×', (v) => designSet({ gap: v })),
    ], false));

    stack.appendChild(group('Elemente', [
      toggle('Foto anzeigen', D.photo, (v) => designSet({ photo: v }, { rebuild: true })),
      h('div.field', h('label', 'Foto-Form'), seg([['round', 'Rund'], ['rounded', 'Abgerundet'], ['square', 'Quadrat'], ['portrait', 'Hochformat']], D.photoShape, (v) => designSet({ photoShape: v }, { custom: true, refresh: true }))),
      h('div.field', h('label', 'Kenntnisse darstellen als'), seg([['dots', 'Punkte'], ['bars', 'Balken'], ['chips', 'Chips'], ['text', 'Text']], D.skills, (v) => designSet({ skills: v }, { custom: true, refresh: true }))),
      toggle('Icons bei Kontaktdaten', D.icons, (v) => designSet({ icons: v })),
      toggle('Überschriften in Versalien', D.caps, (v) => designSet({ caps: v })),
    ], false));
    return stack;
  }

  let thumbToken = 0;
  function renderThumbs() {
    const token = ++thumbToken, nodes = $$('.thumb[data-tpl]');
    let i = 0;
    const step = () => {
      if (token !== thumbToken || i >= nodes.length) return;
      const n = nodes[i++];
      if (n.isConnected) drawThumb(n);
      setTimeout(step, 0);
    };
    step();
  }
  const thumbsSoon = debounce(() => { if (S.tab === 'design') renderThumbs(); }, 500);
  function drawThumb(n) {
    const id = n.dataset.tpl, T = CV.TEMPLATES[id];
    const D = Object.assign({}, S.proj.design, { template: id });
    if (!S.proj.design.custom) Object.assign(D, T.d);
    const p = Object.assign({}, S.proj, { design: D });
    n.textContent = '';
    const inner = h('div.thumb-in');
    n.appendChild(inner);
    const r = new CV.Renderer(p, S.docType, { edit: false });
    inner.appendChild(r.root);
    r.build();
    r.pages.slice(1).forEach((pg) => pg.el.remove());
    r.root.style.gap = '0';
    inner.style.transform = 'scale(' + n.clientWidth / (r.root.offsetWidth || 794) + ')';
  }

  /* ---------- Inhalt-Tab ---------- */
  function panelContent() {
    const stack = h('div.stack');
    stack.appendChild(h('div.hint', 'Tipp: Direkt im Dokument klicken und schreiben. Beim Überfahren von Einträgen erscheinen Werkzeuge zum Verschieben, Duplizieren und Löschen. Bilder lassen sich auf das Fotofeld ziehen.'));
    stack.appendChild(groupPerson());
    if (S.docType === 'cv') stack.appendChild(groupSections());
    if (S.docType === 'letter') { stack.appendChild(groupLetter()); stack.appendChild(groupSnippets()); }
    if (S.docType === 'cover') stack.appendChild(groupCover());
    return stack;
  }

  function groupPerson() {
    const p = S.proj.person;
    const body = [
      h('div.row2', fText('Vorname', p, 'firstName', { ph: 'Vorname' }), fText('Nachname', p, 'lastName', { ph: 'Nachname' })),
      fText('Berufsbezeichnung', p, 'jobTitle', { ph: 'z. B. Projektmanagerin' }),
      photoCtl(),
      h('div.lbl', 'Kontaktdaten'),
      contactsUI(),
    ];
    return group('Persönliche Daten', body);
  }

  function photoCtl() {
    const p = S.proj.person.photo;
    const prev = h('div.photo-prev');
    if (p && p.src) prev.style.backgroundImage = 'url("' + p.src + '")'; else prev.appendChild(icon('user', 24));
    const acts = h('div.stack-sm',
      h('button.btn.sm', { type: 'button', onclick: () => pickPhoto() }, icon('upload', 14), p && p.src ? 'Foto ändern' : 'Foto hochladen'),
      p && p.src ? h('button.btn.sm.danger', { type: 'button', onclick: () => { S.proj.person.photo = null; structural(); } }, 'Entfernen') : null);
    const wrap = h('div.stack-sm', h('div.photo-ctl', prev, acts));
    if (p && p.src) {
      const upd = () => {
        S.renderer.root.querySelectorAll('.photo img').forEach((im) => { im.style.transform = 'translate(' + p.x + '%,' + p.y + '%) scale(' + p.zoom + ')'; });
        saveSoon(); histSoon();
      };
      wrap.appendChild(range('Zoom', 1, 3, 0.05, p.zoom || 1, (v) => Math.round(v * 100) + ' %', (v) => { p.zoom = v; upd(); }));
      wrap.appendChild(h('div.row2',
        range('Horizontal', -40, 40, 1, p.x || 0, (v) => v + '', (v) => { p.x = v; upd(); }),
        range('Vertikal', -40, 40, 1, p.y || 0, (v) => v + '', (v) => { p.y = v; upd(); })));
    }
    return wrap;
  }

  function contactsUI() {
    const list = S.proj.person.contacts, box = h('div.list');
    list.forEach((c, i) => {
      const sel = h('select', Object.entries(CV.CONTACT_TYPES).map(([k, v]) => h('option', { value: k }, v.label)));
      sel.value = c.type;
      sel.addEventListener('change', () => { c.type = sel.value; structural(); });
      const inp = h('input', { type: 'text', placeholder: CV.CONTACT_TYPES[c.type].ph, 'data-sync': '' });
      inp.value = c.value || '';
      inp._sync = () => { if (document.activeElement !== inp) inp.value = c.value || ''; };
      inp.addEventListener('input', () => { c.value = inp.value; formChanged(); });
      box.appendChild(h('div.contact-row', sel, inp, h('div.acts',
        ibtn('up', 'Nach oben', () => { if (i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; structural(); } }),
        ibtn('x', 'Entfernen', () => { list.splice(i, 1); structural(); }, 'danger'))));
    });
    box.appendChild(h('button.btn.sm', { type: 'button', onclick: () => { list.push(CV.newContact('other')); structural(); } }, icon('plus', 14), 'Kontaktangabe hinzufügen'));
    return box;
  }

  function groupSections() {
    const secs = S.proj.docs.cv.sections, T = S.renderer.T, list = h('div.list');
    const hasSide = T.layout !== 'single';
    secs.forEach((s, i) => {
      const name = h('span.iname', { 'data-sync': '' });
      name.textContent = s.title || '(ohne Titel)';
      name._sync = () => { name.textContent = s.title || '(ohne Titel)'; };
      const colTag = hasSide && !s.hidden ? h('span.itag', S.renderer.colOf(s) === 'side' ? 'Seite' : 'Haupt') : null;
      list.appendChild(h('div.item' + (s.hidden ? '.off' : ''), name, colTag,
        ibtn(s.hidden ? 'eyeoff' : 'eye', s.hidden ? 'Einblenden' : 'Ausblenden', () => { s.hidden = !s.hidden; structural(); }),
        hasSide ? ibtn('swap', 'Spalte wechseln', () => { s.col = S.renderer.colOf(s) === 'side' ? 'main' : 'side'; structural(); }) : null,
        ibtn('up', 'Nach oben', () => { if (i > 0) { [secs[i - 1], secs[i]] = [secs[i], secs[i - 1]]; structural(); } }),
        ibtn('down', 'Nach unten', () => { if (i < secs.length - 1) { [secs[i + 1], secs[i]] = [secs[i], secs[i + 1]]; structural(); } }),
        ibtn('trash', 'Abschnitt löschen', () => { secs.splice(i, 1); structural(); toast('Abschnitt gelöscht – Strg+Z macht es rückgängig.'); }, 'danger')));
    });
    const sel = h('select', Object.entries(CV.SECTION_TYPES).map(([k, v]) => h('option', { value: k }, v.label)));
    const add = h('div.row', h('div.field', { style: { flex: 1 } }, sel),
      h('button.btn.sm', { type: 'button', onclick: () => {
        const sec = CV.newSection(sel.value);
        if (sec.items) sec.items.push(CV.newItem(CV.SECTION_TYPES[sel.value].kind));
        secs.push(sec);
        structural({ id: sec.id });
      } }, icon('plus', 14), 'Hinzufügen'));
    return group('Abschnitte', [h('div.hint', 'Reihenfolge, Sichtbarkeit und Spalte. Titel direkt im Dokument umbenennen.'), list, add]);
  }

  function groupLetter() {
    const L = S.proj.docs.letter, sig = L.signature;
    const salut = h('div.chips', ['Sehr geehrte Damen und Herren,', 'Sehr geehrte Frau …,', 'Sehr geehrter Herr …,', 'Liebes Team,'].map((t) =>
      h('button.chipbtn', { type: 'button', onclick: () => { L.salutation = t; structural(); } }, t.replace(',', ''))));
    const dateField = fText('Datum', L, 'date', { ph: 'TT.MM.JJJJ' });
    const body = [
      h('div.lbl', 'Empfänger'),
      fText('Firma', L.recipient, 'company'), fText('Ansprechperson', L.recipient, 'contact'),
      h('div.row2', fText('Straße', L.recipient, 'street'), fText('PLZ Ort', L.recipient, 'city')),
      h('div.row2', fText('Ort', L, 'place'), dateField),
      h('button.btn.sm', { type: 'button', onclick: () => { L.date = CV.today(); structural(); } }, icon('calendar', 14), 'Datum auf heute setzen'),
      fText('Betreff', L, 'subject'),
      fText('Anrede', L, 'salutation'), salut,
      fText('Grußformel', L, 'closing'),
      h('div.field', h('label', 'Unterschrift'), seg([['none', 'Keine'], ['script', 'Handschrift'], ['image', 'Bild']], sig.mode, (v) => {
        sig.mode = v;
        if (v === 'image' && !sig.image) pickSignature(); else structural();
      })),
      sig.mode === 'image' ? h('button.btn.sm', { type: 'button', onclick: pickSignature }, icon('upload', 14), sig.image ? 'Unterschrift-Bild ändern' : 'Unterschrift-Bild hochladen') : null,
      fText('Anlagenzeile', L, 'enclosures'),
    ];
    return group('Anschreiben', body);
  }

  function groupSnippets() {
    const L = S.proj.docs.letter, list = h('div.list');
    CV.SNIPPETS.forEach((sn) => list.appendChild(h('button.snip', {
      type: 'button',
      onclick: () => {
        const last = L.body[L.body.length - 1];
        if (last && !CV.htmlToText(last.text).trim()) { last.text = CV.escapeHTML(sn.text); structural({ id: last.id, key: 'text' }); }
        else { const n = { id: CV.uid(), text: CV.escapeHTML(sn.text) }; L.body.push(n); structural({ id: n.id, key: 'text' }); }
        toast('Baustein eingefügt – [Platzhalter] bitte ersetzen.');
      },
    }, h('em', sn.cat), h('b', sn.label), h('span', sn.text))));
    return group('Textbausteine', [h('div.hint', 'Ein Klick fügt einen Absatz am Ende ein. Eckige Klammern sind Platzhalter.'), list], false);
  }

  function groupCover() {
    const C = S.proj.docs.cover, L = S.proj.docs.letter, list = h('div.list');
    C.enclosures.forEach((en, i) => {
      const inp = h('input.inp', { type: 'text', placeholder: 'Anlage', 'data-sync': '' });
      inp.value = en.name || '';
      inp._sync = () => { if (document.activeElement !== inp) inp.value = en.name || ''; };
      inp.addEventListener('input', () => { en.name = inp.value; formChanged(); });
      list.appendChild(h('div.row', inp,
        ibtn('up', 'Nach oben', () => { if (i > 0) { [C.enclosures[i - 1], C.enclosures[i]] = [C.enclosures[i], C.enclosures[i - 1]]; structural(); } }),
        ibtn('x', 'Entfernen', () => { C.enclosures.splice(i, 1); structural(); }, 'danger')));
    });
    const body = [
      fText('Titel', C, 'title'), fText('Position', C, 'position', { multi: true }), fText('Unternehmen', C, 'company'),
      h('div.lbl', 'Anlagen'), list,
      h('div.row',
        h('button.btn.sm', { type: 'button', onclick: () => { C.enclosures.push({ id: CV.uid(), name: '' }); structural(); } }, icon('plus', 14), 'Anlage'),
        h('button.btn.sm', { type: 'button', title: 'Liest die Anlagenzeile des Anschreibens', onclick: () => {
          const names = String(L.enclosures || '').replace(/^[^:]*:/, '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
          C.enclosures = ['Anschreiben'].concat(names).map((n) => ({ id: CV.uid(), name: n }));
          structural();
        } }, 'Aus Anschreiben übernehmen')),
    ];
    return group('Deckblatt', body);
  }

  /* ---------- Check-Tab ---------- */
  function allText(doc) {
    const P = S.proj, t = [];
    if (doc === 'cv') {
      P.docs.cv.sections.forEach((s) => {
        if (s.hidden) return;
        if (s.text) t.push(CV.htmlToText(s.text));
        (s.items || []).forEach((it) => Object.entries(it).forEach(([k, v]) => { if (typeof v === 'string' && k !== 'id') t.push(CV.htmlToText(v)); }));
      });
    } else if (doc === 'letter') {
      const L = P.docs.letter;
      t.push(L.subject, L.salutation, L.enclosures, ...Object.values(L.recipient), ...L.body.map((b) => CV.htmlToText(b.text)));
    } else {
      const C = P.docs.cover;
      t.push(C.title, C.position, C.company, ...C.enclosures.map((e) => e.name));
    }
    return t.join(' \n ');
  }
  function runChecks() {
    const P = S.proj, p = P.person, out = [], doc = S.docType;
    const A = (lvl, t, d) => out.push({ lvl, t, d });
    const has = (type) => p.contacts.some((c) => c.type === type && c.value.trim());
    CV.fullName(p) ? A('ok', 'Name vorhanden') : A('warn', 'Name fehlt', 'Vor- und Nachname eintragen.');
    has('email') ? A('ok', 'E-Mail-Adresse vorhanden') : A('warn', 'E-Mail-Adresse fehlt', 'Ohne Kontakt keine Einladung.');
    has('phone') ? A('ok', 'Telefonnummer vorhanden') : A('info', 'Keine Telefonnummer', 'Üblich und von vielen Personalern erwartet.');
    if (/\[[^\]]{1,60}\]/.test(allText(doc))) A('warn', 'Platzhalter in [eckigen Klammern]', 'Bitte alle Platzhalter durch echte Angaben ersetzen.');
    else A('ok', 'Keine offenen Platzhalter');
    if (doc === 'cv') {
      A(S.pages <= 2 ? 'ok' : 'warn', S.pages === 1 ? 'Passt auf eine Seite' : S.pages === 2 ? 'Zwei Seiten – ein guter Umfang' : S.pages + ' Seiten – zu lang', S.pages > 2 ? 'Ältere/irrelevante Stationen kürzen oder zusammenfassen.' : null);
      if (S.proj.design.photo && !(p.photo && p.photo.src)) A('info', 'Kein Foto hinterlegt', 'In Deutschland üblich, aber freiwillig. Foto ausblenden unter Design › Elemente.');
      const secs = S.proj.docs.cv.sections.filter((s) => !s.hidden);
      const sum = secs.find((s) => s.type === 'summary');
      if (sum && CV.htmlToText(sum.text).trim().length > 40) A('ok', 'Kurzprofil vorhanden'); else A('info', 'Kein Kurzprofil', 'Zwei, drei Sätze am Anfang geben dem Lebenslauf einen Rahmen.');
      let incomplete = 0, entries = 0;
      secs.filter((s) => s.type === 'experience' || s.type === 'education').forEach((s) => s.items.forEach((it) => { entries++; if (!it.title || !it.date || !it.org) incomplete++; }));
      if (!entries) A('warn', 'Keine Stationen eingetragen', 'Berufserfahrung und Ausbildung lückenlos und antichronologisch aufführen.');
      else if (incomplete) A('warn', incomplete + ' Station(en) unvollständig', 'Titel, Arbeitgeber/Schule und Zeitraum sollten jeweils angegeben sein.');
      else A('ok', 'Alle Stationen vollständig (' + entries + ')');
      const empty = secs.filter((s) => (s.items ? s.items.every((it) => !Object.entries(it).some(([k, v]) => k !== 'id' && k !== 'level' && String(v).trim())) : !CV.htmlToText(s.text).trim()));
      if (empty.length) A('warn', 'Leere Abschnitte: ' + empty.map((s) => s.title).join(', '), 'Leere Abschnitte ausblenden oder füllen.');
    } else if (doc === 'letter') {
      const L = S.proj.docs.letter, words = CV.htmlToText(L.body.map((b) => b.text).join(' ')).split(/\s+/).filter(Boolean).length;
      A(words >= 160 && words <= 380 ? 'ok' : 'warn', 'Textlänge: ' + words + ' Wörter', words < 160 ? 'Etwas ausführlicher: ideal sind etwa 200–350 Wörter.' : words > 380 ? 'Kürzen: ideal sind etwa 200–350 Wörter.' : 'Im idealen Bereich (200–350).');
      A(S.pages === 1 ? 'ok' : 'warn', S.pages === 1 ? 'Passt auf eine Seite' : 'Länger als eine Seite', S.pages > 1 ? 'Ein Anschreiben sollte auf eine Seite passen.' : null);
      L.recipient.company.trim() ? A('ok', 'Empfänger angegeben') : A('warn', 'Empfänger fehlt', 'Firma (und wenn möglich Ansprechperson) eintragen.');
      /^Bewerbung/i.test(L.subject.trim()) ? A('ok', 'Betreff beginnt mit „Bewerbung“') : A('info', 'Betreff prüfen', 'Z. B. „Bewerbung als …“ – gern mit Kennziffer der Anzeige.');
      /Damen und Herren/.test(L.salutation) && L.recipient.contact.trim() ? A('info', 'Persönliche Anrede möglich', 'Es ist eine Ansprechperson eingetragen – „Sehr geehrte Frau …“ wirkt besser.') : A('ok', 'Anrede passt');
      L.body.filter((b) => CV.htmlToText(b.text).trim()).length >= 3 ? A('ok', 'Gute Gliederung in Absätze') : A('info', 'Mehr Absätze', 'Einleitung, Hauptteil (Erfahrung, Motivation) und Schluss.');
    } else {
      const C = S.proj.docs.cover;
      C.position.trim() ? A('ok', 'Position angegeben') : A('warn', 'Position fehlt');
      C.enclosures.some((e) => e.name.trim()) ? A('ok', 'Anlagenverzeichnis vorhanden') : A('info', 'Keine Anlagen aufgeführt');
    }
    return out;
  }
  const checkSoon = debounce(() => {
    S.checks = runChecks();
    renderTabs();
    if (S.tab === 'check') refreshPanel();
  }, 450);
  function panelCheck() {
    S.checks = runChecks();
    const list = S.checks, ok = list.filter((c) => c.lvl === 'ok').length;
    const stack = h('div.stack');
    stack.appendChild(h('div.score', h('div.big', ok + '/' + list.length), h('div', h('b', 'Bewerbungs-Check'), h('div.hint', 'Prüft ' + DOCS.find((d) => d.id === S.docType).label.toLowerCase() + ' auf typische Schwachstellen.'))));
    const box = h('div.list');
    list.sort((a, b) => ['warn', 'info', 'ok'].indexOf(a.lvl) - ['warn', 'info', 'ok'].indexOf(b.lvl)).forEach((c) =>
      box.appendChild(h('div.check.' + c.lvl, icon(c.lvl === 'ok' ? 'check' : c.lvl === 'warn' ? 'alert' : 'info', 16), h('div', h('b', c.t), c.d ? h('span', c.d) : null))));
    stack.appendChild(box);
    return stack;
  }

  /* ============================================================
     Topbar, Dokumente, Projekte, Menü
     ============================================================ */
  function updateTop() {
    $('#projName').value !== S.proj.name && document.activeElement !== $('#projName') && ($('#projName').value = S.proj.name);
    $$('#docTabs button').forEach((b) => b.classList.toggle('active', b.dataset.doc === S.docType));
    $('#btnUndo').disabled = S.hi <= 0;
    $('#btnRedo').disabled = S.hi >= S.hist.length - 1;
    $('#btnPreview').classList.toggle('on', S.preview);
    document.title = (S.proj.name || 'Bewerbung') + ' – Bewerbungsstudio';
  }
  function setDoc(id) {
    if (id === S.docType) return;
    histSoon.flush();
    S.docType = id;
    mountRenderer();
    updateTop();
    S.checks = null;
    checkSoon();
    refreshPanel();
    $('#stage').scrollTop = 0;
  }
  function setPreview(on) {
    S.preview = on;
    S.renderer.setPreview(on);
    if (on) hideRichbar();
    updateTop();
  }

  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('mousedown', menuOutside, true); } }
  function menuOutside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
  function menu(anchor, items) {
    closeMenu();
    const r = anchor.getBoundingClientRect();
    menuEl = h('div.menu', items.map((it) => it === '-' ? h('hr') : h('button', { type: 'button', onclick: () => { closeMenu(); it.fn(); } }, icon(it.i, 16), it.t)));
    document.body.appendChild(menuEl);
    menuEl.style.top = r.bottom + 6 + 'px';
    menuEl.style.left = Math.max(8, Math.min(innerWidth - menuEl.offsetWidth - 8, r.right - menuEl.offsetWidth)) + 'px';
    setTimeout(() => document.addEventListener('mousedown', menuOutside, true));
  }

  /* ---------- Projekte ---------- */
  function openProject(p, fresh) {
    S.proj = p;
    if (!S.index.find((x) => x.id === p.id)) S.index.push({ id: p.id, name: p.name, updated: p.updated });
    saveProject();
    resetHistory();
    S.checks = null;
    mountRenderer();
    updateTop();
    refreshPanel();
    checkSoon();
    $('#projName').value = p.name;
    if (fresh) $('#stage').scrollTop = 0;
  }
  function switchProject(id) {
    if (id === S.proj.id) return;
    histSoon.flush(); saveProject();
    const p = loadProject(id);
    if (p) openProject(p, true); else toast('Projekt konnte nicht geladen werden.');
  }
  function newProject(kind) {
    histSoon.flush(); saveProject();
    const n = S.index.length + 1;
    const p = kind === 'sample' ? CV.sampleProject() : CV.blankProject();
    p.name = (kind === 'sample' ? 'Beispiel ' : 'Bewerbung ') + n;
    openProject(p, true);
    toast(kind === 'sample' ? 'Neue Bewerbung mit Musterdaten angelegt' : 'Neue leere Bewerbung angelegt');
  }
  function duplicateProject(id) {
    histSoon.flush(); saveProject();
    const src = id === S.proj.id ? S.proj : loadProject(id);
    if (!src) return;
    const p = CV.clone(src);
    p.id = CV.uid(); p.name = src.name + ' (Kopie)'; p.created = Date.now();
    openProject(p, true);
  }
  function deleteProject(id) {
    lsDel(KEY_P + id);
    S.index = S.index.filter((x) => x.id !== id);
    if (id === S.proj.id) {
      const next = S.index[0] && loadProject(S.index[0].id);
      if (next) openProject(next, true);
      else { const p = CV.sampleProject(); openProject(p, true); }
    } else saveIndex();
  }
  function openProjects() {
    const body = h('div.list');
    let close;
    const draw = () => {
      body.textContent = '';
      S.index.slice().sort((a, b) => b.updated - a.updated).forEach((e) => {
        const cur = e.id === S.proj.id;
        body.appendChild(h('div.projrow' + (cur ? '.current' : ''),
          h('div.pn', h('b', e.name || 'Ohne Namen'), h('small', (cur ? 'Geöffnet · ' : '') + 'Zuletzt: ' + new Date(e.updated).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))),
          cur ? null : h('button.btn.sm', { type: 'button', onclick: () => { close(); switchProject(e.id); } }, 'Öffnen'),
          ibtn('copy', 'Duplizieren', () => { close(); duplicateProject(e.id); }),
          ibtn('trash', 'Löschen', () => CV.confirm('Bewerbung löschen?', '„' + e.name + '“ wird unwiderruflich gelöscht.', 'Löschen', () => { deleteProject(e.id); setTimeout(openProjects, 200); }, true), 'danger')));
      });
    };
    draw();
    close = CV.modal({
      title: 'Meine Bewerbungen', wide: true, body,
      actions: [
        { label: 'JSON importieren', fn: () => { importJson(); } },
        { label: 'Neu (leer)', fn: () => newProject('blank') },
        { label: 'Neu mit Musterdaten', primary: true, fn: () => newProject('sample') },
      ],
    });
  }
  function exportJson() {
    histSoon.flush(); saveProject();
    const safe = (S.proj.name || 'bewerbung').replace(/[^\w\-äöüÄÖÜß]+/g, '_');
    CV.download(safe + '.json', JSON.stringify(S.proj, null, 1));
    toast('Projekt als JSON exportiert');
  }
  function importJson() {
    const inp = $('#fileImport');
    inp.onchange = () => {
      const f = inp.files[0];
      inp.value = '';
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const p = CV.normalize(JSON.parse(fr.result));
          p.id = CV.uid();
          openProject(p, true);
          toast('Projekt importiert');
        } catch (e) { toast('Datei ist kein gültiges Bewerbungs-Projekt.'); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }
  function resetToSample() {
    CV.confirm('Auf Musterdaten zurücksetzen?', 'Alle Inhalte dieser Bewerbung werden durch die Musterdaten ersetzt (Strg+Z macht es rückgängig).', 'Zurücksetzen', () => {
      const s = CV.sampleProject();
      s.id = S.proj.id; s.name = S.proj.name; s.design = S.proj.design;
      S.proj = s;
      S.renderer.P = s;
      commit(); saveProject();
      S.renderer.build();
      refreshPanel();
    }, true);
  }
  function showHelp() {
    const rows = [
      ['Strg + Z / Strg + Y', 'Rückgängig / Wiederholen'],
      ['Strg + B / I / U', 'Fett, Kursiv, Unterstrichen im Text'],
      ['Enter', 'Neue Zeile bzw. neuer Eintrag (bei Kenntnissen, Kontakten, Absätzen)'],
      ['Rücktaste im leeren Feld', 'Eintrag entfernen'],
      ['Strg + P', 'PDF / Drucken'],
      ['Strg + Mausrad', 'Zoomen'],
    ];
    CV.modal({
      title: 'Tipps & Tastenkürzel',
      body: [h('div.list', rows.map(([k, v]) => h('div.item', h('span.kbd', k), h('span.iname', { style: { textAlign: 'right' } }, v)))),
        h('p.modal-text', 'Alle Änderungen werden automatisch in Ihrem Browser gespeichert. Mit „JSON exportieren“ sichern Sie eine Kopie. Für das PDF im Druckdialog „Als PDF speichern“ wählen.')],
      actions: [{ label: 'Verstanden', primary: true }],
    });
  }

  /* ---------- Druck / PDF ---------- */
  function stripForPrint(paper) {
    paper.classList.add('noedit');
    paper.querySelectorAll('[contenteditable]').forEach((e) => e.removeAttribute('contenteditable'));
    paper.querySelectorAll('.ui').forEach((e) => e.remove());
    paper.style.minHeight = '';
    return paper;
  }
  function liveClone() {
    const was = S.preview;
    S.renderer.setPreview(true);
    const c = stripForPrint(S.renderer.root.cloneNode(true));
    S.renderer.setPreview(was);
    return c;
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function docClone(id) {
    if (id === S.docType) return liveClone();
    const box = $('#offscreen');
    const r = new CV.Renderer(S.proj, id, { edit: false });
    box.appendChild(r.root);
    r.build();
    await nextFrame();
    await document.fonts.ready;
    r.paginate();
    const c = stripForPrint(r.root.cloneNode(true));
    r.destroy();
    return c;
  }
  async function fillPrint(ids) {
    const root = $('#printRoot');
    root.textContent = '';
    await document.fonts.ready;
    for (const id of ids) root.appendChild(await docClone(id));
  }
  CV.fillPrint = fillPrint;
  async function doPrint(ids) {
    histSoon.flush();
    const root = $('#printRoot');
    await fillPrint(ids);
    const p = S.proj.person, nm = [p.firstName, p.lastName].filter(Boolean).join('_') || 'Bewerbung';
    const oldTitle = document.title;
    document.title = (ids.length > 1 ? 'Bewerbung' : DOCS.find((d) => d.id === ids[0]).label) + '_' + nm.replace(/\s+/g, '_');
    const done = () => { root.textContent = ''; document.title = oldTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    await nextFrame();
    window.print();
  }
  function openPrintDialog() {
    const inc = S.proj.include, boxes = {};
    const body = [
      h('p.modal-text', 'Welche Dokumente sollen in das PDF? Reihenfolge: Deckblatt, Anschreiben, Lebenslauf.'),
      ...DOCS.map((d) => {
        const cb = h('input', { type: 'checkbox' });
        cb.checked = inc[d.id] !== false;
        boxes[d.id] = cb;
        return h('label.checkrow', cb, icon(d.ico, 17), d.label);
      }),
      h('p.hint', 'Im Druckdialog „Ziel: Als PDF speichern“ wählen. Ränder und Hintergrundgrafiken sind bereits passend eingestellt.'),
    ];
    CV.modal({
      title: 'PDF / Drucken', body,
      actions: [
        { label: 'Abbrechen' },
        { label: 'Drucken / PDF speichern', primary: true, fn: () => {
          DOCS.forEach((d) => { inc[d.id] = boxes[d.id].checked; });
          saveSoon();
          const ids = DOCS.filter((d) => inc[d.id]).map((d) => d.id);
          if (!ids.length) { toast('Bitte mindestens ein Dokument wählen.'); return false; }
          setTimeout(() => doPrint(ids), 220);
        } },
      ],
    });
  }
  window.addEventListener('beforeprint', () => {
    const root = $('#printRoot');
    if (!root.children.length && S.renderer) root.appendChild(liveClone());
  });
  window.addEventListener('afterprint', () => { if (S.renderer) S.renderer.setPreview(S.preview); });

  /* ============================================================
     Start
     ============================================================ */
  function initStatic() {
    $$('[data-ico]').forEach((el) => el.appendChild(icon(el.dataset.ico, 17)));
    const tabs = $('#docTabs');
    DOCS.forEach((d) => tabs.appendChild(h('button', { type: 'button', 'data-doc': d.id, onclick: () => setDoc(d.id) }, icon(d.ico, 16), h('span.t', d.label))));
    buildRichbar();

    $('#projName').addEventListener('input', (e) => { S.proj.name = e.target.value; saveSoon(); histSoon(); document.title = (S.proj.name || 'Bewerbung') + ' – Bewerbungsstudio'; });
    $('#btnProjects').addEventListener('click', openProjects);
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnZoomIn').addEventListener('click', () => zoomBy(1.1));
    $('#btnZoomOut').addEventListener('click', () => zoomBy(1 / 1.1));
    $('#zoomLabel').addEventListener('click', () => { S.zoomMode = 'fit'; applyZoom(); });
    $('#btnPreview').addEventListener('click', () => setPreview(!S.preview));
    $('#btnPrint').addEventListener('click', openPrintDialog);
    $('#btnMore').addEventListener('click', (e) => menu(e.currentTarget, [
      { i: 'folder', t: 'Meine Bewerbungen …', fn: openProjects },
      { i: 'plus', t: 'Neue Bewerbung (Musterdaten)', fn: () => newProject('sample') },
      { i: 'plus', t: 'Neue Bewerbung (leer)', fn: () => newProject('blank') },
      '-',
      { i: 'download', t: 'Projekt als JSON exportieren', fn: exportJson },
      { i: 'upload', t: 'Projekt aus JSON importieren', fn: importJson },
      '-',
      { i: 'sparkle', t: 'Auf Musterdaten zurücksetzen', fn: resetToSample },
      { i: 'info', t: 'Tipps & Tastenkürzel', fn: showHelp },
    ]));

    const stage = $('#stage');
    stage.addEventListener('scroll', positionRichbar, { passive: true });
    stage.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08); } }, { passive: false });
    window.addEventListener('resize', () => { if (S.zoomMode === 'fit') applyZoom(); positionRichbar(); });
    document.addEventListener('selectionchange', positionRichbar);

    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      const inForm = e.target.matches && e.target.matches('input, textarea, select');
      if (mod && k === 'p') { e.preventDefault(); openPrintDialog(); }
      else if (mod && k === 's') { e.preventDefault(); histSoon.flush(); saveProject(); toast('Gespeichert – das passiert automatisch.'); }
      else if (mod && k === '0') { e.preventDefault(); S.zoomMode = 'fit'; applyZoom(); }
      else if (mod && !inForm && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && !inForm && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });
    window.addEventListener('beforeunload', () => { histSoon.flush(); try { saveProject(); } catch (e) { /* ignore */ } });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => { S.renderer && S.renderer.paginate(); thumbsSoon(); });
  }

  function start() {
    initStatic();
    const idx = loadIndex();
    S.index = idx.list || [];
    let p = idx.current && loadProject(idx.current);
    if (!p && S.index.length) p = loadProject(S.index[0].id);
    const first = !p;
    if (!p) { S.index = []; p = CV.sampleProject(); }
    S.proj = p;
    if (!S.index.find((x) => x.id === p.id)) S.index.push({ id: p.id, name: p.name, updated: p.updated });
    resetHistory();
    mountRenderer();
    renderTabs();
    refreshPanel();
    updateTop();
    checkSoon();
    if (first) { saveProject(); setTimeout(() => toast('Willkommen! Alles ist mit Musterdaten vorbefüllt – einfach reinklicken und überschreiben.', 5500), 500); }
    if (document.fonts) document.fonts.ready.then(() => { S.renderer.paginate(); applyZoom(); });
  }
  start();
})();
