/*
 * BiteBuddy — shared navigation and button behavior. */
(() => {
  'use strict';

  // slogan
  const SLOGAN = ['Good food.', 'Good Mood.'];
  const MOBILE_QUERY = '(max-width: 820px)'; // Match the breakpoint in the CSS.
  const SELECTABLE = '.size-btn, .chip, .priority-btn, .vote';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pageName(href) {
    try {
      const base = new URL(document.baseURI);
      const url = new URL(href, base);
      if (url.origin !== base.origin) return '';
      const name = url.pathname.split('/').pop().toLowerCase();
      return !name || name === 'index.html' ? 'home.html' : name;
    } catch (_) {
      return '';
    }
  }

  function addCreateIcon(link) {
    if (link.querySelector('.bb-nav__icon')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const attributes = {
      class: 'bb-nav__icon', viewBox: '0 0 20 20', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '1.8',
      'stroke-linecap': 'round', 'aria-hidden': 'true', focusable: 'false'
    };
    Object.entries(attributes).forEach(([name, value]) => svg.setAttribute(name, value));
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M10 4v12M4 10h12');
    svg.append(path);
    link.prepend(svg);
  }

  function setSlogan(tagline) {
    const parts = [];
    SLOGAN.forEach((line, index) => {
      if (index) parts.push(document.createElement('br'));
      parts.push(document.createTextNode(line));
    });
    tagline.replaceChildren(...parts);
  }

  // Reuse the original link/image nodes so their destinations and handlers stay.
  // Only the navbar's presentation structure changes; no page HTML edits needed.
  function prepareHeader(header) {
    const existing = header.querySelector('.bb-navbar__inner');
    if (existing && existing.querySelector('.bb-nav')) {
      const tagline = existing.querySelector('.bb-brand__tagline');
      if (tagline) setSlogan(tagline);
      return true;
    }

    const navigation = header.querySelector('nav');
    if (!navigation) return false;
    const links = Array.from(navigation.querySelectorAll('a[href]'));
    if (!links.length) return false;

    const image = header.querySelector('img');
    const brand = image?.closest('a') || element('a');
    if (!brand.hasAttribute('href')) brand.setAttribute('href', 'home.html');
    brand.className = 'bb-brand';
    brand.setAttribute('aria-label', 'BiteBuddy home');

    const logo = image || element('img');
    if (!logo.getAttribute('src')) logo.setAttribute('src', 'bitebuddy-logo.png');
    logo.className = 'bb-brand__image';
    logo.alt = logo.alt || 'BiteBuddy logo';
    logo.decoding = 'async';
    // One original page refers to a fallback sibling in an inline error handler.
    // The new navbar uses the actual image only, so that old handler is removed.
    logo.removeAttribute('onerror');
    logo.style.removeProperty('display');
    const logoFrame = element('span', 'bb-brand__logo');
    logoFrame.append(logo);
    brand.replaceChildren(logoFrame);

    const lockup = element('div', 'bb-brand-lockup');
    const tagline = element('span', 'bb-brand__tagline');
    setSlogan(tagline);
    lockup.append(brand, tagline);

    const browse = element('div', 'bb-nav__browse');
    const actions = element('div', 'bb-nav__actions');
    const joinLinks = [];
    const createLinks = [];
    links.forEach(link => {
      const target = pageName(link.getAttribute('href'));
      link.classList.add('bb-nav__link');
      link.classList.remove('active', 'bb-nav__join', 'bb-nav__cta');
      if (target === 'join-group.html') {
        link.classList.add('bb-nav__join');
        joinLinks.push(link);
      } else if (target === 'create-group.html') {
        link.classList.add('bb-nav__cta');
        addCreateIcon(link);
        createLinks.push(link);
      } else {
        browse.append(link);
      }
    });
    actions.append(...joinLinks, ...createLinks);
    navigation.classList.remove('nav-links');
    navigation.classList.add('bb-nav');
    navigation.setAttribute('aria-label', 'Main navigation');
    navigation.replaceChildren(browse, actions);
    if (!navigation.id) {
      let id = 'bb-navigation';
      let number = 1;
      while (document.getElementById(id)) id = `bb-navigation-${number++}`;
      navigation.id = id;
    }

    const toggle = element('button', 'bb-menu-toggle');
    toggle.type = 'button';
    toggle.hidden = true; // Only reveal when the menu handlers are attached.
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', navigation.id);
    const icon = element('span', 'bb-menu-toggle__icon');
    icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon);

    const inner = element('div', 'bb-navbar__inner');
    inner.append(lockup, toggle, navigation);
    header.replaceChildren(inner);
    return true;
  }

  function highlightCurrentPage(header) {
    const current = pageName(window.location.href);
    header.querySelectorAll('.bb-nav a[href]').forEach(link => {
      const target = pageName(link.getAttribute('href'));
      const exact = Boolean(target && target === current);
      // Recommendations belong to the Restaurants section, not that exact page.
      const related = current === 'top-recommendations.html' && target === 'restaurants.html';
      link.classList.toggle('is-active', exact || related);
      if (exact || related) link.setAttribute('aria-current', exact ? 'page' : 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function enhanceMenu(header) {
    if (header.classList.contains('bb-navbar--enhanced')) return;
    const toggle = header.querySelector('.bb-menu-toggle');
    const navigation = header.querySelector('.bb-nav');
    if (!toggle || !navigation) return;
    const mobile = window.matchMedia(MOBILE_QUERY);

    function setOpen(open, restoreFocus = false) {
      const isOpen = Boolean(open && mobile.matches);
      header.dataset.menuOpen = String(isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      if (restoreFocus && mobile.matches) toggle.focus();
    }

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && header.dataset.menuOpen === 'true') setOpen(false, true);
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Node && !header.contains(event.target)) setOpen(false);
    });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) setOpen(false);
    });
    navigation.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
    });

    function handleBreakpoint() {
      const active = document.activeElement;
      const focusWasInNavigation = navigation.contains(active);
      setOpen(false);
      if (mobile.matches && focusWasInNavigation) toggle.focus();
      if (!mobile.matches && active === toggle) navigation.querySelector('a')?.focus();
    }
    if (typeof mobile.addEventListener === 'function') {
      mobile.addEventListener('change', handleBreakpoint);
    } else {
      mobile.addListener(handleBreakpoint);
    }

    setOpen(false);
    toggle.hidden = false;
    header.classList.add('bb-navbar--enhanced');
  }

  // Existing application handlers still own selections. Mirror their classes
  // for assistive technology, including restored preferences and rendered votes.
  function updatePressed(node) {
    if (!(node instanceof Element) || !node.matches(SELECTABLE)) return;
    const selected = node.classList.contains('selected') ||
      (node.classList.contains('priority-btn') && node.classList.contains('active'));
    const value = String(selected);
    if (node.getAttribute('aria-pressed') !== value) node.setAttribute('aria-pressed', value);
  }

  function observeSelections() {
    document.querySelectorAll(SELECTABLE).forEach(updatePressed);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') {
          updatePressed(record.target);
        } else {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            updatePressed(node);
            node.querySelectorAll(SELECTABLE).forEach(updatePressed);
          }
        }
      }
    });
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['class']
    });
  }

  function initialize() {
    if (!document.body || document.body.dataset.bbSharedUi === 'ready') return;
    document.body.dataset.bbSharedUi = 'ready';
    document.body.classList.add('bb-ui');
    document.querySelectorAll('header.navbar, [data-bb-header]').forEach(header => {
      if (!prepareHeader(header)) return;
      header.classList.add('navbar', 'bb-navbar');
      header.setAttribute('data-bb-header', '');
      highlightCurrentPage(header);
      enhanceMenu(header);
    });
    observeSelections();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
