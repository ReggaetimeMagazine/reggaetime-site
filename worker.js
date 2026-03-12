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
  const title = esc(art.titulo + ' — ' + SITE_NAME);
  const desc  = esc(art.resumo || SITE_DESC);
  const img   = art.imagem || OG_IMG;
  const url   = SITE_URL + '/?a=' + art.id;
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
    if(!this.done){ this.done=true; el.prepend(this.tags,{html:true}); }
  }
}

export default {
  async fetch(request){
    const url   = new URL(request.url);
    const artId = url.searchParams.get('a');

    // JSON nunca cacheia (notícias precisam ser sempre frescas)
    if(url.pathname.endsWith('.json')){
      const jsonRes = await fetch(request);
      const newRes  = new Response(jsonRes.body, jsonRes);
      newRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      newRes.headers.set('Pragma', 'no-cache');
      return newRes;
    }

    // Passa tudo que não for a raiz direto (imagens, admin, etc.)
    if(url.pathname !== '/') return fetch(request);

    // Busca o index.html
    const res = await fetch(request);
    if(!res.ok) return res;

    // Sem artigo → metatags padrão
    if(!artId){
      return new HTMLRewriter()
        .on('head', new HeadInjector(ogDefault()))
        .transform(res);
    }

    // Com artigo → busca o JSON e injeta metatags da matéria
    let tags = ogDefault();
    try{
      const jsonRes = await fetch(new URL('/data/noticias.json', request.url).toString());
      if(jsonRes.ok){
        const news = await jsonRes.json();
        const art  = news.find(n => n.id === artId);
        if(art) tags = ogArt(art);
      }
    }catch(e){}

    return new HTMLRewriter()
      .on('head', new HeadInjector(tags))
      .transform(res);
  }
};
