const dec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const txt = b => new TextDecoder().decode(b);
const j = (d, s = 200) => Response.json(d, { status: s });

// التحقق من توقيع Cloudflare Access (يرجع null إذا سُمح)
async function auth(request, env) {
  const deny = new Response('Unauthorized', { status: 401 });
  const t = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!t || !env.TEAM_DOMAIN || !env.POLICY_AUD) return deny;
  try {
    const [h, p, s] = t.split('.');
    const head = JSON.parse(txt(dec(h)));
    const certs = await (await fetch(`https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)).json();
    const jwk = certs.keys.find(k => k.kid === head.kid);
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, dec(s), new TextEncoder().encode(h + '.' + p));
    const pl = JSON.parse(txt(dec(p)));
    if (!ok || ![].concat(pl.aud).includes(env.POLICY_AUD) || pl.exp * 1000 < Date.now()) return deny;
  } catch { return deny; }
  return null;
}

// إضافة أعمدة الوصف تلقائيًا للجدول القديم (مرة واحدة)
async function addCols(db, table, map) {
  const have = (await db.prepare(`PRAGMA table_info(${table})`).all()).results.map(c => c.name);
  for (const [c, d] of Object.entries(map)) {
    const [ty, df] = Array.isArray(d) ? d : ['TEXT', d];
    if (!have.includes(c)) { try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${c} ${ty} DEFAULT '${df}'`).run(); } catch {} }
  }
}
let migrated = false, subMig = false;
async function migrate(db) {
  if (migrated) return;
  await addCols(db, 'events', { desc_ar: '', desc_en: '', delivery: 'live', show_ended: ['INTEGER', '0'] });
  // مرة واحدة: القيمة القديمة self كانت تعني «ذاتية مستمرة» فتتحول إلى cont
  await db.prepare('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)').run();
  if (!(await db.prepare("SELECT v FROM meta WHERE k='delivery_v2'").first())) {
    await db.prepare("UPDATE events SET delivery='cont' WHERE delivery='self'").run();
    try { await db.prepare("UPDATE submissions SET delivery='cont' WHERE delivery='self'").run(); } catch {}
    await db.prepare("INSERT INTO meta(k,v) VALUES('delivery_v2','1')").run();
  }
  migrated = true;
}

// ---------- شعارات الجهات (تُخزَّن مرة واحدة لكل اسم جهة) ----------
const ORG_SQL = "CREATE TABLE IF NOT EXISTS organizers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE COLLATE NOCASE, logo TEXT, updated INTEGER DEFAULT 0)";
const LOGO = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+\/=]+$/;
const logoOk = l => typeof l === 'string' && l.length <= 200000 && LOGO.test(l);
const orgKey = n => String(n || '').split('|')[0].trim().slice(0, 200);
async function saveLogo(db, name, logo) {
  name = orgKey(name);
  if (!name || !logo) return;
  await db.prepare(ORG_SQL).run();
  await db.prepare('INSERT INTO organizers(name,logo,updated) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET logo=excluded.logo, updated=excluded.updated')
    .bind(name, logo, Date.now()).run();
}
async function logoImg(env, id) {
  try {
    const r = await env.DB.prepare('SELECT logo FROM organizers WHERE id=?').bind(id).first();
    const m = r && logoOk(r.logo) && r.logo.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!m) return new Response('Not found', { status: 404 });
    const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}

