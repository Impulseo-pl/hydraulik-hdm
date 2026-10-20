/* Hydraulik HDM - skrypty strony. Impulseo. */
(function () {
  'use strict';

  /* ---------- nawigacja ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('stuck', window.scrollY > 8);
  }, { passive: true });

  /* ---------- pojawianie się sekcji ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- filtry galerii ---------- */
  var filters = document.querySelectorAll('.gal-filters button');
  if (filters.length) {
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.filter;
        filters.forEach(function (x) { x.classList.toggle('on', x === b); });
        document.querySelectorAll('.gal .shot').forEach(function (s) {
          var show = f === 'all' || (s.dataset.cat || '').split(' ').indexOf(f) > -1;
          s.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ---------- podgląd zdjęcia z galerii ---------- */
  var szoty = Array.prototype.filter.call(
    document.querySelectorAll('.gal a.shot'),
    function (a) { return /\.(webp|jpe?g|png)$/i.test(a.getAttribute('href') || ''); }
  );
  if (szoty.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Podgląd zdjęcia');
    lb.hidden = true;
    lb.innerHTML =
      '<button class="lb-btn lb-x" type="button" aria-label="Zamknij podgląd">\u00d7</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Poprzednie zdjęcie">\u2039</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Następne zdjęcie">\u203a</button>' +
      '<figure class="lb-fig"><img alt=""><figcaption class="lb-cap"></figcaption></figure>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-cap');
    var wrocDo = null;
    var teraz = 0;

    function widoczne() {
      return szoty.filter(function (a) { return a.style.display !== 'none'; });
    }
    function pokaz(i) {
      var lista = widoczne();
      if (!lista.length) return;
      teraz = (i + lista.length) % lista.length;
      var a = lista[teraz];
      var m = a.querySelector('img');
      lbImg.src = a.getAttribute('href');
      lbImg.alt = m ? m.alt : '';
      lbCap.textContent = (teraz + 1) + ' / ' + lista.length;
    }
    function otworz(a) {
      wrocDo = a;
      pokaz(widoczne().indexOf(a));
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-x').focus();
    }
    function zamknij() {
      lb.hidden = true;
      lbImg.removeAttribute('src');
      document.body.style.overflow = '';
      if (wrocDo) wrocDo.focus();
    }

    szoty.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); otworz(a); });
    });
    lb.querySelector('.lb-x').addEventListener('click', zamknij);
    lb.querySelector('.lb-prev').addEventListener('click', function () { pokaz(teraz - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { pokaz(teraz + 1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target === lb.querySelector('.lb-fig')) zamknij();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { zamknij(); }
      else if (e.key === 'ArrowLeft') { pokaz(teraz - 1); }
      else if (e.key === 'ArrowRight') { pokaz(teraz + 1); }
    });
  }

  /* ---------- wgrywanie plików ---------- */
  var MAX_PLIKOW = 8;
  var MAX_MB = 12;          // pojedynczy plik
  var MAX_SUMA_MB = 15;     // suma po kompresji, tyle przyjmuje wysyłka
  var zalaczniki = [];

  function human(b) {
    return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' kB'
                       : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  }

  var drop = document.querySelector('.drop');
  if (drop) {
    var input = drop.querySelector('input[type=file]');
    var list = document.querySelector('.filelist');

    function render() {
      if (!list) return;
      list.innerHTML = '';
      zalaczniki.forEach(function (f, i) {
        var li = document.createElement('li');
        var n = document.createElement('span'); n.className = 'fn'; n.textContent = f.name;
        var s = document.createElement('span'); s.className = 'fs'; s.textContent = human(f.size);
        var x = document.createElement('button');
        x.type = 'button'; x.textContent = '×';
        x.setAttribute('aria-label', 'Usuń ' + f.name);
        x.addEventListener('click', function () { zalaczniki.splice(i, 1); render(); sync(); });
        li.appendChild(n); li.appendChild(s); li.appendChild(x);
        list.appendChild(li);
      });
    }
    function sync() {
      if (!input || typeof DataTransfer === 'undefined') return;
      var dt = new DataTransfer();
      zalaczniki.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    }
    function add(files) {
      Array.prototype.slice.call(files).forEach(function (f) {
        if (zalaczniki.length >= MAX_PLIKOW) return;
        if (f.size > MAX_MB * 1048576) { alert('Plik „' + f.name + '” jest większy niż ' + MAX_MB + ' MB.'); return; }
        zalaczniki.push(f);
      });
      render(); sync();
    }

    if (input) input.addEventListener('change', function () { add(input.files); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files);
    });
  }

  /* Zdjęcie z telefonu waży 3-4 MB, a do oceny miejsca montażu w zupełności
     wystarczy 1600 px. Zmniejszamy je przed wysyłką, żeby osiem sztuk zmieściło
     się w limicie wiadomości. Czego przeglądarka nie umie zdekodować (część HEIC
     na desktopie) i wszystko, co nie jest obrazem, idzie bez zmian. */
  function kompresuj(plik) {
    var PROG = 1.2 * 1048576;
    var BOK = 1600;
    if (!/^image\//.test(plik.type) || plik.size < PROG || typeof createImageBitmap !== 'function') {
      return Promise.resolve(plik);
    }
    return createImageBitmap(plik).then(function (bmp) {
      var skala = Math.min(1, BOK / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas');
      c.width = Math.round(bmp.width * skala);
      c.height = Math.round(bmp.height * skala);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      return new Promise(function (res) {
        c.toBlob(function (blob) {
          if (!blob || blob.size >= plik.size) { res(plik); return; }
          res(new File([blob], plik.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      });
    }).catch(function () { return plik; });
  }

  /* ---------- formularz ---------- */
  var form = document.querySelector('form.quote');
  if (form) {
    var msg = form.querySelector('.form-msg');
    var przycisk = form.querySelector('button[type=submit]');
    var etykieta = przycisk ? przycisk.innerHTML : '';
    var wysylka = false;

    function pokaz(rodzaj, tekst) {
      if (!msg) return;
      msg.className = 'form-msg ' + rodzaj;
      msg.textContent = tekst;
    }
    function zablokuj(stan) {
      wysylka = stan;
      if (!przycisk) return;
      przycisk.disabled = stan;
      przycisk.innerHTML = stan ? 'Wysyłam…' : etykieta;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (wysylka) return;

      if (!form.checkValidity()) { form.reportValidity(); return; }

      var endpoint = form.getAttribute('action');
      if (!endpoint || endpoint === '#') {
        pokaz('err', 'To wersja pokazowa strony - formularz podłączymy do skrzynki firmy przy uruchomieniu. Teraz najszybciej: zadzwoń +48 690 036 095.');
        return;
      }

      zablokuj(true);
      pokaz('ok', zalaczniki.length ? 'Przygotowuję załączniki…' : 'Wysyłam…');

      Promise.all(zalaczniki.map(kompresuj)).then(function (gotowe) {
        var suma = gotowe.reduce(function (s, f) { return s + f.size; }, 0);
        if (suma > MAX_SUMA_MB * 1048576) {
          zablokuj(false);
          pokaz('err', 'Załączniki ważą razem ' + human(suma) + ', a zmieści się ' + MAX_SUMA_MB + ' MB. Usuń jeden z plików.');
          return null;
        }

        var dane = new FormData();
        new FormData(form).forEach(function (v, k) {
          if (k !== 'zalaczniki[]') dane.append(k, v);
        });
        gotowe.forEach(function (f) { dane.append('zalaczniki[]', f, f.name); });

        pokaz('ok', 'Wysyłam…');
        return fetch(endpoint, { method: 'POST', body: dane });
      }).then(function (odp) {
        if (!odp) return;
        return odp.json().catch(function () { return {}; }).then(function (wynik) {
          if (odp.ok && wynik.ok) {
            zalaczniki.length = 0;
            // Pola nie są już do niczego potrzebne - zastępujemy je potwierdzeniem,
            // żeby po wysłaniu nie było wątpliwości, czy formularz poszedł.
            form.innerHTML =
              '<div class="form-ok" role="status">'
              + '<div class="form-ok-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
              + '<path d="m4.5 12.5 5 5 10-11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
              + '</svg></div>'
              + '<h3>Wysłano</h3>'
              + '<p>Dziękujemy, zapytanie zostało wysłane. Odezwiemy się najszybciej, jak to możliwe.</p>'
              + '</div>';
            var plynnie = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            form.scrollIntoView({ block: 'center', behavior: plynnie ? 'smooth' : 'auto' });
          } else {
            zablokuj(false);
            pokaz('err', wynik.blad || 'Nie udało się wysłać. Zadzwoń: +48 690 036 095.');
          }
        });
      }).catch(function () {
        zablokuj(false);
        pokaz('err', 'Nie udało się wysłać. Zadzwoń: +48 690 036 095.');
      });
    });
  }

  /* ---------- rok w stopce ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

// LICZNIK WAŻNOŚCI DEMA (K. 09.08: pełne odliczanie dni/godzin/minut/sekund).
// Element wstrzykuje multipage TYLKO w dema. Nie wita klienta przy wejściu - wjeżdża
// po zejściu z pierwszego ekranu i chowa się po powrocie na górę.
(function () {
  var el = document.querySelector('.demo-wazne');
  if (!el || !el.getAttribute('data-do')) return;
  var koniec = new Date(el.getAttribute('data-do') + 'T23:59:59');
  if (isNaN(koniec)) return;
  var txt = el.querySelector('.dw-txt') || el;
  var dwa = function (n) { return (n < 10 ? '0' : '') + n; };

  var cykl = parseInt(el.getAttribute('data-cykl') || '0', 10);   // dni; 0 = brak wznowienia
  function tyka() {
    var teraz = new Date(), ms = koniec - teraz;
    // po wygaśnięciu licznik rusza od nowa (K. 10.08) - dema i tak zostają, a odliczanie
    // ma dawać klientowi realne poczucie, że sprawa ma termin.
    while (ms <= 0 && cykl > 0) {
      koniec = new Date(koniec.getTime() + cykl * 86400000);
      ms = koniec - teraz;
    }
    if (ms <= 0) { txt.innerHTML = 'Wersja pokazowa wygasła'; el.classList.add('is-koniec'); return false; }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var g = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sek = s % 60;
    var zegar = dwa(g) + ':' + dwa(m) + ':' + dwa(sek);
    txt.innerHTML = d > 0
      ? 'Wersja pokazowa · <b>' + d + ' dni</b> <span class="dw-zeg">' + zegar + '</span>'
      : 'Wersja pokazowa · <b class="dw-pilne">' + zegar + '</b>';
    el.classList.toggle('is-pilne', d === 0);
    return true;
  }
  if (tyka() !== false) setInterval(tyka, 1000);
  el.hidden = false;

  var tick = false;
  function stan() {
    el.classList.toggle('is-on', (window.scrollY || 0) > window.innerHeight * 0.55);
    tick = false;
  }
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true; requestAnimationFrame(stan);
  }, { passive: true });
  stan();
})();


/* === DOLNY PASEK MOBILE: chowa się przy stopce ===
   Lekcja 13.08.2026 (Zielony Azymut): klient zgłosił, że pasek „Zapytaj o termin"
   zasłania treść na dole strony. Rezerwę pod treścią daje CSS (razem z safe-area

/* === licznik otwarć demo (buy-signal) v3 — geo po stronie serwera === */
(function(){try{if(String(location.protocol).indexOf('http')!==0)return;try{if(/[?&#]team=1/.test(location.search+location.hash)){localStorage.setItem('nb_team','1');}}catch(e){}try{if(localStorage.getItem('nb_team')==='1')return;}catch(e){}if(/crm-newbeginning|crm\.impulseo\.pl/.test(document.referrer||''))return;try{if(navigator.webdriver)return;}catch(e){}try{if(/^https?:\/\/(kris20032|impulseo-pl)\.github\.io\/?$/i.test(document.referrer||''))return;}catch(e){}if(sessionStorage.getItem('_dv'))return;sessionStorage.setItem('_dv','1');var seg=(location.pathname.split('/').filter(Boolean)[0])||'';var base=location.origin+(seg?('/'+seg):'');var ua='';try{ua=(navigator.userAgent||'').slice(0,300);}catch(e){}var EP='https://zngfubfinbojfgaxdrbf.supabase.co/functions/v1/demo-view';try{fetch(EP,{method:'POST',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({demo_url:base,page:location.pathname,referrer:(document.referrer||null),user_agent:(ua||null)})}).catch(function(){});}catch(e){}}catch(e){}})();
