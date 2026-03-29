// alemty.eth v0.13 — single coherent build (module)
// Goal: fully compatible with existing index.html + style.css + JSON assets.

const V='v0.13';
const root=document.documentElement;
const $=(sel,ctx=document)=>ctx.querySelector(sel);
const $$=(sel,ctx=document)=>Array.from(ctx.querySelectorAll(sel));

const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const short=(a)=>{const s=String(a||'').trim();return s.length<10?'—':s.slice(0,6)+'…'+s.slice(-4)};
const slug=(s)=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const fmt=(ts)=>{try{return new Date(ts).toLocaleString()}catch{return''}};
const uid=()=>crypto.randomUUID?.()||String(Date.now())+Math.random();

// ====== version tag ======
const verTag=$('#verTag');
if(verTag) verTag.textContent=V;
const yearEl=$('#year');
if(yearEl) yearEl.textContent=String(new Date().getFullYear());

// ====== Theme ======
const themeToggle=$('#themeToggle');
const savedTheme=localStorage.getItem('theme');
if(savedTheme==='light') root.classList.add('light');
if(themeToggle){
  themeToggle.addEventListener('click',()=>{
    root.classList.toggle('light');
    localStorage.setItem('theme',root.classList.contains('light')?'light':'dark');
  });
}

// ====== Clipboard ======
const copyBtn=$('#copyBtn');
if(copyBtn){
  copyBtn.addEventListener('click',async()=>{
    const el=$('#pubkey');
    const full=el?.getAttribute('data-full')||el?.textContent?.trim();
    if(!full) return;
    try{
      await navigator.clipboard.writeText(full);
      const ok=$('#copyOk');
      if(ok){ok.hidden=false;setTimeout(()=>ok.hidden=true,1200)}
    }catch{}
  });
}

// ====== Drawer ======
const menuBtn=$('#menuBtn');
const menuDrawer=$('#menuDrawer');
const menuClose=$('#menuClose');
const drawerBackdrop=$('#drawerBackdrop');

function openDrawer(){
  if(!menuDrawer) return;
  menuDrawer.classList.add('open');
  menuDrawer.setAttribute('aria-hidden','false');
  drawerBackdrop?.classList.add('show');
  menuBtn?.setAttribute('aria-expanded','true');
  document.body.classList.add('drawer-open');
}
function closeDrawer(){
  if(!menuDrawer) return;
  menuDrawer.classList.remove('open');
  menuDrawer.setAttribute('aria-hidden','true');
  drawerBackdrop?.classList.remove('show');
  menuBtn?.setAttribute('aria-expanded','false');
  document.body.classList.remove('drawer-open');
}
menuBtn?.addEventListener('click',()=>menuDrawer?.classList.contains('open')?closeDrawer():openDrawer());
menuClose?.addEventListener('click',closeDrawer);
drawerBackdrop?.addEventListener('click',closeDrawer);

// auto-close details sections in drawer
$$('.menu-section').forEach(sec=>{
  sec.addEventListener('toggle',()=>{
    if(!sec.open) return;
    $$('.menu-section').forEach(o=>{if(o!==sec) o.open=false;});
  });
});

// ====== View switching ======

const pageIdentity = $('#pageIdentity');
const pageCommunity = $('#pageCommunity');
const pageToken = $('#pageToken');

function setView(which) {
  const isIdentity = which === 'identidad';
  const isCommunity = which === 'comunidad';
  const isToken = which === 'token'; // <- TOKEN usa data-phase="token"

  if (pageIdentity) pageIdentity.hidden = !isIdentity;
  if (pageCommunity) pageCommunity.hidden = !isCommunity;
  if (pageToken) pageToken.hidden = !isToken;

  document.title =
    (isCommunity ? 'comunidad.alemty.eth · ' :
     isToken ? 'token.alemty.eth · ' :
     'alemty.eth · ') + V;

  $$('.phase').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-phase') === which)
  );

  localStorage.setItem('ui.view', which);

  // ✅ opcional: al entrar a Token, renderiza stats
  if (isToken) renderTokenDashboard?.();
}

const host=(typeof window!=='undefined'?window.location.hostname:'');
const isCommunitySub=host.startsWith('comunidad.')||host.startsWith('community.');
const savedView=localStorage.getItem('ui.view');
if(isCommunitySub) setView('comunidad');
else if(savedView==='comunidad') setView('comunidad');




$('#phaseBar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button.phase');
  if (!btn || btn.disabled) return;

  const ph = btn.getAttribute('data-phase');

  // ✅ Ahora TOKEN también cambia de vista interna
  if (ph === 'identidad' || ph === 'comunidad' || ph === 'token') {
    setView(ph);
  }
});


$('#homeBrand')?.addEventListener('click',()=>{setView('identidad');closeDrawer();window.scrollTo({top:0,behavior:'smooth'})});

// ====== Storage keys (v0.13) + migration ======
const POSTS_KEY='forum.posts.v0.13';
const ANN_KEY='forum.announcement.v0.13';
const ROOMS_KEY='rooms.v0.13';
const TOPICS_KEY='topics.v0.13.custom';

const migrate=(oldK,newK)=>{
  if(localStorage.getItem(newK)==null && localStorage.getItem(oldK)!=null){
    localStorage.setItem(newK,localStorage.getItem(oldK));
  }
};
['forum.posts.v0.05','forum.posts.v0.08','forum.posts.v0.1','forum.posts.v0.11','forum.posts.v0.12'].forEach(k=>migrate(k,POSTS_KEY));
['forum.announcement.v0.05','forum.announcement.v0.08','forum.announcement.v0.1','forum.announcement.v0.11','forum.announcement.v0.12'].forEach(k=>migrate(k,ANN_KEY));
['rooms.v0.05','rooms.v0.08','rooms.v0.11','rooms.v0.12'].forEach(k=>migrate(k,ROOMS_KEY));
['topics.v0.05.custom','topics.v0.08.custom','topics.v0.11.custom','topics.v0.12.custom'].forEach(k=>migrate(k,TOPICS_KEY));

// ====== State ======
let SITE=null;
let DID={connected:false,address:null,role:null};

// ====== Wallet ======
const connectWalletBtn=$('#connectWallet');
const disconnectWalletBtn=$('#disconnectWallet');
const walletStatusEl=$('#walletStatus');

const hasEth=()=>typeof window!=='undefined'&&!!window.ethereum;
const setWalletStatus=(text,cls='')=>{ if(walletStatusEl) walletStatusEl.innerHTML=`<span class="pill ${esc(cls)}">${esc(text)}</span>`; };
const resolveRole=(addr)=>{
  const admin=String(SITE?.dao?.adminAddress??SITE?.site?.address??'').toLowerCase();
  if(addr && admin && addr.toLowerCase()===admin) return 'Admin (alemty.eth)';
  return 'Miembro verificado';
};

function syncWalletUI(){
  const loginHint=$('#loginHint');
  if(DID.connected && DID.address){
    if(connectWalletBtn) connectWalletBtn.hidden=true;
    if(disconnectWalletBtn) disconnectWalletBtn.hidden=false;
    setWalletStatus(`Conectado: ${short(DID.address)} · ${DID.role||''}`);
    if(loginHint) loginHint.hidden=true;
  }else{
    if(connectWalletBtn) connectWalletBtn.hidden=false;
    if(disconnectWalletBtn) disconnectWalletBtn.hidden=true;
    setWalletStatus('No conectado','muted');
    if(loginHint) loginHint.hidden=false;
  }
}

function renderDidCard(){
  // HTML duplicates IDs inside drawer; update all matches safely
  $$('#didStatus').forEach(el=>el.textContent=DID.connected?'Miembro (DID verificado)':'Visitante (solo lectura)');
  $$('#didAddress').forEach(el=>el.textContent=(DID.connected&&DID.address)?short(DID.address):'—');
  $$('#didRole').forEach(el=>el.textContent=DID.connected?(DID.role||'Miembro'):'—');
}

function resolvePersistedWallet(){
  const saved=localStorage.getItem('did.address');
  if(saved){
    DID.connected=true;
    DID.address=saved;
    DID.role=resolveRole(saved);
  }
  syncWalletUI();
  renderDidCard();
}

