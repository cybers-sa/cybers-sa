const dec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const txt = b => new TextDecoder().decode(b);
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Strict-Transport-Security': 'max-age=31536000' };
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
  await addCols(db, 'events', { desc_ar: '', desc_en: '', delivery: 'live', show_ended: ['INTEGER', '0'], place: '' });
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
let orgReady = false;
async function ensureOrg(db) { if (orgReady) return; await db.prepare(ORG_SQL).run(); await addCols(db, 'organizers', { og: '' }); orgReady = true; }
const OGJ = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/, ogOk = l => typeof l === 'string' && l.length <= 250000 && OGJ.test(l);
async function saveLogo(db, name, logo, og) {
  name = orgKey(name);
  if (!name || !logo) return;
  await ensureOrg(db);
  await db.prepare('INSERT INTO organizers(name,logo,og,updated) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET logo=excluded.logo, og=excluded.og, updated=excluded.updated')
    .bind(name, logo, ogOk(og) ? og : '', Date.now()).run();
}
async function logoImg(env, id, og) {
  try {
    await ensureOrg(env.DB);
    const r = await env.DB.prepare('SELECT logo, og FROM organizers WHERE id=?').bind(id).first();
    const m = r && (og && ogOk(r.og) ? r.og.match(/^data:(image\/\w+);base64,(.*)$/) : logoOk(r.logo) && r.logo.match(/^data:(image\/\w+);base64,(.*)$/));
    if (!m) return new Response('Not found', { status: 404 });
    const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}

async function publicEvents(env) {
  await ensureOrg(env.DB);
  await migrate(env.DB);
  const r = await env.DB.prepare("SELECT e.*, o.id oid, o.updated ou, (o.logo IS NOT NULL AND o.logo!='') hl FROM events e LEFT JOIN organizers o ON o.name=trim(CASE WHEN instr(e.org,'|')>0 THEN substr(e.org,1,instr(e.org,'|')-1) ELSE e.org END) WHERE e.published=1").all();
  const out = r.results.map(e => ({
    id: e.id, type: e.type, title: { ar: e.title_ar, en: e.title_en || e.title_ar },
    city: e.city, place: e.place || '', mode: e.mode, delivery: e.delivery || 'live', start: e.start_date || '', end: e.end_date || '',
    deadline: e.deadline, org: e.org, link: e.link, closed: !!e.closed, keep: Number(e.show_ended) === 1,
    desc: { ar: e.desc_ar || '', en: e.desc_en || e.desc_ar || '' },
    logo: e.hl ? '/api/logo/' + e.oid + '?v=' + e.ou : ''
  }));
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

// ---------- الفعاليات (للأدمن) ----------
const cols = ['type','title_ar','title_en','desc_ar','desc_en','city','mode','delivery','start_date','end_date','deadline','org','link','closed','published','show_ended','place'];
const dOk = s => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && +s.slice(0, 4) >= 2020 && +s.slice(0, 4) <= 2100);
const datesBad = (a, b, c) => !dOk(a) || !dOk(b) || !dOk(c) || (a && b && b < a);
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
      if (datesBad(String(b.start_date || '').trim(), String(b.end_date || '').trim(), String(b.deadline || '').trim())) return j({ error: 'dates' }, 400);
      const v = clean(b);
      if (m === 'POST') await db.prepare(`INSERT INTO events(${cols}) VALUES(${cols.map(() => '?')})`).bind(...v).run();
      else await db.prepare(`UPDATE events SET ${cols.map(c => c + '=?')} WHERE id=?`).bind(...v, id).run();
      if (b.org_logo) await saveLogo(db, b.org, b.org_logo, b.org_og);
      return j({ ok: 1 }, m === 'POST' ? 201 : 200);
    }
    if (m === 'DELETE' && id) { await db.prepare('DELETE FROM events WHERE id=?').bind(id).run(); return j({ ok: 1 }); }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

