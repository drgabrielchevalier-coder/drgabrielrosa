/**
 * Circular Navigation — versão JS puro (sem React, sem bibliotecas).
 *
 * Um menu que abre por cima da página inteira: um círculo de vidro no centro, com os itens em volta (ícone e nome)
 * e o botão de fechar no meio.
 *
 * - Abre crescendo do centro em 0,4 s, com o fundo escurecendo e desfocando a página; fecha encolhendo.
 * - Fecha pelo X, pelo Esc, por um clique fora do círculo e pela escolha de um item.
 * - Itens espaçados por igual no círculo, o primeiro à direita, em sentido horário. Hover/foco = branco;
 *   o da página atual (activeHref) fica marcado (aria-current="page").
 * - Ao abrir, o foco vai para o X e o Tab anda só dentro do menu; ao fechar, volta para onde estava.
 * - Círculo de 420 px, nunca maior que a tela menos 16 px de cada lado. --cnav-size troca o tamanho.
 *
 * Uso:
 *   const nav = CircularNavigation.create({
 *     navItems: [{ name: 'Início', icon: 'house', href: '#inicio' }, ...],   // external: true abre em nova aba
 *     activeHref: '#inicio',
 *     onNavigate(item, event) { ... },   // event.preventDefault() cancela o link
 *     onToggle(isOpen) { ... },
 *     label: 'Navegação', closeLabel: 'Fechar navegação', className: ''
 *   });
 *   botao.addEventListener('click', () => nav.open());
 *   // nav.open() · nav.close() · nav.toggle() · nav.isOpen() · nav.setActive(href) · nav.destroy()
 *
 * Ícones: Lucide (lucide.dev), licença ISC, desenhados aqui. CSS injetado uma única vez (<style id="cnav-styles">).
 */