async function connectWallet(){
  if(!hasEth()) { setWalletStatus('MetaMask no detectado. Instálalo para conectar.','muted'); openDrawer(); return; }
  try{
    const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
    const addr=accounts?.[0]||null;
    if(!addr) return;
    DID.connected=true;
    DID.address=addr;
    DID.role=resolveRole(addr);
    localStorage.setItem('did.address',addr);
    syncWalletUI();
    renderDidCard();
    initForum();
  }catch{ setWalletStatus('Conexión cancelada o fallida.','muted'); }
}
function disconnectWallet(){
  DID={connected:false,address:null,role:null};
  localStorage.removeItem('did.address');
  syncWalletUI();
  renderDidCard();
  initForum();
}
connectWalletBtn?.addEventListener('click',connectWallet);
disconnectWalletBtn?.addEventListener('click',disconnectWallet);
if(hasEth()){
  window.ethereum.on?.('accountsChanged',(acc)=>{
    const addr=acc?.[0]||null;
    if(!addr){disconnectWallet();return;}
    DID.connected=true;
    DID.address=addr;
    DID.role=resolveRole(addr);
    localStorage.setItem('did.address',addr);
    syncWalletUI();
    renderDidCard();
    initForum();
  });
}

// ====== Modal helpers (create if missing) ======
function ensureModal(id,titleId,bodyId,closeId,backdropId,defaultTitle){
  if(document.getElementById(id)) return;
  const wrap=document.createElement('div');
  wrap.className='modal';
  wrap.id=id;
  wrap.setAttribute('aria-hidden','true');
  wrap.setAttribute('role','dialog');
  wrap.setAttribute('aria-modal','true');
  wrap.innerHTML=`
    <div class="modal-card">
      <div class="modal-head">
        <strong id="${titleId}">${esc(defaultTitle||'Modal')}</strong>
        <button class="modal-close" id="${closeId}" aria-label="Cerrar">Cerrar</button>
      </div>
      <div class="modal-body" id="${bodyId}"></div>
      <div class="modal-foot"><span class="meta small">${V}</span></div>
    </div>
    <div class="modal-backdrop" id="${backdropId}" aria-hidden="true"></div>
  `;
  document.body.appendChild(wrap);
}
function openModal(id){
  const m=document.getElementById(id);
  if(!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden','false');
}
function closeModal(id){
  const m=document.getElementById(id);
  if(!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden','true');
}

ensureModal('postModal','postModalTitle','postModalBody','postModalClose','postModalBackdrop','Post');
ensureModal('dmModal','dmTitle','dmBody','dmClose','dmBackdrop','DM');

function renderTokenDashboard() {
  const dh = document.getElementById('tokDharma');
  const au = document.getElementById('tokAura');
  const ka = document.getElementById('tokKarma');
  const al = document.getElementById('tokAlem');

  if (!dh || !au || !ka || !al) return;

  if (!DID.connected || !DID.address) {
    dh.textContent = '—';
    au.textContent = '—';
    ka.textContent = '—';
    al.textContent = '—';
    return;
  }

  const posts = loadPosts().map(normalizePost);
  const s = computeUserStats(DID.address, posts);

  dh.textContent = String(s.xp);
  ka.textContent = String(s.karma);
  au.textContent = String(getAuraBalance(DID.address));
  al.textContent = String(getAlemBalance(DID.address));
}

document.getElementById('openTokenDocs')?.addEventListener('click', () => {
  window.open('assets/docs/tokenomics.pdf', '_blank', 'noopener,noreferrer');
});

// ====== Character Modal (tabs + 6 slots + dex/shop placeholders) ======
const RANKS=[{name:'Novato',min:0},{name:'Iniciado',min:100},{name:'Plata',min:500},{name:'Oro',min:1500},{name:'Diamante',min:5000},{name:'Avanzado',min:12000},{name:'Refinado',min:30000},{name:'Único',min:75000},{name:'Elite',min:150000},{name:'Superior',min:300000},{name:'Amasterdamo',min:600000}];
function computeUserStats(addr,posts){
  const a=String(addr||'').toLowerCase();
  const list=Array.isArray(posts)?posts:[];
  let postsCount=0,commentsCount=0,likesReceived=0,likesGiven=0;
  for(const p of list){
    const lb=p?.likedBy;
    if(lb&&typeof lb==='object'&&lb[a]) likesGiven++;
  }
  for(const p of list){
    if(!p) continue;
    if(String(p.addr||'').toLowerCase()===a){
      postsCount++;
      likesReceived+=Number(p.likes||0);
    }
    const cs=Array.isArray(p.comments)?p.comments:[];
    for(const c of cs){
      if(String(c?.addr||'').toLowerCase()===a) commentsCount++;
      const rs=Array.isArray(c?.replies)?c.replies:[];
      for(const r of rs) if(String(r?.addr||'').toLowerCase()===a) commentsCount++;
    }
  }
  const karma=Math.max(0,likesReceived+Math.floor(commentsCount*0.5)+postsCount);
  const xp=Math.max(0,postsCount*20+commentsCount*6+likesReceived*3+likesGiven);
  const level=Math.max(1,Math.floor(xp/100)+1);
  let current=RANKS[0];
  for(const r of RANKS) if(xp>=r.min) current=r;
  const idx=RANKS.findIndex(r=>r.name===current.name);
  const next=(idx>=0&&idx<RANKS.length-1)?RANKS[idx+1]:null;
  const nextMin=next?next.min:null;
  const baseMin=current?current.min:0;
  const span=nextMin?Math.max(1,nextMin-baseMin):1;
  const within=nextMin?Math.min(span,Math.max(0,xp-baseMin)):span;
  const progress=nextMin?Math.round((within/span)*100):100;
  return {addr,postsCount,commentsCount,likesReceived,likesGiven,karma,xp,level,rank:current.name,nextRank:next?.name,nextRankMin:nextMin,progress};
}
function getAuraBalance(addr){
  const a=String(addr||'').toLowerCase();
  const v=Number(localStorage.getItem(`aura.balance.${a}`));
  return Number.isFinite(v)?Math.max(0,v):0;
}
function getAlemBalance(addr){
  const a=String(addr||'').toLowerCase();
  const v=Number(localStorage.getItem(`alem.balance.${a}`));
  return Number.isFinite(v)?Math.max(0,v):0;
}

function openCharacterModal(){
  if(!DID.connected||!DID.address){
    setWalletStatus('Conecta wallet para ver tu perfil.','muted');
    openDrawer();
    return;
  }
  const addr=DID.address;
  const posts=loadPosts().map(normalizePost);
  const s=computeUserStats(addr,posts);
  const aura=getAuraBalance(addr);
  const alem=getAlemBalance(addr);

  const modal=$('#characterModal');
  const title=$('#characterTitle');
  const body=$('#characterBody');
  if(!modal||!title||!body) return;

  title.textContent='Personaje · '+short(addr);
  const next=s.nextRank?`${s.nextRank} (${s.nextRankMin})`:'Rango máximo';
  const avatarSrc=$('#avatarImg')?.getAttribute('src')||'20260223_205715.jpg';
  const medalKey=`rank.medal.${String(addr).toLowerCase()}`;
  const medalSrc=localStorage.getItem(medalKey)||'';
  const leftImgSrc=medalSrc||avatarSrc;

  body.innerHTML=`
    <div class="char-sheet">
      <div class="char-card">
        <div class="char-avatar" aria-label="Avatar / Medalla">
          <<img id="charAvatarImg" alt="Avatar" loading="eager"/>
        </div>
        <div class="char-role">${esc(DID.role||'Miembro')}</div>
        <h3 class="char-title">${esc(s.rank)}</h3>
        <p class="meta small mono addr">${esc(short(addr))}</p>
        <p class="meta small">Siguiente: <strong>${esc(next)}</strong></p>
        <div class="equip-grid" aria-label="Equipo">
          <div class="equip-slot"><div class="lbl">Medalla rango</div><div class="ico">🏅</div><div class="val">${esc(s.rank)}</div></div>
          <div class="equip-slot"><div class="lbl">Rol</div><div class="ico">🛡️</div><div class="val">${esc(DID.role||'Miembro')}</div></div>
          <div class="equip-slot"><div class="lbl">veNFT</div><div class="ico">⛓️</div><div class="val">—</div></div>
          <div class="equip-slot"><div class="lbl">Agent</div><div class="ico">🤖</div><div class="val">—</div></div>
          <div class="equip-slot"><div class="lbl">Lands</div><div class="ico">🗺️</div><div class="val">—</div></div>
          <div class="equip-slot"><div class="lbl">Assets</div><div class="ico">🧩</div><div class="val">—</div></div>
        </div>
      </div>
      <div class="char-card">
        <div class="profile-tabs" id="characterTabs">
          <button type="button" class="tab-btn active" data-tab="perfil">Perfil</button>
          <button type="button" class="tab-btn" data-tab="actividad">Actividad</button>
          <button type="button" class="tab-btn" data-tab="dm">DM</button>
          <button type="button" class="tab-btn" data-tab="dex">DEX</button>
          <button type="button" class="tab-btn" data-tab="tienda" aria-label="Tienda" title="Tienda">
  🛒
</button>

        </div>
        <div id="characterTabContent"></div>
      </div>
    </div>
  `;

  const tc=$('#characterTabContent',body);
  const renderTab=(tab)=>{
    if(!tc) return;
    if(tab==='perfil'){
      
const clamp = (v,max)=>Math.max(0,Math.min(100,Math.round((v/max)*100)));

const charImg = body.querySelector('#charAvatarImg');
if (charImg) {
  charImg.referrerPolicy = 'no-referrer';
  charImg.decoding = 'async';
  charImg.loading = 'eager';
  charImg.setAttribute('src', leftImgSrc || avatarSrc || '20260223_205715.jpg');
}

tc.innerHTML=`
  <div class="bars">

    <div class="bar">
      <div class="bar-top">
        <strong>Dharma</strong>
        <span class="meta small">${s.xp} XP</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${s.progress}%"></div>
      </div>
    </div>

    <div class="bar">
      <div class="bar-top">
        <strong>Aura</strong>
        <span class="meta small">${aura}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill aura" style="width:${clamp(aura,500)}%"></div>
      </div>
    </div>

    <div class="bar">
      <div class="bar-top">
        <strong>ALEM</strong>
        <span class="meta small">${alem}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${clamp(alem,1000)}%"></div>
      </div>
    </div>

    <div class="bar">
      <div class="bar-top">
        <strong>Karma</strong>
        <span class="meta small">${s.karma}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill karma" style="width:${clamp(s.karma,200)}%"></div>
      </div>
    </div>

  </div>
`;

      return;
    }
    if(tab==='actividad'){
      const all=loadPosts().map(normalizePost);
      const me=String(addr).toLowerCase();
      const created=all.filter(p=>String(p.addr||'').toLowerCase()===me);
      const commented=all.filter(p=>(p.comments||[]).some(c=>String(c.addr||'').toLowerCase()===me));
      const mk=p=>`<button class="small-btn" type="button" data-open="${esc(p.id)}">${esc(p.title||'Post')}</button>`;
      tc.innerHTML=`
        <div class="activity-grid">
          <aside class="activity-stats">
            <div>Dharma: <strong>${esc(s.xp)}</strong></div>
            <div>Karma: <strong>${esc(s.karma)}</strong></div>
            <div>Aura: <strong>${esc(aura)}</strong></div>
          </aside>
          <section class="activity-feed" id="activityFeed">
            <div class="topic-box"><div class="topic-head"><strong>Posts</strong><span class="meta small">${created.length}</span></div>
              ${created.length?created.map(mk).join(''):'<p class="meta small">Sin posts.</p>'}
            </div>
            <div class="topic-box"><div class="topic-head"><strong>Comentarios</strong><span class="meta small">${commented.length}</span></div>
              ${commented.length?commented.map(mk).join(''):'<p class="meta small">Sin comentarios.</p>'}
            </div>
          </section>
        </div>
      `;
      $$('#activityFeed [data-open]',tc).forEach(b=>b.addEventListener('click',()=>openPostModal(b.getAttribute('data-open'))));
      return;
    }
    if(tab==='dm'){
      tc.innerHTML=`
        <p class="meta">Mensajería p2p DID (frontend listo). Backend/cifrado se integra después.</p>
        <div class="dm-thread" id="dmThreadPreview"><div class="dm-msg muted">Aún no hay mensajes.</div></div>
        <div class="dm-input"><input id="dmInputP2P" placeholder="Escribe un mensaje…"/><button class="small-btn primary" id="dmSendP2P" type="button">Enviar</button></div>
      `;
      $('#dmSendP2P',tc)?.addEventListener('click',()=>{
        const inp=$('#dmInputP2P',tc);
        const txt=(inp?.value||'').trim();
        if(!txt) return;
        const wrap=$('#dmThreadPreview',tc);
        if(wrap){wrap.innerHTML+=`<div class="dm-msg me">${esc(txt)}</div>`;wrap.scrollTop=wrap.scrollHeight;}
        if(inp) inp.value='';
      });
      return;
    }

if(tab==='dex'){
  tc.innerHTML=`
    <div class="topic-box">
      <div class="topic-head">
        <strong>Descentralized Exchange</strong>
        <span class="meta small">Economía</span>
      </div>

      <p class="meta">
        La entrada perfecta a tu economía Web3 dentro del juego. Listo para integrar pools y swaps.
      </p>

      <div class="dex-actions">
        <button class="small-btn primary" type="button" data-dex="swap">Swap (SOON)</button>
        <button class="small-btn" type="button" data-dex="pools">Pools (SOON)</button>
        <button class="small-btn" type="button" data-dex="staking">Staking (SOON)</button>
        <button class="small-btn" type="button" data-dex="vote">Vote (SOON)</button>
      </div>

      <p class="meta small" style="margin-top:10px">
        Se habilita al iniciar el mint (tokens + NFTs). Estos botones abrirán la economía en su subdominio.
      </p>
    </div>
  `;

  // ✅ Preparado para activar después: redirección controlada a subdominio
  tc.querySelectorAll('[data-dex]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      // cuando habilites economía, cambia ENABLE_DEX a true
      const ENABLE_DEX=false;

      if(!ENABLE_DEX){
        // por ahora no hace nada (solo UI)
        return;
      }

      const route=btn.getAttribute('data-dex'); // swap | pools | staking | vote
      const base=`${location.protocol}//token.${location.host.replace(/^comunidad\\./,'').replace(/^token\\./,'')}`;
      location.href=`${base}/#${route}`;
    });
  });

  return;

    }
    if(tab==='tienda'){
      tc.innerHTML=`
        <div class="topic-box">
          <div class="topic-head"><strong>Tienda</strong><span class="meta small">Marketplace</span></div>
          <p class="meta">Comercio de NFTs, Assets, Lands, etc. (UI lista para fase madura).</p>
          <div class="shop-grid">
            <div class="shop-item">NFTs (SOON)</div>
            <div class="shop-item">Assets (SOON)</div>
            <div class="shop-item">Lands (SOON)</div>
            <div class="shop-item">Skins (SOON)</div>
          </div>
        </div>
      `;
      return;
    }
  };

  $$('#characterTabs .tab-btn',body).forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('#characterTabs .tab-btn',body).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.getAttribute('data-tab'));
    });
  });
  renderTab('perfil');

  openModal('characterModal');
}

