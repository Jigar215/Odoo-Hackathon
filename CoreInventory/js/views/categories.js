/**
 * views/categories.js — Category list rendering
 * CoreInventory IMS
 */

function renderCategories() {
  const cats = q('SELECT * FROM categories');

  document.getElementById('cat-tbody').innerHTML = cats.map(c => {
    const cnt = q('SELECT COUNT(*) n FROM products WHERE category_id=?', [c.id])[0].n;
    return `<tr>
      <td style="font-weight:500;">${c.name}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:14px;height:14px;border-radius:50%;background:${c.color};"></div>
          ${c.color}
        </div>
      </td>
      <td style="font-family:var(--fm);">${cnt}</td>
      <td>
        <button class="btn xs" onclick="openCategoryModal(${c.id})">Edit</button>
        <button class="btn xs danger" onclick="deleteCategory(${c.id})">Delete</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="tbl-empty">No categories yet</td></tr>`;
}