// ---------- طلبات "أرسل فعاليتك" ----------
async function adminOrgs(request, env, id) {
  await ensureOrg(env.DB);
  if (request.method === 'PUT' && /^\d+$/.test(id || '')) {
    const b = await request.json().catch(() => ({}));
    if (!ogOk(b.og)) return j({ error: 'bad' }, 400);
    await env.DB.prepare('UPDATE organizers SET og=? WHERE id=?').bind(b.og, id).run();
    return j({ ok: 1 });
  }
  return j((await env.DB.prepare("SELECT id,name,updated,(logo IS NOT NULL AND logo!='') hl, (og IS NOT NULL AND og!='') ho FROM organizers ORDER BY name").all()).results);
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
  if (!b.consent) return j({ error: 'consent' }, 400);
  if (Date.now() - Number(b.t || 0) < 3000) return j({ error: 'fast' }, 429);
  const v = k => String(b[k] ?? '').trim().slice(0, 300);
  const dv = ['self', 'cont'].includes(v('delivery')) ? v('delivery') : 'live';
  if (!v('title_ar') || !v('org') || !v('contact') || (dv === 'live' && !DATE.test(v('start_date')) && !DATE.test(v('deadline'))) || (dv === 'self' && !DATE.test(v('end_date'))) || (v('start_date') && !DATE.test(v('start_date'))) || !/^https?:\/\//i.test(v('link'))
    || !TYPES.includes(v('type')) || !CITIES.includes(v('city')) || !MODES.includes(v('mode'))
    || (v('end_date') && !DATE.test(v('end_date'))) || (v('deadline') && !DATE.test(v('deadline'))) || datesBad(v('start_date'), v('end_date'), v('deadline'))) return j({ error: 'invalid' }, 400);
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
async function ogLogo(env, org, origin) {
  try {
    const n = String(org || '').split('|')[0].trim(); if (!n) return '';
    await ensureOrg(env.DB);
    const o = await env.DB.prepare("SELECT id,updated FROM organizers WHERE name=? AND logo IS NOT NULL AND logo!=''").bind(n).first();
    return o ? origin + '/api/logo/' + o.id + '?og=1&v=' + o.updated : '';
  } catch { return ''; }
}
const ogImg = (html, img) => img ? html.replace(/<meta property="og:image" content="[^"]*">/, () => `<meta property="og:image" content="${attr(img)}">`).replace(/<meta name="twitter:image" content="[^"]*">/, () => `<meta name="twitter:image" content="${attr(img)}">`) : html;
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
      html = ogImg(html, await ogLogo(env, e.org, url.origin));
    }
  } catch {}
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...SEC } });
}

// ---------- الوظائف وطلبات التقديم ----------
const JOB_SQL = "CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, title_ar TEXT, title_en TEXT, org TEXT, city TEXT, mode TEXT, kind TEXT, desc_ar TEXT, desc_en TEXT, questions TEXT DEFAULT '[]', deadline TEXT DEFAULT '', closed INTEGER DEFAULT 0, published INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)";
const APP_SQL = "CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER, job_title TEXT, name TEXT, email TEXT, phone TEXT, linkedin TEXT, years REAL, answers TEXT DEFAULT '[]', cv_name TEXT, cv_type TEXT, cv_size INTEGER, status TEXT DEFAULT 'new', note TEXT DEFAULT '', ip_hash TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)";
const CV_SQL = "CREATE TABLE IF NOT EXISTS cv_chunks (app_id INTEGER, n INTEGER, data TEXT, PRIMARY KEY(app_id, n))";
const KINDS = ['full', 'part', 'intern', 'tte', 'contract'], JMODES = ['onsite', 'online'], ASTAT = ['new', 'good', 'maybe', 'no'];
const MAXCV = 4 * 1024 * 1024, CH = 450000;
let jobsReady = false;
async function ensureJobs(db) {
  if (jobsReady) return;
  for (const q of [JOB_SQL, APP_SQL, CV_SQL]) await db.prepare(q).run();
  await ensureOrg(db);
  await addCols(db, 'jobs', { exp: '', place: '', link: '', max_apps: ['INTEGER', 0] });
  jobsReady = true;
}
const jq = s => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const todayRiyadh = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

async function publicJobs(env) {
  await ensureJobs(env.DB);
  const r = await env.DB.prepare("SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) n, o.id oid, o.updated ou, (o.logo IS NOT NULL AND o.logo!='') hl FROM jobs j LEFT JOIN organizers o ON o.name=trim(CASE WHEN instr(j.org,'|')>0 THEN substr(j.org,1,instr(j.org,'|')-1) ELSE j.org END) WHERE j.published=1 AND (j.deadline IS NULL OR j.deadline='' OR j.deadline>=?) ORDER BY j.id DESC").bind(todayRiyadh()).all();
  return Response.json(r.results.map(e => ({
    id: e.id, title: { ar: e.title_ar, en: e.title_en || e.title_ar }, org: e.org, city: e.city, place: e.place || '', mode: e.mode === 'online' ? 'online' : 'onsite', kind: e.kind,
    deadline: e.deadline || '', closed: !!e.closed || (Number(e.max_apps) > 0 && e.n >= Number(e.max_apps)), exp: e.exp || '', created: e.created_at || '', ref: 'CYB-' + String(e.created_at || '').slice(0, 4) + '-' + String(e.id).padStart(3, '0'), desc: { ar: e.desc_ar || '', en: e.desc_en || e.desc_ar || '' }, q: jq(e.questions),
    logo: e.hl ? '/api/logo/' + e.oid + '?v=' + e.ou : '', link: /^https?:\/\//i.test(e.link || '') ? e.link : ''
  })), { headers: { 'Cache-Control': 'no-store' } });
}