// bind profile button
$('#profileBtn')?.addEventListener('click',openCharacterModal);

// ====== Posts ======
function normalizePost(p){
  p.id=p.id||uid();
  p.addr=p.addr||'';
  p.title=p.title||'';
  p.body=p.body||'';
  p.topic=p.topic||'';
  p.ts=Number(p.ts||Date.now());
  p.likes=Number(p.likes||0);
  p.points=Number(p.points||0);
  p.likedBy=(p.likedBy&&typeof p.likedBy==='object')?p.likedBy:{};
  p.sharedBy=(p.sharedBy&&typeof p.sharedBy==='object')?p.sharedBy:{};
  p.comments=Array.isArray(p.comments)?p.comments:[];
  p.comments=p.comments.map(c=>({
    id:c.id||uid(),
    addr:c.addr||'',
    text:c.text||'',
    ts:Number(c.ts||Date.now()),
    likes:Number(c.likes||0),
    likedBy:(c.likedBy&&typeof c.likedBy==='object')?c.likedBy:{},
    replies:Array.isArray(c.replies)?c.replies:[]
  }));
  return p;
}
function loadPosts(){
  try{ return JSON.parse(localStorage.getItem(POSTS_KEY)||'[]'); }catch{ return []; }
}
function savePosts(list){
  localStorage.setItem(POSTS_KEY,JSON.stringify(list));
}

