/**
 * modals.js — All modal open / save / delete handlers
 * CoreInventory IMS
 */

// ── MODAL HELPERS ─────────────────────────────────────────────────
function openModal(html, wide = false) {
  const box = document.getElementById('modal-box');
  box.innerHTML  = html;
  box.className  = 'modal' + (wide ? ' wide' : '');
  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
}

// ── PRODUCT MODAL ─────────────────────────────────────────────────
function openProductModal(id = null) {
  const cats = q('SELECT * FROM categories');
  const whs  = q('SELECT * FROM warehouses');
  const p    = id ? q('SELECT * FROM products WHERE id=?', [id])[0] : null;

  openModal(`
    <div class="mhdr">
      <div class="mtitle">${p ? 'Edit Product' : 'New Product'}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="fgrid">
        <div class="fg full">
          <label>Product Name *</label>
          <input class="fi" id="f-pname" placeholder="e.g. Steel Rods" value="${p?.name || ''}"/>
        </div>
        <div class="fg">
          <label>SKU / Code *</label>
          <input class="fi" id="f-psku" placeholder="SKU-001" value="${p?.sku || ''}"/>
        </div>
        <div class="fg">
          <label>Unit of Measure</label>
          <select class="fi" id="f-puom">
            ${['pcs','kg','L','m','box','set','dozen'].map(u =>
                `<option ${p?.uom === u ? 'selected' : ''} value="${u}">${u}</option>`
              ).join('')}
          </select>
        </div>
        <div class="fg">
          <label>Category</label>
          <select class="fi" id="f-pcat">
            <option value="">— None —</option>
            ${cats.map(c =>
                `<option value="${c.id}" ${p?.category_id === c.id ? 'selected' : ''}>${c.name}</option>`
              ).join('')}
          </select>
        </div>
        <div class="fg">
          <label>Default Warehouse</label>
          <select class="fi" id="f-pwh">
            ${whs.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label>Initial / Set Stock</label>
          <input class="fi" type="number" id="f-pstock" value="${p ? totalStock(p.id) : 0}" min="0"/>
        </div>
        <div class="fg">
          <label>Min Stock (Reorder Trigger)</label>
          <input class="fi" type="number" id="f-pmin" value="${p?.min_stock || 10}" min="0"/>
        </div>
        <div class="fg">
          <label>Reorder Quantity</label>
          <input class="fi" type="number" id="f-preorderqty" value="${p?.reorder_qty || 50}" min="0"/>
        </div>
        <div class="fg full">
          <label>Preferred Supplier</label>
          <input class="fi" id="f-psup" placeholder="Supplier name" value="${p?.supplier || ''}"/>
        </div>
      </div>
    </div>
    <div class="mfoot">
      ${p ? `<button class="btn danger" onclick="deleteProduct(${p.id})">Delete</button>` : ''}
      <button class="btn ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveProduct(${p?.id || 'null'})">${p ? 'Save Changes' : 'Create Product'}</button>
    </div>
  `);
}

function saveProduct(id) {
  const name  = document.getElementById('f-pname').value.trim();
  const sku   = document.getElementById('f-psku').value.trim();
  if (!name || !sku) return toast('Name and SKU are required', 'error');

  const uom   = document.getElementById('f-puom').value;
  const cat   = document.getElementById('f-pcat').value || null;
  const whId  = +document.getElementById('f-pwh').value;
  const stock = +document.getElementById('f-pstock').value;
  const min   = +document.getElementById('f-pmin').value;
  const rqty  = +document.getElementById('f-preorderqty').value;
  const sup   = document.getElementById('f-psup').value.trim();

  if (id === 'null' || !id) {
    run(
      'INSERT INTO products(name,sku,category_id,uom,min_stock,reorder_qty,supplier) VALUES(?,?,?,?,?,?,?)',
      [name, sku, cat, uom, min, rqty, sup]
    );
    const newId = lastId();
    if (stock > 0) run('INSERT INTO product_stock(product_id,warehouse_id,qty) VALUES(?,?,?)', [newId, whId, stock]);
    toast('Product created', 'success');
  } else {
    run(
      'UPDATE products SET name=?,sku=?,category_id=?,uom=?,min_stock=?,reorder_qty=?,supplier=? WHERE id=?',
      [name, sku, cat, uom, min, rqty, sup, id]
    );
    const cur = q('SELECT qty FROM product_stock WHERE product_id=? AND warehouse_id=?', [id, whId])[0];
    if (cur) run('UPDATE product_stock SET qty=? WHERE product_id=? AND warehouse_id=?', [stock, id, whId]);
    else     run('INSERT INTO product_stock(product_id,warehouse_id,qty) VALUES(?,?,?)',  [id, whId, stock]);
    toast('Product updated', 'success');
  }

  closeModal();
  renderView(currentView);
  buildNotifications();
}

