// alemty.eth v0.03 — fixes: drawer scroll stable, POAP crop fix, forum search, JS sanitization.

const root = document.documentElement;
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Theme
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') root.classList.add('light');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    root.classList.toggle('light');
    localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
  });
}

// Copy address
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const el = document.getElementById('pubkey');
    const full = el?.getAttribute('data-full') ?? el?.textContent?.trim();
    if (!full) return;
    try {
      await navigator.clipboard.writeText(full);
      const ok = document.getElementById('copyOk');
      if (ok) {
        ok.hidden = false;
        setTimeout(() => (ok.hidden = true), 1400);
      }
    } catch {
      // clipboard might be blocked
    }
  });
}

let SITE = null;
let DID = { connected: false, address: null, role: null };

// Helpers
function shortAddr(a) {
  if (!a || a.length < 10) return '—';
  return a.slice(0, 6) + '…' + a.slice(-4);
}


const RANKS_DHARMA = [
  { name:'Novato', min:0 },
  { name:'Iniciado', min:100 },
  { name:'Plata', min:500 },
  { name:'Oro', min:1500 },
  { name:'Diamante', min:5000 },
  { name:'Avanzado', min:12000 },
  { name:'Refinado', min:30000 },
  { name:'Único', min:75000 },
  { name:'Elite', min:150000 },
  { name:'Superior', min:300000 },
  { name:'Amasterdamo', min:600000 },
]; // [2](https://onedrive.live.com?cid=8C61CF68A019DADE&id=8C61CF68A019DADE!s96c7d221a1d04465879985ff00dac98c)

function rankFromXp(xp){
  const val = Math.max(0, Number(xp)||0);
  let current = RANKS_DHARMA[0];
  for (const r of RANKS_DHARMA) if (val >= r.min) current = r;
  const idx = RANKS_DHARMA.findIndex(r=>r.name===current.name);
  const next = (idx>=0 && idx<RANKS_DHARMA.length-1) ? RANKS_DHARMA[idx+1] : null;
  return { current, next };
}

function computeUserStats(addr, posts){
  const a = String(addr||'').toLowerCase();
  const list = Array.isArray(posts) ? posts : [];

  let postsCount=0, commentsCount=0, likesReceived=0, likesGiven=0;

  // likes given (scan likedBy)
  for (const p of list){
    const lb = p?.likedBy || {};
    if (lb && typeof lb==='object' && lb[a]) likesGiven += 1;
  }

  for (const p of list){
    if (!p) continue;
    if (String(p.addr||'').toLowerCase()===a){
      postsCount += 1;
      likesReceived += Number(p.likes||0)||0;
    }
    const cs = Array.isArray(p.comments) ? p.comments : [];
    for (const c of cs){
      if (String(c?.addr||'').toLowerCase()===a) commentsCount += 1;
    }
  }

  // Karma tipo reddit (simple v0): likes recibidos + peso ligero de actividad
  const karma = Math.max(0, likesReceived + Math.floor(commentsCount*0.5) + postsCount);

  // Dharma XP (reputación) separado (placeholder ajustable)
  const xp = Math.max(0, postsCount*20 + commentsCount*6 + likesReceived*3 + likesGiven*1);

  const level = Math.max(1, Math.floor(xp/100)+1);
  const { current, next } = rankFromXp(xp);

  const nextMin = next ? next.min : null;
  const baseMin = current ? current.min : 0;
  const span = nextMin ? Math.max(1, nextMin-baseMin) : 1;
  const within = nextMin ? Math.min(span, Math.max(0, xp-baseMin)) : span;
  const progress = nextMin ? Math.round((within/span)*100) : 100;

  return { addr, postsCount, commentsCount, likesReceived, likesGiven, karma, xp, level, rank: current.name, nextRank: next?.name, nextRankMin: nextMin, progress };
}

function openProfileModal(addr){
  const posts = loadPosts(); // ya existe en tu app.js [3](https://onedrive.live.com?cid=8C61CF68A019DADE&id=8C61CF68A019DADE!s68b02493ee8f46d796f5266f6acec70a)
  const s = computeUserStats(addr, posts);

  const title = document.getElementById('profileTitle');
  const body  = document.getElementById('profileBody');
  if (!title || !body) return;

  title.textContent = 'Perfil DID · ' + shortAddr(addr);

  body.innerHTML = `
    <div class="profile-head">
      <div class="rank-badge"><span class="dot"></span> ${escapeHtml(s.rank)} · LVL ${escapeHtml(s.level)}</div>
      <div class="meta small mono">${escapeHtml(addr)}</div>
    </div>

    <div class="xpbar">
      <div class="xpbar-top">
        <div><strong>Dharma (XP)</strong> <span class="meta small">${escapeHtml(s.xp)} XP</span></div>
        <div class="meta small">${s.nextRank ? `Siguiente: <strong>${escapeHtml(s.nextRank)}</strong> (${escapeHtml(s.nextRankMin)})` : 'Rango máximo'}</div>
      </div>
      <div class="xp-track"><div class="xp-fill" style="width:${s.progress}%"></div></div>
      <div class="meta small" style="margin-top:8px">Progreso: ${escapeHtml(s.progress)}%</div>
    </div>

    <div class="profile-grid">
      <div class="stat"><div class="k">Karma</div><div class="v">${escapeHtml(s.karma)}</div></div>
      <div class="stat"><div class="k">Likes recibidos</div><div class="v">${escapeHtml(s.likesReceived)}</div></div>
      <div class="stat"><div class="k">Posts</div><div class="v">${escapeHtml(s.postsCount)}</div></div>
      <div class="stat"><div class="k">Comentarios</div><div class="v">${escapeHtml(s.commentsCount)}</div></div>
      <div class="stat"><div class="k">Likes dados</div><div class="v">${escapeHtml(s.likesGiven)}</div></div>
      <div class="stat"><div class="k">Estado</div><div class="v">Público</div></div>
    </div>
  `;

  // abre modal (mismo patrón que topicModal) [2](https://onedrive.live.com?cid=8C61CF68A019DADE&id=8C61CF68A019DADE!s96c7d221a1d04465879985ff00dac98c)[1](https://onedrive.live.com?cid=8C61CF68A019DADE&id=8C61CF68A019DADE!scab846db2d6c4d6da9638b33bd97dfa5)
  const modal = document.getElementById('profileModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');

  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); };
  document.getElementById('profileClose')?.addEventListener('click', close, { once:true });
  document.getElementById('profileBackdrop')?.addEventListener('click', close, { once:true });
}


