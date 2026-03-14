/**
 * views/operations.js — Receipts, Deliveries, Transfers, Adjustments
 * CoreInventory IMS
 */

let opFilters = {};

const OP_STATUSES = ['all', 'draft', 'waiting', 'ready', 'done', 'canceled'];

// ── RENDER ────────────────────────────────────────────────────────
function renderOps(type) {
  if (!opFilters[type]) opFilters[type] = 'all';

  const filterIdMap = { receipt: 'rec', delivery: 'del', transfer: 'trf', adjustment: 'adj' };
  const filterId    = filterIdMap[type] + '-filters';

  // Status filter pills
  document.getElementById(filterId).innerHTML =
    `<span style="font-size:12px;color:var(--text3);">Status:</span>`
    + OP_STATUSES.map(s =>
        `<button class="fbtn ${opFilters[type] === s ? 'active' : ''}" onclick="setOpFilter('${type}','${s}')">${s}</button>`
      ).join('');

  // Query
  const where = opFilters[type] === 'all'
    ? `WHERE type='${type}'`
    : `WHERE type='${type}' AND status='${opFilters[type]}'`;
  const ops = q(
    `SELECT o.*, (SELECT COUNT(*) FROM operation_lines ol WHERE ol.operation_id=o.id) ic
     FROM operations o ${where} ORDER BY id DESC`
  );

  // Tbody
  const tbodyMap = { receipt: 'rec-tbody', delivery: 'del-tbody', transfer: 'trf-tbody', adjustment: 'adj-tbody' };
  const tbody    = document.getElementById(tbodyMap[type]);

  tbody.innerHTML = ops.map(o => {
    const canValidate = ['draft', 'waiting', 'ready'].includes(o.status);
    const isDeliv     = type === 'delivery';
    const isTrf       = type === 'transfer';
    const isAdj       = type === 'adjustment';

    const stepCol      = isDeliv ? `<td><span class="badge ${o.delivery_step}">${o.delivery_step}</span></td>` : '';
    const partyCol     = !isTrf  ? `<td style="font-weight:500;">${o.party || '—'}</td>` : '';
    const locationsCol = isTrf   ? `<td style="font-size:12px;">${o.from_location}</td><td style="font-size:12px;">${o.to_location}</td>` : '';
    const adjLocCol    = isAdj   ? `<td style="font-size:12px;">${o.from_location}</td>` : '';

    const actions = [
      `<button class="btn xs" onclick="viewOp(${o.id})">View</button>`,
      canValidate && isDeliv && o.delivery_step === 'picking'
        ? `<button class="btn xs success" onclick="advanceDelivery(${o.id},'packing')">→ Pack</button>` : '',
      canValidate && isDeliv && o.delivery_step === 'packing'
        ? `<button class="btn xs primary" onclick="validateOp(${o.id},'${type}')">Validate</button>` : '',
      canValidate && !isDeliv
        ? `<button class="btn xs primary" onclick="validateOp(${o.id},'${type}')">Validate</button>` : '',
      canValidate
        ? `<button class="btn xs danger" onclick="cancelOp(${o.id})">Cancel</button>` : '',
    ].filter(Boolean).join(' ');

    return `<tr>
      <td style="font-family:var(--fm);font-size:12px;">${o.reference}</td>
      ${partyCol}${locationsCol}${adjLocCol}
      <td style="color:var(--text3);font-size:12px;">${o.date}</td>
      <td style="font-family:var(--fm);">${o.ic}</td>
      ${stepCol}
      <td><span class="badge ${o.status}">${o.status}</span></td>
      <td style="white-space:nowrap;">${actions}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" class="tbl-empty">No records found</td></tr>`;

  updateBadges();
}

function setOpFilter(type, status) {
  opFilters[type] = status;
  renderOps(type);
}

// ── CANCEL ────────────────────────────────────────────────────────
function cancelOp(id) {
  if (!confirm('Cancel this operation?')) return;
  run("UPDATE operations SET status='canceled' WHERE id=?", [id]);
  toast('Operation canceled', 'info');
  renderView(currentView);
}

// ── DELIVERY STEP ADVANCE (Pick → Pack) ───────────────────────────
function advanceDelivery(id, newStep) {
  run("UPDATE operations SET delivery_step=?, status='ready' WHERE id=?", [newStep, id]);
  toast(`Delivery moved to: ${newStep}`, 'success');
  renderOps('delivery');
}

// ── VALIDATE OPERATION ────────────────────────────────────────────
function validateOp(id, type) {
  const op = q('SELECT * FROM operations WHERE id=?', [id])[0];
  if (!op || op.status === 'done') return;
  if (type === 'delivery' && op.delivery_step !== 'packing') {
    return toast('Complete picking & packing steps first', 'error');
  }

  const lines = q(
    'SELECT ol.*, p.name, p.uom FROM operation_lines ol JOIN products p ON ol.product_id=p.id WHERE ol.operation_id=?',
    [id]
  );
  const today = new Date().toISOString().slice(0, 10);

  for (const l of lines) {
    let delta = 0, fromLoc = '', toLoc = '';

    if (type === 'receipt') {
      delta = l.qty; fromLoc = 'Vendor'; toLoc = op.to_location;
      const cur = q('SELECT qty FROM product_stock WHERE product_id=? AND warehouse_id=?', [l.product_id, l.warehouse_id])[0];
      if (cur) run('UPDATE product_stock SET qty=qty+? WHERE product_id=? AND warehouse_id=?', [delta, l.product_id, l.warehouse_id]);
      else     run('INSERT INTO product_stock(product_id,warehouse_id,qty) VALUES(?,?,?)',       [l.product_id, l.warehouse_id, delta]);

    } else if (type === 'delivery') {
      delta = -l.qty; fromLoc = op.from_location; toLoc = 'Customer';
      run('UPDATE product_stock SET qty=MAX(0,qty+?) WHERE product_id=? AND warehouse_id=?', [delta, l.product_id, l.warehouse_id]);

    } else if (type === 'transfer') {
      fromLoc = op.from_location; toLoc = op.to_location; delta = 0;
      const fromWH = q("SELECT id FROM warehouses WHERE name=?", [op.from_location])[0]?.id || 1;
      const toWH   = q("SELECT id FROM warehouses WHERE name=?", [op.to_location])[0]?.id   || 1;
      run('UPDATE product_stock SET qty=MAX(0,qty-?) WHERE product_id=? AND warehouse_id=?', [l.qty, l.product_id, fromWH]);
      const toRow = q('SELECT qty FROM product_stock WHERE product_id=? AND warehouse_id=?', [l.product_id, toWH])[0];
      if (toRow) run('UPDATE product_stock SET qty=qty+? WHERE product_id=? AND warehouse_id=?', [l.qty, l.product_id, toWH]);
      else       run('INSERT INTO product_stock(product_id,warehouse_id,qty) VALUES(?,?,?)',      [l.product_id, toWH, l.qty]);

    } else if (type === 'adjustment') {
      const counted = prompt(`Physical count for "${l.name}" (system: ${totalStock(l.product_id)}):`);
      if (counted === null) return;
      const diff = parseFloat(counted) - totalStock(l.product_id);
      delta = diff; fromLoc = op.from_location; toLoc = op.from_location;
      run('UPDATE product_stock SET qty=MAX(0,qty+?) WHERE product_id=? AND warehouse_id=?', [diff, l.product_id, l.warehouse_id]);
    }

    const newBal = totalStock(l.product_id);
    run(
      'INSERT INTO stock_ledger(date,product_id,operation_type,reference,from_loc,to_loc,qty,balance) VALUES(?,?,?,?,?,?,?,?)',
      [today, l.product_id, type, op.reference, fromLoc, toLoc, delta, newBal]
    );
  }

  run("UPDATE operations SET status='done' WHERE id=?", [id]);
  toast(`${op.reference} validated ✓`, 'success');
  buildNotifications();
  renderView(currentView);
  if (currentView !== 'dashboard') renderDashboard();
}

// ── VIEW OPERATION DETAIL ─────────────────────────────────────────
function viewOp(id) {
  const op    = q('SELECT * FROM operations WHERE id=?', [id])[0];
  const lines = q(
    'SELECT ol.qty, ol.warehouse_id, p.name, p.sku, p.uom FROM operation_lines ol JOIN products p ON ol.product_id=p.id WHERE ol.operation_id=?',
    [id]
  );

  const isDelivery = op.type === 'delivery';
  const steps = isDelivery ? `
    <div class="steps">
      <div class="step ${op.delivery_step !== 'picking' || op.status === 'done' ? 'done-step' : 'active-step'}">1. Picking</div>
      <div class="step ${op.delivery_step === 'packing' && op.status !== 'done' ? 'active-step' : op.status === 'done' ? 'done-step' : ''}">2. Packing</div>
      <div class="step ${op.status === 'done' ? 'done-step' : ''}">3. Validate</div>
    </div>` : '';

  openModal(`
    <div class="mhdr">
      <div class="mtitle">${op.reference}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      ${steps}
      <div class="fgrid" style="margin-bottom:18px;">
        <div class="fg"><label>Status</label><div><span class="badge ${op.status}">${op.status}</span></div></div>
        <div class="fg"><label>Date</label><div style="font-size:13px;">${op.date}</div></div>
        <div class="fg"><label>${op.type === 'transfer' ? 'From' : 'Party'}</label>
          <div style="font-size:13px;">${op.party || op.from_location}</div></div>
        <div class="fg"><label>${op.type === 'transfer' ? 'To' : 'Location'}</label>
          <div style="font-size:13px;">${op.to_location || '—'}</div></div>
        ${op.notes ? `<div class="fg full"><label>Notes</label><div style="font-size:13px;color:var(--text2);">${op.notes}</div></div>` : ''}
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;">Line Items</div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>UOM</th></tr></thead>
          <tbody>
            ${lines.map(l => `
              <tr>
                <td style="font-weight:500;">${l.name}</td>
                <td style="font-family:var(--fm);font-size:12px;color:var(--text3);">${l.sku}</td>
                <td style="font-family:var(--fm);">${l.qty}</td>
                <td style="color:var(--text3);">${l.uom}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="mfoot"><button class="btn" onclick="closeModal()">Close</button></div>
  `);
}