function loadAnnouncement(){
  const fb=SITE?.community?.announcementDefault||'';
  return localStorage.getItem(ANN_KEY)||fb;
}
function saveAnnouncement(text){
  localStorage.setItem(ANN_KEY,text);
}

// ====== Topics ======
const TOPIC_GROUPS=[
 {groupIcon:'🔬',groupLabel:'Ciencia & Conocimiento',key:'ciencia-conocimiento',topics:[{icon:'🔬',label:'Ciencia y Tecnología'},{icon:'🧬',label:'Biología & Genética'},{icon:'🌌',label:'Astronomía & Astrofísica'},{icon:'🧠',label:'Neurociencia & Cognición'},{icon:'⚛️',label:'Física Cuántica & Teorías del Todo'}]},
 {groupIcon:'🌀',groupLabel:'Conspiraciones & Misterios',key:'conspiraciones-misterios',topics:[{icon:'🌀',label:'Conspiraciones Globales'},{icon:'👁️',label:'Sociedades Secretas'},{icon:'🛸',label:'OVNIs & Contacto Extraterrestre'},{icon:'🕳️',label:'Misterios del Mundo'},{icon:'🧩',label:'Arqueología Prohibida'}]},
 {groupIcon:'🧿',groupLabel:'Espiritualidad & Gnosis',key:'espiritualidad-gnosis',topics:[{icon:'🧿',label:'Gnosis & Tradiciones Iniciáticas'},{icon:'🔱',label:'Mitología & Arquetipos'},{icon:'🕉️',label:'Meditación & Conciencia'},{icon:'🐍',label:'Alquimia & Hermetismo'},{icon:'🔮',label:'Magia, Ritos & Simbolismo'}]},
 {groupIcon:'💬',groupLabel:'Comunidad & Off-topic',key:'comunidad-offtopic',topics:[{icon:'💬',label:'Off Topic / Libre Expresión'},{icon:'😂',label:'Memes & Humor'},{icon:'🎨',label:'Arte & Creatividad'},{icon:'🎮',label:'Gaming & Cultura Geek'},{icon:'🎵',label:'Música & Cultura Pop'}]},
 {groupIcon:'🧑‍💻',groupLabel:'Tecnología & Futuro',key:'tecnologia-futuro',topics:[{icon:'🤖',label:'IA & Agentes Autónomos'},{icon:'🕶️',label:'AR/VR & Metaverso'},{icon:'🧱',label:'Web3, DAOs & Blockchain'},{icon:'🛠️',label:'Hacking Ético & Ciberseguridad'},{icon:'🛰️',label:'Futuro, Prospectiva & Transhumanismo'}]},
 {groupIcon:'🧘',groupLabel:'Salud & Bienestar',key:'salud-bienestar',topics:[{icon:'🧘',label:'Salud Holística'},{icon:'🥗',label:'Nutrición & Biohacking'},{icon:'🧪',label:'Medicina Alternativa'},{icon:'🫀',label:'Salud Física & Mental'},{icon:'🌿',label:'Plantas Sagradas & Etnobotánica'}]},
 {groupIcon:'📚',groupLabel:'Cultura & Humanidades',key:'cultura-humanidades',topics:[{icon:'📚',label:'Filosofía & Pensamiento Crítico'},{icon:'🗿',label:'Historia & Civilizaciones'},{icon:'📝',label:'Literatura & Ensayo'},{icon:'🎭',label:'Psicología & Arquetipos'},{icon:'🌍',label:'Antropología & Culturas del Mundo'}]},
 {groupIcon:'💼',groupLabel:'Economía & Sociedad',key:'economia-sociedad',topics:[{icon:'💼',label:'Emprendimiento & Startups'},{icon:'📈',label:'Economía & Mercados'},{icon:'🏛️',label:'Política & Geopolítica'},{icon:'🌱',label:'Sustentabilidad & Futuro del Planeta'}]},
 {groupIcon:'🧩',groupLabel:'Contenido Especial / Fringe',key:'contenido-fringe',topics:[{icon:'🧩',label:'Teorías Alternativas'},{icon:'🧿',label:'Realidad Simulada'},{icon:'🧬',label:'Criptozoología'},{icon:'🌀',label:'Paradojas & Pensamiento Lateral'},{icon:'🧙',label:'Folclore & Tradiciones Ocultas'}]}
];
function topicKey(groupKey,label){return `${groupKey}--${slug(label)}`;}
function loadList(key){ try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];} }
function saveList(key,arr){ localStorage.setItem(key,JSON.stringify(arr)); }