function escapeHtml(s){
  return String(s).replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}




// v0.06: Acreditaciones en collage (4 destacadas con rotación automática)

function buildCertCollage(list) {
  const grid = document.getElementById('certGrid');
  if (!grid) return;

  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = '<p class="meta">Sin acreditaciones disponibles.</p>';
    return;
  }

  const sorted = list.slice().sort((a, b) => {
    const pA = a.pinned ? 1 : 0;
    const pB = b.pinned ? 1 : 0;
    if (pA !== pB) return pB - pA;
    const s = (b.score ?? 0) - (a.score ?? 0);
    if (s !== 0) return s;
    const ay = a.start ?? '';
    const by = b.start ?? '';
    if (ay < by) return 1;
    if (ay > by) return -1;
    return (a.title ?? '').localeCompare(b.title ?? '');
  });

  let cursor = 0;
  const pick4 = () => {
    const out = [];
    for (let i = 0; i < 4; i++) out.push(sorted[(cursor + i) % sorted.length]);
    cursor = (cursor + 1) % sorted.length;
    return out;
  };

  const paint = (items) => {
    grid.innerHTML = '';
    items.forEach((c) => {
      const a = document.createElement('a');
      a.className = 'cert-tile';
      a.href = c.url || '#';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      if (!c.url) {
        a.setAttribute('aria-disabled', 'true');
        a.style.pointerEvents = 'none';
        a.style.opacity = '0.75';
      }

      a.innerHTML = `
        <div class="cert-title">${escapeHtml(c.title ?? 'Acreditación')}</div>
        <div class="cert-meta">${escapeHtml(c.issuer ?? '')}${c.start ? ' · ' + escapeHtml(c.start) : ''}</div>
      `;
      grid.appendChild(a);
    });
  };

  const render = (items) => {
    grid.classList.add('fade');
    setTimeout(() => {
      paint(items);
      grid.classList.remove('fade');
    }, 180);
  };

  render(pick4());
  window.clearInterval(window.__certRot);
  window.__certRot = window.setInterval(() => render(pick4()), 4200);
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// Load site config
fetch('assets/data/site.v3.json')
  .then((r) => r.json())
  .then((s) => {
    SITE = s;
    setupAvatar();
    setupBuy();
    setupPubkey();
    setupPoapAll();
    resolvePersistedWallet();
    renderDidCard();
    initForum();
  })
  .catch(() => {
    resolvePersistedWallet();
    renderDidCard();
    initForum();
  });

// =====================
// Modal: Sistema de Rangos (desde .txt local)
// =====================
const RANGOS_TXT_URL = 'assets/docs/rangos.txt';

function openRangosModal() {
  const modal = document.getElementById('rangosModal');
  const body = document.getElementById('rangosBody');
  if (!modal || !body) return;

  // UI placeholder mientras carga
  body.innerHTML = `
    <article class="post">
      <header class="post-head">
        <div class="post-tag">DOCUMENTO</div>
        <div class="post-title">Sistema de Rangos (Dharma)</div>
      </header>
      <div class="post-body">Cargando contenido…</div>
    </article>
  `;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  // Carga el txt local
  fetch(RANGOS_TXT_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('No se pudo cargar rangos.txt');
      return r.text();
    })
    .then(txt => {
      // Render 1 solo post (texto plano)
      
const safe = escapeHtml(txt)
  .split(/\n\s*\n/)
  .map(p => `<p>${p.replace(/\n/g,'<br/>')}</p>`)
  .join('');


      body.innerHTML = `
        <article class="post">
          <header class="post-head">
            <div class="post-tag">DOCUMENTO</div>
            <div class="post-title">Sistema de Rangos (Dharma)</div>
          </header>
          <div class="post-body">${safe}</div>
        </article>
      `;
    })
    .catch(() => {
      body.innerHTML = `
        <article class="post">
          <header class="post-head">
            <div class="post-tag">ERROR</div>
            <div class="post-title">Sistema de Rangos</div>
          </header>
          <div class="post-body">
            No se encontró <code>${escapeHtml(RANGOS_TXT_URL)}</code>.<br/>
            Crea ese archivo local y recarga.
          </div>
        </article>
      `;
    });
}

function closeRangosModal() {
  const modal = document.getElementById('rangosModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function bindRangosUI() {
  const btn = document.getElementById('openRangos');
  const close = document.getElementById('rangosClose');
  const back = document.getElementById('rangosBackdrop');

  btn?.addEventListener('click', openRangosModal);
  close?.addEventListener('click', closeRangosModal);
  back?.addEventListener('click', closeRangosModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRangosModal();
  });
}

// Llama esto cuando el DOM ya esté listo
bindRangosUI();

function setupPubkey() {
  const el = document.getElementById('pubkey');
  if (!el || !SITE?.site?.address) return;
  el.setAttribute('data-full', SITE.site.address);
  el.textContent = shortAddr(SITE.site.address);
}

function setupPoapAll() {
  const a = document.getElementById('poapAll');
  if (!a || !SITE?.site?.address) return;
  a.href = `https://collectors.poap.xyz/scan/${SITE.site.address}`;
}

