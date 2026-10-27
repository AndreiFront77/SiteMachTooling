(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.MACH_CONFIG || {};
  // Menu
  const burger = $('.burger'), menu = $('#menu');
  const closeMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => { const o = burger.getAttribute('aria-expanded') === 'true'; burger.setAttribute('aria-expanded', String(!o)); menu.classList.toggle('open', !o); });
  $$('#menu a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const hd = $('.hd'); document.addEventListener('click', e => { if (!hd.contains(e.target)) closeMenu(); }); matchMedia('(min-width:1201px)').addEventListener('change', closeMenu); const sc = () => hd.classList.toggle('sc', scrollY > 8); sc(); addEventListener('scroll', sc, { passive: true });
  // Link ativo
  const links = $$('#menu li:not(.m-cta) a');
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const t = $(l.getAttribute('href')); if (t) spy.observe(t); });
  // Revelação
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));
  // Configuração
  $$('[data-cfg]').forEach(el => { const v = C[el.dataset.cfg]; if (v) el.textContent = v; else el.textContent = el.dataset.fallback || ''; });
  $('#yr').textContent = new Date().getFullYear();
  const maps = $('#maps-link'); if (C.mapsUrl) maps.href = C.mapsUrl; else $('#maps-li').hidden = true;
  const soc = $('#soc'); const names = { instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube' };
  Object.entries(C.social || {}).forEach(([k, v]) => { if (v) { const li = document.createElement('li'); li.innerHTML = '<a target="_blank" rel="noopener noreferrer"></a>'; const a = li.firstChild; a.href = v; a.textContent = names[k] || k; soc.appendChild(li); } });
  if (!soc.children.length) soc.hidden = true;
  const vis = $('#visivel'); if (C.visivelUrl) { vis.href = C.visivelUrl; vis.target = '_blank'; vis.rel = 'noopener'; } else vis.replaceWith(document.createTextNode('Visível'));
  // WhatsApp flutuante (só abre conversa quando o número oficial estiver configurado)
  const wa = document.createElement('a'); wa.className = 'wa';
  wa.href = C.whatsapp ? 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(C.whatsappMsg || '') : '#contato';
  if (C.whatsapp) { wa.target = '_blank'; wa.rel = 'noopener noreferrer'; }
  wa.setAttribute('aria-label', C.whatsapp ? 'Conversar pelo WhatsApp (abre em nova aba)' : 'Ir para o formulário de contato');
  wa.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#wa"/></svg>'; document.body.appendChild(wa);
  // Serviço pré-selecionado pelos cards
  $$('[data-service]').forEach(a => a.addEventListener('click', () => { $('#servico').value = a.dataset.service; }));
  // Lightbox
  const lb = $('#lb'), lbi = $('img', lb), lbp = $('p', lb);
  $$('[data-full]').forEach(b => b.addEventListener('click', () => { lbi.src = b.dataset.full; lbi.alt = b.dataset.cap || ''; lbp.textContent = b.dataset.cap || ''; lb.showModal(); }));
  $('.x', lb).addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  // Filtro de projetos
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    $$('#pj .pj').forEach(p => { p.hidden = c.dataset.f !== 'all' && p.dataset.c !== c.dataset.f; });
  }));
  // Formulário
  const f = $('#orc'), fb = $('#fb'); $('#_t').value = Date.now();
  const MAX = 3.5 * 1024 * 1024, EXT = /\.(pdf|dwg|dxf|step|stp|igs|iges|png|jpe?g|zip)$/i;
  if (C.turnstileSiteKey) { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; document.head.appendChild(s); $('#ts').innerHTML = '<div class="cf-turnstile" data-sitekey="' + C.turnstileSiteKey + '"></div>'; }
  const setErr = (el, msg) => { el.setAttribute('aria-invalid', 'true'); let e = el.parentElement.querySelector('.err'); if (!e) { e = document.createElement('span'); e.className = 'err'; el.parentElement.appendChild(e); } e.textContent = msg; };
  const clr = el => { el.removeAttribute('aria-invalid'); const e = el.parentElement.querySelector('.err'); if (e) e.remove(); };
  const validate = () => {
    let first = null; const bad = (el, m) => { setErr(el, m); first = first || el; };
    ['nome', 'empresa', 'email', 'telefone', 'servico', 'mensagem'].forEach(id => { const el = $('#' + id); clr(el); if (!el.value.trim()) bad(el, 'Campo obrigatório.'); });
    const em = $('#email'); if (em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) bad(em, 'Informe um e-mail válido.');
    const ms = $('#mensagem'); if (ms.value && ms.value.trim().length < 10) bad(ms, 'Descreva com pelo menos 10 caracteres.');
    const tel = $('#telefone'); if (tel.value && tel.value.replace(/\D/g, '').length < 10) bad(tel, 'Informe o telefone com DDD.');
    const fl = $('#anexo'); clr(fl); const file = fl.files[0];
    if (file && !EXT.test(file.name)) bad(fl, 'Formato não permitido.'); else if (file && file.size > MAX) bad(fl, 'O arquivo excede 3,5 MB.');
    const ck = f.consentimento; if (!ck.checked) { first = first || ck; fb.textContent = 'É necessário concordar com o tratamento dos dados.'; fb.className = 'fb bad full'; }
    if (first) first.focus(); return !first;
  };
  f.addEventListener('submit', async e => {
    e.preventDefault(); fb.className = 'fb full'; fb.textContent = ''; if (!validate()) return;
    const btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await fetch(f.action, { method: 'POST', body: new FormData(f) }); const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Não foi possível enviar agora.');
      f.reset(); $('#_t').value = Date.now(); fb.className = 'fb ok full'; fb.textContent = 'Solicitação enviada com sucesso. Em breve nossa equipe entrará em contato.';
    } catch (err) { fb.className = 'fb bad full'; fb.textContent = err.message + ' Tente novamente em instantes.'; }
    finally { btn.disabled = false; btn.textContent = 'Enviar solicitação'; if (window.turnstile) try { turnstile.reset(); } catch (_) {} }
  });
})();
