/**
 * ui.js — Toast notifications, alert badges, notification dropdown, dropdowns
 * CoreInventory IMS
 */

// ── TOAST ─────────────────────────────────────────────────────────
/**
 * Show a transient toast message.
 * @param {string} msg
 * @param {'info'|'success'|'error'} type
 */
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el        = document.createElement('div');
  el.className    = `toast ${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const color = type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--accent)';
  el.innerHTML = `<span style="font-weight:600;color:${color}">${icons[type] || '•'}</span>${msg}`;

  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(8px)';
    el.style.transition = 'all .3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ── SIDEBAR BADGES ────────────────────────────────────────────────
function updateBadges() {
  const pendRec = q("SELECT COUNT(*) c FROM operations WHERE type='receipt'  AND status IN ('draft','waiting','ready')")[0].c;
  const pendDel = q("SELECT COUNT(*) c FROM operations WHERE type='delivery' AND status IN ('draft','waiting','ready')")[0].c;

  const recBadge = document.getElementById('badge-receipts');
  recBadge.textContent    = pendRec || '';
  recBadge.style.display  = pendRec ? '' : 'none';

  const delBadge = document.getElementById('badge-deliveries');
  delBadge.textContent    = pendDel || '';
  delBadge.style.display  = pendDel ? '' : 'none';
}

// ── NOTIFICATION DROPDOWN ─────────────────────────────────────────
function buildNotifications() {
  const notifs  = [];
  const prods   = q('SELECT p.id, p.name, p.min_stock FROM products p');

  prods.forEach(p => {
    const s = totalStock(p.id);
    if (s === 0) {
      notifs.push({ title: `Out of Stock: ${p.name}`, desc: 'Needs immediate restocking', type: 'red' });
    } else if (s < p.min_stock) {
      notifs.push({ title: `Low Stock: ${p.name}`, desc: `Only ${s} units left (min: ${p.min_stock})`, type: 'amber' });
    }
  });

  const pendRec = q("SELECT COUNT(*) c FROM operations WHERE type='receipt' AND status IN ('waiting','ready')")[0].c;
  if (pendRec > 0) {
    notifs.push({ title: `${pendRec} Receipt(s) awaiting validation`, desc: 'Ready to receive goods', type: 'green' });
  }

  document.getElementById('notif-dot').style.display = notifs.length ? 'block' : 'none';
  document.getElementById('notif-list').innerHTML = notifs.slice(0, 8).map(n => `
    <div class="notif-item" style="border-left:2px solid var(--${n.type});">
      <div class="notif-title">${n.title}</div>
      <div class="notif-desc">${n.desc}</div>
    </div>`).join('')
    || '<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px;">No alerts</div>';
}

function toggleNotifDD() {
  document.getElementById('notif-dd').classList.toggle('open');
}

// ── PROFILE DROPDOWN ──────────────────────────────────────────────
function toggleProfileDD() {
  document.getElementById('profile-dd').classList.toggle('open');
}

function closeProfileDD() {
  document.getElementById('profile-dd').classList.remove('open');
}

// ── GLOBAL CLICK HANDLER — close dropdowns on outside click ───────
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-dd')) {
    document.getElementById('notif-dd').classList.remove('open');
  }
  if (!e.target.closest('.sb-footer')) {
    closeProfileDD();
  }
});
