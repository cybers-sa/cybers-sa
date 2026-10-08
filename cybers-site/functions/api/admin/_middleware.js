// يتحقق من توقيع Cloudflare Access قبل أي عملية إدارة
const dec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function onRequest({ request, env, next }) {
  const t = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!t || !env.TEAM_DOMAIN || !env.POLICY_AUD) return new Response('Unauthorized', { status: 401 });
  try {
    const [h, p, s] = t.split('.');
    const head = JSON.parse(new TextDecoder().decode(dec(h)));
    const certs = await (await fetch(`https://${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)).json();
    const jwk = certs.keys.find(k => k.kid === head.kid);
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, dec(s), new TextEncoder().encode(h + '.' + p));
    const pl = JSON.parse(new TextDecoder().decode(dec(p)));
    if (!ok || ![].concat(pl.aud).includes(env.POLICY_AUD) || pl.exp * 1000 < Date.now()) throw 0;
  } catch { return new Response('Unauthorized', { status: 401 }); }
  return next();
}
