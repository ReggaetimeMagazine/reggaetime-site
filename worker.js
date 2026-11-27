// ═══════════════════════════════════════════════════════════
//  Reggaetime Magazine · Cloudflare Worker
//  Fica na pasta do site (junto do wrangler.jsonc) e vai para a Cloudflare
//  automaticamente pelo subir.bat (GitHub → Cloudflare). Não cola no painel.
//
//  O que ele faz:
//   1) Entrega o /ads.txt do Google AdSense direto (não depende do arquivo)
//   2) Monta a prévia do link (WhatsApp/Facebook/X) com a FOTO DA MATÉRIA
//   3) Serve a foto da matéria em /og/<id>.jpg (as fotos ficam em base64 no JSON,
//      e as redes sociais não leem base64 — por isso o worker converte em imagem)
//   4) SEO: cada matéria ganha uma página própria  /materia/<id>  (HTML completo
//      para o Google ler), mais /sitemap.xml e /robots.txt automáticos
// ═══════════════════════════════════════════════════════════

const SITE_NAME = 'Reggaetime Magazine';
const SITE_DESC = 'A maior revista de reggae e dancehall do Brasil.';
const CANON     = 'https://reggaetimemagazine.com';   // endereço oficial do site
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


// ── cache em memória (evita reler/parsear o JSON de 9MB a cada visita) ──
let CACHE = { t: 0, news: null };
async function getNews(origin, base){
  if(CACHE.news && Date.now() - CACHE.t < 300000) return CACHE.news;
  const news = await loadNews(origin, base);
  if(news.length){ CACHE = { t: Date.now(), news }; }
  return news;
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function dataBR(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d||''); if(!m) return '';
  return `${+m[3]} de ${MESES[+m[2]-1]} de ${m[1]}`;
}
function limpaTexto(t){
  // remove carimbos colados do WhatsApp: "[21:43, 04/08/2026] Nome: "
  return String(t||'').replace(/^\s*\[\d{1,2}:\d{2}, \d{1,2}\/\d{1,2}\/\d{4}\][^:\n]{0,40}:\s*/gm,'');
}
function corta(t, n){ t = String(t||'').replace(/\s+/g,' ').trim(); return t.length>n ? t.slice(0,n-1).replace(/\s+\S*$/,'')+'…' : t; }
function jsonLd(o){ return JSON.stringify(o).replace(/</g,'\\u003c'); }
function artImg(art){
  const im = String(art.imagem||'');
  if(im.startsWith('data:image/')) return CANON + '/og/' + encodeURIComponent(art.id) + '.jpg';
  if(/^https?:\/\//i.test(im)) return im;
  if(im) return CANON + '/' + im.replace(/^\//,'');
  return CANON + '/og-image.jpg';
}

function paginaMateria(art, news){
  const url   = CANON + '/materia/' + encodeURIComponent(art.id);
  const img   = artImg(art);
  const title = String(art.titulo||'');
  const desc  = corta(art.resumo || limpaTexto(art.conteudo), 155) || SITE_DESC;
  const pubIso = /^\d{4}-\d{2}-\d{2}/.test(art.data||'') ? art.data.slice(0,10)+'T12:00:00-03:00' : undefined;
  const pos   = /^[\w%. -]{1,30}$/.test(art.imgPosition||'') ? art.imgPosition : 'center top';
  const paras = limpaTexto(art.conteudo || art.resumo).split('\n').map(p=>p.trim()).filter(Boolean)
                  .map(p=>`<p>${esc(p)}</p>`).join('\n');
  const rel   = news.filter(n=>n.id!==art.id && n.categoria===art.categoria).slice(0,4);
  const ld = { '@context':'https://schema.org', '@type':'NewsArticle',
    headline: corta(title,110), description: desc, image:[img],
    datePublished: pubIso, dateModified: pubIso,
    articleSection: art.categoria, inLanguage:'pt-BR',
    author:{ '@type':'Person', name: art.autor || 'Reggaetime Staff' },
    publisher:{ '@type':'Organization', name:SITE_NAME, url:CANON, logo:{ '@type':'ImageObject', url:CANON+'/img/icon-512.png' } },
    mainEntityOfPage:{ '@type':'WebPage', '@id':url } };
  const crumbs = { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
    { '@type':'ListItem', position:1, name:SITE_NAME, item:CANON+'/' },
    { '@type':'ListItem', position:2, name:art.categoria||'Notícias', item:CANON+'/' },
    { '@type':'ListItem', position:3, name:corta(title,80), item:url } ] };
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | ${SITE_NAME}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/icon-32.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
${pubIso ? `<meta property="article:published_time" content="${pubIso}">` : ''}
<meta property="article:section" content="${esc(art.categoria)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${jsonLd(ld)}</script>
<script type="application/ld+json">${jsonLd(crumbs)}</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5304581261023931" crossorigin="anonymous"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Serif+4:wght@400;600&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;color:#141414;font-family:'Source Serif 4',Georgia,serif;line-height:1.6}
.rasta{height:4px;background:linear-gradient(90deg,#E63946 33.3%,#FFD700 33.3% 66.6%,#1DB954 66.6%)}
header{border-bottom:1px solid #e3e3e0;padding:14px 24px}
.hin{max-width:1000px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.logo{text-decoration:none;font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:.06em;color:#8a6a00;line-height:1}
.logo small{display:block;font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:.3em;color:#4a4a4a;text-transform:uppercase}
.back{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a6a00;text-decoration:none}
main{max-width:800px;margin:0 auto;padding:32px 20px 60px}
.cat{font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#8a6a00}
h1{font-family:'Oswald',sans-serif;font-size:36px;font-weight:700;line-height:1.15;margin:10px 0 14px}
.meta{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#4a4a4a;padding-bottom:18px;border-bottom:1px solid #e3e3e0;margin-bottom:24px}
.imgcred{margin:-16px 0 20px;font-size:12px;color:#3d3d3d;font-style:italic}
.hero{display:block;width:100%;height:auto;max-height:80vh;object-fit:contain;border-radius:5px;margin-bottom:26px;background:#f3f3f0}
.body p{font-size:18px;line-height:1.85;margin-bottom:22px;color:#141414}
.share{margin:30px 0;display:flex;gap:10px;flex-wrap:wrap}
.share a{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border:1px solid #e3e3e0;border-radius:3px;padding:9px 16px;color:#141414;text-decoration:none}
.share a:hover{border-color:#8a6a00;color:#8a6a00}
.rel{margin-top:44px;padding-top:24px;border-top:1px solid #e3e3e0}
.rel h2{font-family:'Oswald',sans-serif;font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px}
.rel a{display:block;font-family:'Oswald',sans-serif;font-size:16px;font-weight:500;color:#141414;text-decoration:none;padding:10px 0;border-bottom:1px solid #e3e3e0}
.rel a:hover{color:#8a6a00}
footer{border-top:1px solid #e3e3e0;padding:24px;text-align:center;font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#4a4a4a}
@media(max-width:640px){h1{font-size:26px}.body p{font-size:17px}}
</style>
</head>
<body>
<div class="rasta"></div>
<header><div class="hin">
  <a class="logo" href="/">Reggaetime<small>Magazine · News 'N' Reggae</small></a>
  <a class="back" href="/">← Todas as notícias</a>
</div></header>
<main>
  <article>
    <span class="cat">${esc(art.categoria)}</span>
    <h1>${esc(title)}</h1>
    <div class="meta">Por ${esc(art.autor||'Reggaetime Staff')} · <time datetime="${esc((art.data||'').slice(0,10))}">${esc(dataBR(art.data))}</time></div>
    <img class="hero" src="${esc(img)}" alt="${esc(title)}">
    ${art.imgCredito ? `<div class="imgcred">📷 ${esc(art.imgCredito)}</div>` : ''}
    <div class="body">
${paras}
    </div>
    <div class="share">
      <a href="https://wa.me/?text=${encodeURIComponent(title+' '+url)}" rel="noopener" target="_blank">WhatsApp</a>
      <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" rel="noopener" target="_blank">X</a>
    </div>
  </article>
${rel.length ? `  <section class="rel"><h2>Leia também</h2>
${rel.map(n=>`    <a href="/materia/${encodeURIComponent(n.id)}">${esc(n.titulo)}</a>`).join('\n')}
  </section>` : ''}
</main>
<footer><a href="/sobre" style="color:inherit">Sobre</a> · <a href="/contato" style="color:inherit">Contato</a> · <a href="/privacidade" style="color:inherit">Política de Privacidade</a><div style="margin-top:10px">© ${new Date().getFullYear()} ${SITE_NAME} · <a href="/" style="color:inherit">reggaetimemagazine.com</a></div></footer>
</body>
</html>`;
}

function sitemapXml(news){
  const datas = news.map(n=>(n.data||'').slice(0,10)).filter(Boolean).sort();
  const last = datas[datas.length-1];
  const urls = [`<url><loc>${CANON}/</loc>${last?`<lastmod>${last}</lastmod>`:''}<changefreq>daily</changefreq><priority>1.0</priority></url>`]
    .concat(['sobre','contato','privacidade'].map(s=>`<url><loc>${CANON}/${s}</loc><priority>0.5</priority></url>`))
    .concat(news.map(n=>{
      const d=(n.data||'').slice(0,10);
      return `<url><loc>${esc(CANON+'/materia/'+encodeURIComponent(n.id))}</loc>${d?`<lastmod>${d}</lastmod>`:''}<priority>0.8</priority></url>`;
    }));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${CANON}/sitemap.xml\n`;

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

    // 1b) robots.txt
    if(url.pathname === '/robots.txt'){
      return new Response(ROBOTS, { headers:{ 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'public, max-age=3600' }});
    }

    // 1c) sitemap.xml dinâmico (se algo falhar, entrega o arquivo estático da pasta)
    if(url.pathname === '/sitemap.xml'){
      try{
        const news = await getNews(origin, base);
        if(news.length) return new Response(sitemapXml(news), { headers:{ 'Content-Type':'application/xml; charset=utf-8', 'Cache-Control':'public, max-age=3600' }});
      }catch(e){}
      return origin(request);
    }

    // 1d) página própria de cada matéria: /materia/<id>
    if(url.pathname.startsWith('/materia/')){
      try{
        const id   = decodeURIComponent(url.pathname.slice(9).replace(/\/$/,''));
        const news = await getNews(origin, base);
        const art  = news.find(n => String(n.id) === id);
        if(art) return new Response(paginaMateria(art, news), { headers:{ 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'public, max-age=300' }});
        return new Response('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Matéria não encontrada</title><p style="font-family:sans-serif;padding:40px">Matéria não encontrada. <a href="/">Voltar ao site</a></p>', { status:404, headers:{'Content-Type':'text/html; charset=utf-8'} });
      }catch(e){
        // se não der para montar a página, entrega a home no mesmo endereço: o site abre a matéria sozinho (nunca volta pra home)
        return origin(new Request(url.origin + '/', request));
      }
    }

    // 1e) links antigos /?a=<id> → endereço novo (o Google junta tudo em um só)
    if(url.pathname === '/' && artId){
      return Response.redirect(CANON + '/materia/' + encodeURIComponent(artId), 301);
    }

    // 2) foto da matéria para a prévia do link: /og/<id>.jpg
    if(url.pathname.startsWith('/og/')){
      try{
        const id   = decodeURIComponent(url.pathname.slice(4).replace(/\.\w+$/,''));
        const news = await getNews(origin, base);
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
