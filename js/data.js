/* Datenmodell, Standardwerte, Musterdaten, Normalisierung */
(function () {
  const CV = (window.CV = window.CV || {});
  const uid = CV.uid;

  /* ---------- Schriftpaare ---------- */
  const SANS = ", 'Segoe UI', system-ui, -apple-system, Arial, sans-serif";
  const SERIF = ", Georgia, 'Times New Roman', serif";
  CV.FONTS = {
    inter: { name: 'Inter', note: 'Klar & modern', head: "'Inter'" + SANS, body: "'Inter'" + SANS },
    dmsans: { name: 'DM Sans', note: 'Freundlich geometrisch', head: "'DM Sans'" + SANS, body: "'DM Sans'" + SANS },
    source: { name: 'Source Sans', note: 'Neutral & gut lesbar', head: "'Source Sans 3'" + SANS, body: "'Source Sans 3'" + SANS },
    montserrat: { name: 'Montserrat + Source Sans', note: 'Kräftige Überschriften', head: "'Montserrat'" + SANS, body: "'Source Sans 3'" + SANS },
    playfair: { name: 'Playfair + Source Sans', note: 'Elegant & kontrastreich', head: "'Playfair Display'" + SERIF, body: "'Source Sans 3'" + SANS },
    lora: { name: 'Lora', note: 'Klassisch seriös (Serif)', head: "'Lora'" + SERIF, body: "'Lora'" + SERIF },
    garamond: { name: 'EB Garamond', note: 'Zeitlos, buchartig', head: "'EB Garamond'" + SERIF, body: "'EB Garamond'" + SERIF },
    plex: { name: 'IBM Plex Sans', note: 'Technisch sachlich', head: "'IBM Plex Sans'" + SANS, body: "'IBM Plex Sans'" + SANS },
    plexmono: { name: 'Plex Mono + Plex Sans', note: 'Tech / Entwickler', head: "'IBM Plex Mono', Consolas, monospace", body: "'IBM Plex Sans'" + SANS },
  };

  CV.PALETTE = [
    { n: 'Marineblau', c: '#14284b' },
    { n: 'Dunkelblau', c: '#1d3557' },
    { n: 'Nachtblau', c: '#0b1f3a' },
    { n: 'Königsblau', c: '#1f4fa3' },
    { n: 'Stahlblau', c: '#3e6a8f' },
    { n: 'Petrol', c: '#0f5e6b' },
    { n: 'Tannengrün', c: '#1f5a45' },
    { n: 'Bordeaux', c: '#7a1f3a' },
    { n: 'Terrakotta', c: '#b5532d' },
    { n: 'Aubergine', c: '#4a2a5e' },
    { n: 'Anthrazit', c: '#2b2f36' },
    { n: 'Gold', c: '#a8822f' },
  ];

  CV.DEFAULT_DESIGN = {
    template: 'modern',
    accent: '#14284b',
    font: 'inter',
    size: 10,
    lh: 1.45,
    margin: 16,
    gap: 1,
    photo: true,
    photoShape: 'round',
    skills: 'dots',
    icons: true,
    caps: true,
    custom: false,
  };

  /* ---------- Abschnittstypen ---------- */
  const TL = (title, org, place) => ({ title, org, place, date: 'MM/JJJJ – MM/JJJJ', text: 'Aufgaben, Ergebnisse, Erfolge …' });
  CV.SECTION_TYPES = {
    summary: { kind: 'text', title: 'Profil', label: 'Profil / Kurzvorstellung', ph: 'Kurzprofil: Wer sind Sie und was zeichnet Sie aus?' },
    experience: { kind: 'timeline', title: 'Berufserfahrung', label: 'Berufserfahrung', ph: TL('Position', 'Unternehmen', 'Ort') },
    education: { kind: 'timeline', title: 'Ausbildung', label: 'Ausbildung & Studium', ph: TL('Abschluss', 'Hochschule / Schule', 'Ort') },
    projects: { kind: 'timeline', title: 'Projekte', label: 'Projekte', ph: TL('Projektname', 'Rolle / Auftraggeber', 'Ort') },
    certificates: { kind: 'timeline', title: 'Weiterbildungen', label: 'Weiterbildung & Zertifikate', ph: TL('Zertifikat / Kurs', 'Anbieter', 'Ort') },
    volunteer: { kind: 'timeline', title: 'Ehrenamt', label: 'Ehrenamt', ph: TL('Tätigkeit', 'Organisation', 'Ort') },
    timeline: { kind: 'timeline', title: 'Freier Abschnitt', label: 'Freier Abschnitt (Zeitleiste)', ph: TL('Titel', 'Untertitel', 'Ort') },
    skills: { kind: 'skills', side: true, title: 'Kenntnisse', label: 'Kenntnisse mit Level', ph: 'Kenntnis' },
    languages: { kind: 'languages', side: true, title: 'Sprachen', label: 'Sprachen', ph: 'Sprache' },
    tags: { kind: 'tags', side: true, title: 'Interessen', label: 'Stichworte / Interessen', ph: 'Stichwort' },
    facts: { kind: 'facts', side: true, title: 'Persönliches', label: 'Persönliche Daten', ph: 'Angabe' },
    text: { kind: 'text', title: 'Freier Text', label: 'Freier Text', ph: 'Text …' },
  };

  CV.CONTACT_TYPES = {
    email: { label: 'E-Mail', ph: 'name@beispiel.de' },
    phone: { label: 'Telefon', ph: '+49 000 0000000' },
    address: { label: 'Adresse', ph: 'Straße 1, 12345 Ort' },
    web: { label: 'Webseite', ph: 'www.beispiel.de' },
    linkedin: { label: 'LinkedIn', ph: 'linkedin.com/in/…' },
    github: { label: 'GitHub', ph: 'github.com/…' },
    other: { label: 'Sonstiges', ph: 'Angabe' },
  };

  /* ---------- Fabriken ---------- */
  CV.newItem = function (kind, init) {
    const base = { id: uid() };
    switch (kind) {
      case 'timeline': return Object.assign(base, { title: '', org: '', place: '', date: '', text: '' }, init);
      case 'skills': return Object.assign(base, { name: '', level: 4 }, init);
      case 'languages': return Object.assign(base, { name: '', level: '' }, init);
      case 'tags': return Object.assign(base, { name: '' }, init);
      case 'facts': return Object.assign(base, { label: '', value: '' }, init);
      default: return Object.assign(base, init);
    }
  };
  CV.newSection = function (type, init) {
    const t = CV.SECTION_TYPES[type];
    const s = { id: uid(), type, title: t.title, hidden: false, col: null };
    if (t.kind === 'text') s.text = '';
    else s.items = [];
    return Object.assign(s, init);
  };
  const sec = (type, init, items) => {
    const s = CV.newSection(type, init);
    if (items) s.items = items.map((it) => CV.newItem(CV.SECTION_TYPES[type].kind, it));
    return s;
  };
  CV.newContact = (type, value) => ({ id: uid(), type: type || 'other', value: value || '' });

  /* ---------- Musterfoto (neutrale Silhouette) ---------- */
  const SAMPLE_PHOTO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd7e6"/><stop offset="1" stop-color="#9fb0c9"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="150" cy="116" r="54" fill="#f1f4f9"/><path d="M42 300c4-62 48-102 108-102s104 40 108 102z" fill="#f1f4f9"/></svg>'
    );

  /* ---------- Textbausteine für Anschreiben ---------- */
  CV.SNIPPETS = [
    { cat: 'Einleitung', label: 'Direkter Einstieg', text: 'mit großer Begeisterung habe ich Ihre Stellenausschreibung als [Position] gelesen. Die Aufgabe verbindet genau das, was ich in den letzten Jahren mit Leidenschaft gemacht habe – und ich möchte dieses Wissen gerne in Ihrem Unternehmen einbringen.' },
    { cat: 'Einleitung', label: 'Bezug auf das Unternehmen', text: 'Ihr Unternehmen steht für [Werte/Produkte], die mich seit Langem überzeugen. Umso mehr freue ich mich, mich auf die Position als [Position] zu bewerben.' },
    { cat: 'Einleitung', label: 'Nach Telefonat', text: 'vielen Dank für das informative Telefonat am [Datum]. Wie besprochen sende ich Ihnen hiermit meine Bewerbungsunterlagen für die Position als [Position].' },
    { cat: 'Hauptteil', label: 'Erfahrung & Erfolge', text: 'In meiner aktuellen Position bei [Unternehmen] verantworte ich [Aufgabe]. Dabei konnte ich [messbares Ergebnis] erreichen. Diese Erfahrung hilft mir, auch bei Ihnen schnell Verantwortung zu übernehmen.' },
    { cat: 'Hauptteil', label: 'Passung zur Stelle', text: 'Besonders reizt mich an der Position, dass [Aspekt der Stelle]. Meine Stärken – [Stärke 1], [Stärke 2] und [Stärke 3] – passen dazu sehr gut.' },
    { cat: 'Hauptteil', label: 'Soft Skills mit Beleg', text: 'Kolleginnen und Kollegen beschreiben mich als zuverlässig, lösungsorientiert und teamstark. So habe ich beispielsweise [konkretes Beispiel], wodurch [Ergebnis].' },
    { cat: 'Schluss', label: 'Gesprächswunsch', text: 'Über die Einladung zu einem persönlichen Gespräch freue ich mich sehr. Gerne stelle ich Ihnen dort vor, wie ich Ihr Team unterstützen kann.' },
    { cat: 'Schluss', label: 'Kündigungsfrist', text: 'Meine Kündigungsfrist beträgt [drei Monate zum Monatsende]. Ein früherer Einstieg ist nach Absprache möglich.' },
    { cat: 'Schluss', label: 'Gehaltsvorstellung', text: 'Meine Gehaltsvorstellung liegt bei [Betrag] Euro brutto jährlich.' },
  ];

  /* ---------- Leeres Projekt ---------- */
  CV.blankProject = function (name) {
    return {
      v: 1,
      id: uid(),
      name: name || 'Neue Bewerbung',
      created: Date.now(),
      updated: Date.now(),
      design: Object.assign({}, CV.DEFAULT_DESIGN),
      include: { cover: true, letter: true, cv: true },
      person: {
        firstName: '',
        lastName: '',
        jobTitle: '',
        photo: null,
        contactTitle: 'Kontakt',
        contacts: [CV.newContact('email'), CV.newContact('phone'), CV.newContact('address')],
      },
      docs: {
        cv: {
          sections: [
            CV.newSection('summary'),
            CV.newSection('experience', { items: [CV.newItem('timeline')] }),
            CV.newSection('education', { items: [CV.newItem('timeline')] }),
            CV.newSection('skills', { items: [CV.newItem('skills')] }),
            CV.newSection('languages', { items: [CV.newItem('languages')] }),
            CV.newSection('tags', { items: [CV.newItem('tags')] }),
          ],
        },
        letter: {
          recipient: { company: '', contact: '', street: '', city: '' },
          place: '',
          date: CV.today(),
          subject: 'Bewerbung als …',
          salutation: 'Sehr geehrte Damen und Herren,',
          body: [{ id: uid(), text: '' }],
          closing: 'Mit freundlichen Grüßen',
          signature: { mode: 'script', image: null },
          enclosures: 'Anlagen: Lebenslauf, Zeugnisse',
        },
        cover: {
          title: 'Bewerbungsunterlagen',
          position: 'als …',
          company: 'bei …',
          enclosuresTitle: 'Anlagen',
          enclosures: [
            { id: uid(), name: 'Anschreiben' },
            { id: uid(), name: 'Lebenslauf' },
            { id: uid(), name: 'Zeugnisse' },
          ],
        },
      },
    };
  };

  /* ---------- Musterdaten (alles vorausgefüllt) ---------- */
  CV.sampleProject = function () {
    const p = CV.blankProject('Beispiel – Projektmanagerin');
    p.person = {
      firstName: 'Sophie',
      lastName: 'Berger',
      jobTitle: 'Senior Projektmanagerin · Digitale Produkte',
      photo: { src: SAMPLE_PHOTO, zoom: 1, x: 0, y: 0 },
      contactTitle: 'Kontakt',
      contacts: [
        CV.newContact('email', 'sophie.berger@beispiel.de'),
        CV.newContact('phone', '+49 151 2345 6789'),
        CV.newContact('address', 'Musterstraße 12, 10115 Berlin'),
        CV.newContact('web', 'www.sophie-berger.de'),
        CV.newContact('linkedin', 'linkedin.com/in/sophieberger'),
      ],
    };
    p.docs.cv.sections = [
      sec('summary', { title: 'Profil' }, null),
      sec('experience', { title: 'Berufserfahrung' }, [
        {
          title: 'Senior Projektmanagerin',
          org: 'Nordlicht Digital GmbH',
          place: 'Berlin',
          date: '03/2020 – heute',
          text: '<ul><li>Leitung von 6–8 parallelen Projekten mit einem Gesamtvolumen von 2,4 Mio. €</li><li>Einführung agiler Methoden (Scrum/Kanban) – Lieferzeiten um 30 % reduziert</li><li>Aufbau und Coaching eines Teams aus 12 Entwickler:innen und Designer:innen</li></ul>',
        },
        {
          title: 'Projektmanagerin',
          org: 'Brandwerk Agentur',
          place: 'Hamburg',
          date: '07/2016 – 02/2020',
          text: '<ul><li>Betreuung von Kund:innen aus Handel und Industrie von der Konzeption bis zum Launch</li><li>Relaunch von über 15 Webauftritten termin- und budgetgerecht</li></ul>',
        },
        {
          title: 'Junior Projektmanagerin',
          org: 'Pixelhaus Media',
          place: 'Hamburg',
          date: '10/2014 – 06/2016',
          text: '<ul><li>Unterstützung der Projektleitung bei Planung, Budgetierung und Reporting</li></ul>',
        },
      ]),
      sec('education', { title: 'Ausbildung' }, [
        { title: 'M.Sc. Wirtschaftsinformatik', org: 'Universität Hamburg', place: 'Hamburg', date: '2012 – 2014', text: 'Abschlussnote 1,4 · Schwerpunkt Prozess- und Projektmanagement' },
        { title: 'B.A. Betriebswirtschaftslehre', org: 'Universität Mannheim', place: 'Mannheim', date: '2009 – 2012', text: 'Schwerpunkte Marketing und Organisation · Abschlussnote 1,9' },
      ]),
      sec('certificates', { title: 'Weiterbildungen', hidden: true }, [
        { title: 'Project Management Professional (PMP)', org: 'Project Management Institute', place: '', date: '2021', text: '' },
        { title: 'Professional Scrum Master I', org: 'Scrum.org', place: '', date: '2019', text: '' },
      ]),
      sec('skills', { title: 'Kenntnisse' }, [
        { name: 'Projektmanagement', level: 5 },
        { name: 'Scrum & Kanban', level: 5 },
        { name: 'Stakeholder-Management', level: 4 },
        { name: 'Budgetplanung', level: 4 },
        { name: 'Jira / Confluence', level: 5 },
        { name: 'Figma', level: 3 },
        { name: 'SQL', level: 3 },
      ]),
      sec('languages', { title: 'Sprachen' }, [
        { name: 'Deutsch', level: 'Muttersprache' },
        { name: 'Englisch', level: 'Verhandlungssicher (C1)' },
        { name: 'Französisch', level: 'Grundkenntnisse (A2)' },
      ]),
      sec('tags', { title: 'Interessen' }, [{ name: 'Trailrunning' }, { name: 'Fotografie' }, { name: 'Kochen' }, { name: 'Ehrenamt' }]),
      sec('facts', { title: 'Persönliches', hidden: true }, [
        { label: 'Geburtsdatum', value: '14.03.1989' },
        { label: 'Nationalität', value: 'deutsch' },
      ]),
    ];
    p.docs.cv.sections[0].text =
      'Engagierte Projektmanagerin mit über acht Jahren Erfahrung in der Entwicklung digitaler Produkte. Ich verbinde strategisches Denken mit pragmatischer Umsetzung und führe interdisziplinäre Teams verlässlich von der Idee bis zum Launch.';

    const L = p.docs.letter;
    L.recipient = { company: 'Musterfirma GmbH', contact: 'Frau Dr. Anna Schmidt', street: 'Beispielallee 8', city: '80331 München' };
    L.place = 'Berlin';
    L.date = CV.today();
    L.subject = 'Bewerbung als Senior Projektmanagerin Digitale Produkte (m/w/d)';
    L.salutation = 'Sehr geehrte Frau Dr. Schmidt,';
    L.body = [
      'mit großem Interesse habe ich Ihre Ausschreibung für die Position als Senior Projektmanagerin gelesen. Die Aufgabe, digitale Produkte von der Idee bis zum Markterfolg zu begleiten, verbindet genau das, was ich in den letzten acht Jahren mit Leidenschaft gemacht habe.',
      'Aktuell verantworte ich bei der Nordlicht Digital GmbH sechs bis acht parallele Projekte mit einem Gesamtvolumen von 2,4 Millionen Euro. Durch die Einführung agiler Methoden konnte ich die Lieferzeiten um 30 % senken und gleichzeitig die Zufriedenheit der Kundinnen und Kunden spürbar steigern. Dabei führe ich ein interdisziplinäres Team aus zwölf Entwickler:innen und Designer:innen.',
      'Besonders stolz bin ich auf den Relaunch einer Kundenplattform, den ich über 14 Monate von der Anforderungsanalyse bis zum Go-live geleitet habe: Das Projekt blieb im Budget, wurde termingerecht ausgeliefert und steigerte die Conversion-Rate um 18 %. Entscheidend dafür waren transparente Kommunikation mit allen Beteiligten und ein konsequenter Blick auf die Prioritäten.',
      'Besonders reizt mich an Ihrem Unternehmen der konsequente Fokus auf nutzerzentrierte Produkte. Meine Stärken – strukturiertes Arbeiten, klare Kommunikation und der Blick für das Wesentliche – möchte ich gerne bei Ihnen einbringen.',
      'Über die Einladung zu einem persönlichen Gespräch freue ich mich sehr. Meine Kündigungsfrist beträgt drei Monate zum Monatsende.',
    ].map((t) => ({ id: uid(), text: t }));
    L.closing = 'Mit freundlichen Grüßen';
    L.signature = { mode: 'script', image: null };
    L.enclosures = 'Anlagen: Lebenslauf, Zeugnisse, Zertifikate';

    const C = p.docs.cover;
    C.title = 'Bewerbungsunterlagen';
    C.position = 'als Senior Projektmanagerin Digitale Produkte (m/w/d)';
    C.company = 'bei der Musterfirma GmbH';
    C.enclosuresTitle = 'Anlagen';
    C.enclosures = ['Anschreiben', 'Lebenslauf', 'Arbeitszeugnisse', 'Abschlusszeugnisse', 'Zertifikate (PMP, PSM I)'].map((n) => ({ id: uid(), name: n }));
    return p;
  };

  /* ---------- Normalisieren (Import / alte Stände) ---------- */
  CV.normalize = function (p) {
    const B = CV.blankProject();
    const out = Object.assign({}, B, p);
    out.id = p.id || uid();
    out.design = Object.assign({}, CV.DEFAULT_DESIGN, p.design || {});
    out.include = Object.assign({ cover: true, letter: true, cv: true }, p.include || {});
    out.person = Object.assign({}, B.person, p.person || {});
    out.person.contacts = (out.person.contacts || []).map((c) => Object.assign({ id: uid(), type: 'other', value: '' }, c));
    out.docs = {
      cv: Object.assign({}, B.docs.cv, (p.docs && p.docs.cv) || {}),
      letter: Object.assign({}, B.docs.letter, (p.docs && p.docs.letter) || {}),
      cover: Object.assign({}, B.docs.cover, (p.docs && p.docs.cover) || {}),
    };
    out.docs.cv.sections = (out.docs.cv.sections || []).filter((s) => CV.SECTION_TYPES[s.type]).map((s) => {
      const t = CV.SECTION_TYPES[s.type];
      const n = Object.assign({ id: uid(), title: t.title, hidden: false, col: null }, s);
      if (t.kind === 'text') n.text = CV.sanitize(n.text || '');
      else {
        n.items = (n.items || []).map((it) => {
          const m = CV.newItem(t.kind, it);
          if (m.text) m.text = CV.sanitize(m.text);
          return m;
        });
      }
      return n;
    });
    const L = out.docs.letter;
    L.recipient = Object.assign({ company: '', contact: '', street: '', city: '' }, L.recipient);
    L.signature = Object.assign({ mode: 'script', image: null }, L.signature);
    L.body = (L.body || []).map((b) => ({ id: b.id || uid(), text: CV.sanitize(b.text || '') }));
    if (!L.body.length) L.body = [{ id: uid(), text: '' }];
    out.docs.cover.enclosures = (out.docs.cover.enclosures || []).map((e) => ({ id: e.id || uid(), name: e.name || '' }));
    return out;
  };
})();
