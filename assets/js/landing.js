(() => {
  const top = document.querySelector('.lp-top');
  const onScroll = () => {
    if (!top) return;
    top.classList.toggle('is-solid', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

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