async function publicEvents(env) {
  await env.DB.prepare(ORG_SQL).run();
  await migrate(env.DB);
  const r = await env.DB.prepare("SELECT e.*, o.id oid, o.updated ou, (o.logo IS NOT NULL AND o.logo!='') hl FROM events e LEFT JOIN organizers o ON o.name=trim(CASE WHEN instr(e.org,'|')>0 THEN substr(e.org,1,instr(e.org,'|')-1) ELSE e.org END) WHERE e.published=1").all();
  const out = r.results.map(e => ({
    id: e.id, type: e.type, title: { ar: e.title_ar, en: e.title_en || e.title_ar },
    city: e.city, mode: e.mode, delivery: e.delivery || 'live', start: e.start_date || '', end: e.end_date || '',
    deadline: e.deadline, org: e.org, link: e.link, closed: !!e.closed, keep: Number(e.show_ended) === 1,
    desc: { ar: e.desc_ar || '', en: e.desc_en || e.desc_ar || '' },
    logo: e.hl ? '/api/logo/' + e.oid + '?v=' + e.ou : ''
  }));
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

// ---------- الفعاليات (للأدمن) ----------
const cols = ['type','title_ar','title_en','desc_ar','desc_en','city','mode','delivery','start_date','end_date','deadline','org','link','closed','published','show_ended'];
const clean = b => cols.map(c => {
  if (c === 'delivery') return ['self', 'cont'].includes(b[c]) ? b[c] : 'live';
  if (c === 'closed' || c === 'published' || c === 'show_ended') return b[c] ? 1 : 0;
  let v = String(b[c] ?? '').trim().slice(0, c.startsWith('desc_') ? 1500 : 300);
  if (c === 'link' && v && !/^https?:\/\//i.test(v)) v = '';
  return v;
});
async function admin(request, env, id) {
  const m = request.method, db = env.DB;
  try {
    await migrate(db);
    if (m === 'GET') return j((await db.prepare('SELECT * FROM events ORDER BY start_date').all()).results);
    if (m === 'POST' || (m === 'PUT' && id)) {
      const b = await request.json();
      if (b.org_logo && !logoOk(b.org_logo)) return j({ error: 'logo' }, 400);
      const v = clean(b);
      if (m === 'POST') await db.prepare(`INSERT INTO events(${cols}) VALUES(${cols.map(() => '?')})`).bind(...v).run();
      else await db.prepare(`UPDATE events SET ${cols.map(c => c + '=?')} WHERE id=?`).bind(...v, id).run();
      if (b.org_logo) await saveLogo(db, b.org, b.org_logo);
      return j({ ok: 1 }, m === 'POST' ? 201 : 200);
    }
    if (m === 'DELETE' && id) { await db.prepare('DELETE FROM events WHERE id=?').bind(id).run(); return j({ ok: 1 }); }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

// ---------- طلبات "أرسل فعاليتك" ----------
async function adminOrgs(env) {
  await env.DB.prepare(ORG_SQL).run();
  return j((await env.DB.prepare("SELECT id,name,updated,(logo IS NOT NULL AND logo!='') hl FROM organizers ORDER BY name").all()).results);
}

const SUB_SQL = "CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, title_ar TEXT, title_en TEXT, city TEXT, mode TEXT, delivery TEXT DEFAULT 'live', start_date TEXT, end_date TEXT, deadline TEXT, org TEXT, link TEXT, contact TEXT, notes TEXT, ip_hash TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)";
const TYPES = ['ev','bc','cr','ws','pg'], CITIES = ['r','j','d','k','m','o'], MODES = ['onsite','online'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function ensureSub(db) {
  await db.prepare(SUB_SQL).run();
  if (!subMig) { await addCols(db, 'submissions', { delivery: 'live' }); subMig = true; }
}

async function submit(request, env) {
  if (Number(request.headers.get('content-length') || 0) > 10000) return j({ error: 'size' }, 413);
  let b; try { b = await request.json(); } catch { return j({ error: 'bad' }, 400); }
  if (b.website) return j({ ok: 1 });                        // فخ للروبوتات
  if (Date.now() - Number(b.t || 0) < 3000) return j({ error: 'fast' }, 429);
  const v = k => String(b[k] ?? '').trim().slice(0, 300);
  const dv = ['self', 'cont'].includes(v('delivery')) ? v('delivery') : 'live';
  if (!v('title_ar') || !v('org') || !v('contact') || (dv === 'live' && !DATE.test(v('start_date'))) || (dv === 'self' && !DATE.test(v('end_date'))) || (v('start_date') && !DATE.test(v('start_date'))) || !/^https?:\/\//i.test(v('link'))
    || !TYPES.includes(v('type')) || !CITIES.includes(v('city')) || !MODES.includes(v('mode'))
    || (v('end_date') && !DATE.test(v('end_date'))) || (v('deadline') && !DATE.test(v('deadline')))) return j({ error: 'invalid' }, 400);
  try {
    await ensureSub(env.DB);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.POLICY_AUD || ''))))]
      .map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
    const recent = await env.DB.prepare("SELECT COUNT(*) c FROM submissions WHERE ip_hash=? AND created_at>datetime('now','-1 hour')").bind(h).first();
    if (recent.c >= 3) return j({ error: 'limit' }, 429);
    const pend = await env.DB.prepare("SELECT COUNT(*) c FROM submissions WHERE status='pending'").first();
    if (pend.c >= 300) return j({ error: 'busy' }, 503);
    await env.DB.prepare('INSERT INTO submissions(type,title_ar,title_en,city,mode,delivery,start_date,end_date,deadline,org,link,contact,notes,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(v('type'), v('title_ar'), v('title_en'), v('city'), v('mode'), dv, dv === 'live' ? v('start_date') : '', dv === 'cont' ? '' : v('end_date'), dv === 'cont' ? '' : v('deadline'), v('org'), v('link'), v('contact'), v('notes'), h).run();
    return j({ ok: 1 }, 201);
  } catch { return j({ error: 'server' }, 500); }
}

async function adminSubs(request, env, parts) {
  const [id, act] = parts, m = request.method, db = env.DB;
  try {
    await ensureSub(db);
    await migrate(db);
    if (m === 'GET') return j((await db.prepare("SELECT id,type,title_ar,title_en,city,mode,delivery,start_date,end_date,deadline,org,link,contact,notes,created_at FROM submissions WHERE status='pending' ORDER BY id DESC").all()).results);
    if (m === 'POST' && id && act === 'approve') {
      const s = await db.prepare("SELECT * FROM submissions WHERE id=? AND status='pending'").bind(id).first();
      if (!s) return j({ error: 'not found' }, 404);
      await db.prepare('INSERT INTO events(type,title_ar,title_en,city,mode,delivery,start_date,end_date,deadline,org,link,closed,published) VALUES(?,?,?,?,?,?,?,?,?,?,?,0,1)')
        .bind(s.type, s.title_ar, s.title_en, s.city, s.mode, s.delivery || 'live', s.start_date, s.end_date, s.deadline, s.org, s.link).run();
      await db.prepare("UPDATE submissions SET status='approved' WHERE id=?").bind(id).run();
      return j({ ok: 1 });
    }
    if (m === 'DELETE' && id) { await db.prepare("UPDATE submissions SET status='rejected' WHERE id=?").bind(id).run(); return j({ ok: 1 }); }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

// صفحة رابط الفعالية /e/ID: نفس الموقع مع عنوان ومعاينة مشاركة خاصة بالفعالية
const attr = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function eventPage(request, env, id) {
  const url = new URL(request.url);
  let html = await (await env.ASSETS.fetch(new Request(url.origin + '/'))).text();
  try {
    await migrate(env.DB);
    const e = await env.DB.prepare('SELECT * FROM events WHERE id=? AND published=1').bind(id).first();
    if (e) {
      const title = attr(e.title_ar + (e.title_en ? ' | ' + e.title_en : '') + ' | سايبرز');
      const desc = attr((e.desc_ar || [e.org, e.start_date].filter(Boolean).join(' · ') || e.title_ar).slice(0, 160));
      const page = attr(url.origin + '/e/' + e.id);
      html = html.replace(/<title>.*?<\/title>/s, () => `<title>${title}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${desc}">`)
        .replace(/<meta property="og:title" content="[^"]*">/, () => `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, () => `<meta property="og:description" content="${desc}">`)
        .replace(/<meta property="og:url" content="[^"]*">/, () => `<meta property="og:url" content="${page}">`)
        .replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${page}">`);
    }
  } catch {}
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname, m = request.method;
    if (p === '/api/events' && m === 'GET') return publicEvents(env);
    if (m === 'GET' && /^\/e\/\d+$/.test(p)) return eventPage(request, env, p.split('/')[2]);
    if (p === '/api/submit' && m === 'POST') return submit(request, env);
    if (p.startsWith('/api/logo/') && m === 'GET') return logoImg(env, p.split('/')[3]);
    if (p.startsWith('/api/admin/')) {
      const deny = await auth(request, env);
      if (deny) return deny;
      const seg = p.split('/');
      if (seg[3] === 'events') return admin(request, env, seg[4]);
      if (seg[3] === 'organizers') return adminOrgs(env);
      if (seg[3] === 'submissions') return adminSubs(request, env, seg.slice(4));
    }
    return env.ASSETS.fetch(request);
  }
};
