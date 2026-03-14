/**
 * db.js — SQLite database setup, schema, seed data, and query helpers
 * CoreInventory IMS
 */

let db = null;

// ── INIT ──────────────────────────────────────────────────────────
async function initDB() {
  const SQL = await initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
  });
  db = new SQL.Database();
  createSchema();
  seedData();
}

// ── QUERY HELPERS ─────────────────────────────────────────────────
function q(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) {
    console.error('[DB Query Error]', sql, e);
    return [];
  }
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
  } catch (e) {
    console.error('[DB Run Error]', sql, e);
  }
}

function lastId() {
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] || 0;
}

// ── SCHEMA ────────────────────────────────────────────────────────
function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      color TEXT DEFAULT '#f97316'
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      location TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      sku         TEXT UNIQUE,
      category_id INTEGER,
      uom         TEXT    DEFAULT 'pcs',
      min_stock   REAL    DEFAULT 10,
      reorder_qty REAL    DEFAULT 50,
      supplier    TEXT    DEFAULT '',
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_stock (
      product_id   INTEGER,
      warehouse_id INTEGER,
      qty          REAL DEFAULT 0,
      PRIMARY KEY (product_id, warehouse_id),
      FOREIGN KEY (product_id)   REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS operations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      type           TEXT NOT NULL,
      reference      TEXT,
      party          TEXT,
      from_location  TEXT,
      to_location    TEXT,
      date           TEXT,
      status         TEXT DEFAULT 'draft',
      notes          TEXT,
      delivery_step  TEXT DEFAULT 'picking'
    );

    CREATE TABLE IF NOT EXISTS operation_lines (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER,
      product_id   INTEGER,
      qty          REAL,
      warehouse_id INTEGER DEFAULT 1,
      FOREIGN KEY (operation_id) REFERENCES operations(id),
      FOREIGN KEY (product_id)   REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT,
      product_id     INTEGER,
      operation_type TEXT,
      reference      TEXT,
      from_loc       TEXT,
      to_loc         TEXT,
      qty            REAL,
      balance        REAL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

// ── SEED DATA ─────────────────────────────────────────────────────
function seedData() {
  // Categories
  [
    ['Raw Materials',  '#ef4444'],
    ['Finished Goods', '#22c55e'],
    ['Packaging',      '#f59e0b'],
    ['Spare Parts',    '#3b82f6'],
    ['Chemicals',      '#8b5cf6'],
  ].forEach(([name, color]) =>
    run('INSERT INTO categories(name,color) VALUES(?,?)', [name, color])
  );

  // Warehouses
  [
    ['Main Warehouse',   'Ahmedabad, Zone A'],
    ['Production Floor', 'Ahmedabad, Zone B'],
    ['Cold Storage',     'Ahmedabad, Zone C'],
  ].forEach(([name, location]) =>
    run('INSERT INTO warehouses(name,location) VALUES(?,?)', [name, location])
  );

  // Products  [name, sku, cat_id, uom, min_stock, reorder_qty, supplier]
  const products = [
    ['Steel Rods',      'SKU-001', 1, 'kg',  20, 100, 'Tata Steel'],
    ['Aluminum Sheets', 'SKU-002', 1, 'kg',  30, 80,  'Hindalco'],
    ['Copper Wire',     'SKU-003', 1, 'm',   50, 200, 'Sterlite'],
    ['Chair Frame',     'SKU-004', 2, 'pcs', 15, 40,  'Local Fab'],
    ['Office Desk',     'SKU-005', 2, 'pcs', 10, 20,  'FurnCo'],
    ['Wooden Panel',    'SKU-006', 2, 'pcs', 15, 60,  'TimberIndia'],
    ['Cardboard Box',   'SKU-007', 3, 'pcs',100, 500, 'PackMasters'],
    ['Bubble Wrap',     'SKU-008', 3, 'm',   50, 200, 'SafePack'],
    ['Bearing 6205',    'SKU-009', 4, 'pcs', 20, 80,  'SKF India'],
    ['Hydraulic Seal',  'SKU-010', 4, 'pcs', 25, 50,  'ParkerHann'],
    ['Acetone',         'SKU-011', 5, 'L',   30, 60,  'BASF India'],
    ['Paint Thinner',   'SKU-012', 5, 'L',   20, 40,  'Asian Paints'],
  ];
  products.forEach(([n, s, c, u, mn, rq, sup]) =>
    run(
      'INSERT INTO products(name,sku,category_id,uom,min_stock,reorder_qty,supplier) VALUES(?,?,?,?,?,?,?)',
      [n, s, c, u, mn, rq, sup]
    )
  );

  // Product stock distribution  [product_id, warehouse_id, qty]
  const stockDist = [
    [1,1,55],[1,2,22], [2,1,100],[2,3,45], [3,1,220],[3,2,100],
    [4,1,35],[4,2,7],  [5,1,22],[5,2,6],   [6,1,8],
    [7,1,450],[7,3,50],[8,1,160],[8,3,40],
    [9,2,28],[9,1,7],  [10,2,5],[10,1,2],
    [11,3,40],[11,1,5],[12,3,20],[12,1,2],
  ];
  stockDist.forEach(([pid, wid, qty]) =>
    run(
      'INSERT OR REPLACE INTO product_stock(product_id,warehouse_id,qty) VALUES(?,?,?)',
      [pid, wid, qty]
    )
  );

  // Operations  [type, ref, party, from, to, date, status, delivery_step]
  const ops = [
    ['receipt',    'RCP-001', 'Tata Steel',   'Vendor',          'Main Warehouse',    '2025-01-05', 'done',    null],
    ['receipt',    'RCP-002', 'Hindalco',      'Vendor',          'Main Warehouse',    '2025-01-12', 'done',    null],
    ['receipt',    'RCP-003', 'PackMasters',   'Vendor',          'Main Warehouse',    '2025-02-03', 'done',    null],
    ['receipt',    'RCP-004', 'SKF India',     'Vendor',          'Main Warehouse',    '2025-03-10', 'waiting', null],
    ['receipt',    'RCP-005', 'BASF India',    'Vendor',          'Cold Storage',      '2025-03-11', 'draft',   null],
    ['delivery',   'DEL-001', 'Infosys Ltd',   'Main Warehouse',  'Customer',          '2025-01-20', 'done',    'picking'],
    ['delivery',   'DEL-002', 'Wipro Corp',    'Main Warehouse',  'Customer',          '2025-02-15', 'done',    'picking'],
    ['delivery',   'DEL-003', 'TCS Global',    'Main Warehouse',  'Customer',          '2025-03-05', 'ready',   'packing'],
    ['delivery',   'DEL-004', 'HCL Tech',      'Main Warehouse',  'Customer',          '2025-03-11', 'draft',   'picking'],
    ['transfer',   'TRF-001', 'Internal',      'Main Warehouse',  'Production Floor',  '2025-01-25', 'done',    null],
    ['transfer',   'TRF-002', 'Internal',      'Main Warehouse',  'Cold Storage',      '2025-02-20', 'done',    null],
    ['transfer',   'TRF-003', 'Internal',      'Production Floor','Main Warehouse',    '2025-03-08', 'ready',   null],
    ['adjustment', 'ADJ-001', 'Physical Count','Main Warehouse',  'Main Warehouse',    '2025-01-30', 'done',    null],
    ['adjustment', 'ADJ-002', 'Damage Write-off','Cold Storage',  'Cold Storage',      '2025-02-28', 'done',    null],
  ];
  ops.forEach(([type, ref, party, from, to, date, status, dstep]) =>
    run(
      'INSERT INTO operations(type,reference,party,from_location,to_location,date,status,delivery_step) VALUES(?,?,?,?,?,?,?,?)',
      [type, ref, party, from, to, date, status, dstep || 'picking']
    )
  );

  // Operation lines  [op_id, product_id, qty, warehouse_id]
  const lines = [
    [1,1,100,1],[1,2,50,1],[2,3,200,1],[3,7,300,1],[3,8,100,1],[4,9,40,1],
    [5,11,20,3],[6,4,10,1],[6,5,5,1],[7,4,8,1],[8,5,3,1],[8,6,10,1],
    [9,4,2,1],[10,1,30,1],[10,3,50,1],[11,11,3,3],[11,12,15,3],
    [12,1,25,1],[13,2,10,1],[14,11,3,3],
  ];
  lines.forEach(([oid, pid, qty, wid]) =>
    run(
      'INSERT INTO operation_lines(operation_id,product_id,qty,warehouse_id) VALUES(?,?,?,?)',
      [oid, pid, qty, wid]
    )
  );

  // Stock ledger  [date, product_id, type, ref, from, to, qty, balance]
  const ledger = [
    ['2025-01-05', 1,'receipt',    'RCP-001','Vendor',   'Main WH',       100, 155],
    ['2025-01-05', 2,'receipt',    'RCP-001','Vendor',   'Main WH',        50, 145],
    ['2025-01-12', 3,'receipt',    'RCP-002','Vendor',   'Main WH',       200, 320],
    ['2025-01-20', 4,'delivery',   'DEL-001','Main WH',  'Customer',      -10,  42],
    ['2025-01-20', 5,'delivery',   'DEL-001','Main WH',  'Customer',       -5,  28],
    ['2025-01-25', 1,'transfer',   'TRF-001','Main WH',  'Prod Floor',      0,  77],
    ['2025-01-25', 3,'transfer',   'TRF-001','Main WH',  'Prod Floor',      0, 320],
    ['2025-01-30', 2,'adjustment', 'ADJ-001','Main WH',  'Main WH',        -5, 140],
    ['2025-02-03', 7,'receipt',    'RCP-003','Vendor',   'Main WH',       300, 500],
    ['2025-02-03', 8,'receipt',    'RCP-003','Vendor',   'Main WH',       100, 200],
    ['2025-02-15', 4,'delivery',   'DEL-002','Main WH',  'Customer',       -8,  42],
    ['2025-02-20',11,'transfer',   'TRF-002','Main WH',  'Cold WH',         0,  45],
    ['2025-02-28',11,'adjustment', 'ADJ-002','Cold WH',  'Cold WH',        -3,  42],
    ['2025-03-05', 5,'delivery',   'DEL-003','Main WH',  'Customer',       -3,  28],
    ['2025-03-05', 6,'delivery',   'DEL-003','Main WH',  'Customer',      -10,   8],
    ['2025-03-08', 1,'transfer',   'TRF-003','Prod Floor','Main WH',        0,  77],
  ];
  ledger.forEach(([date, pid, type, ref, from, to, qty, bal]) =>
    run(
      'INSERT INTO stock_ledger(date,product_id,operation_type,reference,from_loc,to_loc,qty,balance) VALUES(?,?,?,?,?,?,?,?)',
      [date, pid, type, ref, from, to, qty, bal]
    )
  );
}

// ── HELPER ────────────────────────────────────────────────────────
/** Returns the total stock across all warehouses for a product */
function totalStock(pid) {
  const r = q('SELECT COALESCE(SUM(qty),0) AS s FROM product_stock WHERE product_id=?', [pid]);
  return r[0]?.s || 0;
}