function deleteProduct(id) {
  if (!confirm('Delete this product? This will remove all stock records.')) return;
  run('DELETE FROM product_stock WHERE product_id=?',   [id]);
  run('DELETE FROM operation_lines WHERE product_id=?', [id]);
  run('DELETE FROM products WHERE id=?',                [id]);
  closeModal();
  renderView(currentView);
  toast('Product deleted', 'info');
}

// ── CATEGORY MODAL ────────────────────────────────────────────────
function openCategoryModal(id = null) {
  const c = id ? q('SELECT * FROM categories WHERE id=?', [id])[0] : null;

  openModal(`
    <div class="mhdr">
      <div class="mtitle">${c ? 'Edit Category' : 'New Category'}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="fgrid">
        <div class="fg full">
          <label>Category Name *</label>
          <input class="fi" id="f-cname" value="${c?.name || ''}"/>
        </div>
        <div class="fg full">
          <label>Color</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="color" id="f-ccolor" value="${c?.color || '#f97316'}"
              style="width:40px;height:36px;background:none;border:1px solid var(--border2);border-radius:var(--r);cursor:pointer;padding:2px;"/>
            <span style="font-size:12px;color:var(--text2);">Pick a colour for this category</span>
          </div>
        </div>
      </div>
    </div>
    <div class="mfoot">
      <button class="btn ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveCategory(${c?.id || 'null'})">${c ? 'Save' : 'Create'}</button>
    </div>
  `);
}

function saveCategory(id) {
  const name  = document.getElementById('f-cname').value.trim();
  const color = document.getElementById('f-ccolor').value;
  if (!name) return toast('Category name required', 'error');

  if (id === 'null' || !id) {
    run('INSERT INTO categories(name,color) VALUES(?,?)', [name, color]);
    toast('Category created', 'success');
  } else {
    run('UPDATE categories SET name=?,color=? WHERE id=?', [name, color, id]);
    toast('Category updated', 'success');
  }
  closeModal();
  renderCategories();
}

function deleteCategory(id) {
  const cnt = q('SELECT COUNT(*) c FROM products WHERE category_id=?', [id])[0].c;
  if (cnt > 0) return toast(`Cannot delete: ${cnt} products use this category`, 'error');
  if (!confirm('Delete this category?')) return;
  run('DELETE FROM categories WHERE id=?', [id]);
  renderCategories();
  toast('Category deleted', 'info');
}

// ── WAREHOUSE MODAL ───────────────────────────────────────────────
function openWarehouseModal(id = null) {
  const w = id ? q('SELECT * FROM warehouses WHERE id=?', [id])[0] : null;

  openModal(`
    <div class="mhdr">
      <div class="mtitle">${w ? 'Edit Warehouse' : 'New Warehouse'}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="fgrid">
        <div class="fg full">
          <label>Warehouse Name *</label>
          <input class="fi" id="f-wname" value="${w?.name || ''}"/>
        </div>
        <div class="fg full">
          <label>Location / Address</label>
          <input class="fi" id="f-wloc" value="${w?.location || ''}"/>
        </div>
      </div>
    </div>
    <div class="mfoot">
      <button class="btn ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveWarehouse(${w?.id || 'null'})">${w ? 'Save' : 'Create'}</button>
    </div>
  `);
}

