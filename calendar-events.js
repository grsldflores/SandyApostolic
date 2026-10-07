/* Sandy Apostolic Church — live Events from Google Calendar
 * Fills the "Upcoming Events" section using the site's existing card design.
 * If the calendar can't be reached, the events already written in index.html stay as they are.
 */
(function () {
  // Paste your Apps Script Web app URL here (ends in /exec)
  var CALENDAR_FEED_URL = 'https://script.google.com/macros/s/AKfycbwVfBwRIANCcQoCoz2uR-CmgwXTHEi_g7vmud5nvlieEPzPqknqbvh_u1MnBWjE5mMy/exec';
  var TZ = 'America/Denver';
  var TILE_STYLES = ['d', 'a', 'b', 'c']; // the site's existing gradient tiles, in rotation

  var grid = document.querySelector('#events .events');
  if (!grid || CALENDAR_FEED_URL.indexOf('http') !== 0) return;

  function fmt(date, lang, opts) {
    opts.timeZone = TZ;
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', opts).format(date);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // Builds <span class="en">…</span><span class="es">…</span> inside a parent
  function both(parent, en, es) {
    parent.appendChild(el('span', 'en', en));
    parent.appendChild(el('span', 'es', es == null || es === '' ? en : es));
    return parent;
  }
  // Small label above the big date (month / "Every"); keeps the site's small style
  function label(parent, en, es) {
    both(parent, en, es);
    for (var i = 0; i < parent.children.length; i++) parent.children[i].style.font = 'inherit';
    return parent;
  }
  // Auto-detect which half is Spanish and which is English, in any order.
  var ES_WORDS = /\b(el|la|los|las|de|del|y|en|con|para|por|un|una|nuestra?s?|que|es|al|se|su|sus|tu|te|ven|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|servicio|iglesia|oraci[oó]n|reuni[oó]n|j[oó]venes|ni[nñ]os|damas|varones|hermanas?|convivio|alcance|actividad|escuela|dominical|matutino|todos)\b/gi;
  var EN_WORDS = /\b(the|and|of|for|with|our|your|you|we|to|in|at|is|are|join|us|all|sunday|monday|tuesday|wednesday|thursday|friday|saturday|service|church|prayer|meeting|youth|kids|children|women|men|ladies|outreach|activity|school|morning|night|community|fellowship)\b/gi;
  function spanishScore(s) {
    var es = (s.match(ES_WORDS) || []).length + 2 * (s.match(/[áéíóúñ¿¡]/gi) || []).length;
    var en = (s.match(EN_WORDS) || []).length;
    return es - en;
  }
  function pair(a, b) {
    a = (a || '').trim(); b = (b || '').trim();
    if (!b) return { en: a, es: a };
    return spanishScore(a) >= spanishScore(b) ? { es: a, en: b } : { en: a, es: b };
  }
  // Titles: "Español / English", "English | Español", either order
  function splitTitle(t) {
    t = (t || '').trim();
    var p = t.split(/\s+[|\/]\s+/);
    return p.length > 1 ? pair(p[0], p.slice(1).join(' / ')) : pair(t);
  }
  // Descriptions: two parts separated by a line with ---, either order
  function splitDesc(d) {
    var p = (d || '').split(/\n\s*-{3,}\s*\n/);
    return p.length > 1 ? pair(p[0], p.slice(1).join('\n')) : pair(p[0]);
  }
  function trim(s, n) { return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; }

  function timeLabel(ev, start, lang) {
    if (ev.allDay) return lang === 'es' ? 'Todo el día' : 'All day';
    return fmt(start, lang, { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?\s?m\.?/i, function (_, x) { return ' ' + x.toUpperCase() + 'M'; });
  }

  function card(ev, i) {
    var start = new Date(ev.start);
    var title = splitTitle(ev.title);
    var desc = splitDesc(ev.description);
    var art = el('article', 'ev');

    // Date tile
    var tile = el('div', 'img ' + TILE_STYLES[i % TILE_STYLES.length]);
    var big = el('span');
    var small = el('small');
    if (ev.weekly) {
      label(small, 'Every', 'Cada');
      big.appendChild(small);
      both(big, fmt(start, 'en', { weekday: 'short' }).toUpperCase(),
                fmt(start, 'es', { weekday: 'short' }).replace('.', '').toUpperCase());
    } else {
      label(small, fmt(start, 'en', { month: 'short' }), cap(fmt(start, 'es', { month: 'short' }).replace('.', '')));
      big.appendChild(small);
      big.appendChild(document.createTextNode(fmt(start, 'en', { day: 'numeric' })));
    }
    tile.appendChild(big);
    art.appendChild(tile);

    // Meta line: "Sunday · 6:00 AM" / "Weekly · 7:00 PM"
    var meta = el('span', 'meta');
    var dayEn = ev.weekly ? 'Weekly' : fmt(start, 'en', { weekday: 'long' });
    var dayEs = ev.weekly ? 'Semanal' : cap(fmt(start, 'es', { weekday: 'long' }));
    both(meta, dayEn + ' · ' + timeLabel(ev, start, 'en'), dayEs + ' · ' + timeLabel(ev, start, 'es'));
    art.appendChild(meta);

    var h3 = el('h3');
    if (title.en === title.es) h3.textContent = title.en; else both(h3, title.en, title.es);
    art.appendChild(h3);

    if (desc.en) {
      var p = el('p');
      p.style.whiteSpace = 'pre-line';
      both(p, trim(desc.en, 260), trim(desc.es, 260));
      art.appendChild(p);
    }

    if (ev.location) {
      var a = el('a', 'link');
      a.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(ev.location);
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.color = 'var(--accent)';
      both(a, 'Directions', 'Cómo llegar');
      a.appendChild(document.createTextNode(' →'));
      art.appendChild(a);
    }
    return art;
  }

  function empty() {
    var art = el('article', 'ev');
    art.style.gridColumn = '1 / -1';
    art.style.textAlign = 'center';
    var p = el('p');
    both(p, 'No upcoming events posted right now. Check back soon, or follow us on Facebook!',
            'No hay eventos próximos por ahora. ¡Vuelve pronto o síguenos en Facebook!');
    art.appendChild(p);
    return art;
  }

  fetch(CALENDAR_FEED_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var list = (data && data.events) || [];
      var frag = document.createDocumentFragment();
      if (!list.length) frag.appendChild(empty());
      else list.forEach(function (ev, i) { frag.appendChild(card(ev, i)); });
      grid.replaceChildren(frag);
    })
    .catch(function (err) {
      // Keep the events already in index.html if the calendar can't be reached.
      if (window.console) console.warn('Calendar events unavailable:', err);
    });
})();
