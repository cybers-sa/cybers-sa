const dec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const txt = b => new TextDecoder().decode(b);

// التحقق من توقيع Cloudflare Access (يرجع null إذا سُمح)
// ملاحظة: رسائل السبب مؤقتة للتشخيص، ويمكن حذفها لاحقًا
async function auth(request, env) {
  const deny = r => new Response('Unauthorized: ' + r, { status: 401 });
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) return deny('no-env');
  const t = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!t) return deny('no-token');
  try {
    const [h, p, s] = t.split('.');
    const head = JSON.parse(txt(dec(h)));
    const certs = await (await fetch(`https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)).json();
    const jwk = certs.keys.find(k => k.kid === head.kid);
    if (!jwk) return deny('no-key');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, dec(s), new TextEncoder().encode(h + '.' + p));
    if (!ok) return deny('bad-signature');
    const pl = JSON.parse(txt(dec(p)));
    if (![].concat(pl.aud).includes(env.POLICY_AUD)) return deny('bad-aud');
    if (pl.exp * 1000 < Date.now()) return deny('expired');
  } catch { return deny('team-domain-error'); }
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

const cols = ['type','title_ar','title_en','city','mode','start_date','end_date','deadline','org','link','closed','published'];
const clean = b => cols.map(c => {
  if (c === 'closed' || c === 'published') return b[c] ? 1 : 0;
  let v = String(b[c] ?? '').trim().slice(0, 300);
  if (c === 'link' && v && !/^https?:\/\//i.test(v)) v = '';
  return v;
});

async function admin(request, env, id) {
  const m = request.method, db = env.DB;
  const j = (d, s = 200) => Response.json(d, { status: s });
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

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (p === '/api/events' && request.method === 'GET') return publicEvents(env);
    if (p === '/api/admin/events' || p.startsWith('/api/admin/events/')) {
      const deny = await auth(request, env);
      if (deny) return deny;
      return admin(request, env, p.split('/')[4]);
    }
    return env.ASSETS.fetch(request);
  }
};
