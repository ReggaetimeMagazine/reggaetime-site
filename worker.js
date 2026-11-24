// ═══════════════════════════════════════════════════════════
//  Reggaetime Magazine · Cloudflare Worker
//  Cola esse código em: dash.cloudflare.com →
//  Workers & Pages → reggaetime-site → Edit Code → Deploy
// ═══════════════════════════════════════════════════════════

const SITE_URL  = 'https://reggaetime-site.reggaetimebr.workers.dev';
const SITE_NAME = 'Reggaetime Magazine';
const SITE_DESC = 'A maior revista de reggae e dancehall do Brasil.';
const OG_IMG    = SITE_URL + '/og-image.jpg';

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function ogDefault(){
  return `<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:title" content="${SITE_NAME} — News 'N' Reggae">
<meta property="og:description" content="${SITE_DESC}">
<meta property="og:image" content="${OG_IMG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${SITE_NAME} — News 'N' Reggae">
<meta name="twitter:description" content="${SITE_DESC}">
<meta name="twitter:image" content="${OG_IMG}">
<title>${SITE_NAME} — News 'N' Reggae</title>`;
}

function ogArt(art){
  const title = esc(String(art.titulo||'') + ' — ' + SITE_NAME);
  const desc  = esc(art.resumo || SITE_DESC);
  // Imagem em base64 (data:) NÃO funciona em og:image — WhatsApp/Facebook ignoram. Usa a padrão.
  const img   = esc(/^https?:\/\//i.test(art.imagem || '') ? art.imagem : OG_IMG);
  const url   = esc(SITE_URL + '/?a=' + encodeURIComponent(art.id));
  return `<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${img}">
<title>${title}</title>`;
}

class HeadInjector {
  constructor(tags){ this.tags=tags; this.done=false; }
  element(el){
    if(!this.done){ this.done=true; el.append(this.tags,{html:true}); }
  }
}

// Remove <title> e og:/twitter: do HTML original para não duplicar com as injetadas
class StripOld {
  element(el){ el.remove(); }
}

export default {
  async fetch(request, env){
    // Busca o arquivo estático. Com Workers+Assets o certo é env.ASSETS;
    // fetch(request) direto pode entrar em loop e derrubar o site inteiro (site "vazio").
    const origin = (req) => (env && env.ASSETS) ? env.ASSETS.fetch(req) : fetch(req);

    const url   = new URL(request.url);
    const artId = url.searchParams.get('a');

    // JSON: sempre revalida (ETag → 304), mas não baixa 9MB de novo se não mudou
    if(url.pathname.endsWith('.json')){
      const jsonRes = await origin(request);
      const newRes  = new Response(jsonRes.body, jsonRes);
      newRes.headers.set('Cache-Control', 'no-cache');
      newRes.headers.delete('Pragma');
      return newRes;
    }

    // Passa tudo que não for a raiz direto (imagens, admin, etc.)
    if(url.pathname !== '/') return origin(request);

    const res = await origin(request);
    if(!res.ok) return res;

    let tags = ogDefault();
    if(artId){
      try{
        const jsonRes = await origin(new Request(new URL('/data/noticias.json', request.url).toString()));
        if(jsonRes.ok){
          const raw  = await jsonRes.json();
          const news = Array.isArray(raw) ? raw : (raw.noticias || []);
          const art  = news.find(n => String(n.id) === artId);
          if(art) tags = ogArt(art);
        }
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
