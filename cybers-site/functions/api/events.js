export async function onRequestGet({ env }) {
  const r = await env.DB.prepare('SELECT * FROM events WHERE published=1').all();
  const out = r.results.map(e => ({
    id: e.id, type: e.type, title: { ar: e.title_ar, en: e.title_en || e.title_ar },
    city: e.city, mode: e.mode, start: e.start_date, end: e.end_date,
    deadline: e.deadline, org: e.org, link: e.link, closed: !!e.closed
  }));
  return Response.json(out, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