async function apply(request, env) {
  if (Number(request.headers.get('content-length') || 0) > MAXCV + 200000) return j({ error: 'size' }, 413);
  let f; try { f = await request.formData(); } catch { return j({ error: 'bad' }, 400); }
  if (f.get('website')) return j({ ok: 1 });                       // فخ للروبوتات
  if (f.get('consent') !== '1') return j({ error: 'consent' }, 400);
  if (Date.now() - Number(f.get('t') || 0) < 4000) return j({ error: 'fast' }, 429);
  const v = (k, n = 200) => String(f.get(k) ?? '').trim().slice(0, n);
  const years = Number(v('years')), cv = f.get('cv');
  if (v('name').length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email')) || !(years >= 0 && years <= 60) || v('years') === ''
    || !/^[0-9+\s()-]{6,20}$/.test(v('phone')) || (v('linkedin') && !/^https?:\/\//i.test(v('linkedin')))
    || !cv || typeof cv === 'string') return j({ error: 'invalid' }, 400);
  if (!cv.size || cv.size > MAXCV) return j({ error: 'file' }, 400);
  const buf = new Uint8Array(await cv.arrayBuffer());
  const sig = a => a.every((x, i) => buf[i] === x);
  const ext = (String(cv.name).split('.').pop() || '').toLowerCase();
  const ct = ext === 'pdf' && sig([0x25, 0x50, 0x44, 0x46]) ? 'application/pdf'
    : ext === 'docx' && sig([0x50, 0x4b, 3, 4]) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : ext === 'doc' && sig([0xd0, 0xcf, 0x11, 0xe0]) ? 'application/msword' : '';
  if (!ct) return j({ error: 'file' }, 400);
  const db = env.DB;
  try {
    await ensureJobs(db);
    const job = await db.prepare('SELECT * FROM jobs WHERE id=? AND published=1').bind(v('job_id', 20)).first();
    if (!job) return j({ error: 'nojob' }, 404);
    if (job.link) return j({ error: 'external' }, 409);
    if (job.closed || (job.deadline && job.deadline < todayRiyadh())) return j({ error: 'closed' }, 409);
    if (Number(job.max_apps) > 0 && (await db.prepare('SELECT COUNT(*) c FROM applications WHERE job_id=?').bind(job.id).first()).c >= Number(job.max_apps)) return j({ error: 'closed' }, 409);
    const qs = jq(job.questions);
    let ans; try { ans = JSON.parse(v('answers', 500) || '[]'); } catch { ans = null; }
    if (!Array.isArray(ans) || ans.length !== qs.length || ans.some(a => a !== 'y' && a !== 'n')) return j({ error: 'invalid' }, 400);
    if (await db.prepare('SELECT id FROM applications WHERE job_id=? AND lower(email)=lower(?)').bind(job.id, v('email')).first()) return j({ error: 'dup' }, 409);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.POLICY_AUD || ''))))].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
    const recent = await db.prepare("SELECT COUNT(*) c FROM applications WHERE ip_hash=? AND created_at>datetime('now','-1 hour')").bind(h).first();
    if (recent.c >= 5) return j({ error: 'limit' }, 429);
    const cvName = String(cv.name).replace(/[\r\n]/g, ' ').slice(0, 120);
    const r = await db.prepare('INSERT INTO applications(job_id,job_title,name,email,phone,linkedin,years,answers,cv_name,cv_type,cv_size,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(job.id, job.title_ar, v('name', 100), v('email'), v('phone', 20), v('linkedin'), years, JSON.stringify(qs.map((q, i) => ({ q, a: ans[i] }))), cvName, ct, buf.length, h).run();
    const id = r.meta.last_row_id;
    try {
      for (let i = 0, n = 0; i < buf.length; i += CH, n++)
        await db.prepare('INSERT INTO cv_chunks(app_id,n,data) VALUES(?,?,?)').bind(id, n, b64(buf.subarray(i, i + CH))).run();
    } catch {
      await db.prepare('DELETE FROM cv_chunks WHERE app_id=?').bind(id).run();
      await db.prepare('DELETE FROM applications WHERE id=?').bind(id).run();
      return j({ error: 'server' }, 500);
    }
    return j({ ok: 1 }, 201);
  } catch { return j({ error: 'server' }, 500); }
}

