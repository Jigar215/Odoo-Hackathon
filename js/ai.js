/**
 * ai.js — AI Data Assistant panel (uses Anthropic API via Artifact proxy)
 * CoreInventory IMS
 */

const AI_CHIPS = [
  'Which products are low on stock?',
  'Show me pending operations',
  'Stock by warehouse breakdown',
  'Which products need reordering?',
  'What was delivered this month?',
];

// ── INIT ──────────────────────────────────────────────────────────
function initAI() {
  const msgs = document.getElementById('ai-msgs');
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  msgs.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:10px;color:var(--text3);">AI Assistant</div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;line-height:1.6;">
        Hi ${firstName}! I'm your inventory analyst. Ask me anything about your live stock data.
      </div>
    </div>`;

  document.getElementById('ai-chips').innerHTML = AI_CHIPS.map(c =>
    `<button
       onclick="askAI('${c}')"
       style="padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-family:var(--ff);font-size:11px;transition:all .12s;"
       onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
       onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'"
     >${c}</button>`
  ).join('');
}

// ── DATABASE SNAPSHOT ─────────────────────────────────────────────
function getDBSnapshot() {
  const products = q(
    'SELECT p.name, p.sku, p.uom, p.min_stock, p.reorder_qty, p.supplier, c.name cat FROM products p LEFT JOIN categories c ON p.category_id=c.id'
  ).map(p => ({
    ...p,
    total_stock: totalStock(q('SELECT id FROM products WHERE name=?', [p.name])[0]?.id),
  }));

  const ops = q('SELECT type, status, COUNT(*) cnt FROM operations GROUP BY type, status');

  const warehouses = q(
    'SELECT w.name, w.location, COALESCE(SUM(ps.qty),0) total FROM warehouses w LEFT JOIN product_stock ps ON ps.warehouse_id=w.id GROUP BY w.id'
  );

  const ledger = q(
    'SELECT sl.date, p.name, sl.operation_type, sl.qty FROM stock_ledger sl JOIN products p ON sl.product_id=p.id ORDER BY sl.id DESC LIMIT 20'
  );

  return JSON.stringify({ products, operations: ops, warehouses, recent_movements: ledger });
}

// ── SEND ──────────────────────────────────────────────────────────
async function sendAI() {
  const input = document.getElementById('ai-input');
  const val   = input.value.trim();
  if (val) {
    askAI(val);
    input.value = '';
  }
}

async function askAI(msg) {
  const msgs = document.getElementById('ai-msgs');

  // User bubble
  msgs.innerHTML += `
    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
      <div style="font-size:10px;color:var(--text3);">You</div>
      <div style="background:var(--accentbg2);border-radius:12px 12px 4px 12px;padding:10px 13px;font-size:13px;max-width:85%;">${msg}</div>
    </div>`;

  // Typing indicator
  const typing = document.createElement('div');
  typing.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:10px;color:var(--text3);">AI</div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;display:flex;gap:4px;align-items:center;">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--text3);animation:pulse 1s infinite;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--text3);animation:pulse 1s .2s infinite;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:var(--text3);animation:pulse 1s .4s infinite;"></span>
      </div>
    </div>`;
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  document.getElementById('ai-send-btn').disabled = true;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are CoreInventory AI, an inventory analyst. Current database:\n${getDBSnapshot()}\nAnswer concisely using the data. Use • for lists. Highlight issues like low stock or pending operations.`,
        messages: [{ role: 'user', content: msg }],
      }),
    });

    const data  = await res.json();
    const reply = data.content?.map(b => b.text || '').join('') || 'Could not get a response.';

    typing.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:10px;color:var(--text3);">AI</div>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;line-height:1.7;">
          ${reply
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^• (.+)$/gm, '<div>• $1</div>')
            .replace(/\n/g, '<br/>')}
        </div>
      </div>`;
  } catch (e) {
    typing.innerHTML = `
      <div style="background:var(--redbg);border:1px solid var(--red);border-radius:12px;padding:10px 13px;font-size:12px;color:var(--red);">
        Connection error. Please check your network.
      </div>`;
  }

  document.getElementById('ai-send-btn').disabled = false;
  msgs.scrollTop = msgs.scrollHeight;
}
