/**
 * views/ledger.js — Stock movement history / ledger
 * CoreInventory IMS
 */

let ledgerTypeFilter = 'all';

function renderLedger() {
  const where = ledgerTypeFilter === 'all'
    ? ''
    : `AND sl.operation_type='${ledgerTypeFilter}'`;

  const rows = q(
    `SELECT sl.*, p.name, p.uom
     FROM stock_ledger sl
     JOIN products p ON sl.product_id = p.id
     WHERE 1=1 ${where}
     ORDER BY sl.id DESC
     LIMIT 100`
  );

  document.getElementById('led-tbody').innerHTML = rows.map(r => {
    const qClass = r.qty > 0 ? 'color:var(--green)' : r.qty < 0 ? 'color:var(--red)' : 'color:var(--text3)';
    const qStr   = r.qty === 0 ? '—' : (r.qty > 0 ? '+' : '') + r.qty + ' ' + r.uom;
    return `<tr>
      <td style="font-family:var(--fm);font-size:12px;">${r.date}</td>
      <td style="font-weight:500;">${r.name}</td>
      <td><span class="tag" style="text-transform:capitalize;">${r.operation_type}</span></td>
      <td style="font-family:var(--fm);font-size:12px;color:var(--text3);">${r.reference}</td>
      <td style="font-size:12px;color:var(--text2);">${r.from_loc}</td>
      <td style="font-size:12px;color:var(--text2);">${r.to_loc}</td>
      <td style="font-family:var(--fm);font-weight:600;${qClass}">${qStr}</td>
      <td style="font-family:var(--fm);">${r.balance} ${r.uom}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="tbl-empty">No ledger entries</td></tr>`;
}

function filterLedger(type, btn) {
  ledgerTypeFilter = type;
  document.querySelectorAll('#led-filters .fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLedger();
}