function populateTopicSelect(){
  const sel=$('#postTopic');
  if(!sel) return;
  const prev=sel.value;
  sel.innerHTML='<option value="">Sin tema</option>';
  for(const g of TOPIC_GROUPS){
    const og=document.createElement('optgroup');
    og.label=`${g.groupIcon} ${g.groupLabel}`;
    for(const t of g.topics){
      const o=document.createElement('option');
      o.value=topicKey(g.key,t.label);
      o.textContent=`${t.icon} ${t.label}`;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
  const custom=loadList(TOPICS_KEY);
  if(custom.length){
    const og=document.createElement('optgroup');
    og.label='✨ Personalizados';
    custom.forEach(lbl=>{
      const o=document.createElement('option');
      o.value=`custom--${slug(lbl)}`;
      o.textContent=`▣ ${lbl}`;
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  if(prev) sel.value=prev;
}

// ====== Topic modal ======
function openTopicModalByKey(tKey){
  const topic=(function(){
    for(const g of TOPIC_GROUPS) for(const t of g.topics) if(topicKey(g.key,t.label)===tKey) return {icon:t.icon||g.groupIcon,label:t.label,group:g.groupLabel,welcome:`Bienvenido a ${t.label}.`};
    const custom=loadList(TOPICS_KEY);
    for(const lbl of custom) if(`custom--${slug(lbl)}`===tKey) return {icon:'▣',label:lbl,group:'Personalizados',welcome:`Bienvenido a ${lbl}.`};
    return {icon:'▣',label:tKey,group:'',welcome:''};
  })();
  const modal=$('#topicModal');
  const title=$('#topicTitle');
  const body=$('#topicBody');
  if(!modal||!title||!body) return;
  title.textContent=`${topic.icon} ${topic.label}`;
  const posts=loadPosts().map(normalizePost).filter(p=>(p.topic||'')===tKey);
  const admin=String(SITE?.dao?.adminAddress??SITE?.site?.address??'').toLowerCase();
  const adminFirst=posts.filter(p=>String(p.addr||'').toLowerCase()===admin).sort((a,b)=>(a.ts||0)-(b.ts||0))[0]||null;
  const rest=posts.filter(p=>!adminFirst||p.id!==adminFirst.id).sort((a,b)=>(b.ts||0)-(a.ts||0));
  body.innerHTML=`
    <p class="meta">${esc(topic.welcome||'')}</p>
    <div class="topic-box">
      <div class="topic-head"><strong>Primer post del Admin</strong><span class="meta small">${esc(topic.group||'')}</span></div>
      ${adminFirst?`<article class="post pinned"><header class="post-head"><div class="post-tag">ADMIN</div><div class="post-title">${esc(adminFirst.title||'Post del Admin')}</div></header><div class="post-body">${esc(adminFirst.body||'')}</div></article>`:`<p class="meta small">Sin post del admin todavía.</p>`}
    </div>
    <div class="topic-box">
      <div class="topic-head"><strong>Posts</strong><span class="meta small">${posts.length}</span></div>
      ${rest.length?rest.map(p=>`<button class="small-btn" data-open="${esc(p.id)}">${esc(p.title||'Post')}</button>`).join(''):`<p class="meta small">Sin posts.</p>`}
    </div>
  `;
  body.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openPostModal(b.getAttribute('data-open'))));
  openModal('topicModal');
}

// ====== Topics sidebar ======
let currentTopicKey='';
function initTopicsSidebar(){
  const list=$('#topicsList');
  if(!list) return;
  list.innerHTML='';
  const allLi=document.createElement('li');
  allLi.style.listStyle='none';
  const allBtn=document.createElement('button');
  allBtn.type='button';
  allBtn.className='chip topic'+(!currentTopicKey?' active':'');
  allBtn.textContent='✨ Todos';
  allBtn.addEventListener('click',e=>{e.preventDefault();currentTopicKey='';renderFeed();});
  allLi.appendChild(allBtn);
  list.appendChild(allLi);

  const make=(t)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='chip topic'+(currentTopicKey===t.key?' active':'');
    btn.innerHTML=`<span class="topic-ico">${esc(t.icon)}</span><span>${esc(t.label)}</span>`;
    btn.addEventListener('click',e=>{e.preventDefault();currentTopicKey=t.key;renderFeed();openTopicModalByKey(t.key);});
    return btn;
  };

  for(const g of TOPIC_GROUPS){
    const li=document.createElement('li');
    li.style.listStyle='none';
    const det=document.createElement('details');
    det.className='topic-group';
    const sum=document.createElement('summary');
    sum.className='topic-summary';
    sum.innerHTML=`<span class="topic-ico">${esc(g.groupIcon)}</span><span>${esc(g.groupLabel)}</span>`;
    const wrap=document.createElement('div');
    wrap.className='topic-items';
    g.topics.forEach(st=>wrap.appendChild(make({key:topicKey(g.key,st.label),icon:st.icon||g.groupIcon,label:st.label})));
    det.appendChild(sum);
    det.appendChild(wrap);
    li.appendChild(det);
    list.appendChild(li);
  }

  const custom=loadList(TOPICS_KEY);
  if(custom.length){
    const li=document.createElement('li');
    li.style.listStyle='none';
    const det=document.createElement('details');
    det.className='topic-group';
    const sum=document.createElement('summary');
    sum.className='topic-summary';
    sum.innerHTML='<span class="topic-ico">✨</span><span>Personalizados</span>';
    const wrap=document.createElement('div');
    wrap.className='topic-items';
    custom.forEach(lbl=>wrap.appendChild(make({key:`custom--${slug(lbl)}`,icon:'▣',label:lbl})));
    det.appendChild(sum);
    det.appendChild(wrap);
    li.appendChild(det);
    list.appendChild(li);
  }
}

// ====== Rooms UI ======
function renderChips(listEl,items){
  if(!listEl) return;
  listEl.innerHTML='';
  if(!items.length){
    const li=document.createElement('li');
    li.className='chip muted';
    li.textContent='Sin elementos aún.';
    listEl.appendChild(li);
    return;
  }
  items.slice(0,8).forEach(t=>{
    const li=document.createElement('li');
    li.className='chip';
    li.textContent=t;
    listEl.appendChild(li);
  });
}
function initRoomsTopics(){
  const roomsList=$('#roomsList');
  renderChips(roomsList,loadList(ROOMS_KEY));

  const createRoomBtn=$('#createRoomBtn');
  const createTopicBtn=$('#createTopicBtn');
  const viewRoomsBtn=$('#viewRoomsBtn');
  const viewTopicsBtn=$('#viewTopicsBtn');

  if(createRoomBtn && !createRoomBtn.dataset.bound){
    createRoomBtn.dataset.bound='1';
    createRoomBtn.addEventListener('click',()=>{
      const name=prompt('Nombre de la sala privada/grupo:');
      if(!name) return;
      const next=loadList(ROOMS_KEY);
      next.unshift(name.trim());
      saveList(ROOMS_KEY,next);
      renderChips(roomsList,next);
    });
  }
  if(createTopicBtn && !createTopicBtn.dataset.bound){
    createTopicBtn.dataset.bound='1';
    createTopicBtn.addEventListener('click',()=>{
      const name=prompt('Nombre del subtema (se agregará a Personalizados):');
      if(!name) return;
      const next=loadList(TOPICS_KEY);
      next.unshift(name.trim());
      saveList(TOPICS_KEY,next);
      initTopicsSidebar();
      populateTopicSelect();
    });
  }
  if(viewRoomsBtn && !viewRoomsBtn.dataset.bound){
    viewRoomsBtn.dataset.bound='1';
    viewRoomsBtn.addEventListener('click',()=>alert('UI lista: backend en la siguiente fase.'));
  }
  if(viewTopicsBtn && !viewTopicsBtn.dataset.bound){
    viewTopicsBtn.dataset.bound='1';
    viewTopicsBtn.addEventListener('click',()=>alert('UI lista: backend en la siguiente fase.'));
  }
}

// ====== Social cards ======
const LINKS=[
 {platform:'TikTok',desc:'Escuela de Conocimiento Oculto (T2)',url:'https://www.tiktok.com/@alemtyv',icon:'assets/icons/tiktok.svg'},
 {platform:'TikTok',desc:'Tecnologías del Futuro (IA, Web3, Metaverso)',url:'https://www.tiktok.com/@alemty.eth',icon:'assets/icons/tiktok.svg'},
 {platform:'YouTube',desc:'Escuela de Conocimiento Oculto',url:'https://www.youtube.com/@AlemtyV',icon:'assets/icons/youtube.svg'},
 {platform:'LinkedIn',desc:'Mi Carrera Profesional',url:'https://www.linkedin.com/in/alemty/',icon:'assets/icons/linkedin.svg'},
 {platform:'X',desc:'Mi Perfil en Twitter',url:'https://x.com/alemty_eth',icon:'assets/icons/x.svg'},
 {platform:'Instagram',desc:'Mi Perfil de Instagram',url:'https://www.instagram.com/alemty01/',icon:'assets/icons/instagram.svg'},
 {platform:'Facebook',desc:'Alejandro Gutierrez Zavala',url:'https://web.facebook.com/Alemty11/',icon:'assets/icons/facebook.svg'},
 {platform:'Telegram',desc:'Grupo alemtyv',url:'https://t.me/+A91KGSxgvr5hYThhotra',icon:'assets/icons/telegram.svg'},
 {platform:'OpenSea',desc:'Galería de NFTs',url:'https://opensea.io/es/0x6a202f991c4c1df079449be9847b1dac3f51854f',icon:'assets/icons/opensea.svg'},
 {platform:'Decentraland',desc:'Mi Avatar del Metaverso',url:'https://decentraland.org/profile/accounts/0x6a202f991c4c1df079449be9847b1dac3f51854f',icon:'assets/icons/decentraland.svg'},
 {platform:'GitHub',desc:'Repositorio del proyecto',url:'https://github.com/Alemty/alemty.eth-DAO',icon:'assets/icons/github.svg'},
 {platform:'WhatsApp',desc:'(SOON)',url:'#',icon:'assets/icons/whatsapp.svg'}
];
function extractUser(url,platform){
  const FALL='alemty';
  if(!url||url==='#') return FALL;
  try{
    const u=new URL(url);
    const parts=u.pathname.split('/').filter(Boolean);
    if(String(platform||'').toLowerCase()==='linkedin'){
      const idx=parts.findIndex(p=>p==='in'||p==='company');
      const h=(idx>=0&&parts[idx+1])?parts[idx+1]:(parts[0]||'');
      return h||FALL;
    }
    const at=parts.find(p=>p.startsWith('@'));
    if(at) return at.replace('@','');
    if(u.hostname.includes('x.com')) return parts[0]||FALL;
    if(u.hostname.includes('instagram.com')) return parts[0]||FALL;
    if(u.hostname.includes('github.com')) return parts[0]||FALL;
    
if (u.hostname.includes('opensea.io')) {
  const addr = parts.find(p => p.startsWith('0x')) || '';
  return addr ? shortHex(addr) : FALLBACK;
}

if (u.hostname.includes('decentraland.org')) {
  const addr = parts.find(p => p.startsWith('0x')) || '';
  return addr ? shortHex(addr) : FALLBACK;
}

    if(u.hostname.includes('t.me')){const m=parts[0]||'';return m.startsWith('+')?FALL:(m||FALL)}
    const last=parts[parts.length-1]||'';
    return last||FALL;
  }catch{return FALL}
}
function renderSocial(){
  const cards=$('#cards');
  if(!cards) return;
  cards.innerHTML='';
  LINKS.forEach(l=>{
    const user=extractUser(l.url,l.platform);
    const el=document.createElement('article');
    el.className='card';
    el.innerHTML=`
      <img class="icon" src="${esc(l.icon)}" alt="${esc(l.platform)}" width="28" height="28"/>
      <div class="card-text">
        <h3 class="card-title">${esc(l.platform)}</h3>
        <div class="card-user">${esc(user)}</div>
        <p class="card-desc">${esc(l.desc)}</p>
      </div>
    `;
    const a=document.createElement('a');
    a.className='btn';
    a.href=l.url;
    if(l.url==='#'){
      a.setAttribute('aria-disabled','true');
      a.style.pointerEvents='none';
      a.style.opacity='0.7';
      a.textContent='Próximamente';
    }else{
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.textContent='Abrir';
    }
    el.appendChild(a);
    cards.appendChild(el);
  });
}

// ====== Forum ======
let currentSearch='';
function matchesSearch(p){
  if(!currentSearch) return true;
  const cs=Array.isArray(p.comments)?p.comments:[];
  const cText=cs.map(c=>`${c.text||''} ${(c.replies||[]).map(r=>r.text||'').join(' ')}`).join(' ');
  return `${p.title||''} ${p.body||''} ${p.addr||''} ${cText}`.toLowerCase().includes(currentSearch);
}
function score(p){ return (p.likes||0)+(p.comments?.length||0)+(p.points||0); }

function initForum(){
  // search
  const search=$('#postSearch');
  const clear=$('#clearSearch');
  if(search && !search.dataset.bound){
    search.dataset.bound='1';
    search.addEventListener('input',()=>{
      const q=(search.value||'').trim().toLowerCase();
      currentSearch=q.length>=2?q:'';
      renderFeed();
    });
  }
  if(clear && !clear.dataset.bound){
    clear.dataset.bound='1';
    clear.addEventListener('click',()=>{ if(search) search.value=''; currentSearch=''; renderFeed(); });
  }

  // announcement
  const annText=$('#announcementText');
  const annTools=$('#announcementAdminTools');
  const annEdit=$('#announcementEdit');
  const saveBtn=$('#saveAnnouncement');
  const resetBtn=$('#resetAnnouncement');
  const ann=loadAnnouncement();
  if(annText) annText.textContent=ann;

  const isAdmin=DID.connected && String(DID.role||'').includes('Admin');
  if(annTools) annTools.hidden=!isAdmin;
  if(isAdmin && annEdit){
    annEdit.value=ann;
    if(saveBtn && !saveBtn.dataset.bound){
      saveBtn.dataset.bound='1';
      saveBtn.addEventListener('click',()=>{
        const t=(annEdit.value||'').trim();
        if(!t) return;
        saveAnnouncement(t);
        if(annText) annText.textContent=t;
      });
    }
    if(resetBtn && !resetBtn.dataset.bound){
      resetBtn.dataset.bound='1';
      resetBtn.addEventListener('click',()=>{
        localStorage.removeItem(ANN_KEY);
        const def=loadAnnouncement();
        annEdit.value=def;
        if(annText) annText.textContent=def;
      });
    }
  }

  // composer
  const title=$('#postTitle');
  const body=$('#postBody');
  const publish=$('#publishPost');
  const status=$('#publishStatus');
  const hint=$('#composerHint');
  if(hint) hint.textContent=DID.connected?'DID verificado. Publica tu post.':'Requiere wallet (DID) para publicar.';

  populateTopicSelect();

  if(publish && !publish.dataset.bound){
    publish.dataset.bound='1';
    publish.addEventListener('click',()=>{
      if(!DID.connected||!DID.address){
        if(status) status.textContent='Conecta wallet para publicar.';
        openDrawer();
        return;
      }
      const t=(title?.value||'').trim();
      const b=(body?.value||'').trim();
      if(t.length<3||b.length<10){
        if(status) status.textContent='Completa título (3+) y cuerpo (10+).';
        return;
      }
      const topic=($('#postTopic')?.value||'').trim();
      const list=loadPosts().map(normalizePost);
      list.push(normalizePost({id:uid(),addr:DID.address,title:t,body:b,topic:topic||'',ts:Date.now(),likes:0,likedBy:{},points:0,sharedBy:{},comments:[]}));
      savePosts(list);
      if(title) title.value='';
      if(body) body.value='';
      if(status) status.textContent='Publicado.';
      renderFeed();
    });
  }

  renderFeed();
}

function toggleLike(entity,byLower){
  entity.likedBy ||= {};
  if(entity.likedBy[byLower]){
    delete entity.likedBy[byLower];
    entity.likes = Math.max(0,Number(entity.likes||0)-1);
  }else{
    entity.likedBy[byLower]=true;
    entity.likes = Number(entity.likes||0)+1;
  }
}

function openPostModal(postId){
  const posts=loadPosts().map(normalizePost);
  const idx=posts.findIndex(p=>p.id===postId);
  if(idx<0) return;
  const post=posts[idx];
  const me=(DID.address||'').toLowerCase();
  const liked=!!(post.likedBy||{})[me];
  const body=$('#postModalBody');
  const title=$('#postModalTitle');
  if(title) title.textContent=post.title||'Post';
  if(body){
    body.innerHTML=`
      <div class="post-body">${esc(post.body||'')}</div>
      <div class="post-modal-actions">
        <button class="small-btn" id="pmLike">${liked?'💚':'👍'} ${post.likes||0}</button>
        <button class="small-btn" id="pmPoints">✨ ${post.points||0}</button>
        <button class="small-btn" id="pmShare">🔗 Compartir</button>
      </div>
      <div class="post-comments">
        <h4>Comentarios</h4>
        <div id="pmComments"></div>
        <div class="comment-form">
          <input id="pmInput" placeholder="Escribe un comentario…"/>
          <button class="small-btn primary" id="pmSend">Enviar</button>
        </div>
      </div>
    `;
  }

  const renderComments=()=>{
    const wrap=$('#pmComments');
    if(!wrap) return;
    wrap.innerHTML='';
    const cs=post.comments||[];
    if(!cs.length){wrap.innerHTML='<p class="meta small">Sin comentarios.</p>';return;}
    cs.slice().reverse().forEach(c=>{
      const el=document.createElement('div');
      el.className='post-comment';
      el.innerHTML=`<div class="meta small mono">${esc(short(c.addr))} · ${esc(fmt(c.ts))}</div><div>${esc(c.text||'')}</div>`;
      wrap.appendChild(el);
    });
  };
  renderComments();

  $('#pmLike')?.addEventListener('click',()=>{
    if(!DID.connected||!DID.address){openDrawer();return;}
    toggleLike(post,me);
    posts[idx]=post;
    savePosts(posts);
    openPostModal(postId);
  },{once:true});

  $('#pmPoints')?.addEventListener('click',e=>{
    if(!DID.connected||!DID.address){openDrawer();return;}
    post.points=Math.max(0,Number(post.points||0)+(e.shiftKey?-1:1));
    posts[idx]=post;
    savePosts(posts);
    openPostModal(postId);
  },{once:true});

  $('#pmShare')?.addEventListener('click',()=>{
    try{navigator.clipboard?.writeText?.(location.href.split('#')[0]+`#post-${post.id}`);}catch{}
  },{once:true});

  $('#pmSend')?.addEventListener('click',()=>{
    if(!DID.connected||!DID.address){openDrawer();return;}
    const inp=$('#pmInput');
    const txt=(inp?.value||'').trim();
    if(txt.length<2) return;
    post.comments ||= [];
    post.comments.push({id:uid(),addr:DID.address,text:txt,ts:Date.now()});
    posts[idx]=post;
    savePosts(posts);
    openPostModal(postId);
  },{once:true});

  // close handlers
  $('#postModalClose')?.addEventListener('click',()=>closeModal('postModal'),{once:true});
  $('#postModalBackdrop')?.addEventListener('click',()=>closeModal('postModal'),{once:true});
  openModal('postModal');
}

function renderFeed(){
  const feed=$('#feed');
  if(!feed) return;
  const list=loadPosts().map(normalizePost);
  const ordered=list.slice().sort((a,b)=>(b.ts||0)-(a.ts||0));
  const filtered=ordered.filter(p=>!currentTopicKey||p.topic===currentTopicKey).filter(matchesSearch);

  if(!filtered.length){
    feed.innerHTML=currentSearch?`<p class="meta">No hay resultados para “${esc(currentSearch)}”.</p>`:'<p class="meta">Aún no hay posts. Sé el primero (con DID).</p>';
  }else{
    feed.innerHTML='';
    filtered.forEach(p=>{
      const wrap=document.createElement('article');
      wrap.className='feed-post';
      wrap.id=`post-${p.id}`;

      const vote=document.createElement('div');
      vote.className='vote';
      const likeBtn=document.createElement('button');
      likeBtn.className='vote-btn';
      likeBtn.textContent='▲';
      const count=document.createElement('div');
      count.className='vote-count';
      count.textContent=String(p.likes||0);
      vote.append(likeBtn,count);

      const card=document.createElement('div');
      card.className='post-card';
      const h4=document.createElement('h4');
      h4.textContent=p.title||'';
      const meta=document.createElement('div');
      meta.className='post-meta';
      const author=document.createElement('button');
      author.type='button';
      author.className='author-link';
      author.textContent=short(p.addr);
      author.addEventListener('click',e=>{e.stopPropagation();openProfileModal(p.addr);});
      meta.innerHTML='';
      meta.append(author,document.createTextNode(' · '),document.createTextNode(fmt(p.ts)),document.createTextNode(' · '),document.createTextNode(`${(p.comments||[]).length} comentarios`));
      const snip=document.createElement('div');
      snip.className='post-snippet';
      snip.textContent=p.body||'';
      card.append(h4,meta,snip);

      card.addEventListener('click',e=>{ if(e.target.closest('button')) return; openPostModal(p.id); });
      likeBtn.addEventListener('click',()=>{
        if(!DID.connected||!DID.address){openDrawer();return;}
        const posts=loadPosts().map(normalizePost);
        const idx=posts.findIndex(x=>x.id===p.id);
        if(idx<0) return;
        toggleLike(posts[idx],(DID.address||'').toLowerCase());
        savePosts(posts);
        renderFeed();
      });

      wrap.append(vote,card);
      feed.appendChild(wrap);
    });
  }

  renderSidebars(list);
  initRoomsTopics();
  initTopicsSidebar();
}

function renderSidebars(list){
  const topWeek=$('#topWeek');
  const topGlobal=$('#topGlobal');
  if(!topWeek||!topGlobal) return;
  const now=Date.now();
  const weekAgo=now-7*24*60*60*1000;
  const week=list.filter(p=>(p.ts||0)>=weekAgo).slice().sort((a,b)=>score(b)-score(a)).slice(0,7);
  const glob=list.slice().sort((a,b)=>score(b)-score(a)).slice(0,7);
  const render=(ol,arr)=>{
    ol.innerHTML='';
    if(!arr.length){const li=document.createElement('li');li.textContent='Sin datos aún.';ol.appendChild(li);return;}
    arr.forEach(p=>{
      const li=document.createElement('li');
      const a=document.createElement('a');
      a.href=`#post-${p.id}`;
      a.textContent=(p.title||'').length>42?(p.title||'').slice(0,42)+'…':(p.title||'');
      a.addEventListener('click',e=>{e.preventDefault();document.getElementById(`post-${p.id}`)?.scrollIntoView({behavior:'smooth',block:'start'});});
      const m=document.createElement('div');
      m.className='meta small';
      m.textContent=`${p.likes||0} likes · ${(p.comments||[]).length} comentarios`;
      li.append(a,m);
      ol.appendChild(li);
    });
  };
  render(topWeek,week);
  render(topGlobal,glob);
}

// ====== Profile modal (other DID) ======
function openProfileModal(addr){
  const posts=loadPosts().map(normalizePost);
  const s=computeUserStats(addr,posts);
  const title=$('#profileTitle');
  const body=$('#profileBody');
  
  if(!title||!body) return;
  title.textContent='Perfil DID · '+short(addr);
  body.innerHTML=`
    <div class="profile-head">
      <div class="rank-badge"><span class="dot"></span> ${esc(s.rank)} · LVL ${esc(s.level)}</div>
      <div class="meta small mono addr">${esc(String(addr))}</div>
    </div>
    <div class="profile-grid">
      <div class="stat"><div class="k">Dharma (XP)</div><div class="v">${esc(s.xp)}</div></div>
      <div class="stat"><div class="k">Karma</div><div class="v">${esc(s.karma)}</div></div>
      <div class="stat"><div class="k">Likes recibidos</div><div class="v">${esc(s.likesReceived)}</div></div>
      <div class="stat"><div class="k">Posts</div><div class="v">${esc(s.postsCount)}</div></div>
    </div>
  `;
  openModal('profileModal');
  $('#profileClose')?.addEventListener('click',()=>closeModal('profileModal'),{once:true});
  $('#profileBackdrop')?.addEventListener('click',()=>closeModal('profileModal'),{once:true});
}

// ====== Rangos modal (txt) ======
const RANGOS_TXT_URL='assets/docs/rangos.txt';
function openRangosModal(){
  const modal=$('#rangosModal');
  const body=$('#rangosBody');
  if(!modal||!body) return;
  body.innerHTML=`<article class="post"><header class="post-head"><div class="post-tag">DOCUMENTO</div><div class="post-title">Sistema de Rangos (Dharma)</div></header><div class="post-body">Cargando contenido…</div></article>`;
  openModal('rangosModal');
  fetch(RANGOS_TXT_URL,{cache:'no-store'}).then(r=>{if(!r.ok) throw 0; return r.text();}).then(txt=>{
    const safe=esc(txt).split(/\n\s*\n/).map(p=>`<p>${p.replace(/\n/g,'<br/>')}</p>`).join('');
    body.innerHTML=`<article class="post"><header class="post-head"><div class="post-tag">DOCUMENTO</div><div class="post-title">Sistema de Rangos (Dharma)</div></header><div class="post-body">${safe}</div></article>`;
  }).catch(()=>{
    body.innerHTML=`<article class="post"><header class="post-head"><div class="post-tag">ERROR</div><div class="post-title">Sistema de Rangos</div></header><div class="post-body">No se encontró <code>${esc(RANGOS_TXT_URL)}</code>.</div></article>`;
  });
}
$('#openRangos')?.addEventListener('click',openRangosModal);
$('#rangosClose')?.addEventListener('click',()=>closeModal('rangosModal'));
$('#rangosBackdrop')?.addEventListener('click',()=>closeModal('rangosModal'));

// ====== Cert collage ======
function buildCertCollage(list){
  const grid=$('#certGrid');
  if(!grid) return;
  if(!Array.isArray(list)||!list.length){grid.innerHTML='<p class="meta">Sin acreditaciones disponibles.</p>';return;}
  const sorted=list.slice().sort((a,b)=>{
    const pA=a.pinned?1:0,pB=b.pinned?1:0;
    if(pA!=pB) return pB-pA;
    const s=(b.score||0)-(a.score||0);
    if(s!==0) return s;
    const ay=a.start||'',by=b.start||'';
    if(ay<by) return 1;
    if(ay>by) return -1;
    return String(a.title||'').localeCompare(String(b.title||''));
  });
  let last=new Set();
  const pick=(arr,n=4)=>{
    if(arr.length<=n) return arr.slice();
    const c=arr.slice();
    for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}
    let p=c.slice(0,n);
    const keys=new Set(p.map(x=>x.url||x.title||JSON.stringify(x)));
    const same=keys.size===last.size && [...keys].every(k=>last.has(k));
    if(same) p=c.slice(1,n+1);
    last=new Set(p.map(x=>x.url||x.title||JSON.stringify(x)));
    return p;
  };
  const paint=(items)=>{
    grid.innerHTML='';
    items.forEach(c=>{
      const a=document.createElement('a');
      a.className='cert-tile';
      a.href=c.url||'#';
      a.target='_blank';
      a.rel='noopener noreferrer';
      if(!c.url){a.setAttribute('aria-disabled','true');a.style.pointerEvents='none';a.style.opacity='0.75';}
      a.innerHTML=`<div class="cert-title">${esc(c.title||'Acreditación')}</div><div class="cert-meta">${esc(c.issuer||'')}${c.start?' · '+esc(c.start):''}</div>`;
      grid.appendChild(a);
    });
  };
  const render=()=>{grid.classList.add('fade');setTimeout(()=>{paint(pick(sorted,4));grid.classList.remove('fade');},160)};
  render();
  clearInterval(window.__certRot);
  window.__certRot=setInterval(render,1500);
}
fetch('assets/data/certifications.v3.json').then(r=>r.json()).then(list=>buildCertCollage(Array.isArray(list)?list:[])).catch(()=>buildCertCollage([]));

// ====== POAP carousel ======
const poapRow=$('#poapRow');
function renderPOAPs(arr){
  if(!poapRow) return;
  poapRow.innerHTML='';
  if(!arr.length){poapRow.innerHTML='<p class="meta">Sin POAPs disponibles.</p>';return;}
  const marquee=document.createElement('div');
  marquee.className='poap-marquee';
  poapRow.appendChild(marquee);
  const track1=document.createElement('div');
  track1.className='poap-track';
  marquee.appendChild(track1);
  const add=(track)=>{
    arr.forEach(p=>{
      const clickable=!!(p.url&&String(p.url).trim());
      const el=clickable?document.createElement('a'):document.createElement('div');
      el.className='poap';
      if(clickable){el.href=p.url;el.target='_blank';el.rel='noopener noreferrer';el.title=p.title;}
      const img=document.createElement('img');
      img.src=p.img;img.alt=p.title;img.loading='lazy';
      img.onerror=()=>{img.src='assets/poap/placeholder.png'};
      const label=document.createElement('span');
      label.className='label';
      label.textContent=p.title;
      el.append(img,label);
      track.appendChild(el);
    });
  };
  add(track1);
  const track2=track1.cloneNode(true);
  track2.setAttribute('aria-hidden','true');
  marquee.appendChild(track2);
  const measure=()=>{const w=track1.scrollWidth; if(w>0) poapRow.style.setProperty('--poap-shift',`${w}px`);};
  const imgs=marquee.querySelectorAll('img');
  let pending=imgs.length; if(pending===0) measure();
  imgs.forEach(im=>{
    if(im.complete){pending--;if(pending===0) measure();}
    else im.addEventListener('load',()=>{pending--;if(pending===0) measure();},{once:true});
  });
  if('ResizeObserver' in window) new ResizeObserver(measure).observe(poapRow);
  else window.addEventListener('resize',measure);
}
if(poapRow){
  const pause=()=>poapRow.classList.add('is-paused');
  const resume=()=>poapRow.classList.remove('is-paused');
  poapRow.addEventListener('pointerdown',pause);
  poapRow.addEventListener('pointerup',resume);
  poapRow.addEventListener('pointercancel',resume);
  poapRow.addEventListener('pointerleave',resume);
  poapRow.addEventListener('touchstart',pause,{passive:true});
  poapRow.addEventListener('touchend',resume,{passive:true});
  poapRow.addEventListener('touchcancel',resume,{passive:true});
  fetch('assets/poap/poaps.v3.json').then(r=>r.json()).then(list=>renderPOAPs(Array.isArray(list)?list:[])).catch(()=>renderPOAPs([]));
}

// ====== Site config helpers ======
function setupPubkey(){
  const el=$('#pubkey');
  if(!el||!SITE?.site?.address) return;
  el.setAttribute('data-full',SITE.site.address);
  el.textContent=short(SITE.site.address);
}
function setupPoapAll(){
  const a=$('#poapAll');
  if(!a||!SITE?.site?.address) return;
  a.href=`https://collectors.poap.xyz/scan/${SITE.site.address}`;
}


function setupAvatar(){
  const img = document.getElementById('avatarImg');
  if(!img) return;

  // ÚNICA fuente: Pinata Dedicated Gateway (IPFS)
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = 'https://teal-managing-reindeer-815.mypinata.cloud/ipfs/bafybeih6bodktcdu26x7m63bwsnul3daubvvey4qfkmwu3g3vy236bufqe';
}


function setupBuy(){
  const buy=$('#buyBtn');
  if(!buy||!SITE?.book) return;
  const url=String(SITE.book.buyUrl??'').trim();
  if(url){buy.href=url;buy.setAttribute('aria-disabled','false');buy.style.pointerEvents='auto';buy.style.opacity='1';}
  else {buy.href='#';buy.setAttribute('aria-disabled','true');}
}

// ====== Background canvas dots ======
(function(){
  const canvas=$('#bgDots');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let w=0,h=0,nodes=[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MAX=0.22,LINK=170,GLYPH=0.12;
  const rnd=(a,b)=>Math.random()*(b-a)+a;
  const resize=()=>{w=canvas.width=innerWidth;h=canvas.height=innerHeight;};
  const init=()=>{
    nodes=[];
    const base=Math.max(34,(w*h)/62000);
    for(let i=0;i<base;i++) nodes.push({x:rnd(0,w),y:rnd(0,h),vx:rnd(-MAX,MAX),vy:rnd(-MAX,MAX),r:rnd(1.2,2.4),g:Math.random()<GLYPH});
  };
  const glyph=(x,y,s,rot,col)=>{
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.globalAlpha=.7;
    ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.9,s);ctx.lineTo(-s*.9,s);ctx.closePath();ctx.stroke();
    ctx.restore();ctx.globalAlpha=1;
  };
  const step=(t=0)=>{
    ctx.clearRect(0,0,w,h);
    const lc=cssVar('--dots-line')||'rgba(0,255,213,0.18)';
    const nc=cssVar('--dots-node')||'rgba(233,255,251,0.85)';
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<nodes.length;i++){
      const a=nodes[i];
      for(let j=i+1;j<nodes.length;j++){
        const b=nodes[j];
        const dx=a.x-b.x,dy=a.y-b.y;
        const d=Math.hypot(dx,dy);
        if(d<LINK){
          const alpha=(1-d/LINK)*.9;
          ctx.strokeStyle=lc;ctx.lineWidth=1;ctx.globalAlpha=alpha;
          const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,bend=.1;
          const cx=mx+(-dy*bend),cy=my+(dx*bend);
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,cy,b.x,b.y);ctx.stroke();
          ctx.globalAlpha=1;
        }
      }
    }
    for(const n of nodes){
      ctx.fillStyle=nc;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fill();
      if(n.g){const rot=t/3200+(n.x+n.y)/900;glyph(n.x,n.y,6,rot,'rgba(189,228,255,0.55)');}
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<-20||n.x>w+20) n.vx*=-1;
      if(n.y<-20||n.y>h+20) n.vy*=-1;
    }
    ctx.restore();
  };
  resize();init();
  if(!reduced){(function loop(ts){step(ts);requestAnimationFrame(loop)})(0);} else step(0);
  addEventListener('resize',()=>{resize();init();});
})();