function saveWarehouse(id) {
  const name = document.getElementById('f-wname').value.trim();
  const loc  = document.getElementById('f-wloc').value.trim();
  if (!name) return toast('Warehouse name required', 'error');

  if (id === 'null' || !id) {
    run('INSERT INTO warehouses(name,location) VALUES(?,?)', [name, loc]);
    toast('Warehouse created', 'success');
  } else {
    run('UPDATE warehouses SET name=?,location=? WHERE id=?', [name, loc, id]);
    toast('Warehouse updated', 'success');
  }
  closeModal();
  renderWarehouses();
}

// ── OPERATION MODAL ───────────────────────────────────────────────
function openOpModal(type) {
  const prods  = q('SELECT p.*, COALESCE((SELECT SUM(qty) FROM product_stock WHERE product_id=p.id),0) tot FROM products p ORDER BY name');
  const whs    = q('SELECT * FROM warehouses');
  const labels = { receipt: 'New Receipt', delivery: 'New Delivery Order', transfer: 'New Internal Transfer', adjustment: 'New Stock Adjustment' };
  const today  = new Date().toISOString().slice(0, 10);
  const prefix = { receipt: 'RCP', delivery: 'DEL', transfer: 'TRF', adjustment: 'ADJ' }[type];
  const ref    = `${prefix}-${String(Date.now()).slice(-5)}`;

  const isTransfer  = type === 'transfer';
  const isAdjustment = type === 'adjustment';
  const partyLabel  = { receipt: 'Supplier', delivery: 'Customer', adjustment: 'Location' }[type] || 'Party';

  const fromRow = isTransfer
    ? `<div class="fg"><label>From Location (Warehouse)</label>
         <select class="fi" id="f-oparty">${whs.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select></div>`
    : isAdjustment
    ? `<div class="fg"><label>${partyLabel}</label>
         <select class="fi" id="f-oparty">${whs.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select></div>`
    : `<div class="fg"><label>${partyLabel}</label>
         <input class="fi" id="f-oparty" placeholder="${partyLabel}…"/></div>`;

  const toRow = isTransfer
    ? `<div class="fg"><label>To Location (Warehouse)</label>
         <select class="fi" id="f-oto">${whs.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select></div>`
    : '';

  // Stash for addOpLine()
  window._opProds = prods;
  window._opWhs   = whs;

  openModal(`
    <div class="mhdr">
      <div class="mtitle">${labels[type]}</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="fgrid">
        <div class="fg"><label>Reference</label><input class="fi" id="f-oref" value="${ref}"/></div>
        <div class="fg"><label>Date</label><input class="fi" type="date" id="f-odate" value="${today}"/></div>
        ${fromRow}${toRow}
        <div class="fg full">
          <label>Notes</label>
          <textarea class="fi" id="f-onotes" rows="2" placeholder="Optional notes…"></textarea>
        </div>
      </div>
      <div style="margin-top:16px;">
        <label style="font-size:12px;color:var(--text2);font-weight:500;display:block;margin-bottom:6px;">Products</label>
        <div class="li-wrap">
          <div class="li-hdr" style="grid-template-columns:1fr 80px 70px 28px;">
            <div>Product</div><div>Qty</div><div>Warehouse</div><div></div>
          </div>
          <div id="op-lines"></div>
          <div class="li-add" onclick="addOpLine()">+ Add Line</div>
        </div>
      </div>
    </div>
    <div class="mfoot">
      <button class="btn ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveOp('${type}')">Save as Draft</button>
    </div>
  `, true);

  addOpLine();
}

