/**
 * app.js — Application entry point
 * Boots the SQLite database, then waits for user authentication.
 * CoreInventory IMS
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    console.info('[CoreInventory] Database ready');
  } catch (err) {
    console.error('[CoreInventory] Failed to initialise database:', err);
  }
});
