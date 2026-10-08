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

async function publicEvents(env) {
  const r = await env.DB.prepare('SELECT * FROM events WHERE published=1').all();
  const out = r.results.map(e => ({
    id: e.id, type: e.type, title: { ar: e.title_ar, en: e.title_en || e.title_ar },
    city: e.city, mode: e.mode, start: e.start_date, end: e.end_date,
    deadline: e.deadline, org: e.org, link: e.link, closed: !!e.closed
  }));
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

// ---------- الفعاليات (للأدمن) ----------
const cols = ['type','title_ar','title_en','city','mode','start_date','end_date','deadline','org','link','closed','published'];
const clean = b => cols.map(c => {
  if (c === 'closed' || c === 'published') return b[c] ? 1 : 0;
  let v = String(b[c] ?? '').trim().slice(0, 300);
  if (c === 'link' && v && !/^https?:\/\//i.test(v)) v = '';
  return v;
});
async function admin(request, env, id) {
  const m = request.method, db = env.DB;
  try {
    if (m === 'GET') return j((await db.prepare('SELECT * FROM events ORDER BY start_date').all()).results);
    if (m === 'POST') {
      const v = clean(await request.json());
      await db.prepare(`INSERT INTO events(${cols}) VALUES(${cols.map(() => '?')})`).bind(...v).run();
      return j({ ok: 1 }, 201);
    }
    if (m === 'PUT' && id) {
      const v = clean(await request.json());
      await db.prepare(`UPDATE events SET ${cols.map(c => c + '=?')} WHERE id=?`).bind(...v, id).run();
      return j({ ok: 1 });
    }
    if (m === 'DELETE' && id) { await db.prepare('DELETE FROM events WHERE id=?').bind(id).run(); return j({ ok: 1 }); }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

// ---------- طلبات "أرسل فعاليتك" ----------
const SUB_SQL = "CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, title_ar TEXT, title_en TEXT, city TEXT, mode TEXT, start_date TEXT, end_date TEXT, deadline TEXT, org TEXT, link TEXT, contact TEXT, notes TEXT, ip_hash TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)";
const TYPES = ['ev','bc','ws','pg'], CITIES = ['r','j','d','k','m','o'], MODES = ['onsite','online'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function submit(request, env) {
  if (Number(request.headers.get('content-length') || 0) > 10000) return j({ error: 'size' }, 413);
  let b; try { b = await request.json(); } catch { return j({ error: 'bad' }, 400); }
  if (b.website) return j({ ok: 1 });                        // فخ للروبوتات
  if (Date.now() - Number(b.t || 0) < 3000) return j({ error: 'fast' }, 429);
  const v = k => String(b[k] ?? '').trim().slice(0, 300);
  if (!v('title_ar') || !v('org') || !v('contact') || !DATE.test(v('start_date')) || !/^https?:\/\//i.test(v('link'))
    || !TYPES.includes(v('type')) || !CITIES.includes(v('city')) || !MODES.includes(v('mode'))
    || (v('end_date') && !DATE.test(v('end_date'))) || (v('deadline') && !DATE.test(v('deadline')))) return j({ error: 'invalid' }, 400);
  try {
    await env.DB.prepare(SUB_SQL).run();
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.POLICY_AUD || ''))))]
      .map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
    const recent = await env.DB.prepare("SELECT COUNT(*) c FROM submissions WHERE ip_hash=? AND created_at>datetime('now','-1 hour')").bind(h).first();
    if (recent.c >= 3) return j({ error: 'limit' }, 429);
    const pend = await env.DB.prepare("SELECT COUNT(*) c FROM submissions WHERE status='pending'").first();
    if (pend.c >= 300) return j({ error: 'busy' }, 503);
    await env.DB.prepare('INSERT INTO submissions(type,title_ar,title_en,city,mode,start_date,end_date,deadline,org,link,contact,notes,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(v('type'), v('title_ar'), v('title_en'), v('city'), v('mode'), v('start_date'), v('end_date'), v('deadline'), v('org'), v('link'), v('contact'), v('notes'), h).run();
    return j({ ok: 1 }, 201);
  } catch { return j({ error: 'server' }, 500); }
}

async function adminSubs(request, env, parts) {
  const [id, act] = parts, m = request.method, db = env.DB;
  try {
    await db.prepare(SUB_SQL).run();
    if (m === 'GET') return j((await db.prepare("SELECT id,type,title_ar,title_en,city,mode,start_date,end_date,deadline,org,link,contact,notes,created_at FROM submissions WHERE status='pending' ORDER BY id DESC").all()).results);
    if (m === 'POST' && id && act === 'approve') {
      const s = await db.prepare("SELECT * FROM submissions WHERE id=? AND status='pending'").bind(id).first();
      if (!s) return j({ error: 'not found' }, 404);
      await db.prepare('INSERT INTO events(type,title_ar,title_en,city,mode,start_date,end_date,deadline,org,link,closed,published) VALUES(?,?,?,?,?,?,?,?,?,?,0,1)')
        .bind(s.type, s.title_ar, s.title_en, s.city, s.mode, s.start_date, s.end_date, s.deadline, s.org, s.link).run();
      await db.prepare("UPDATE submissions SET status='approved' WHERE id=?").bind(id).run();
      return j({ ok: 1 });
    }
    if (m === 'DELETE' && id) { await db.prepare("UPDATE submissions SET status='rejected' WHERE id=?").bind(id).run(); return j({ ok: 1 }); }
  } catch { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname, m = request.method;
    if (p === '/api/events' && m === 'GET') return publicEvents(env);
    if (p === '/api/submit' && m === 'POST') return submit(request, env);
    if (p.startsWith('/api/admin/')) {
      const deny = await auth(request, env);
      if (deny) return deny;
      const seg = p.split('/');
      if (seg[3] === 'events') return admin(request, env, seg[4]);
      if (seg[3] === 'submissions') return adminSubs(request, env, seg.slice(4));
    }
    return env.ASSETS.fetch(request);
  }
};
