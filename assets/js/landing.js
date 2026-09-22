(() => {
  const top = document.querySelector('.lp-top');
  const onScroll = () => {
    if (!top) return;
    top.classList.toggle('is-solid', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const btn = document.getElementById('lpMenuBtn');
  const drawer = document.getElementById('lpDrawer');
  if (btn && drawer) {
    const close = () => {
      drawer.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', () => {
      const open = drawer.hidden;
      drawer.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  }

  const nodes = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || !nodes.length) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  nodes.forEach((n) => io.observe(n));
})();