// ---------- الوظائف (للأدمن) ----------
function jclean(b) {
  const s = (k, n = 300) => String(b[k] ?? '').trim().slice(0, n);
  const qs = (Array.isArray(b.questions) ? b.questions : []).map(x => String(x).trim().slice(0, 250)).filter(Boolean).slice(0, 10);
  return [s('title_ar'), s('title_en'), s('org'), CITIES.concat('x').includes(b.city) ? b.city : 'r', JMODES.includes(b.mode) ? b.mode : 'onsite',
    KINDS.includes(b.kind) ? b.kind : 'full', s('desc_ar', 3000), s('desc_en', 3000), JSON.stringify(qs), DATE.test(s('deadline')) ? s('deadline') : '', b.closed ? 1 : 0, b.published ? 1 : 0, s('exp', 20), s('place', 150), /^https?:\/\//i.test(s('link')) ? s('link') : '', Math.min(100000, Math.max(0, parseInt(b.max_apps) || 0))];
}
const JC = 'title_ar,title_en,org,city,mode,kind,desc_ar,desc_en,questions,deadline,closed,published,exp,place,link,max_apps'.split(',');
async function adminJobs(request, env, id) {
  const m = request.method, db = env.DB;
  try {
    await ensureJobs(db);
    if (m === 'GET') return j((await db.prepare('SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) n FROM jobs j ORDER BY j.id DESC').all()).results.map(r => ({ ...r, max_apps: Number(r.max_apps) || 0, questions: jq(r.questions) })));
    if (m === 'POST' || (m === 'PUT' && id)) {
      const b = await request.json();
      if (!String(b.title_ar || '').trim()) return j({ error: 'title' }, 400);
      if (!dOk(String(b.deadline || '').trim())) return j({ error: 'dates' }, 400);
      if (b.org_logo && !logoOk(b.org_logo)) return j({ error: 'logo' }, 400);
      const v = jclean(b);
      if (m === 'POST') await db.prepare(`INSERT INTO jobs(${JC}) VALUES(${JC.map(() => '?')})`).bind(...v).run();
      else await db.prepare(`UPDATE jobs SET ${JC.map(c => c + '=?')} WHERE id=?`).bind(...v, id).run();
      if (b.org_logo) await saveLogo(db, b.org, b.org_logo, b.org_og);
      return j({ ok: 1 }, m === 'POST' ? 201 : 200);
    }
    if (m === 'DELETE' && id) { await db.prepare('DELETE FROM jobs WHERE id=?').bind(id).run(); return j({ ok: 1 }); }   // الطلبات والسير تبقى في البنك
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

async function adminApps(request, env, id) {
  const m = request.method, db = env.DB;
  try {
    await ensureJobs(db);
    if (m === 'GET') return j((await db.prepare('SELECT id,job_id,job_title,name,email,phone,linkedin,years,answers,cv_name,cv_size,status,note,created_at FROM applications ORDER BY id DESC').all()).results.map(r => ({ ...r, answers: (() => { try { return JSON.parse(r.answers || '[]'); } catch { return []; } })() })));
    if (m === 'PUT' && id) {
      const b = await request.json();
      if (!ASTAT.includes(b.status)) return j({ error: 'bad' }, 400);
      await db.prepare('UPDATE applications SET status=?, note=? WHERE id=?').bind(b.status, String(b.note ?? '').slice(0, 500), id).run();
      return j({ ok: 1 });
    }
    if (m === 'POST' && id === 'bulk') {       // حذف مجموعة طلبات وسيرها
      const ids = ((await request.json()).ids || []).map(Number).filter(Number.isInteger).slice(0, 1000);
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50), q = part.map(() => '?').join(',');
        await db.prepare(`DELETE FROM cv_chunks WHERE app_id IN (${q})`).bind(...part).run();
        await db.prepare(`DELETE FROM applications WHERE id IN (${q})`).bind(...part).run();
      }
      return j({ ok: 1, n: ids.length });
    }
    if (m === 'DELETE' && id) {
      await db.prepare('DELETE FROM cv_chunks WHERE app_id=?').bind(id).run();
      await db.prepare('DELETE FROM applications WHERE id=?').bind(id).run();
      return j({ ok: 1 });
    }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

async function adminCv(env, id, view) {
  try {
    await ensureJobs(env.DB);
    const a = await env.DB.prepare('SELECT name,cv_name,cv_type FROM applications WHERE id=?').bind(id).first();
    if (!a) return new Response('Not found', { status: 404 });
    const rows = (await env.DB.prepare('SELECT data FROM cv_chunks WHERE app_id=? ORDER BY n').bind(id).all()).results;
    const parts = rows.map(r => Uint8Array.from(atob(r.data), c => c.charCodeAt(0)));
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    const ext = (a.cv_name.split('.').pop() || 'pdf').replace(/[^a-z]/gi, '');
    return new Response(out, { headers: { 'Content-Type': a.cv_type, 'Content-Disposition': (view && a.cv_type === 'application/pdf' ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(a.name + ' CV.' + ext), 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox', 'Cache-Control': 'no-store' } });
  } catch { return new Response('Error', { status: 500 }); }
}

// صفحة رابط الوظيفة /j/ID
async function jobPage(request, env, id) {
  const url = new URL(request.url);
  let html = await (await env.ASSETS.fetch(new Request(url.origin + '/'))).text();
  try {
    await ensureJobs(env.DB);
    const e = await env.DB.prepare('SELECT * FROM jobs WHERE id=? AND published=1').bind(id).first();
    if (e) {
      const title = attr(e.title_ar + (e.title_en ? ' | ' + e.title_en : '') + ' | سايبرز');
      const desc = attr((e.desc_ar || e.org || e.title_ar).replace(/\s+/g, ' ').slice(0, 160));
      const page = attr(url.origin + '/j/' + e.id);
      html = html.replace(/<title>.*?<\/title>/s, () => `<title>${title}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${desc}">`)
        .replace(/<meta property="og:title" content="[^"]*">/, () => `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, () => `<meta property="og:description" content="${desc}">`)
        .replace(/<meta property="og:url" content="[^"]*">/, () => `<meta property="og:url" content="${page}">`)
        .replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${page}">`);
      html = ogImg(html, await ogLogo(env, e.org, url.origin));
    }
  } catch {}
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...SEC } });
}

// ---------- إحصائيات مجهولة (بدون كوكيز ولا بيانات شخصية) ----------
const STAT_SQL = ["CREATE TABLE IF NOT EXISTS stats (day TEXT, kind TEXT, key TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(day, kind, key))", "CREATE TABLE IF NOT EXISTS seen (day TEXT, h TEXT, PRIMARY KEY(day, h))"];
let statsReady = false;
async function ensureStats(db) { if (statsReady) return; for (const q of STAT_SQL) await db.prepare(q).run(); statsReady = true; }
const SK = ['v', 'ev', 'reg', 'sh', 'jo', 'ja', 'jx', 's'];
const bump = (db, day, kind, key) => db.prepare('INSERT INTO stats(day,kind,key,n) VALUES(?,?,?,1) ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1').bind(day, kind, key).run();
async function track(request, env) {
  const ok = () => new Response(null, { status: 204 });
  if (Number(request.headers.get('content-length') || 0) > 400) return ok();
  const ua = request.headers.get('user-agent') || '';
  if (/bot|crawl|spider|slurp|preview|headless|monitor/i.test(ua)) return ok();
  let b; try { b = await request.json(); } catch { return ok(); }
  const k = String(b.k || ''); let key = String(b.key ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
  if (!SK.includes(k)) return ok();
  if (['ev', 'reg', 'jo', 'ja', 'jx'].includes(k) && !/^\d{1,9}$/.test(key)) return ok();
  if (k === 'sh' && !/^[ej]:\d{1,9}$/.test(key)) return ok();
  if (k === 's') { key = key.toLowerCase(); if (key.length < 2) return ok(); }
  if (k === 'v') key = '';
  try {
    const db = env.DB, day = todayRiyadh();
    await ensureStats(db);
    if (k === 's' && !(await db.prepare("SELECT 1 x FROM stats WHERE day=? AND kind='s' AND key=?").bind(day, key).first())) {
      const c = await db.prepare("SELECT COUNT(*) c FROM stats WHERE day=? AND kind='s'").bind(day).first();
      if (c.c >= 300) return ok();
    }
    await bump(db, day, k, key);
    if (k === 'v') {                                     // زائر فريد لليوم: قيمة مشفّرة تتغير يوميًا
      const ip = request.headers.get('CF-Connecting-IP') || '';
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + ua + day + (env.POLICY_AUD || ''))))].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
      const r = await db.prepare('INSERT OR IGNORE INTO seen(day,h) VALUES(?,?)').bind(day, h).run();
      if (r.meta.changes === 1) await bump(db, day, 'u', '');
      if (Math.random() < 0.02) await db.prepare('DELETE FROM seen WHERE day<?').bind(new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)).run();
    }
  } catch {}
  return ok();
}
async function adminStats(request, env) {
  const db = env.DB;
  try {
    await ensureStats(db); await ensureJobs(db); await migrate(db);
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30));
    const now = Date.now() + 3 * 3600e3, from = new Date(now - (days - 1) * 864e5).toISOString().slice(0, 10);
    const rows = (await db.prepare('SELECT day,kind,key,n FROM stats WHERE day>=?').bind(from).all()).results;
    const totals = {}, per = {}, tops = {};
    for (const r of rows) {
      totals[r.kind] = (totals[r.kind] || 0) + r.n;
      if (r.kind === 'v' || r.kind === 'u') (per[r.day] = per[r.day] || {})[r.kind] = r.n;
      else ((tops[r.kind] = tops[r.kind] || {})[r.key] = (tops[r.kind][r.key] || 0) + r.n);
    }
    const series = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(now - i * 864e5).toISOString().slice(0, 10); series.push({ day: d, v: (per[d] || {}).v || 0, u: (per[d] || {}).u || 0 }); }
    const ev = Object.fromEntries((await db.prepare('SELECT id,title_ar FROM events').all()).results.map(r => [r.id, r.title_ar]));
    const jb = Object.fromEntries((await db.prepare('SELECT id,title_ar FROM jobs').all()).results.map(r => [r.id, r.title_ar]));
    const nm = (k, key) => k === 's' ? key : k === 'sh' ? ((key[0] === 'e' ? ev : jb)[key.slice(2)] || key) : (['jo', 'ja', 'jx'].includes(k) ? jb : ev)[key] || ('#' + key);
    const top = {};
    for (const k of Object.keys(tops)) top[k] = Object.entries(tops[k]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([key, n]) => ({ key, n, title: nm(k, key) }));
    const apps = (await db.prepare('SELECT COUNT(*) c FROM applications WHERE substr(created_at,1,10)>=?').bind(from).first()).c;
    const all = {}; for (const r of (await db.prepare("SELECT kind, SUM(n) n FROM stats WHERE kind IN ('v','u') GROUP BY kind").all()).results) all[r.kind] = r.n;
    const first = (await db.prepare("SELECT MIN(day) d FROM stats").first()) || {};
    return j({ days, series, totals, top, apps, all, since: first.d || '' });
  } catch { return j({ error: 'server' }, 500); }
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname, m = request.method;
    if (p === '/api/events' && m === 'GET') return publicEvents(env);
    if (m === 'GET' && /^\/e\/\d+$/.test(p)) return eventPage(request, env, p.split('/')[2]);
    if (m === 'GET' && /^\/j\/\d+$/.test(p)) return jobPage(request, env, p.split('/')[2]);
    if (p === '/api/submit' && m === 'POST') return submit(request, env);
    if (p === '/api/t' && m === 'POST') return track(request, env);
    if (p === '/api/jobs' && m === 'GET') return publicJobs(env);
    if (p === '/api/apply' && m === 'POST') return apply(request, env);
    if (p.startsWith('/api/logo/') && m === 'GET') return logoImg(env, p.split('/')[3], new URL(request.url).searchParams.get('og') === '1');
    if (p.startsWith('/api/admin/')) {
      const deny = await auth(request, env);
      if (deny) return deny;
      const seg = p.split('/');
      if (seg[3] === 'events') return admin(request, env, seg[4]);
      if (seg[3] === 'organizers') return adminOrgs(request, env, seg[4]);
      if (seg[3] === 'stats') return adminStats(request, env);
      if (seg[3] === 'jobs') return adminJobs(request, env, seg[4]);
      if (seg[3] === 'apps') return adminApps(request, env, seg[4]);
      if (seg[3] === 'cv' && seg[4]) return adminCv(env, seg[4], new URL(request.url).searchParams.get('view'));
      if (seg[3] === 'submissions') return adminSubs(request, env, seg.slice(4));
    }
    return env.ASSETS.fetch(request);
  }
};