function setupAvatar() {
  const img = document.getElementById('avatarImg');
  if (!img) return;
  const localSrc = img.getAttribute('src');
  const local = SITE?.profile?.localCandidates ?? [];
  const cid = SITE?.profile?.ipfsCid ?? '';
  const remote = SITE?.profile?.remoteFallback ?? '';
  const candidates = [];

  for (const f of local) candidates.push(f);
  if (cid) {
    candidates.push('https://ipfs.io/ipfs/' + cid);
    candidates.push('https://cloudflare-ipfs.com/ipfs/' + cid);
  }
  if (remote) candidates.push(remote);
  if (localSrc) candidates.push(localSrc);

  let idx = 0;
  function tryNext() {
    if (idx >= candidates.length) return;
    img.referrerPolicy = 'no-referrer';
    img.src = candidates[idx++];
  }
  img.addEventListener('error', tryNext);
  tryNext();
}

function setupBuy() {
  const buyBtn = document.getElementById('buyBtn');
  if (!buyBtn || !SITE?.book) return;
  const url = (SITE.book.buyUrl ?? '').trim();
  if (url) {
    buyBtn.href = url;
    buyBtn.setAttribute('aria-disabled', 'false');
    buyBtn.style.pointerEvents = 'auto';
    buyBtn.style.opacity = '1';
  } else {
    buyBtn.href = '#';
    buyBtn.setAttribute('aria-disabled', 'true');
  }
}

// Social cards
const LINKS = [
  { title: 'TikTok @alemtyv', desc: 'Escuela de Conocimiento Oculto T2', url: 'https://www.tiktok.com/@alemtyv', icon: 'assets/icons/tiktok.svg' },
  { title: 'YouTube alemtyv', desc: 'Escuela de Conocimiento Oculto', url: 'https://www.youtube.com/@AlemtyV', icon: 'assets/icons/youtube.svg' },
  { title: 'LinkedIn', desc: 'Mi Carrera Profesional', url: 'https://www.linkedin.com/in/alemty/', icon: 'assets/icons/linkedin.svg' },
  { title: 'X @alemty_eth', desc: 'Mi Perfil en Twitter', url: 'https://x.com/alemty_eth', icon: 'assets/icons/x.svg' },
  { title: 'Instagram @alemty01', desc: 'Mi Perfil de Instagram', url: 'https://www.instagram.com/alemty01/', icon: 'assets/icons/instagram.svg' },
  { title: 'Facebook', desc: 'Alejandro Gutierrez Zavala', url: 'https://web.facebook.com/Alemty11/', icon: 'assets/icons/facebook.svg' },
  { title: 'Telegram', desc: 'Grupo alemtyv', url: 'https://t.me/+A91KGSxgvr5hYThhotra', icon: 'assets/icons/telegram.svg' },
  { title: 'OpenSea', desc: 'Galería de NFTs', url: 'https://opensea.io/es/0x6a202f991c4c1df079449be9847b1dac3f51854f', icon: 'assets/icons/opensea.svg' },
  { title: 'Decentraland', desc: 'Mi Avatar del Metaverso', url: 'https://decentraland.org/profile/accounts/0x6a202f991c4c1df079449be9847b1dac3f51854f', icon: 'assets/icons/decentraland.svg' },
  { title: 'TikTok', desc: 'Tecnologías del futuro (T2 SOON)', url: 'https://www.tiktok.com/@alemty.eth', icon: 'assets/icons/tiktok.svg' },
  { title: 'GitHub · alemtyDAO', desc: 'Repositorio del proyecto', url: 'https://github.com/Alemty/alemty.eth-DAO', icon: 'assets/icons/github.svg' },
  { title: 'WhatsApp', desc: '(SOON)', url: '#', icon: 'assets/icons/whatsapp.svg' },

];

