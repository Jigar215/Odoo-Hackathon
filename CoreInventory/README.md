# CoreInventory IMS

> A modern, client-side Inventory Management System built with vanilla JavaScript and an in-browser SQLite database (sql.js).

![CoreInventory Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

| Module | Capabilities |
|---|---|
| **Dashboard** | KPI cards, low-stock alerts, recent ops, category chart |
| **Products** | CRUD, multi-warehouse stock, reorder rules, SKU tracking |
| **Categories** | Colour-coded product grouping |
| **Receipts** | Incoming stock from suppliers, draft → validate workflow |
| **Deliveries** | 3-step Pick → Pack → Validate dispatch workflow |
| **Transfers** | Internal warehouse-to-warehouse stock movements |
| **Adjustments** | Physical count reconciliation |
| **Move History** | Full stock ledger with filters |
| **Settings** | Warehouse management, reorder rules, general config |
| **AI Assistant** | Natural-language inventory queries powered by Claude |
| **Auth** | Login / Sign-up / OTP forgot-password flow |

---

## 🗂️ Project Structure

```
CoreInventory/
├── index.html              ← App shell (HTML only, no inline scripts/styles)
├── css/
│   ├── tokens.css          ← Design tokens (CSS variables) & reset
│   ├── auth.css            ← Login / signup screen styles
│   ├── layout.css          ← Sidebar, topbar, content area, AI panel
│   └── components.css      ← Tables, badges, modals, forms, toasts, charts
└── js/
    ├── db.js               ← sql.js database init, schema, seed data, helpers
    ├── auth.js             ← Authentication (login, signup, OTP, logout)
    ├── nav.js              ← Navigation routing & sidebar toggle
    ├── modals.js           ← All CRUD modals and form handlers
    ├── ai.js               ← AI assistant (Anthropic API)
    ├── ui.js               ← Toast, badges, notifications, dropdown helpers
    ├── app.js              ← Entry point (DOMContentLoaded → initDB)
    └── views/
        ├── dashboard.js    ← KPI grid, recent ops, low-stock table, chart
        ├── products.js     ← Product list, filters, stock breakdown modal
        ├── categories.js   ← Category list render
        ├── operations.js   ← Receipts / Deliveries / Transfers / Adjustments
        ├── ledger.js       ← Stock ledger with type filter
        └── settings.js     ← Warehouse table, reorder rules, section switcher
```

---

## 🚀 Getting Started

### Option 1 — Open directly in browser

Because the app uses **sql.js** (WebAssembly), it must be served over HTTP — opening `index.html` via `file://` will not work.

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit **http://localhost:8080**

### Option 2 — VS Code Live Server

Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension and click **"Go Live"** in the status bar.

---

## 🔑 Demo Credentials

| Email | Password | Role |
|---|---|---|
| `manager@core.com` | `pass123` | Inventory Manager |
| `staff@core.com`   | `pass123` | Warehouse Staff |

> You can also sign up with a new account directly from the login screen.

---

## 🤖 AI Assistant

The AI panel in the right sidebar uses the **Anthropic Claude API**.

- The assistant receives a live snapshot of your database (products, stock levels, operations, warehouses) with every message.
- It can answer questions like *"Which products need reordering?"* or *"Show me pending deliveries"*.
- Requires a valid Anthropic API key exposed via the Claude.ai Artifact proxy environment. No key configuration is needed when running inside claude.ai.

---

## 🗃️ Data Persistence

All data is stored in an **in-memory SQLite database** via [sql.js](https://sql.js.org/).  
Data resets on page refresh — this is by design for a demo/hackathon build.

To add persistence, export the database using `db.export()` and save to `localStorage` or a backend.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML / CSS / JavaScript (no framework) |
| Database | [sql.js](https://sql.js.org/) — SQLite compiled to WebAssembly |
| Fonts | [Geist](https://vercel.com/font) + Instrument Serif via Google Fonts |
| AI | [Anthropic Claude API](https://www.anthropic.com/) (`claude-sonnet-4-20250514`) |

---

## 📋 Workflow Reference

### Receipt (Incoming Stock)
`Draft → Waiting → Ready → Done`

### Delivery (Outgoing Stock)
`Draft → Picking → Packing → Done`

### Transfer (Internal)
`Draft → Ready → Done`

### Adjustment (Physical Count)
`Draft → Done`

---

## 📄 License

MIT — free to use, modify, and distribute.