(function (global) {
  'use strict';

  // Lucide (lucide.dev), licença ISC: os mesmos desenhos, em 24 × 24
  var ICONS = {
    house:
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    trophy:
      '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
    'file-text':
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    settings:
      '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    menu: '<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'graduation-cap':
      '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    'scan-line':
      '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    instagram:
      '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
  };

  var CNAV_CSS = [
    '/* o fundo: a página inteira, escurecida e desfocada */',
    '.cnav-overlay {',
    '  position: fixed; inset: 0; z-index: 10000;',
    '  display: flex; align-items: center; justify-content: center;',
    '  box-sizing: border-box; margin: 0; padding: 16px;',
    '  background: rgba(0, 0, 0, .8);',
    '  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);',
    '  outline: none;',
    '  /* nada de texto herdado da página: o menu fica igual em qualquer projeto */',
    '  font-family: ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
    '  font-style: normal; font-variant: normal; font-feature-settings: normal; font-variation-settings: normal;',
    '  letter-spacing: normal; word-spacing: normal; text-align: center; text-transform: none; text-indent: 0; text-shadow: none;',
    '  color: #fff;',
    '  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; -webkit-tap-highlight-color: transparent;',
    '}',
    '.cnav-overlay[hidden] { display: none; }',
    '.cnav-overlay *, .cnav-overlay *::before, .cnav-overlay *::after { box-sizing: border-box; }',
    '',
    '/* o círculo de vidro: 420 px, nunca maior que a tela menos o respiro */',
    '.cnav-circle {',
    '  position: relative; flex: none;',
    '  width: min(var(--cnav-size, 420px), 100%, calc(100dvh - 32px));',
    '  aspect-ratio: 1; margin: 0;',
    '  border: 1px solid rgba(255, 255, 255, .1); border-radius: 50%;',
    '  background: rgba(255, 255, 255, .05);',
    '  box-shadow: inset 2px 2px 2px rgba(255, 255, 255, .5), inset -1px -1px 1px rgba(255, 255, 255, .3);',
    '}',
    '',
    '.cnav-icon { display: block; flex: none; width: 24px; height: 24px; }',
    '',
    '/* o X, branco, no centro */',
    '.cnav-close {',
    '  position: absolute; left: 50%; top: 50%; z-index: 1;',
    '  display: flex; align-items: center; justify-content: center;',
    '  width: 48px; height: 48px; margin: 0; padding: 0;',
    '  border: 0; border-radius: 50%; background: #fff; color: #000;',
    '  font: inherit; cursor: pointer; translate: -50% -50%;',
    '  -webkit-appearance: none; appearance: none;',
    '  transition: scale .2s cubic-bezier(.4, 0, .2, 1);',
    '}',
    '.cnav-close:active { scale: .94; }',
    '.cnav-close:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }',
    '',
    '/* os itens em volta: cada um centrado no seu ponto do círculo */',
    '.cnav-list { position: absolute; inset: 0; margin: 0; padding: 0; list-style: none; }',
    '.cnav-item { position: absolute; margin: 0; padding: 0; translate: -50% -50%; }',
    '.cnav-item::marker { content: none; }',
    '.cnav-link {',
    '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
    '  width: 80px; height: 80px; margin: 0; padding: 0;',
    '  border-radius: 50%; background: transparent; color: #fff;',
    '  text-decoration: none; outline: none;',
    '  transition: background-color .2s cubic-bezier(.4, 0, .2, 1), color .2s cubic-bezier(.4, 0, .2, 1);',
    '}',
    '.cnav-link .cnav-icon { margin-bottom: 4px; }',
    '.cnav-label {',
    '  display: block; max-width: 72px; overflow: hidden;',
    '  font-size: 12px; font-weight: 500; line-height: 16px;',
    '  white-space: nowrap; text-overflow: ellipsis; text-decoration: none;',
    '}',
    '/* a página atual */',
    '.cnav-link[aria-current="page"] { background: rgba(255, 255, 255, .12); }',
    '/* o hover (só com mouse: no toque ele ficaria preso) e o foco do teclado */',
    '@media (hover: hover) { .cnav-link:hover { background: #fff; color: #000; } }',
    '.cnav-link:focus-visible { background: #fff; color: #000; box-shadow: 0 0 0 2px rgba(0, 0, 0, .8), 0 0 0 4px #fff; }',
    '',
    '/* abrir e fechar: o círculo cresce do centro e o fundo acende, e o contrário */',
    '@keyframes cnav-grow { from { opacity: 0; scale: 0; } to { opacity: 1; scale: 1; } }',
    '@keyframes cnav-shrink { from { opacity: 1; scale: 1; } to { opacity: 0; scale: 0; } }',
    '@keyframes cnav-fade-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes cnav-fade-out { from { opacity: 1; } to { opacity: 0; } }',
    '.cnav-overlay.is-opening { animation: cnav-fade-in .4s cubic-bezier(.42, 0, .58, 1) both; }',
    '.cnav-overlay.is-closing { animation: cnav-fade-out .4s cubic-bezier(.42, 0, .58, 1) both; pointer-events: none; }',
    '.cnav-overlay.is-opening .cnav-circle { animation: cnav-grow .4s cubic-bezier(.42, 0, .58, 1) both; }',
    '.cnav-overlay.is-closing .cnav-circle { animation: cnav-shrink .4s cubic-bezier(.42, 0, .58, 1) both; }',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .cnav-overlay, .cnav-overlay * { animation-duration: .01ms !important; transition-duration: .01ms !important; }',
    '}'
  ].join('\n');

  var FOCUSABLE = 'a[href], button:not([disabled])';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function injectStyles() {
    if (document.getElementById('cnav-styles')) return;
    var style = document.createElement('style');
    style.id = 'cnav-styles';
    style.textContent = CNAV_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  /** Um ícone do Lucide pelo nome, em 24 × 24 e no traço de 2. Devolve um <svg>. */
  function icon(name, className, strokeWidth) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth || 2));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (className) svg.setAttribute('class', className);
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  // O lugar de cada item, em % do círculo: raio de 150 px num círculo de 420, a partir da direita, em sentido horário.
  function itemPosition(index, count) {
    var angle = (2 * Math.PI * index) / count;
    var radius = (150 / 420) * 100;
    return {
      left: (50 + radius * Math.cos(angle)).toFixed(3) + '%',
      top: (50 + radius * Math.sin(angle)).toFixed(3) + '%'
    };
  }

  function create(opts) {
    opts = opts || {};
    injectStyles();

    var navItems = Array.isArray(opts.navItems) ? opts.navItems : [];
    var activeHref = opts.activeHref || '';
    var phase = 'closed'; // closed | opening | open | closing
    var returnFocus = null;
    var fallbackTimer = 0;

    var overlay = document.createElement('div');
    overlay.className = 'cnav-overlay' + (opts.className ? ' ' + opts.className : '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.label || 'Navegação');
    overlay.tabIndex = -1;
    overlay.hidden = true;

    var circle = document.createElement('div');
    circle.className = 'cnav-circle';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cnav-close';
    closeBtn.setAttribute('aria-label', opts.closeLabel || 'Fechar navegação');
    closeBtn.appendChild(icon('x', 'cnav-icon'));

    var list = document.createElement('ul');
    list.className = 'cnav-list';

    var links = [];
    navItems.forEach(function (item, index) {
      var li = document.createElement('li');
      li.className = 'cnav-item';
      var pos = itemPosition(index, navItems.length);
      li.style.left = pos.left;
      li.style.top = pos.top;

      var a = document.createElement('a');
      a.className = 'cnav-link';
      a.href = item.href;
      // link externo: item.external abre em nova aba
      if (item.external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      if (typeof item.icon === 'string') a.appendChild(icon(item.icon, 'cnav-icon'));
      else if (item.icon instanceof Node) a.appendChild(item.icon);
      var label = document.createElement('span');
      label.className = 'cnav-label';
      label.textContent = item.name;
      a.appendChild(label);

      a.addEventListener('click', function (event) {
        if (typeof opts.onNavigate === 'function') opts.onNavigate(item, event);
        if (isOpen()) close();
      });

      links.push({ el: a, item: item });
      li.appendChild(a);
      list.appendChild(li);
    });

    circle.appendChild(closeBtn);
    circle.appendChild(list);
    overlay.appendChild(circle);
    document.body.appendChild(overlay);

    function paintActive() {
      links.forEach(function (l) {
        if (l.item.href === activeHref) l.el.setAttribute('aria-current', 'page');
        else l.el.removeAttribute('aria-current');
      });
    }
    paintActive();

    function isOpen() {
      return phase === 'opening' || phase === 'open';
    }

    function settle() {
      window.clearTimeout(fallbackTimer);
      if (phase === 'opening') {
        phase = 'open';
        overlay.classList.remove('is-opening');
      } else if (phase === 'closing') {
        phase = 'closed';
        overlay.classList.remove('is-closing');
        overlay.hidden = true;
      }
    }

    function setPhase(next) {
      phase = next;
      overlay.classList.remove('is-opening', 'is-closing');
      // reinicia a animação mesmo se trocar de direção no meio
      void overlay.offsetWidth;
      overlay.classList.add(next === 'opening' ? 'is-opening' : 'is-closing');
      window.clearTimeout(fallbackTimer);
      // a animação avisa quando termina (animationend); isto é a garantia, se um CSS de fora desligar as animações
      fallbackTimer = window.setTimeout(settle, 1000);
    }

    function open() {
      if (isOpen()) return;
      var active = document.activeElement;
      if (active && active !== document.body && !overlay.contains(active)) returnFocus = active;
      overlay.hidden = false;
      setPhase('opening');
      closeBtn.focus({ preventScroll: true });
      if (typeof opts.onToggle === 'function') opts.onToggle(true);
    }

    function close() {
      if (!isOpen()) return;
      var active = document.activeElement;
      setPhase('closing');
      if (overlay.contains(active) || active === document.body) {
        if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus({ preventScroll: true });
        returnFocus = null;
      }
      if (typeof opts.onToggle === 'function') opts.onToggle(false);
    }

    function toggle() {
      if (isOpen()) close();
      else open();
    }

    circle.addEventListener('animationend', function (event) {
      if (event.target !== circle) return;
      settle();
    });

    closeBtn.addEventListener('click', function () {
      if (isOpen()) close();
    });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay && isOpen()) close();
    });

    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        // preventDefault: um modal ou uma gaveta por baixo não fecha junto
        event.preventDefault();
        event.stopPropagation();
        if (isOpen()) close();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(overlay.querySelectorAll(FOCUSABLE), function (el) {
        return el.tabIndex >= 0;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = document.activeElement;
      if (event.shiftKey && (active === first || active === overlay)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    return {
      open: open,
      close: close,
      toggle: toggle,
      isOpen: isOpen,
      setActive: function (href) {
        activeHref = href || '';
        paintActive();
      },
      element: overlay,
      destroy: function () {
        window.clearTimeout(fallbackTimer);
        overlay.remove();
      }
    };
  }

  global.CircularNavigation = { create: create, icon: icon, ICONS: ICONS };
})(window);
