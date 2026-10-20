/* Vorlagen-Metadaten. Das eigentliche Aussehen steckt in css/doc.css (Klasse .tpl-<id>) */
(function () {
  const CV = (window.CV = window.CV || {});
  const SIDE = ['skills', 'languages', 'tags', 'facts'];

  CV.TEMPLATES = {
    modern: {
      id: 'modern', name: 'Modern', tag: 'Marine-Seitenleiste',
      layout: 'side-left', headRegion: false, headVariant: 'bar',
      contactIn: 'side', photoIn: 'side', sideTypes: SIDE,
      d: { accent: '#14284b', font: 'inter', skills: 'dots', photoShape: 'round' },
    },
    executive: {
      id: 'executive', name: 'Executive', tag: 'Dunkles Kopfband',
      layout: 'side-right', headRegion: true, headVariant: 'band',
      contactIn: 'side', photoIn: 'head', sideTypes: SIDE,
      d: { accent: '#1d3557', font: 'montserrat', skills: 'bars', photoShape: 'round' },
    },
    classic: {
      id: 'classic', name: 'Klassisch', tag: 'Seriös, einspaltig',
      layout: 'single', headRegion: true, headVariant: 'line',
      contactIn: 'head', photoIn: 'head', sideTypes: [],
      d: { accent: '#1d3557', font: 'lora', skills: 'text', photoShape: 'portrait' },
    },
    minimal: {
      id: 'minimal', name: 'Minimal', tag: 'Viel Weißraum',
      layout: 'single', headRegion: true, headVariant: 'plain',
      contactIn: 'head', photoIn: 'head', sideTypes: [],
      d: { accent: '#334155', font: 'dmsans', skills: 'bars', photoShape: 'round' },
    },
    elegant: {
      id: 'elegant', name: 'Elegant', tag: 'Zentriert, Serif',
      layout: 'single', headRegion: true, headVariant: 'center',
      contactIn: 'head', photoIn: 'head', sideTypes: [],
      d: { accent: '#8a6a2f', font: 'playfair', skills: 'text', photoShape: 'round' },
    },
    creative: {
      id: 'creative', name: 'Kreativ', tag: 'Farbakzente',
      layout: 'side-right', headRegion: false, headVariant: 'bar',
      contactIn: 'side', photoIn: 'side', sideTypes: SIDE,
      d: { accent: '#c2410c', font: 'montserrat', skills: 'chips', photoShape: 'round' },
    },
    timeline: {
      id: 'timeline', name: 'Zeitstrahl', tag: 'Vertikale Timeline',
      layout: 'single', headRegion: true, headVariant: 'row',
      contactIn: 'head', photoIn: 'head', sideTypes: [],
      d: { accent: '#1f4fa3', font: 'plex', skills: 'dots', photoShape: 'round' },
    },
    tech: {
      id: 'tech', name: 'Tech', tag: 'Kompakt, Monospace',
      layout: 'single', headRegion: true, headVariant: 'tech',
      contactIn: 'head', photoIn: 'none', sideTypes: [],
      d: { accent: '#0f766e', font: 'plexmono', skills: 'bars', photoShape: 'square' },
    },
  };
  CV.TEMPLATE_ORDER = ['modern', 'executive', 'classic', 'minimal', 'elegant', 'creative', 'timeline', 'tech'];
})();
