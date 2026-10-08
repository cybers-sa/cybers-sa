const cols = ['type','title_ar','title_en','city','mode','start_date','end_date','deadline','org','link','closed','published'];
const clean = b => cols.map(c => {
  if (c === 'closed' || c === 'published') return b[c] ? 1 : 0;
  let v = String(b[c] ?? '').trim().slice(0, 300);
  if (c === 'link' && v && !/^https?:\/\//i.test(v)) v = '';
  return v;
});
export async function onRequest({ request, env, params }) {
  const id = params.id && params.id[0], m = request.method, db = env.DB;
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
  } catch (e) { return j({ error: 'server' }, 500); }
  return j({ error: 'bad request' }, 400);
}
