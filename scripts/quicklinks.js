/**
 * quicklinks.js - Quick Links page
 */

const QuickLinks = (() => {
  let currentView = 'gallery'; // gallery | list
  let filterQuery = '';

  function render(container) {
    const settings = Store.settings.get();
    currentView = settings.quickLinksView || 'gallery';

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Quick Links</h1>
        <button class="btn btn-primary" id="add-link-btn">
          ${Utils.icons.plus} Add Link
        </button>
      </div>

      <div class="quicklinks-filter">
        <div class="quicklinks-search">
          <input type="text" id="links-search" placeholder="Search links..." value="${Utils.escapeHtml(filterQuery)}" />
        </div>
        <div class="quicklinks-view-toggle view-tabs">
          <button class="view-tab ${currentView === 'gallery' ? 'active' : ''}" data-view="gallery">
            ${Utils.icons.grid} Gallery
          </button>
          <button class="view-tab ${currentView === 'list' ? 'active' : ''}" data-view="list">
            ${Utils.icons.list} List
          </button>
        </div>
      </div>

      <div id="links-content"></div>
    `;

    // View toggle
    container.querySelectorAll('.view-tab[data-view]').forEach(tab => {
      tab.addEventListener('click', () => {
        currentView = tab.dataset.view;
        Store.settings.update({ quickLinksView: currentView });
        container.querySelectorAll('.view-tab[data-view]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLinks(container.querySelector('#links-content'));
      });
    });

    // Search
    container.querySelector('#links-search').addEventListener('input', Utils.debounce((e) => {
      filterQuery = e.target.value.trim().toLowerCase();
      renderLinks(container.querySelector('#links-content'));
    }, 200));

    // Add link
    container.querySelector('#add-link-btn').addEventListener('click', () => {
      showAddLinkModal(() => render(container));
    });

    renderLinks(container.querySelector('#links-content'));
  }

  function getFilteredLinks() {
    const links = Store.quickLinks.getAll();
    if (!filterQuery) return links;
    return links.filter(l =>
      l.name.toLowerCase().includes(filterQuery) ||
      l.url.toLowerCase().includes(filterQuery)
    );
  }

  function renderLinks(container) {
    const links = getFilteredLinks();

    if (links.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          ${Utils.icons.links}
          <p>${filterQuery ? 'No links match your search.' : 'No quick links yet. Add your first link!'}</p>
        </div>
      `;
      return;
    }

    if (currentView === 'gallery') {
      renderGallery(container, links);
    } else {
      renderList(container, links);
    }
  }

  function renderGallery(container, links) {
    const gallery = document.createElement('div');
    gallery.className = 'quicklinks-gallery';

    links.forEach(link => {
      const card = document.createElement('div');
      card.className = 'quicklink-card';

      const faviconHtml = link.favicon
        ? `<img class="quicklink-favicon" src="${Utils.escapeHtml(link.favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="quicklink-favicon-placeholder" style="display:none">${link.name.charAt(0).toUpperCase()}</div>`
        : `<div class="quicklink-favicon-placeholder">${link.name.charAt(0).toUpperCase()}</div>`;

      card.innerHTML = `
        <div class="quicklink-card-actions">
          <button class="btn-icon edit-link-btn" data-id="${link.id}" title="Edit">${Utils.icons.edit}</button>
          <button class="btn-icon delete-link-btn" data-id="${link.id}" title="Delete" style="color:#dc2626">${Utils.icons.trash}</button>
        </div>
        ${faviconHtml}
        <div class="quicklink-name">${Utils.escapeHtml(link.name)}</div>
        <div class="quicklink-url">${Utils.getDomain(link.url)}</div>
      `;

      // Open link
      card.addEventListener('click', (e) => {
        if (e.target.closest('.quicklink-card-actions')) return;
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Edit
      card.querySelector('.edit-link-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showEditLinkModal(link, () => {
          const pageContent = document.getElementById('page-content');
          if (pageContent) render(pageContent);
        });
      });

      // Delete
      card.querySelector('.delete-link-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${link.name}"?`)) {
          Store.quickLinks.delete(link.id);
          Utils.toast('Link removed', 'error');
          const pageContent = document.getElementById('page-content');
          if (pageContent) render(pageContent);
        }
      });

      gallery.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(gallery);
  }

  function renderList(container, links) {
    const list = document.createElement('div');
    list.className = 'quicklinks-list';

    links.forEach(link => {
      const item = document.createElement('div');
      item.className = 'quicklink-list-item';

      const faviconHtml = link.favicon
        ? `<img class="quicklink-list-favicon" src="${Utils.escapeHtml(link.favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="quicklink-list-favicon-placeholder" style="display:none">${link.name.charAt(0).toUpperCase()}</div>`
        : `<div class="quicklink-list-favicon-placeholder">${link.name.charAt(0).toUpperCase()}</div>`;

      item.innerHTML = `
        ${faviconHtml}
        <div class="quicklink-list-info">
          <div class="quicklink-list-name">${Utils.escapeHtml(link.name)}</div>
          <div class="quicklink-list-url">${Utils.escapeHtml(link.url)}</div>
        </div>
        <div class="quicklink-list-actions">
          <button class="btn-icon edit-link-btn" data-id="${link.id}" title="Edit">${Utils.icons.edit}</button>
          <button class="btn-icon" title="Open" style="color:var(--accent)">${Utils.icons.externalLink}</button>
          <button class="btn-icon delete-link-btn" data-id="${link.id}" title="Delete" style="color:#dc2626">${Utils.icons.trash}</button>
        </div>
      `;

      // Open link
      item.addEventListener('click', (e) => {
        if (e.target.closest('.quicklink-list-actions')) return;
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Edit
      item.querySelector('.edit-link-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showEditLinkModal(link, () => {
          const pageContent = document.getElementById('page-content');
          if (pageContent) render(pageContent);
        });
      });

      // Delete
      item.querySelector('.delete-link-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${link.name}"?`)) {
          Store.quickLinks.delete(link.id);
          Utils.toast('Link removed', 'error');
          const pageContent = document.getElementById('page-content');
          if (pageContent) render(pageContent);
        }
      });

      list.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  // ============================================
  // Add Link Modal
  // ============================================
  function showAddLinkModal(onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <h3 class="modal-title">Add Quick Link</h3>
          <button class="btn-icon" id="close-link-modal">${Utils.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>URL *</label>
            <input type="url" id="link-url" placeholder="https://example.com" />
          </div>
          <div id="link-preview" class="hidden">
            <div class="add-link-preview">
              <img id="preview-favicon" class="add-link-preview-favicon" src="" alt="" />
              <div>
                <div class="add-link-preview-title" id="preview-title">Loading...</div>
                <div class="add-link-preview-url" id="preview-url"></div>
              </div>
            </div>
          </div>
          <div class="form-group mt-2">
            <label>Name *</label>
            <input type="text" id="link-name" placeholder="Link name" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-link-modal">Cancel</button>
          <button class="btn btn-primary" id="save-link-modal">Add Link</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#link-url').focus(), 50);

    const close = () => overlay.remove();
    overlay.querySelector('#close-link-modal').addEventListener('click', close);
    overlay.querySelector('#cancel-link-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // URL input - auto-fill name and favicon
    overlay.querySelector('#link-url').addEventListener('blur', () => {
      const url = Utils.normalizeUrl(overlay.querySelector('#link-url').value.trim());
      if (!url) return;

      overlay.querySelector('#link-url').value = url;

      const domain = Utils.getDomain(url);
      const faviconUrl = Utils.getFaviconUrl(url);

      // Auto-fill name if empty
      if (!overlay.querySelector('#link-name').value) {
        overlay.querySelector('#link-name').value = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0];
      }

      // Show preview
      const preview = overlay.querySelector('#link-preview');
      preview.classList.remove('hidden');
      overlay.querySelector('#preview-favicon').src = faviconUrl;
      overlay.querySelector('#preview-title').textContent = overlay.querySelector('#link-name').value || domain;
      overlay.querySelector('#preview-url').textContent = domain;
    });

    // Save
    overlay.querySelector('#save-link-modal').addEventListener('click', () => {
      const url = Utils.normalizeUrl(overlay.querySelector('#link-url').value.trim());
      const name = overlay.querySelector('#link-name').value.trim();

      if (!url) {
        overlay.querySelector('#link-url').focus();
        overlay.querySelector('#link-url').style.borderColor = '#dc2626';
        return;
      }
      if (!name) {
        overlay.querySelector('#link-name').focus();
        overlay.querySelector('#link-name').style.borderColor = '#dc2626';
        return;
      }

      Store.quickLinks.add({
        name,
        url,
        favicon: Utils.getFaviconUrl(url)
      });

      Utils.toast('Link added', 'success');
      close();
      if (onSave) onSave();
    });
  }

  function showEditLinkModal(link, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <h3 class="modal-title">Edit Link</h3>
          <button class="btn-icon" id="close-edit-link-modal">${Utils.icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="edit-link-name" value="${Utils.escapeHtml(link.name)}" />
          </div>
          <div class="form-group">
            <label>URL *</label>
            <input type="url" id="edit-link-url" value="${Utils.escapeHtml(link.url)}" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm" id="delete-edit-link-btn">Delete</button>
          <button class="btn btn-secondary" id="cancel-edit-link-modal">Cancel</button>
          <button class="btn btn-primary" id="save-edit-link-modal">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#close-edit-link-modal').addEventListener('click', close);
    overlay.querySelector('#cancel-edit-link-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#delete-edit-link-btn').addEventListener('click', () => {
      if (confirm(`Remove "${link.name}"?`)) {
        Store.quickLinks.delete(link.id);
        Utils.toast('Link removed', 'error');
        close();
        if (onSave) onSave();
      }
    });

    overlay.querySelector('#save-edit-link-modal').addEventListener('click', () => {
      const name = overlay.querySelector('#edit-link-name').value.trim();
      const url = Utils.normalizeUrl(overlay.querySelector('#edit-link-url').value.trim());

      if (!name || !url) return;

      Store.quickLinks.update(link.id, {
        name,
        url,
        favicon: Utils.getFaviconUrl(url)
      });

      Utils.toast('Link updated', 'success');
      close();
      if (onSave) onSave();
    });
  }

  return { render, showAddLinkModalPublic: showAddLinkModal };
})();
