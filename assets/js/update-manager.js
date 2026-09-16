'use strict';
(() => {
  const CHECK_URL='api/version.php';
  const CHECK_INTERVAL=60000;
  const SEEN_KEY='chevalier_release_seen_build';
  const bootBuild=String(window.CHEVALIER_BUILD||'');
  let availableBuild='';
  let availableRelease=null;
  let installing=false;
  let timer=null;

  const root=()=>document.getElementById('update-root');
  const sameOriginAsset=url=>{try{return new URL(url,location.href).origin===location.origin;}catch{return false;}};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function normalizedRelease(release){
    const r=release&&typeof release==='object'?release:{};
    const changes=Array.isArray(r.changes)?r.changes.map(x=>String(x||'').trim()).filter(Boolean).slice(0,8):[];
    return {version:String(r.version||'').trim(),name:String(r.name||'').trim(),releasedAt:String(r.releasedAt||'').trim(),changes};
  }

  function releaseListHtml(release){
    const r=normalizedRelease(release);
    if(!r.changes.length)return '<ul class="protea-update-changes"><li>Arquivos e recursos do Chevalier Gestão foram atualizados.</li></ul>';
    return `<ul class="protea-update-changes">${r.changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
  }

  function updateBarHtml(build,release){
    const r=normalizedRelease(release);
    const version=r.version?` v${esc(r.version)}`:'';
    const title=r.name?esc(r.name):'Nova versão do sistema';
    return `<div class="protea-update-bar" role="status" aria-live="polite">
      <div class="protea-update-message"><span class="protea-update-dot"></span><div class="protea-update-copy"><strong>Atualização do Chevalier Gestão${version} disponível</strong><small>${title}</small>${releaseListHtml(r)}</div></div>
      <button type="button" class="button primary protea-update-button" data-protea-update-install>Atualizar agora</button>
    </div>`;
  }

  function installedBarHtml(release){
    const r=normalizedRelease(release);
    const version=r.version?` v${esc(r.version)}`:'';
    return `<div class="protea-update-bar success" role="status" aria-live="polite">
      <div class="protea-update-message"><span class="protea-update-check">✓</span><div class="protea-update-copy"><strong>Chevalier Gestão${version} atualizado</strong><small>${r.name?esc(r.name):'Veja o que mudou nesta versão.'}</small>${releaseListHtml(r)}</div></div>
      <button type="button" class="button protea-update-dismiss" data-protea-update-dismiss>Entendi</button>
    </div>`;
  }

  function progressHtml(){
    return `<div class="protea-update-bar installing" role="status" aria-live="polite" aria-busy="true">
      <div class="protea-update-message"><span class="protea-update-spinner"></span><div><strong id="protea-update-title">Instalando atualização…</strong><small id="protea-update-status">Preparando a nova interface.</small></div></div>
      <div class="protea-update-progress-wrap"><div class="protea-update-progress"><span id="protea-update-progress-bar" style="width:4%"></span></div><strong id="protea-update-percent">4%</strong></div>
    </div>`;
  }

  function syncOffset(){
    requestAnimationFrame(()=>{
      const node=root();
      const height=node&&node.children.length?Math.ceil(node.getBoundingClientRect().height):0;
      document.documentElement.style.setProperty('--protea-update-offset',`${height}px`);
    });
  }

  function setProgress(percent,status){
    const bar=document.getElementById('protea-update-progress-bar');
    const label=document.getElementById('protea-update-percent');
    const text=document.getElementById('protea-update-status');
    const value=Math.max(0,Math.min(100,Math.round(percent)));
    if(bar)bar.style.width=value+'%';
    if(label)label.textContent=value+'%';
    if(text&&status)text.textContent=status;
  }

  function showAvailable(build,release){
    if(!build||build===bootBuild||installing)return;
    availableBuild=build;
    availableRelease=normalizedRelease(release);
    const node=root();
    if(!node)return;
    node.innerHTML=updateBarHtml(build,availableRelease);
    document.body.classList.remove('protea-update-installed');
    document.body.classList.add('protea-update-available');
    syncOffset();
  }

  function showInstalled(release){
    const node=root();
    if(!node)return;
    node.innerHTML=installedBarHtml(release);
    document.body.classList.remove('protea-update-available','protea-update-installing');
    document.body.classList.add('protea-update-installed');
    syncOffset();
  }

  function hideAvailable(){
    availableBuild='';
    availableRelease=null;
    root()?.replaceChildren();
    document.body.classList.remove('protea-update-available','protea-update-installing','protea-update-installed');
    document.documentElement.style.setProperty('--protea-update-offset','0px');
  }

  async function fetchVersion(){
    const res=await fetch(`${CHECK_URL}?t=${Date.now()}`,{cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}});
    if(!res.ok)throw new Error('Não foi possível consultar a versão do Chevalier Gestão.');
    return res.json();
  }

  async function check(){
    if(installing||!bootBuild)return;
    try{
      const data=await fetchVersion();
      const remote=String(data?.build||'');
      if(remote&&remote!==bootBuild){showAvailable(remote,data?.release);return;}
      if(remote===bootBuild&&document.body.classList.contains('protea-update-available'))hideAvailable();
    }catch(_){/* atualização é não bloqueante */}
  }

  async function maybeShowCurrentRelease(){
    if(!bootBuild||document.body.classList.contains('protea-update-available'))return;
    try{
      const seen=localStorage.getItem(SEEN_KEY)||'';
      if(seen===bootBuild)return;
      const data=await fetchVersion();
      if(String(data?.build||'')!==bootBuild)return;
      const release=normalizedRelease(data?.release);
      if(!release.changes.length){localStorage.setItem(SEEN_KEY,bootBuild);return;}
      showInstalled(release);
    }catch(_){/* não bloqueia o sistema */}
  }

  async function clearBrowserCaches(){
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/chevalier|protea/i.test(k)).map(k=>caches.delete(k)));
      }
    }catch(_){/* continua sem Cache API */}
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      }
    }catch(_){/* continua */}
  }

  async function preloadFreshInterface(build){
    const htmlUrl=new URL('index.php',location.href);
    htmlUrl.searchParams.set('__chevalier_build',build||Date.now());
    const htmlRes=await fetch(htmlUrl.href,{cache:'no-store',credentials:'same-origin'});
    if(!htmlRes.ok)throw new Error('Não foi possível baixar a nova interface.');
    const html=await htmlRes.text();
    setProgress(42,'Nova interface recebida. Atualizando arquivos…');
    const doc=new DOMParser().parseFromString(html,'text/html');
    const urls=[...doc.querySelectorAll('link[rel="stylesheet"][href],script[src]')]
      .map(el=>el.getAttribute(el.tagName==='LINK'?'href':'src'))
      .filter(Boolean)
      .map(u=>new URL(u,htmlUrl.href).href)
      .filter(sameOriginAsset);
    const unique=[...new Set(urls)];
    if(!unique.length){setProgress(88,'Finalizando atualização…');return htmlUrl;}
    for(let i=0;i<unique.length;i++){
      const res=await fetch(unique[i],{cache:'reload',credentials:'same-origin'});
      if(!res.ok){
        let name=unique[i];
        try{name=new URL(unique[i]).pathname.replace(/^\//,'');}catch(_){/* keep raw */}
        throw new Error(`Arquivo ausente no servidor (${res.status}): ${name}`);
      }
      setProgress(42+((i+1)/unique.length)*46,`Atualizando arquivos ${i+1} de ${unique.length}…`);
    }
    return htmlUrl;
  }

  async function install(){
    if(installing||!availableBuild)return;
    installing=true;
    const node=root();
    if(!node)return;
    node.innerHTML=progressHtml();
    document.body.classList.remove('protea-update-available','protea-update-installed');
    document.body.classList.add('protea-update-installing');
    syncOffset();
    try{
      setProgress(8,'Preparando a atualização…');
      await clearBrowserCaches();
      setProgress(22,'Verificando a versão mais recente…');
      const version=await fetchVersion();
      const build=String(version?.build||availableBuild);
      availableRelease=normalizedRelease(version?.release||availableRelease);
      setProgress(30,'Baixando o novo HTML…');
      const nextUrl=await preloadFreshInterface(build);
      setProgress(94,'Aplicando a nova versão…');
      await new Promise(r=>setTimeout(r,220));
      setProgress(100,'Atualização concluída. Reabrindo o Chevalier Gestão…');
      await new Promise(r=>setTimeout(r,500));
      localStorage.removeItem(SEEN_KEY);
      nextUrl.hash=location.hash;
      location.replace(nextUrl.href);
    }catch(err){
      installing=false;
      document.body.classList.remove('protea-update-installing');
      node.innerHTML=`<div class="protea-update-bar error" role="alert"><div class="protea-update-message"><div><strong>Não foi possível instalar a atualização</strong><small>${esc(err?.message||'Tente novamente em alguns instantes.')}</small></div></div><button type="button" class="button" data-protea-update-retry>Tentar novamente</button></div>`;
      document.body.classList.add('protea-update-available');
      syncOffset();
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-protea-update-install]'))install();
    if(e.target.closest('[data-protea-update-retry]')){installing=false;showAvailable(availableBuild||'retry',availableRelease);check();}
    if(e.target.closest('[data-protea-update-dismiss]')){localStorage.setItem(SEEN_KEY,bootBuild);hideAvailable();}
  });

  document.addEventListener('DOMContentLoaded',()=>{
    if(!root())return;
    setTimeout(()=>{check();maybeShowCurrentRelease();},1800);
    timer=setInterval(check,CHECK_INTERVAL);
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
  window.addEventListener('focus',check);
  window.addEventListener('resize',syncOffset);
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});
})();