const cardsEl = document.getElementById('cards');
if (cardsEl) {
  LINKS.forEach((l) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <img class="icon" src="${l.icon}" alt="${escapeHtml(l.title)}" width="28" height="28"/>
      <div>
        <h3>${escapeHtml(l.title)}</h3>
        <p>${escapeHtml(l.desc)}</p>
      </div>
    `;
    const a = document.createElement('a');
    a.className = 'btn';
    a.href = l.url;
    
if (l.url === '#') {
  a.setAttribute('aria-disabled','true');
  a.style.pointerEvents='none';
  a.style.opacity='0.7';
  a.textContent='Próximamente';
}

    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Abrir';
    el.appendChild(a);
    cardsEl.appendChild(el);
  });
}

// Drawer
const menuBtn = document.getElementById('menuBtn');
const menuDrawer = document.getElementById('menuDrawer');
const menuClose = document.getElementById('menuClose');
const backdrop = document.getElementById('drawerBackdrop');

function openDrawer() {
  if (!menuDrawer) return;
  menuDrawer.classList.add('open');
  menuDrawer.setAttribute('aria-hidden', 'false');
  backdrop?.classList.add('show');
  menuBtn?.setAttribute('aria-expanded', 'true');
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  if (!menuDrawer) return;
  menuDrawer.classList.remove('open');
  menuDrawer.setAttribute('aria-hidden', 'true');
  backdrop?.classList.remove('show');
  menuBtn?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('drawer-open');
}

if (menuBtn) menuBtn.addEventListener('click', () => (menuDrawer?.classList.contains('open') ? closeDrawer() : openDrawer()));
if (menuClose) menuClose.addEventListener('click', closeDrawer);
if (backdrop) backdrop.addEventListener('click', closeDrawer);
menuAutoCloseSections();
menuCompactInit();
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuDrawer?.classList.contains('open')) closeDrawer();
});


// v0.05: Menu accordion behavior (only one section open at a time)
function menuAutoCloseSections() {
  const sections = Array.from(document.querySelectorAll('.menu-section'));
  sections.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      sections.forEach((o) => { if (o !== d) o.open = false; });
    });
  });
}
function menuCompactInit() {
  const sections = Array.from(document.querySelectorAll('.menu-section'));
  if (!sections.length) return;
  sections.forEach((s, i) => (s.open = i === 0));
}

// Tabs for certifications
const tabList = document.getElementById('tabList');
const tabPanes = document.getElementById('tabPanes');
const CATEGORY_PRIORITY = ['IA', 'Web 3.0', 'Cloud', 'TI', 'Marketing', 'Education', 'Jobs', 'Design', 'Games'];

fetch('assets/data/certifications.v3.json')
  .then((r) => r.json())
  .then((list) => buildCertCollage(Array.isArray(list) ? list : []))
  .catch(() => buildCertCollage([]));

function badgeIconFor(item) {
  const t = (item.title ?? '').toLowerCase();
  if (t.includes('copilot') || t.includes('chatgpt') || t.includes('gpt')) return 'assets/icons/copilot.svg';
  if (t.includes('inteligencia artificial') || t.includes('machine') || t.includes('ia')) return 'assets/icons/ai.svg';
  if (t.includes('ethereum') || t.includes('bitcoin') || t.includes('blockchain')) return 'assets/icons/chipbrain.svg';
  return 'assets/icons/microsoft.svg';
}

function groupByCategory(list) {
  const g = {};
  list.forEach((c) => {
    const k = c.category ?? 'Otros';
    (g[k] ??= []).push(c);
  });
  return g;
}

function sortWithinCategory(items) {
  return items
    .slice()
    .sort((a, b) => {
      const pA = a.pinned ? 1 : 0,
        pB = b.pinned ? 1 : 0;
      if (pA !== pB) return pB - pA;
      const s = (b.score ?? 0) - (a.score ?? 0);
      if (s !== 0) return s;
      const ay = a.start ?? '',
        by = b.start ?? '';
      if (ay < by) return 1;
      if (ay > by) return -1;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
}

function buildTabs(list) {
  if (!tabList || !tabPanes) return;
  tabList.innerHTML = '';
  tabPanes.innerHTML = '';

  const groups = groupByCategory(list);
  let first = null;

  CATEGORY_PRIORITY.forEach((cat) => {
    const items = groups[cat];
    if (!items || !items.length) return;

    const btn = document.createElement('button');
    btn.setAttribute('role', 'tab');
    btn.textContent = cat;
    btn.dataset.cat = cat;
    btn.addEventListener('click', () => activateTab(cat));
    tabList.appendChild(btn);

    if (!first) first = cat;

    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.id = `pane-${cat}`;
    pane.setAttribute('role', 'tabpanel');

    const ul = document.createElement('ul');
    ul.className = 'drawer-list';
    pane.appendChild(ul);

    sortWithinCategory(items).forEach((c) => {
      const li = document.createElement('li');
      li.className = 'drawer-item';

      const icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = badgeIconFor(c);
      icon.alt = 'icono';

      const info = document.createElement('div');

      const titleA = document.createElement('a');
      titleA.className = 'title';
      titleA.href = c.url;
      titleA.target = '_blank';
      titleA.rel = 'noopener noreferrer';
      titleA.textContent = c.title;

      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = `${c.issuer ?? ''}${c.start ? ' · ' + c.start : ''}`;

      info.appendChild(titleA);
      info.appendChild(meta);

      li.appendChild(icon);
      li.appendChild(info);
      ul.appendChild(li);
    });

    tabPanes.appendChild(pane);
  });

  if (first) activateTab(first);
  else tabPanes.innerHTML = '<p class="meta">Sin credenciales disponibles.</p>';
}

function activateTab(cat) {
  Array.from(tabList.children).forEach((b) => b.classList.toggle('active', b.dataset.cat === cat));
  Array.from(tabPanes.children).forEach((p) => p.classList.toggle('active', p.id === `pane-${cat}`));
}

// POAP carousel
const poapRow = document.getElementById('poapRow');
if (poapRow) {
  const pause = () => poapRow.classList.add('is-paused');
  const resume = () => poapRow.classList.remove('is-paused');
  poapRow.addEventListener('pointerdown', pause);
  poapRow.addEventListener('pointerup', resume);
  poapRow.addEventListener('pointercancel', resume);
  poapRow.addEventListener('pointerleave', resume);
  poapRow.addEventListener('touchstart', pause, { passive: true });
  poapRow.addEventListener('touchend', resume, { passive: true });
  poapRow.addEventListener('touchcancel', resume, { passive: true });

  fetch('assets/poap/poaps.v3.json')
    .then((r) => r.json())
    .then((list) => renderPOAPs(Array.isArray(list) ? list : []))
    .catch(() => renderPOAPs([]));
}

function renderPOAPs(arr) {
  if (!poapRow) return;
  poapRow.innerHTML = '';
  if (!arr.length) {
    poapRow.innerHTML = '<p class="meta">Sin POAPs disponibles.</p>';
    return;
  }

  const marquee = document.createElement('div');
  marquee.className = 'poap-marquee';
  poapRow.appendChild(marquee);

  const track1 = document.createElement('div');
  track1.className = 'poap-track';
  marquee.appendChild(track1);

  function buildItems(track) {
    arr.forEach((p) => {
      const clickable = !!(p.url && String(p.url).trim());
      const el = clickable ? document.createElement('a') : document.createElement('div');
      el.className = 'poap';
      if (clickable) {
        el.href = p.url;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.title = p.title;
      } else {
        el.setAttribute('aria-label', `${p.title} (sin enlace)`);
      }

      const img = document.createElement('img');
      img.src = p.img;
      img.alt = p.title;
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = 'assets/poap/placeholder.png';
      };

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = p.title;

      el.appendChild(img);
      el.appendChild(label);
      track.appendChild(el);
    });
  }

  buildItems(track1);
  const track2 = track1.cloneNode(true);
  track2.setAttribute('aria-hidden', 'true');
  marquee.appendChild(track2);

  const measure = () => {
    const w = track1.scrollWidth;
    if (w > 0) poapRow.style.setProperty('--poap-shift', `${w}px`);
  };

  const imgs = marquee.querySelectorAll('img');
  let pending = imgs.length;
  if (pending === 0) measure();
  imgs.forEach((im) => {
    if (im.complete) {
      pending -= 1;
      if (pending === 0) measure();
    } else {
      im.addEventListener(
        'load',
        () => {
          pending -= 1;
          if (pending === 0) measure();
        },
        { once: true }
      );
    }
  });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => measure());
    ro.observe(poapRow);
  } else {
    window.addEventListener('resize', measure);
  }
}

// Wallet (MetaMask)
const connectWalletBtn = document.getElementById('connectWallet');
const disconnectWalletBtn = document.getElementById('disconnectWallet');
const walletStatusEl = document.getElementById('walletStatus');

function resolvePersistedWallet() {
  const saved = localStorage.getItem('did.address');
  if (saved) {
    DID.connected = true;
    DID.address = saved;
    DID.role = resolveRole(saved);
  }
  syncWalletUI();
}

function hasEthereum() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

async function connectWallet() {
  if (!hasEthereum()) {
    setWalletStatus('MetaMask no detectado. Instálalo para conectar.', 'muted');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const addr = accounts?.[0] ?? null;
    if (!addr) return;
    DID.connected = true;
    DID.address = addr;
    DID.role = resolveRole(addr);
    localStorage.setItem('did.address', addr);
    syncWalletUI();
    renderDidCard();
    initForum();
  } catch {
    setWalletStatus('Conexión cancelada o fallida.', 'muted');
  }
}

function disconnectWallet() {
  DID.connected = false;
  DID.address = null;
  DID.role = null;
  localStorage.removeItem('did.address');
  syncWalletUI();
  renderDidCard();
  initForum();
}

function resolveRole(addr) {
  const admin = (SITE?.dao?.adminAddress ?? SITE?.site?.address ?? '').toLowerCase();
  if (addr && admin && addr.toLowerCase() === admin) return 'Admin (alemty.eth)';
  return 'Miembro verificado';
}

function setWalletStatus(text, pillClass = '') {
  if (!walletStatusEl) return;
  walletStatusEl.innerHTML = `<span class="pill ${pillClass}">${escapeHtml(text)}</span>`;
}

function syncWalletUI() {
  if (!connectWalletBtn || !disconnectWalletBtn) return;
  if (DID.connected && DID.address) {
    connectWalletBtn.hidden = true;
    disconnectWalletBtn.hidden = false;
    setWalletStatus(`Conectado: ${shortAddr(DID.address)} · ${DID.role ?? ''}`);
  } else {
    connectWalletBtn.hidden = false;
    disconnectWalletBtn.hidden = true;
    setWalletStatus('No conectado', 'muted');
  }
}

if (connectWalletBtn) connectWalletBtn.addEventListener('click', connectWallet);
if (disconnectWalletBtn) disconnectWalletBtn.addEventListener('click', disconnectWallet);

if (hasEthereum()) {
  window.ethereum.on?.('accountsChanged', (acc) => {
    const addr = acc?.[0] ?? null;
    if (!addr) {
      disconnectWallet();
      return;
    }
    DID.connected = true;
    DID.address = addr;
    DID.role = resolveRole(addr);
    localStorage.setItem('did.address', addr);
    syncWalletUI();
    renderDidCard();
    initForum();
  });
}

function renderDidCard() {
  const status = document.getElementById('didStatus');
  const addr = document.getElementById('didAddress');
  const role = document.getElementById('didRole');
  if (status) status.textContent = DID.connected ? 'Miembro (DID verificado)' : 'Visitante (solo lectura)';
  if (addr) addr.textContent = DID.connected && DID.address ? DID.address : '—';
  if (role) role.textContent = DID.connected ? DID.role ?? 'Miembro' : '—';
}

// View switching (simulate subdomain)
const pageIdentity = document.getElementById('pageIdentity');
const pageCommunity = document.getElementById('pageCommunity');

function setView(which) {
  if (which === 'comunidad') {
    pageIdentity.hidden = true;
    pageCommunity.hidden = false;
    document.title = 'comunidad.alemty.eth · v0.03';
  } else {
    pageIdentity.hidden = false;
    pageCommunity.hidden = true;
    document.title = 'alemty.eth v0.03';
  }
  document.querySelectorAll('.phase').forEach((b) => {
    const p = b.getAttribute('data-phase');
    b.classList.toggle('active', p === which);
  });
  localStorage.setItem('ui.view', which);
}

const savedView = localStorage.getItem('ui.view');
if (savedView === 'comunidad') setView('comunidad');

const phaseBar = document.getElementById('phaseBar');
if (phaseBar) {
  phaseBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button.phase');
    if (!btn || btn.disabled) return;
    const phase = btn.getAttribute('data-phase');
    if (phase === 'identidad') setView('identidad');
    if (phase === 'comunidad') setView('comunidad');
  });
}

// Forum (local prototype)
const POSTS_KEY = 'forum.posts.v0.05';
const ANN_KEY = 'forum.announcement.v0.05';
let currentSearch = '';

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function savePosts(list) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(list));
}

function loadAnnouncement() {
  const fallback = SITE?.community?.announcementDefault ?? '';
  return localStorage.getItem(ANN_KEY) ?? fallback;
}

function saveAnnouncement(text) {
  localStorage.setItem(ANN_KEY, text);
}

function initForum() {
  // search bindings
  const search = document.getElementById('postSearch');
  const clear = document.getElementById('clearSearch');
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', () => {
      
const q = (search.value ?? '').trim().toLowerCase();
currentSearch = q.length >= 2 ? q : '';

      renderFeed();
    });
  }
  if (clear && !clear.dataset.bound) {
    clear.dataset.bound = '1';
    clear.addEventListener('click', () => {
      if (search) search.value = '';
      currentSearch = '';
      renderFeed();
    });
  }

  // announcement
  const annTextEl = document.getElementById('announcementText');
  const annTools = document.getElementById('announcementAdminTools');
  const annEdit = document.getElementById('announcementEdit');
  const saveBtn = document.getElementById('saveAnnouncement');
  const resetBtn = document.getElementById('resetAnnouncement');

  const announcement = loadAnnouncement();
  if (annTextEl) annTextEl.textContent = announcement;

  const isAdmin = DID.connected && (DID.role ?? '').includes('Admin');
  if (annTools) annTools.hidden = !isAdmin;

  if (isAdmin && annEdit) {
    annEdit.value = announcement;

    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', () => {
        const t = (annEdit.value ?? '').trim();
        if (!t) return;
        saveAnnouncement(t);
        if (annTextEl) annTextEl.textContent = t;
      });
    }

    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', () => {
        localStorage.removeItem(ANN_KEY);
        const def = loadAnnouncement();
        annEdit.value = def;
        if (annTextEl) annTextEl.textContent = def;
      });
    }
  }

  // composer
  const title = document.getElementById('postTitle');
  const body = document.getElementById('postBody');
  const publish = document.getElementById('publishPost');
  const status = document.getElementById('publishStatus');
  const composerHint = document.getElementById('composerHint');

  if (composerHint) composerHint.textContent = DID.connected ? 'DID verificado. Publica tu post.' : 'Requiere wallet (DID) para publicar.';
populateTopicSelect();
  if (publish && !publish.dataset.bound) {
    publish.dataset.bound = '1';
    publish.addEventListener('click', () => {
      if (!DID.connected || !DID.address) {
        if (status) status.textContent = 'Conecta wallet para publicar.';
        openDrawer();
        return;
      }
      const t = (title?.value ?? '').trim();
      const b = (body?.value ?? '').trim();
      if (t.length < 3 || b.length < 10) {
        if (status) status.textContent = 'Completa título (3+) y cuerpo (10+).';
        return;
      }
      const list = loadPosts();
      
const topicKey = (document.getElementById('postTopic')?.value ?? '').trim();

const post = {
  id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
  addr: DID.address,
  title: t,
  body: b,
  topic: topicKey || '',
  ts: Date.now(),
  likes: 0,
  likedBy: {},
  comments: [],
};

      list.push(post);
      savePosts(list);
      if (title) title.value = '';
      if (body) body.value = '';
      if (status) status.textContent = 'Publicado.';
      renderFeed();
    });
  }

  renderFeed();
}

function score(post) {
  return (post.likes ?? 0) + (post.comments?.length ?? 0);
}

function matchesSearch(p) {
  if (!currentSearch) return true;
  const comments = Array.isArray(p.comments) ? p.comments : [];
  const cText = comments.map((c) => `${c.text ?? ''} ${c.addr ?? ''}`).join(' ');
  const hay = `${p.title ?? ''} ${p.body ?? ''} ${p.addr ?? ''} ${cText}`.toLowerCase();
  return hay.includes(currentSearch);
}

function renderFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  const list = loadPosts();
  const ordered = list.slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  
const filtered = ordered
  .filter(p => !currentTopicKey || (p.topic === currentTopicKey))
  .filter(matchesSearch);


  if (!filtered.length) {
    feed.innerHTML = currentSearch
      ? `<p class="meta">No hay resultados para “${escapeHtml(currentSearch)}”.</p>`
      : '<p class="meta">Aún no hay posts. Sé el primero (con DID).</p>';
  } else {
    feed.innerHTML = '';
    filtered.forEach((p) => {
      const wrap = document.createElement('article');
      wrap.className = 'feed-post';
      wrap.id = `post-${p.id}`;

      const vote = document.createElement('div');
      vote.className = 'vote';

      const likeBtn = document.createElement('button');
      likeBtn.className = 'vote-btn';
      likeBtn.textContent = '▲';
      likeBtn.title = 'Me gusta';

      const count = document.createElement('div');
      count.className = 'vote-count';
      count.textContent = String(p.likes ?? 0);

      vote.appendChild(likeBtn);
      vote.appendChild(count);

      
const card = document.createElement('div');
card.className = 'post-card';

// Título
const h4 = document.createElement('h4');
h4.textContent = p.title ?? '';

// Meta row
const meta = document.createElement('div');
meta.className = 'post-meta';

// Autor (clickable → perfil DID)
const authorBtn = document.createElement('button');
authorBtn.type = 'button';
authorBtn.className = 'author-link';
authorBtn.textContent = shortAddr(p.addr);
authorBtn.title = 'Ver perfil DID';
authorBtn.addEventListener('click', () => openProfileModal(p.addr));

// Separadores y datos
const dot1 = document.createElement('span');
dot1.textContent = '·';

const timeSpan = document.createElement('span');
timeSpan.textContent = fmtTime(p.ts);

const dot2 = document.createElement('span');
dot2.textContent = '·';

const cSpan = document.createElement('span');
cSpan.textContent = `${p.comments?.length ?? 0} comentarios`;

// Cuerpo
const snippet = document.createElement('div');
snippet.className = 'post-snippet';
snippet.textContent = p.body ?? '';

// Montaje
meta.appendChild(authorBtn);
meta.appendChild(dot1);
meta.appendChild(timeSpan);
meta.appendChild(dot2);
meta.appendChild(cSpan);

card.appendChild(h4);
card.appendChild(meta);
card.appendChild(snippet);


      const controls = document.createElement('div');
      controls.className = 'post-controls';

      const toggleComments = document.createElement('button');
      toggleComments.className = 'small-btn';
      toggleComments.textContent = 'Comentar';

      const adminDel = document.createElement('button');
      adminDel.className = 'small-btn';
      adminDel.textContent = 'Eliminar';
      adminDel.style.display = DID.connected && (DID.role ?? '').includes('Admin') ? 'inline-flex' : 'none';

      controls.appendChild(toggleComments);
      controls.appendChild(adminDel);

      const comments = document.createElement('div');
      comments.className = 'comments';

      const listEl = document.createElement('div');
      const allComments = Array.isArray(p.comments) ? p.comments : [];
      listEl.innerHTML = allComments.length ? '' : '<p class="meta small">Sin comentarios.</p>';

      allComments
        .slice()
        .reverse()
        .forEach((c) => {
          const ce = document.createElement('div');
          ce.className = 'comment';
          ce.innerHTML = `
            <div class="ch"><span class="mono">${shortAddr(c.addr)}</span><span>${fmtTime(c.ts)}</span></div>
            <div class="cb">${escapeHtml(c.text)}</div>
          `;
          listEl.appendChild(ce);
        });

      const form = document.createElement('div');
      form.className = 'comment-form';

      const input = document.createElement('input');
      input.placeholder = 'Escribe un comentario…';

      const send = document.createElement('button');
      send.className = 'small-btn primary';
      send.textContent = 'Enviar';

      form.appendChild(input);
      form.appendChild(send);

      comments.appendChild(listEl);
      comments.appendChild(form);

      // handlers
      likeBtn.addEventListener('click', () => {
        if (!DID.connected || !DID.address) {
          openDrawer();
          return;
        }
        const posts = loadPosts();
        const idx = posts.findIndex((x) => x.id === p.id);
        if (idx < 0) return;
        const post = posts[idx];
        post.likedBy ??= {};
        const key = DID.address.toLowerCase();
        if (post.likedBy[key]) return;
        post.likedBy[key] = true;
        post.likes = (post.likes ?? 0) + 1;
        posts[idx] = post;
        savePosts(posts);
        renderFeed();
      });

      toggleComments.addEventListener('click', () => {
        comments.classList.toggle('open');
      });

      send.addEventListener('click', () => {
        if (!DID.connected || !DID.address) {
          openDrawer();
          return;
        }
        const txt = (input.value ?? '').trim();
        if (txt.length < 2) return;
        const posts = loadPosts();
        const idx = posts.findIndex((x) => x.id === p.id);
        if (idx < 0) return;
        const post = posts[idx];
        post.comments ??= [];
        post.comments.push({ addr: DID.address, text: txt, ts: Date.now() });
        posts[idx] = post;
        savePosts(posts);
        renderFeed();
      });

      adminDel.addEventListener('click', () => {
        const posts = loadPosts();
        const idx = posts.findIndex((x) => x.id === p.id);
        if (idx >= 0) {
          posts.splice(idx, 1);
          savePosts(posts);
          renderFeed();
        }
      });

      card.appendChild(controls);
      card.appendChild(comments);
      wrap.appendChild(vote);
      wrap.appendChild(card);
      feed.appendChild(wrap);
    });
  }

  
renderSidebars(list);
initRoomsTopics();
initPresetTopics();

}

function renderSidebars(list) {
  const topWeek = document.getElementById('topWeek');
  const topGlobal = document.getElementById('topGlobal');
  if (!topWeek || !topGlobal) return;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const week = list
    .filter((p) => (p.ts ?? 0) >= weekAgo)
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 7);

  const glob = list
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 7);

  function renderOl(ol, arr) {
    ol.innerHTML = '';
    if (!arr.length) {
      const li = document.createElement('li');
      li.textContent = 'Sin datos aún.';
      ol.appendChild(li);
      return;
    }
    arr.forEach((p) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#post-${p.id}`;
      a.textContent = (p.title ?? '').length > 42 ? (p.title ?? '').slice(0, 42) + '…' : p.title ?? '';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const el = document.getElementById(`post-${p.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const meta = document.createElement('div');
      meta.className = 'meta small';
      meta.textContent = `${p.likes ?? 0} likes · ${p.comments?.length ?? 0} comentarios`;
      li.appendChild(a);
      li.appendChild(meta);
      ol.appendChild(li);
    });
  }

  renderOl(topWeek, week);
  renderOl(topGlobal, glob);
}

// Background canvas
(function () {
  const canvas = document.getElementById('bgDots');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0,
    h = 0,
    nodes = [];

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  const MAX_SPEED = 0.22,
    LINK_DIST = 170,
    GLYPH_RATE = 0.12;

  const rnd = (a, b) => Math.random() * (b - a) + a;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function init() {
    nodes = [];
    const base = Math.max(34, (w * h) / 62000);
    for (let i = 0; i < base; i++) {
      nodes.push({
        x: rnd(0, w),
        y: rnd(0, h),
        vx: rnd(-MAX_SPEED, MAX_SPEED),
        vy: rnd(-MAX_SPEED, MAX_SPEED),
        r: rnd(1.2, 2.4),
        glyph: Math.random() < GLYPH_RATE,
      });
    }
  }

  function drawGlyph(x, y, size, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.9, size);
    ctx.lineTo(-size * 0.9, size);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function step(t = 0) {
    ctx.clearRect(0, 0, w, h);
    const lineColor = css('--dots-line') || 'rgba(0,255,213,0.18)';
    const nodeColor = css('--dots-node') || 'rgba(233,255,251,0.85)';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x,
          dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * 0.9;
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = alpha;
          const mx = (a.x + b.x) / 2,
            my = (a.y + b.y) / 2;
          const bend = 0.1;
          const cx = mx + -dy * bend,
            cy = my + dx * bend;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cx, cy, b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    for (const n of nodes) {
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();

      if (n.glyph) {
        const rot = t / 3200 + (n.x + n.y) / 900;
        drawGlyph(n.x, n.y, 6, rot, 'rgba(189,228,255,0.55)');
      }

      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20 || n.x > w + 20) n.vx *= -1;
      if (n.y < -20 || n.y > h + 20) n.vy *= -1;
    }

    ctx.restore();
  }

  resize();
  init();

  if (!reduced) {
    (function loop(ts) {
      step(ts);
      requestAnimationFrame(loop);
    })(0);
  } else {
    step(0);
  }

  window.addEventListener('resize', () => {
    resize();
    init();
  });
})();


// v0.05: Salas y temas (UI lista; persistencia backend en siguiente fase)
const ROOMS_KEY = 'rooms.v0.05';
const TOPICS_KEY = 'topics.v0.05';

function slugify(s){
  return String(s||'')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

function getAllTopics(){
  const custom = loadList(TOPICS_KEY).map(t => ({
    key: slugify(t),
    label: t,
    icon: '▣',
    welcome: `Bienvenido a ${t}.`
  }));

  const map = new Map();
  PRESET_TOPICS.forEach(t => map.set(t.key, t));
  custom.forEach(t => { if (!map.has(t.key)) map.set(t.key, t); });

  return Array.from(map.values());
}

function populateTopicSelect(){
  const sel = document.getElementById('postTopic');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Sin tema</option>';
  getAllTopics().forEach(t => {
    const o = document.createElement('option');
    o.value = t.key;
    o.textContent = `${t.icon} ${t.label}`;
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}

function loadList(key){
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}
function renderChips(listEl, items){
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!items.length){
    const li = document.createElement('li');
    li.className = 'chip muted';
    li.textContent = 'Sin elementos aún.';
    listEl.appendChild(li);
    return;
  }
  items.slice(0,8).forEach((t)=>{
    const li = document.createElement('li');
    li.className = 'chip';
    li.textContent = t;
    listEl.appendChild(li);
  });
}
function initRoomsTopics(){
  const roomsList = document.getElementById('roomsList');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const createTopicBtn = document.getElementById('createTopicBtn');
  const viewRoomsBtn = document.getElementById('viewRoomsBtn');
  const viewTopicsBtn = document.getElementById('viewTopicsBtn');

  renderChips(roomsList, loadList(ROOMS_KEY));

  createRoomBtn?.addEventListener('click', () => {
    const name = prompt('Nombre de la sala privada/grupo:');
    if (!name) return;
    const next = loadList(ROOMS_KEY);
    next.unshift(name.trim());
    saveList(ROOMS_KEY, next);
    renderChips(roomsList, next);
  });
  
createTopicBtn?.addEventListener('click', () => {
  const name = prompt('Nombre del tema/comunidad:');
  if (!name) return;
  const next = loadList(TOPICS_KEY);
  next.unshift(name.trim());
  saveList(TOPICS_KEY, next);
  initPresetTopics();      // vuelve a pintar chips
  populateTopicSelect();   // actualiza selector del composer
});

  viewRoomsBtn?.addEventListener('click', () => alert('v0.05: listo para backend. Aquí mostraremos salas con permisos y persistencia.'));
  viewTopicsBtn?.addEventListener('click', () => alert('v0.05: listo para backend. Aquí mostraremos comunidades/temas con persistencia.'));
}

const PRESET_TOPICS=[
  {key:'ciencia',label:'Ciencia',icon:'🧪',welcome:'Bienvenido a Ciencia. Comparte ideas, papers y debates.'},
  {key:'offtopic',label:'Off Topic',icon:'🎭',welcome:'Bienvenido a Off Topic. Conversación libre.'},
  {key:'salud',label:'Salud',icon:'🩺',welcome:'Bienvenido a Salud. Bienestar y experiencias.'},
  {key:'politica',label:'Política',icon:'🏛️',welcome:'Bienvenido a Política. Debate con respeto.'},
  {key:'web3',label:'Web3',icon:'⛓️',welcome:'Bienvenido a Web3. Identidad, DAO y construcción.'},
];

function openTopicModal(t){
  const modal=document.getElementById('topicModal');
  const title=document.getElementById('topicTitle');
  const body=document.getElementById('topicBody');
  const close=document.getElementById('topicClose');
  const back=document.getElementById('topicBackdrop');
  if(!modal||!title||!body) return;

  title.textContent=`${t.icon} ${t.label}`;
  body.innerHTML=
    `<p class="meta">${escapeHtml(t.welcome)}</p>`+
    `<div class="topic-box">`+
      `<div class="topic-head"><strong>Top post del tema</strong><span class="meta small">(placeholder)</span></div>`+
      `<p class="meta">Aquí se mostrará el top post y el feed del subtema, con miembros y gobernanza interna.</p>`+
    `</div>`;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');

  const closeFn=()=>{
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  };
  close?.addEventListener('click',closeFn,{once:true});
  back?.addEventListener('click',closeFn,{once:true});
}

function initPresetTopics(){
  const list=document.getElementById('topicsList');
  if(!list) return;
  list.innerHTML='';
  PRESET_TOPICS.forEach(t=>{
    const li=document.createElement('li');
    li.className='chip topic';
    li.innerHTML=`<span class="topic-ico">${t.icon}</span><span>${t.label}</span>`;
    li.addEventListener('click',()=>openTopicModal(t));
    list.appendChild(li);
  });
}
