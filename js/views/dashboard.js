/**
 * views/dashboard.js — Dashboard: KPI cards, recent ops, low stock, category chart
 * CoreInventory IMS
 */

function renderDashboard() {
  const prodRows = q('SELECT p.id, p.name, p.min_stock FROM products p');
  let low = 0, out = 0;
  prodRows.forEach(p => {
    const s = totalStock(p.id);
    if (s === 0) out++;
    else if (s < p.min_stock) low++;
  });

  const total    = prodRows.length;
  const whCount  = q('SELECT COUNT(*) c FROM warehouses')[0].c;
  const pendRec  = q("SELECT COUNT(*) c FROM operations WHERE type='receipt'    AND status IN ('draft','waiting','ready')")[0].c;
  const pendDel  = q("SELECT COUNT(*) c FROM operations WHERE type='delivery'   AND status IN ('draft','waiting','ready','picking','packing')")[0].c;
  const pendTrf  = q("SELECT COUNT(*) c FROM operations WHERE type='transfer'   AND status IN ('draft','ready')")[0].c;

  // ── KPI Grid ───────────────────────────────────────────────────
  document.getElementById('kpi-grid').innerHTML = `
    ${kpiCard('var(--accent)',  'var(--accentbg)',  'var(--accent)',  iconBox(),      'Total Products',       total,    `Across ${whCount} warehouses`)}
    ${kpiCard('var(--amber)',   'var(--amberbg)',   'var(--amber)',   iconAlert(),    'Low Stock',             low,     'Below minimum level')}
    ${kpiCard('var(--red)',     'var(--redbg)',     'var(--red)',     iconCircleX(),  'Out of Stock',          out,     'Immediate action needed')}
    ${kpiCard('var(--green)',   'var(--greenbg)',   'var(--green)',   iconReceipt(),  'Pending Receipts',      pendRec, 'Awaiting validation')}
    ${kpiCard('var(--blue)',    'var(--bluebg)',    'var(--blue)',    iconTruck(),    'Pending Deliveries',    pendDel, 'To be dispatched')}
    ${kpiCard('var(--violet)',  'var(--violetbg)',  'var(--violet)',  iconTransfer(), 'Scheduled Transfers',   pendTrf, 'Internal movements')}
  `;

  // ── Recent Operations ──────────────────────────────────────────
  const recent = q('SELECT type,reference,date,status FROM operations ORDER BY id DESC LIMIT 8');
  document.getElementById('dash-recent-ops').innerHTML = recent.map(o => `
    <tr>
      <td><span style="text-transform:capitalize;font-weight:500;font-size:12px;">${o.type}</span></td>
      <td style="font-family:var(--fm);font-size:12px;">${o.reference}</td>
      <td style="color:var(--text3);font-size:12px;">${o.date}</td>
      <td><span class="badge ${o.status}">${o.status}</span></td>
    </tr>`).join('');

  // ── Low / Out of Stock ─────────────────────────────────────────
  const lowItems = prodRows.filter(p => totalStock(p.id) < p.min_stock).slice(0, 6);
  document.getElementById('dash-low-stock').innerHTML = lowItems.length
    ? lowItems.map(p => {
        const s   = totalStock(p.id);
        const uom = q('SELECT uom FROM products WHERE id=?', [p.id])[0]?.uom || '';
        const st  = s === 0 ? 'out' : 'low';
        return `<tr>
          <td style="font-weight:500;font-size:13px;">${p.name}</td>
          <td style="font-family:var(--fm);">${s} ${uom}</td>
          <td style="font-family:var(--fm);color:var(--text3);">${p.min_stock}</td>
          <td><span class="badge ${st}">${st === 'out' ? 'Out' : 'Low'}</span></td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--text4);padding:20px;">All stock levels healthy ✓</td></tr>';

  // ── Category Chart ─────────────────────────────────────────────
  const cats   = q('SELECT c.id, c.name, c.color FROM categories c');
  const totals = cats.map(c =>
    q('SELECT COALESCE(SUM(ps.qty),0) s FROM products p LEFT JOIN product_stock ps ON p.id=ps.product_id WHERE p.category_id=?', [c.id])[0]?.s || 0
  );
  const maxVal = Math.max(...totals, 1);

  document.getElementById('cat-chart').innerHTML = cats.map((c, i) => {
    const total = totals[i];
    const h     = Math.max(8, Math.round((total / maxVal) * 90));
    return `<div class="cat-bar-wrap">
      <div class="cat-bar-val">${total}</div>
      <div class="cat-bar" style="height:${h}px;background:${c.color}33;border-top:2px solid ${c.color};"></div>
      <div class="cat-bar-lbl">${c.name.split(' ')[0]}</div>
    </div>`;
  }).join('');
}

// ── KPI helper builders ────────────────────────────────────────────
function kpiCard(accent, iconBg, iconColor, iconSvg, label, value, sub) {
  return `
    <div class="kpi">
      <div class="kpi-accent" style="background:${accent}"></div>
      <div class="kpi-icon" style="background:${iconBg};">
        <svg viewBox="0 0 24 24" fill="${iconColor}" width="16" height="16">${iconSvg}</svg>
      </div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-val">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
}

// ── SVG icon paths ─────────────────────────────────────────────────
function iconBox()      { return '<path d="M20 7l-8-4-8 4v10l8 4 8-4V7z"/>'; }
function iconAlert()    { return '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>'; }
function iconCircleX()  { return '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'; }
function iconReceipt()  { return '<path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 3h2v2h2v2h-2v2h-2v-2H9V8h2V6z"/>'; }
function iconTruck()    { return '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.7 1.3 3 3 3s3-1.3 3-3h6c0 1.7 1.3 3 3 3s3-1.3 3-3h2v-5l-3-4z"/>'; }
function iconTransfer() { return '<path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>'; }
