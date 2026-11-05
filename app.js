// Viva Studio | prévia conceitual. Sem dependências; motion via CSS + Web Animations API.
(() => {
  const WHATS = '5548988182733';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const EASE_OUT = 'cubic-bezier(.23,1,.32,1)';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const header = $('.header');

  /* Rolagem contínua (Lenis): suaviza a roda do mouse; o toque segue nativo.
     As animações por rolagem são CSS scroll-driven e acompanham a posição suavizada. */
  let lenis = null;
  if (window.Lenis && !reduce.matches) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]:not(.skip)');
      if (!a) return;
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -((header ? header.offsetHeight : 0) + 12), duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
      history.replaceState(null, '', id);
    });
    reduce.addEventListener('change', () => { if (reduce.matches && lenis) { lenis.destroy(); lenis = null; } });
  }

  /* Cabeçalho: borda depois que a página sai do topo (sentinela, sem listener de scroll) */
  if (header && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
  }

  /* Modalidades: índice que troca a foto do palco (desktop) */
  const mods = $$('.mod');
  const stage = $$('.stage-img');
  const setMod = (i) => {
    mods.forEach((m, k) => {
      const on = k === i;
      m.classList.toggle('is-active', on);
      $('.mod-btn', m).setAttribute('aria-expanded', String(on));
    });
    stage.forEach((s, k) => s.classList.toggle('is-active', k === i));
  };
  mods.forEach((m, i) => {
    const b = $('.mod-btn', m);
    b.addEventListener('click', () => setMod(i));
    b.addEventListener('focus', () => setMod(i));
    if (finePointer.matches) b.addEventListener('pointerenter', () => setMod(i));
  });
  /* No celular as modalidades viram carrossel com tudo visível: os botões deixam de ser controles */
  const mobile = matchMedia('(max-width: 860px)');
  const syncModsMode = () => mods.forEach((m) => {
    const b = $('.mod-btn', m);
    if (mobile.matches) { b.tabIndex = -1; b.removeAttribute('aria-expanded'); b.setAttribute('aria-disabled', 'true'); }
    else { b.tabIndex = 0; b.removeAttribute('aria-disabled'); b.setAttribute('aria-expanded', String(m.classList.contains('is-active'))); }
  });
  syncModsMode();
  mobile.addEventListener('change', syncModsMode);

  /* Faixa "Pilates para..." (text-switch): avança só visível e sem movimento reduzido */
  const track = $('.switch-track');
  if (track) {
    const words = $$('.switch-word', track);
    const items = $$('.band-list li');
    let idx = 0, timer = null, visible = false;
    const step = () => {
      if (reduce.matches || document.hidden || !visible) return;
      const from = idx; idx = (idx + 1) % words.length;
      items.forEach((li, k) => li.classList.toggle('is-on', k === idx));
      const h = words[0].getBoundingClientRect().height;
      track.animate(
        [{ transform: `translateY(${-from * h}px)` }, { transform: `translateY(${-idx * h}px)` }],
        { duration: 620, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' }
      );
    };
    const start = () => { if (!timer) timer = setInterval(step, 2400); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(track);
    reduce.addEventListener('change', () => { track.getAnimations().forEach(a => a.cancel()); idx = 0; });
  }

  /* Unidades (ix-segmented-morph): cápsula elástica + painel revelado na direção da troca */
  const seg = $('.seg');
  if (seg) {
    const pill = $('.seg-pill', seg);
    const tabs = $$('.seg-btn', seg);
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    let current = 0;
    const box = (t) => ({ x: t.offsetLeft, w: t.offsetWidth });
    const place = (i) => { const b = box(tabs[i]); pill.style.width = b.w + 'px'; pill.style.transform = `translateX(${b.x}px)`; };
    place(0); seg.classList.add('is-ready');
    addEventListener('resize', () => place(current));

    const select = (i, focus) => {
      if (i === current) return;
      const a = box(tabs[current]), b = box(tabs[i]);
      const dir = i > current ? 1 : -1;
      if (!reduce.matches) {
        const left = Math.min(a.x, b.x), right = Math.max(a.x + a.w, b.x + b.w);
        pill.animate([
          { width: a.w + 'px', transform: `translateX(${a.x}px)` },
          { width: (right - left) + 'px', transform: `translateX(${left}px)`, offset: .45 },
          { width: b.w + 'px', transform: `translateX(${b.x}px)` }
        ], { duration: 420, easing: EASE_OUT });
      }
      place(i);
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      panels[current].hidden = true; panels[current].classList.remove('is-active');
      const p = panels[i]; p.hidden = false; p.classList.add('is-active');
      if (!reduce.matches) {
        const media = $('.unit-media', p), info = $('.unit-info', p);
        media.animate(
          [{ clipPath: dir > 0 ? 'inset(0 0 0 100% round 28px)' : 'inset(0 100% 0 0 round 28px)' }, { clipPath: 'inset(0 0 0 0 round 28px)' }],
          { duration: 620, easing: 'cubic-bezier(.77,0,.175,1)' }
        );
        info.animate([{ opacity: 0, transform: `translateX(${dir * 16}px)` }, { opacity: 1, transform: 'none' }],
          { duration: 420, delay: 120, easing: EASE_OUT, fill: 'backwards' });
      }
      current = i;
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    seg.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      else if (k) { e.preventDefault(); select((current + k + tabs.length) % tabs.length, true); }
    });
  }

  /* Compositor de mensagem do WhatsApp */
  const form = $('#composer');
  const out = $('#preview-text');
  const periodo = { 'manhã': 'de manhã', tarde: 'à tarde', noite: 'à noite' };
  const message = () => {
    const d = new FormData(form);
    const nome = String(d.get('nome') || '').trim();
    const unidade = d.get('unidade');
    return `Olá!${nome ? ` Sou ${nome}.` : ''} Quero ${d.get('objetivo')}${unidade ? ` na ${unidade}` : ''}. Qual horário vocês têm ${periodo[d.get('periodo')]}?`;
  };
  const render = () => { if (out) out.textContent = message(); };
  /* Plano Start existe só na Unidade 2: ao escolhê-lo, a Unidade 1 fica indisponível */
  const startRule = () => {
    if (!form) return;
    const isStart = form.querySelector('input[name="objetivo"]:checked')?.value === 'conhecer o Plano Start';
    const u1 = form.querySelector('input[name="unidade"][value="Unidade 1"]');
    const u2 = form.querySelector('input[name="unidade"][value="Unidade 2"]');
    if (u1) u1.disabled = isStart;
    if (isStart && u1 && u2 && (u1.checked || !form.querySelector('input[name="unidade"]:checked')?.value)) u2.checked = true;
  };
  if (form) {
    form.addEventListener('input', render);
    form.addEventListener('change', () => { startRule(); render(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
    });
    render();
  }
  const check = (name, value) => {
    const r = form && $$(`input[name="${name}"]`, form).find(i => i.value === value);
    if (r) { r.checked = true; startRule(); render(); }
  };
  $$('[data-unit]').forEach(a => a.addEventListener('click', () => check('unidade', a.dataset.unit)));
  $$('[data-goal]').forEach(a => a.addEventListener('click', () => { check('objetivo', 'conhecer o Plano Start'); check('unidade', 'Unidade 2'); }));

  /* CTA magnético (só ponteiro fino, sem movimento reduzido) */
  const mag = $('.magnetic');
  if (mag && finePointer.matches) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      mag.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      if (Math.abs(tx - x) > .05 || Math.abs(ty - y) > .05) raf = requestAnimationFrame(loop); else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    mag.addEventListener('pointermove', (e) => {
      if (reduce.matches) return;
      const r = mag.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      ty = (e.clientY - (r.top + r.height / 2)) * 0.3;
      kick();
    });
    mag.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }
})();
