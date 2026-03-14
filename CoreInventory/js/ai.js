/**
 * ai.js — AI Data Assistant panel (Hybrid AI + Gemini)
 * CoreInventory IMS
 */

const GEMINI_API_KEY = "YOUR_API_KEY_HERE" // Get from Google Cloud Console;

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
    'SELECT p.id,p.name,p.sku,p.min_stock,p.reorder_qty,c.name cat FROM products p LEFT JOIN categories c ON p.category_id=c.id'
  ).map(p => ({
    ...p,
    total_stock: totalStock(p.id)
  }));

  const ops = q(
    'SELECT type,status,COUNT(*) cnt FROM operations GROUP BY type,status'
  );

  const warehouses = q(
    'SELECT w.name, COALESCE(SUM(ps.qty),0) total FROM warehouses w LEFT JOIN product_stock ps ON ps.warehouse_id=w.id GROUP BY w.id'
  );

  return JSON.stringify({
    products,
    operations: ops,
    warehouses
  });
}

// ── INVENTORY INTENT DETECTION ────────────────────────────────────
function detectInventoryIntent(query){

  query = query.toLowerCase()

  if(query.includes("low stock"))
  return "LOW_STOCK"

  if(query.includes("pending"))
  return "PENDING_OPS"

  if(query.includes("warehouse"))
  return "WAREHOUSE_STOCK"

  if(query.includes("reorder"))
  return "REORDER"

  return "AI"
}

// ── INVENTORY INTELLIGENCE ────────────────────────────────────────
function getLowStock(){

  const products = q('SELECT id,name,min_stock FROM products')

  const low = products.filter(p =>
    totalStock(p.id) <= p.min_stock
  )

  if(!low.length)
  return "• All products have sufficient stock."

  return low.map(p =>
    `• ${p.name} is below minimum stock`
  ).join("<br>")
}

function getPendingOps(){

  const ops = q(`
  SELECT type,COUNT(*) cnt
  FROM operations
  WHERE status!='done'
  GROUP BY type`)

  if(!ops.length)
  return "• No pending operations."

  return ops.map(o =>
    `• ${o.type}: ${o.cnt} pending`
  ).join("<br>")
}

function getWarehouseStock(){

  const data = q(`
  SELECT w.name,COALESCE(SUM(ps.qty),0) total
  FROM warehouses w
  LEFT JOIN product_stock ps
  ON ps.warehouse_id=w.id
  GROUP BY w.id`)

  return data.map(d =>
    `• ${d.name}: ${d.total} items`
  ).join("<br>")
}

function getReorderProducts(){

  const products = q('SELECT id,name,reorder_qty FROM products')

  const reorder = products.filter(p =>
    totalStock(p.id) <= p.reorder_qty
  )

  if(!reorder.length)
  return "• No products currently need reordering."

  return reorder.map(p =>
    `• ${p.name} needs reorder`
  ).join("<br>")
}

// ── SEND ──────────────────────────────────────────────────────────
async function sendAI(){

  const input = document.getElementById('ai-input')
  const val = input.value.trim()

  if(val){
    askAI(val)
    input.value=''
  }
}

// ── ASK AI ────────────────────────────────────────────────────────
async function askAI(msg){

  const msgs = document.getElementById('ai-msgs')

  msgs.innerHTML += `
  <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
    <div style="font-size:10px;color:var(--text3);">You</div>
    <div style="background:var(--accentbg2);border-radius:12px 12px 4px 12px;padding:10px 13px;font-size:13px;max-width:85%;">
      ${msg}
    </div>
  </div>`

  const typing = document.createElement('div')

  typing.innerHTML=`
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:10px;color:var(--text3);">AI</div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;">
      Thinking...
    </div>
  </div>`

  msgs.appendChild(typing)
  msgs.scrollTop=msgs.scrollHeight

  document.getElementById('ai-send-btn').disabled=true

  const intent = detectInventoryIntent(msg)

  let instantReply = null

  if(intent==="LOW_STOCK")
  instantReply = getLowStock()

  if(intent==="PENDING_OPS")
  instantReply = getPendingOps()

  if(intent==="WAREHOUSE_STOCK")
  instantReply = getWarehouseStock()

  if(intent==="REORDER")
  instantReply = getReorderProducts()

  if(instantReply){

    typing.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:10px;color:var(--text3);">AI</div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;">
      ${instantReply}
      </div>
    </div>`

    document.getElementById('ai-send-btn').disabled=false
    return
  }

  try{

    const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        contents:[
          {
            parts:[
              {
                text:`
You are CoreInventory AI, an inventory analyst.

Database snapshot:
${getDBSnapshot()}

User question:
${msg}

Answer concisely using bullet points and highlight issues like low stock or pending operations.
`
              }
            ]
          }
        ]
      })
    })

    const data = await res.json()

    let reply="AI could not generate a response."

    if(data.candidates && data.candidates.length>0){
      reply=data.candidates[0].content.parts
      .map(p=>p.text)
      .join("")
    }

    typing.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:10px;color:var(--text3);">AI</div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:10px 13px;font-size:13px;line-height:1.7;">
      ${reply.replace(/\n/g,"<br>")}
      </div>
    </div>`

  }catch(e){

    typing.innerHTML=`
    <div style="background:var(--redbg);border:1px solid var(--red);border-radius:12px;padding:10px 13px;font-size:12px;color:var(--red);">
      AI connection failed.
    </div>`
  }

  document.getElementById('ai-send-btn').disabled=false
  msgs.scrollTop=msgs.scrollHeight
}