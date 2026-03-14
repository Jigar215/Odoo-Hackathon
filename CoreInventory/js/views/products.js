/**
 * views/products.js — Products list, filters, stock modal
 * CoreInventory IMS
 */

let prodCatFilter = 'all';
let prodWhFilter  = 'all';

function renderProducts() {
  const cats       = q('SELECT * FROM categories');
  const warehouses = q('SELECT * FROM warehouses');

  // ── Filter bar ─────────────────────────────────────────────────
  document.getElementById('prod-filters').innerHTML =
    `<span style="font-size:12px;color:var(--text3);">Category:</span>`
    + `<button class="fbtn ${prodCatFilter === 'all' ? 'active' : ''}" onclick="setProdFilter('cat','all')">All</button>`
    + cats.map(c =>
        `<button class="fbtn ${prodCatFilter == c.id ? 'active' : ''}" onclick="setProdFilter('cat',${c.id})">${c.name}</button>`
      ).join('')
    + `<div class="filter-sep"></div>`
    + `<span style="font-size:12px;color:var(--text3);">Warehouse:</span>`
    + `<button class="fbtn ${prodWhFilter === 'all' ? 'active' : ''}" onclick="setProdFilter('wh','all')">All</button>`
    + warehouses.map(w =>
        `<button class="fbtn ${prodWhFilter == w.id ? 'active' : ''}" onclick="setProdFilter('wh',${w.id})">${w.name}</button>`
      ).join('');

  // ── Query ──────────────────────────────────────────────────────
  let where = 'WHERE 1=1';
  if (prodCatFilter !== 'all') where += ` AND p.category_id=${prodCatFilter}`;
  const prods = q(
    `SELECT p.*, c.name cat_name, c.color cat_color
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${where}
     ORDER BY p.name`
  );

  // ── Rows ───────────────────────────────────────────────────────
  document.getElementById('prod-tbody').innerHTML = prods.map(p => {
    let stock;
    if (prodWhFilter === 'all') {
      stock = totalStock(p.id);
    } else {
      const r = q(
        'SELECT COALESCE(qty,0) s FROM product_stock WHERE product_id=? AND warehouse_id=?',
        [p.id, prodWhFilter]
      );
      stock = r[0]?.s || 0;
    }

    const st    = stock === 0 ? 'out' : stock < p.min_stock ? 'low' : 'ok';
    const wh    = q(
      'SELECT w.name, ps.qty FROM product_stock ps JOIN warehouses w ON ps.warehouse_id=w.id WHERE ps.product_id=? AND ps.qty>0',
      [p.id]
    );
    const whTip = wh.map(w => `${w.name}:${w.qty}`).join(' | ');

    return `<tr>
      <td>
        <div style="font-weight:500;">${p.name}</div>
        <div style="font-size:11px;color:var(--text3);">${p.sku}</div>
      </td>
      <td style="font-family:var(--fm);font-size:12px;color:var(--text3);">${p.sku}</td>
      <td>
        <span class="tag" style="background:${p.cat_color}22;color:${p.cat_color};font-size:11px;">
          ${p.cat_name || '—'}
        </span>
      </td>
      <td style="color:var(--text3);">${p.uom}</td>
      <td>
        <span style="font-family:var(--fm);font-weight:600;" title="${whTip}">${stock}</span>
      </td>
      <td style="font-family:var(--fm);color:var(--text3);">${p.min_stock}</td>
      <td style="font-size:12px;color:var(--text2);" title="${whTip}">
        ${wh.map(w => `<span class="tag" style="margin-right:3px;font-size:10px;">${w.name.split(' ')[0]}</span>`).join('')}
      </td>
      <td style="font-size:12px;">
        ↑${p.reorder_qty} ${p.uom} / <span style="color:var(--text3);">${p.supplier || '—'}</span>
      </td>
      <td>
        <span class="badge ${st}">
          ${st === 'out' ? 'Out of Stock' : st === 'low' ? 'Low Stock' : 'In Stock'}
        </span>
      </td>
      <td>
        <button class="btn xs" onclick="openProductModal(${p.id})">Edit</button>
        <button class="btn xs" onclick="viewProductStock(${p.id},'${p.name.replace(/'/g,"\\'")}')">Stock</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="10" class="tbl-empty">No products found</td></tr>`;
}

function setProdFilter(type, val) {
  if (type === 'cat') prodCatFilter = val;
  else prodWhFilter = val;
  renderProducts();
}

// ── Stock breakdown modal ──────────────────────────────────────────
function viewProductStock(pid, pname) {
  const rows  = q(
    'SELECT w.name, ps.qty, p.uom FROM product_stock ps JOIN warehouses w ON ps.warehouse_id=w.id JOIN products p ON ps.product_id=p.id WHERE ps.product_id=?',
    [pid]
  );
  const total = rows.reduce((a, r) => a + r.qty, 0);

  openModal(`
    <div class="mhdr">
      <div class="mtitle">Stock: ${pname}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px;">Stock availability per warehouse location</p>
      <div class="loc-stock">
        ${rows.map(r => `
          <div class="loc-row">
            <div class="loc-name">${r.name}</div>
            <div style="font-family:var(--fm);color:var(--accent);">${r.qty} ${r.uom}</div>
            <div style="flex:1;margin:0 12px;background:var(--bg4);border-radius:20px;height:6px;overflow:hidden;">
              <div style="height:100%;background:var(--accent);border-radius:20px;width:${total ? Math.round(r.qty / total * 100) : 0}%;"></div>
            </div>
            <div style="font-size:11px;color:var(--text3);">${total ? Math.round(r.qty / total * 100) : 0}%</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:var(--r);display:flex;justify-content:space-between;font-size:14px;">
        <span style="color:var(--text2);">Total Stock</span>
        <span style="font-family:var(--fm);font-weight:600;">${total} ${rows[0]?.uom || ''}</span>
      </div>
    </div>
    <div class="mfoot"><button class="btn" onclick="closeModal()">Close</button></div>
  `);
}

// ── Global search integration ──────────────────────────────────────
function globalSearch(val) {
  if (!val) { renderView(currentView); return; }

  if (currentView === 'products') {
    const prods = q(
      'SELECT p.*, c.name cat_name, c.color cat_color FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.name LIKE ? OR p.sku LIKE ? ORDER BY p.name',
      [`%${val}%`, `%${val}%`]
    );
    document.getElementById('prod-tbody').innerHTML = prods.map(p => {
      const s  = totalStock(p.id);
      const st = s === 0 ? 'out' : s < p.min_stock ? 'low' : 'ok';
      return `<tr>
        <td style="font-weight:500;">${p.name}</td>
        <td style="font-family:var(--fm);font-size:12px;color:var(--text3);">${p.sku}</td>
        <td><span class="tag" style="font-size:11px;">${p.cat_name || '—'}</span></td>
        <td>${p.uom}</td>
        <td style="font-family:var(--fm);">${s}</td>
        <td style="font-family:var(--fm);color:var(--text3);">${p.min_stock}</td>
        <td></td><td></td>
        <td><span class="badge ${st}">${st === 'out' ? 'Out' : st === 'low' ? 'Low' : 'OK'}</span></td>
        <td><button class="btn xs" onclick="openProductModal(${p.id})">Edit</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="10" class="tbl-empty">No results for "${val}"</td></tr>`;
  }
}
