/* Schlanke Strich-Icons (24er Raster) */
(function () {
  const CV = (window.CV = window.CV || {});
  const P = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    address: '<path d="M12 21s-7-6.1-7-11.2a7 7 0 0 1 14 0C19 14.900 12 21 12 21z"/><circle cx="12" cy="9.800" r="2.500"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3.200 3.300 3.200 14.700 0 18-3.200-3.300-3.200-14.700 0-18z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v5M8 8v.01M12 16v-5m0 2.500a2.500 2.500 0 0 1 5 0V16"/>',
    github: '<path d="M9 19c-5 1.500-5-2.500-7-3m14 6v-3.870a3.370 3.370 0 0 0-.940-2.610c3.140-.350 6.440-1.540 6.440-7A5.440 5.440 0 0 0 20 4.770 5.070 5.070 0 0 0 19.910 1S18.730.650 16 2.480a13.380 13.380 0 0 0-7 0C6.270.650 5.090 1 5.090 1A5.070 5.070 0 0 0 5 4.770a5.440 5.440 0 0 0-1.500 3.780c0 5.420 3.300 6.610 6.440 7A3.370 3.370 0 0 0 9 18.130V22"/>',
    other: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    eye: '<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.600 6.100A9.800 9.800 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3.200 4M6.500 7.500C3.800 9.300 2 12 2 12s3.600 7 10 7a9.800 9.800 0 0 0 4-.9"/><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
    upload: '<path d="M12 16V5m0 0-4 4m4-4 4 4M5 20h14"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.800"/><path d="m21 16-5-5-9 9"/>',
    bold: '<path d="M7 5h6a3.500 3.500 0 0 1 0 7H7zM7 12h7a3.500 3.500 0 0 1 0 7H7z"/>',
    italic: '<path d="M14 5h-4m4 0-4 14m0 0H6m4 0h4"/>',
    underline: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1" fill="currentColor"/><circle cx="4.500" cy="12" r="1" fill="currentColor"/><circle cx="4.500" cy="18" r="1" fill="currentColor"/>',
    olist: '<path d="M10 6h10M10 12h10M10 18h10M4 5l1-1v4M3.500 13.500c.5-1.500 2.500-1 2.500.2 0 1-2.500 1.800-2.500 2.800h2.600M3.500 19.500h2l-1 1.200a1.200 1.200 0 1 1-1 1.800"/>',
    clear: '<path d="M5 5h14M12 5v6m-4 8h8M9 19l3-8 3 8M4 4l16 16"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.700 0 2-1.200 1.200-2.300-.8-1.100-.2-2.700 1.300-2.700H17a4 4 0 0 0 4-4c0-4.400-4-9-9-9z"/><circle cx="7.500" cy="11" r="1"/><circle cx="10.500" cy="7" r="1"/><circle cx="15.500" cy="7.500" r="1"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.500M12 17.500v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.01"/>',
    more: '<circle cx="5" cy="12" r="1.200" fill="currentColor"/><circle cx="12" cy="12" r="1.200" fill="currentColor"/><circle cx="19" cy="12" r="1.200" fill="currentColor"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>',
    mail2: '<path d="M4 5h16v14H4z"/><path d="m4 6 8 7 8-7"/>',
    cover: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.500 8h7M8.500 12h7M8.500 16h4"/>',
    letter: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h5M8 12h8M8 16h8"/>',
    cvdoc: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9.500" cy="9" r="2"/><path d="M14 8h3M14 11h3M7 15h10"/>',
    sparkle: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z"/>',
  };
  CV.icon = function (name, size) {
    const s = size || 16;
    const t = document.createElement('template');
    t.innerHTML =
      '<svg class="ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (P[name] || P.other) + '</svg>';
    return t.content.firstChild;
  };
})();