function addOpLine() {
  const prods = window._opProds || [];
  const whs   = window._opWhs  || [];
  const div   = document.createElement('div');
  div.className = 'li-row';
  div.style.gridTemplateColumns = '1fr 80px 70px 28px';
  div.innerHTML = `
    <select class="op-prod-sel">
      <option value="">Select product</option>
      ${prods.map(p => `<option value="${p.id}">${p.name} (${p.tot} ${p.uom})</option>`).join('')}
    </select>
    <input type="number" value="1" min="0.1" step="any" class="op-qty-inp"/>
    <select class="op-wh-sel">
      ${whs.map(w => `<option value="${w.id}">${w.name.split(' ')[0]}</option>`).join('')}
    </select>
    <button class="li-del" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById('op-lines').appendChild(div);
}

function saveOp(type) {
  const ref   = document.getElementById('f-oref').value.trim();
  const date  = document.getElementById('f-odate').value;
  const party = document.getElementById('f-oparty')?.value.trim() || '';
  const to    = document.getElementById('f-oto')?.value.trim()    || party;
  const notes = document.getElementById('f-onotes')?.value.trim() || '';

  const lines = [];
  document.querySelectorAll('#op-lines .li-row').forEach(row => {
    const pid = +row.querySelector('.op-prod-sel').value;
    const qty = +row.querySelector('.op-qty-inp').value;
    const wid = +row.querySelector('.op-wh-sel').value;
    if (pid && qty > 0) lines.push({ pid, qty, wid });
  });

  if (!ref)          return toast('Reference required', 'error');
  if (!lines.length) return toast('Add at least one product line', 'error');

  run(
    "INSERT INTO operations(type,reference,party,from_location,to_location,date,status,notes,delivery_step) VALUES(?,?,?,?,?,?,'draft',?,?)",
    [type, ref, party, party, to, date, notes, 'picking']
  );
  const oid = lastId();
  lines.forEach(l =>
    run('INSERT INTO operation_lines(operation_id,product_id,qty,warehouse_id) VALUES(?,?,?,?)', [oid, l.pid, l.qty, l.wid])
  );

  toast(`${ref} created as Draft`, 'success');
  closeModal();
  renderView(currentView);
  updateBadges();
}

// ── PROFILE MODAL ─────────────────────────────────────────────────
function openEditProfileModal() {
  const u = currentUser;
  openModal(`
    <div class="mhdr">
      <div class="mtitle">Edit Profile</div>
      <button class="mclose" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="fgrid">
        <div class="fg full"><label>Full Name</label><input class="fi" id="ep-name"  value="${u.name}"/></div>
        <div class="fg full"><label>Email</label>    <input class="fi" id="ep-email" value="${u.email}"/></div>
        <div class="fg full">
          <label>Role</label>
          <select class="fi" id="ep-role">
            <option ${u.role === 'Inventory Manager' ? 'selected' : ''}>Inventory Manager</option>
            <option ${u.role === 'Warehouse Staff'   ? 'selected' : ''}>Warehouse Staff</option>
          </select>
        </div>
      </div>
    </div>
    <div class="mfoot">
      <button class="btn ghost"   onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="saveProfile()">Save</button>
    </div>
  `);
}

function saveProfile() {
  const name  = document.getElementById('ep-name').value.trim();
  const email = document.getElementById('ep-email').value.trim();
  const role  = document.getElementById('ep-role').value;

  currentUser.name  = name;
  currentUser.email = email;
  currentUser.role  = role;

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sb-avatar-initials').textContent = initials;
  document.getElementById('pf-avatar').textContent          = initials;
  document.getElementById('sb-uname').textContent           = name.split(' ')[0];
  document.getElementById('sb-urole').textContent           = role;
  document.getElementById('pdd-name').textContent           = name;
  document.getElementById('pdd-email').textContent          = email;
  document.getElementById('pf-name').textContent            = name;
  document.getElementById('pf-role').textContent            = role;
  document.getElementById('pf-role2').textContent           = role;
  document.getElementById('pf-email').textContent           = email;

  closeModal();
  toast('Profile updated', 'success');
}

// ── ADD BUTTON DISPATCHER ─────────────────────────────────────────
function handleAddBtn() {
  const map = {
    products:    () => openProductModal(),
    categories:  () => openCategoryModal(),
    receipts:    () => openOpModal('receipt'),
    deliveries:  () => openOpModal('delivery'),
    transfers:   () => openOpModal('transfer'),
    adjustments: () => openOpModal('adjustment'),
    dashboard:   () => openProductModal(),
    settings:    () => openWarehouseModal(),
    ledger:      () => openOpModal('receipt'),
    profile:     () => openEditProfileModal(),
  };
  map[currentView]?.();
}
