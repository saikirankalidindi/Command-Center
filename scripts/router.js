/**
 * router.js - Hash-based client-side router
 */

const Router = (() => {
  // Route definitions: hash -> { render, title }
  const routes = {};
  let currentRoute = null;
  let beforeEach = null;

  /**
   * Register a route
   */
  function register(hash, handler) {
    routes[hash] = handler;
  }

  /**
   * Navigate to a route
   */
  function navigate(hash) {
    window.location.hash = hash;
  }

  /**
   * Get current route hash
   */
  function getCurrentRoute() {
    return window.location.hash.slice(1) || 'dashboard';
  }

  /**
   * Handle route change
   */
  function handleRoute() {
    const hash = getCurrentRoute();
    const handler = routes[hash] || routes['dashboard'];

    if (!handler) return;

    // Update active nav item
    document.querySelectorAll('.nav-item[data-route]').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    // Render the page
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      pageContent.innerHTML = '';
      pageContent.scrollTop = 0;
    }

    currentRoute = hash;
    handler(pageContent);
  }

  /**
   * Initialize router
   */
  function init() {
    window.addEventListener('hashchange', handleRoute);
    // Handle initial load
    handleRoute();
  }

  return { register, navigate, init, getCurrentRoute };
})();
