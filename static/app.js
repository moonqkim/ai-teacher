function toggleTheme() {
  var root = document.documentElement;
  var dark = root.dataset.theme ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
}

// 한 파일 번들(플레이그라운드 발행본)은 여러 페이지를 .page 로 담고 해시로 전환한다.
// 여러 장짜리 사이트에서는 문서 전체가 한 페이지다.
var pages = document.querySelectorAll('.page');
var scopes = pages.length ? Array.prototype.slice.call(pages) : [document];



document.querySelectorAll('.card .more').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var card = btn.closest('.card');
    var open = card.classList.toggle('open');
    btn.textContent = open ? '접기 ▴' : '자세히 ▾';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});

// ── 오늘 소식 검색·카테고리 필터 (페이지마다 따로) ──
scopes.forEach(function (scope) {
  var chips = scope.querySelector('.js-chips');
  var q = scope.querySelector('.js-q');
  if (!chips || !q) return;
  var filter = 'all';
  function apply() {
    var term = q.value.trim().toLowerCase();
    scope.querySelectorAll('.catblock').forEach(function (block) {
      var visible = 0;
      block.querySelectorAll('.card').forEach(function (card) {
        var show = (filter === 'all' || card.dataset.cat === filter) &&
          (!term || card.dataset.text.indexOf(term) !== -1);
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      block.classList.toggle('hidden', visible === 0);
    });
    scope.querySelectorAll('.group').forEach(function (g) {
      if (!g.querySelector('.catblock')) return;
      g.classList.toggle('hidden', !g.querySelector('.catblock:not(.hidden)'));
    });
  }
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.f;
    chips.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    apply();
  });
  q.addEventListener('input', apply);
});

// ── 지난 소식 전체 검색 ──
function loadCards() {
  var embedded = document.getElementById('cards-data');
  if (embedded) return Promise.resolve(JSON.parse(embedded.textContent));
  return Promise.reject(new Error('검색 색인 없음'));
}

scopes.forEach(function (scope) {
  var q = scope.querySelector('.js-aq');
  if (!q) return;
  var chips = scope.querySelector('.js-achips');
  var out = scope.querySelector('.js-aresults');
  var count = scope.querySelector('.js-acount');
  var browse = scope.querySelector('.js-abrowse');
  var cards = null, filter = 'all';
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function hl(s, t) {
    s = esc(s); if (!t) return s;
    var i = s.toLowerCase().indexOf(t); if (i < 0) return s;
    return s.slice(0, i) + '<mark>' + s.slice(i, i + t.length) + '</mark>' + s.slice(i + t.length);
  }
  function render() {
    var term = q.value.trim().toLowerCase();
    if (!term && filter === 'all') { out.innerHTML = ''; count.textContent = ''; browse.classList.remove('hidden'); return; }
    browse.classList.add('hidden');
    if (!cards) { count.textContent = '불러오는 중…'; return; }
    var hits = cards.filter(function (c) {
      return (filter === 'all' || c.c === filter) &&
        (!term || (c.h + ' ' + c.o + ' ' + c.w + ' ' + c.s).toLowerCase().indexOf(term) !== -1);
    });
    count.textContent = hits.length + '건';
    out.innerHTML = hits.slice(0, 200).map(function (c) {
      return '<article class="hit"><div class="meta"><span class="chip cat-' + c.c[0] + '">' + esc(c.c) + '</span>' +
        '<a href="' + esc(c.p) + '">' + esc(c.d) + (c.k === 'weekly' ? ' 주간' : '') + '</a><span>' + esc(c.s) + '</span></div>' +
        '<h3><a href="' + esc(c.u) + '" target="_blank" rel="noopener">' + hl(c.h, term) + '</a></h3>' +
        '<p>' + hl(c.o, term) + '</p></article>';
    }).join('');
  }
  loadCards().then(function (d) { cards = d; render(); })
    .catch(function () { count.textContent = '검색 색인을 불러오지 못했어요'; });
  q.addEventListener('input', render);
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f;
    chips.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    render();
  });
});

// ── 번들 라우터: #/d/<날짜> · #/w/<주> · #/archive, 없으면 최신 일일 ──
if (pages.length) {
  var nav = document.querySelector('.viewbar');
  function show() {
    var route = (location.hash || '#/').slice(2);
    var target = null;
    pages.forEach(function (p) { if (p.dataset.route === route) target = p; });
    if (!target) target = pages[0];
    pages.forEach(function (p) { p.hidden = p !== target; });
    document.title = target.dataset.title || document.title;
    // 보기 전환 탭도 같은 날짜·주로 보낸다
    if (nav) nav.querySelectorAll('a[data-base]').forEach(function (a) {
      a.href = a.dataset.base + (target.dataset.route ? '#/' + target.dataset.route : '');
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', show);
  show();
}

// ── 동종 서비스 현황판: 그룹 필터 ──
scopes.forEach(function (scope) {
  var chips = scope.querySelector('.js-pchips');
  if (!chips) return;
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var f = b.dataset.f;
    chips.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    scope.querySelectorAll('.move[data-group], .catblock[data-group]').forEach(function (el) {
      el.classList.toggle('hidden', f !== 'all' && el.dataset.group !== f);
    });
  });
});
