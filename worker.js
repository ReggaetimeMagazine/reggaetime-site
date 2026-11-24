// ═══════════════════════════════════════════════════════════
//  Reggaetime Magazine · Cloudflare Worker
//  Cola esse código em: dash.cloudflare.com →
//  Workers & Pages → reggaetime-site → Edit Code → Deploy
//
//  O que ele faz:
//   1) Entrega o /ads.txt do Google AdSense direto (não depende do arquivo)
//   2) Monta a prévia do link (WhatsApp/Facebook/X) com a FOTO DA MATÉRIA
//   3) Serve a foto da matéria em /og/<id>.jpg (as fotos ficam em base64 no JSON,
//      e as redes sociais não leem base64 — por isso o worker converte em imagem)
// ═══════════════════════════════════════════════════════════

const SITE_NAME = 'Reggaetime Magazine';
const SITE_DESC = 'A maior revista de reggae e dancehall do Brasil.';
const ADS_TXT   = 'google.com, pub-5304581261023931, DIRECT, f08c47fec0942fa0\n';

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function ogDefault(base){
  const img = base + '/og-image.jpg';
  return `<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${base}/">
<meta property="og:title" content="${SITE_NAME} — News 'N' Reggae">
<meta property="og:description" content="${SITE_DESC}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${SITE_NAME} — News 'N' Reggae">
<meta name="twitter:description" content="${SITE_DESC}">
<meta name="twitter:image" content="${img}">
<title>${SITE_NAME} — News 'N' Reggae</title>`;
}

function ogArt(base, art){
  const title = esc(String(art.titulo||'') + ' — ' + SITE_NAME);
  const desc  = esc(art.resumo || SITE_DESC);
  const im    = String(art.imagem || '');
  // base64 → o próprio worker entrega a imagem em /og/<id>.jpg ; link http(s)/relativo → usa direto
  let img;
  if(im.startsWith('data:image/')) img = base + '/og/' + encodeURIComponent(art.id) + '.jpg';
  else if(/^https?:\/\//i.test(im)) img = im;
  else if(im) img = base + '/' + im.replace(/^\//,'');
  else img = base + '/og-image.jpg';
  img = esc(img);
  const url = esc(base + '/?a=' + encodeURIComponent(art.id));
  return `<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<title>${title}</title>`;
}

class HeadInjector {
  constructor(tags){ this.tags=tags; this.done=false; }
  element(el){ if(!this.done){ this.done=true; el.append(this.tags,{html:true}); } }
}
class StripOld { element(el){ el.remove(); } }

async function loadNews(origin, base){
  const res = await origin(new Request(base + '/data/noticias.json'));
  if(!res.ok) return [];
  const raw = await res.json();
  return Array.isArray(raw) ? raw : (raw.noticias || []);
}

export default {
  async fetch(request, env){
    // Com Workers+Assets o certo é env.ASSETS; fetch(request) direto pode entrar em loop.
    const origin = (req) => (env && env.ASSETS) ? env.ASSETS.fetch(req) : fetch(req);

    const url   = new URL(request.url);
    const base  = url.origin;               // funciona no domínio próprio e no workers.dev
    const artId = url.searchParams.get('a');

    // 1) ads.txt — sempre texto puro, direto do worker
    if(url.pathname === '/ads.txt'){
      return new Response(ADS_TXT, { headers:{
        'Content-Type':'text/plain; charset=utf-8',
        'Cache-Control':'public, max-age=3600'
      }});
    }

    // 2) foto da matéria para a prévia do link: /og/<id>.jpg
    if(url.pathname.startsWith('/og/')){
      try{
        const id   = decodeURIComponent(url.pathname.slice(4).replace(/\.\w+$/,''));
        const news = await loadNews(origin, base);
        const art  = news.find(n => String(n.id) === id);
        const m    = art && /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(String(art.imagem||''));
        if(m){
          const bin = atob(m[2]);
          const buf = new Uint8Array(bin.length);
          for(let i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
          return new Response(buf, { headers:{
            'Content-Type': m[1],
            'Cache-Control':'public, max-age=86400'
          }});
        }
      }catch(e){}
      return Response.redirect(base + '/og-image.jpg', 302);
    }

    // JSON: sempre revalida (ETag → 304), sem baixar 9MB de novo se não mudou
    if(url.pathname.endsWith('.json')){
      const jsonRes = await origin(request);
      const newRes  = new Response(jsonRes.body, jsonRes);
      newRes.headers.set('Cache-Control', 'no-cache');
      newRes.headers.delete('Pragma');
      return newRes;
    }

    // Tudo que não for a página inicial passa direto (imagens, admin, etc.)
    if(url.pathname !== '/') return origin(request);

    const res = await origin(request);
    if(!res.ok) return res;

    let tags = ogDefault(base);
    if(artId){
      try{
        const art = (await loadNews(origin, base)).find(n => String(n.id) === artId);
        if(art) tags = ogArt(base, art);
      }catch(e){}
    }

    return new HTMLRewriter()
      .on('title', new StripOld())
      .on('meta[property^="og:"]', new StripOld())
      .on('meta[name^="twitter:"]', new StripOld())
      .on('head', new HeadInjector(tags))
      .transform(res);
  }
};
