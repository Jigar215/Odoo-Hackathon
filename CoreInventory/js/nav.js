/**
 * nav.js — Navigation, view routing, sidebar toggle
 * CoreInventory IMS
 */

let currentView    = 'dashboard';
let sidebarCollapsed = false;

const VIEW_TITLES = {
  dashboard:   'Dashboard',
  products:    'Products',
  categories:  'Categories',
  receipts:    'Receipts — Incoming Stock',
  deliveries:  'Delivery Orders — Outgoing Stock',
  transfers:   'Internal Transfers',
  adjustments: 'Stock Adjustments',
  ledger:      'Move History / Stock Ledger',
  settings:    'Settings',
  profile:     'My Profile',
};

// ── NAVIGATE ──────────────────────────────────────────────────────
function nav(view) {
  currentView = view;

  // Activate view panel
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');

  // Highlight sidebar item
  document.querySelectorAll('.sb-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + view);
  if (navEl) navEl.classList.add('active');

  // Update page title
  document.getElementById('page-title').textContent = VIEW_TITLES[view] || view;

  renderView(view);
  closeProfileDD();

  // Update add button label / visibility
  const addLabels = {
    products:    'New Product',
    categories:  'New Category',
    receipts:    'New Receipt',
    deliveries:  'New Delivery',
    transfers:   'New Transfer',
    adjustments: 'New Adjustment',
    settings:    '',
    profile:     '',
  };
  const btn = document.getElementById('add-btn');
  if (addLabels[view] === '') {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'flex';
    btn.childNodes[1].nodeValue = addLabels[view] || 'New';
  }
}

// ── RENDER DISPATCHER ─────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderProducts();
  renderCategories();
  renderOps('receipt');
  renderOps('delivery');
  renderOps('transfer');
  renderOps('adjustment');
  renderLedger();
  renderWarehouses();
  renderReorderRules();
  updateBadges();
  initAI();
}

function renderView(v) {
  const dispatch = {
    dashboard:   renderDashboard,
    products:    renderProducts,
    categories:  renderCategories,
    receipts:    () => renderOps('receipt'),
    deliveries:  () => renderOps('delivery'),
    transfers:   () => renderOps('transfer'),
    adjustments: () => renderOps('adjustment'),
    ledger:      renderLedger,
    settings:    renderWarehouses,
    profile:     () => {},
  };
  dispatch[v]?.();
  if (v === 'settings') renderReorderRules();
}

// ── SIDEBAR ───────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}