// ====== Global ESC close ======
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(menuDrawer?.classList.contains('open')) closeDrawer();
  ['topicModal','profileModal','rangosModal','characterModal','postModal','dmModal'].forEach(id=>{
    const m=document.getElementById(id);
    if(m?.classList.contains('open')) closeModal(id);
  });
});

// ====== Close buttons (bind once) ======
(function bindModalClosersOnce(){
  const bind = (closeBtnId, backdropId, modalId) => {
    document.getElementById(closeBtnId)?.addEventListener('click', () => closeModal(modalId));
    document.getElementById(backdropId)?.addEventListener('click', () => closeModal(modalId));
  };

  bind('profileClose', 'profileBackdrop', 'profileModal'); // ✅ PERFIL
  bind('topicClose', 'topicBackdrop', 'topicModal');       // (opcional) tema
  bind('rangosClose', 'rangosBackdrop', 'rangosModal');    // (opcional) rangos
  bind('characterClose', 'characterBackdrop', 'characterModal'); // (opcional) personaje
})();

// ====== Boot ======
function boot(){
  renderSocial();
  resolvePersistedWallet();
  initForum();
}

boot();

fetch('assets/data/site.v3.json').then(r=>r.json()).then(s=>{
  SITE=s;
  setupAvatar();
  setupBuy();
  setupPubkey();
  setupPoapAll();
  // refresh role if wallet loaded
  if(DID.connected && DID.address) DID.role=resolveRole(DID.address);
  syncWalletUI();
  renderDidCard();
  initForum();
}).catch(()=>{
  // still functional without site config
  initForum();
});
