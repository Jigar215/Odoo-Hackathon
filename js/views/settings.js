/**
 * views/settings.js — Warehouses table, Reorder rules, Settings section switcher
 * CoreInventory IMS
 */

// ── WAREHOUSES ────────────────────────────────────────────────────
function renderWarehouses() {
  const whs = q('SELECT * FROM warehouses');

  document.getElementById('wh-tbody').innerHTML = whs.map(w => {
    const pCount = q('SELECT COUNT(*) c FROM product_stock WHERE warehouse_id=? AND qty>0', [w.id])[0].c;
    const tStock = q('SELECT COALESCE(SUM(qty),0) s FROM product_stock WHERE warehouse_id=?', [w.id])[0].s;
    return `<tr>
      <td style="font-weight:500;">${w.name}</td>
      <td style="color:var(--text2);">${w.location}</td>
      <td style="font-family:var(--fm);">${pCount}</td>
      <td style="font-family:var(--fm);">${tStock}</td>
      <td><button class="btn xs" onclick="openWarehouseModal(${w.id})">Edit</button></td>
    </tr>`;
  }).join('');

  // Populate default warehouse <select> in general settings
  const sel = document.getElementById('set-defwh');
  if (sel) sel.innerHTML = whs.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
}

// ── REORDER RULES ─────────────────────────────────────────────────
function renderReorderRules() {
  const prods = q(
    'SELECT p.*, c.name cat FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.name'
  );

  document.getElementById('reorder-tbody').innerHTML = prods.map(p => {
    const s  = totalStock(p.id);
    const st = s === 0 ? 'out' : s < p.min_stock ? 'low' : 'ok';
    return `<tr>
      <td style="font-weight:500;">${p.name}</td>
      <td style="font-family:var(--fm);">${p.min_stock} ${p.uom}</td>
      <td style="font-family:var(--fm);">${p.reorder_qty} ${p.uom}</td>
      <td style="font-size:12px;color:var(--text2);">${p.supplier || '—'}</td>
      <td style="font-family:var(--fm);">${s}</td>
      <td><span class="badge ${st}">${st === 'out' ? 'Out' : st === 'low' ? '⚠ Reorder' : 'OK'}</span></td>
    </tr>`;
  }).join('');
}

// ── SECTION SWITCHER ──────────────────────────────────────────────
function showSettingsSection(sec, el) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sn-item').forEach(s => s.classList.remove('active'));
  document.getElementById('ss-' + sec).classList.add('active');
  el.classList.add('active');
  if (sec === 'warehouses') renderWarehouses();
  if (sec === 'reorder')    renderReorderRules();
}
