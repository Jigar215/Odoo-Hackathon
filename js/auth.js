/**
 * auth.js — Authentication: login, signup, OTP, password reset, logout
 * CoreInventory IMS
 */

let currentUser = null;
let otpEmail    = '';

const DEMO_USERS = [
  { email: 'manager@core.com', password: 'pass123', name: 'Ravi Sharma',  role: 'Inventory Manager', joined: 'Jan 2025' },
  { email: 'staff@core.com',   password: 'pass123', name: 'Priya Patel',  role: 'Warehouse Staff',   joined: 'Feb 2025' },
];

// ── TAB SWITCHER ──────────────────────────────────────────────────
function switchAuthTab(tab) {
  ['login', 'signup', 'forgot', 'otp', 'newpass'].forEach(t => {
    document.getElementById('form-' + t)?.classList.add('hidden');
  });
  document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('form-' + tab)?.classList.remove('hidden');
  document.getElementById('auth-msg').innerHTML = '';

  if (tab === 'login')  document.querySelectorAll('.auth-tab')[0].classList.add('active');
  if (tab === 'signup') document.querySelectorAll('.auth-tab')[1].classList.add('active');
}

function authMsg(msg, type = 'err') {
  document.getElementById('auth-msg').innerHTML =
    `<div class="auth-msg ${type}" style="margin-bottom:12px;">${msg}</div>`;
}

// ── LOGIN ─────────────────────────────────────────────────────────
function doLogin() {
  const email = document.getElementById('li-email').value.trim().toLowerCase();
  const pass  = document.getElementById('li-pass').value;
  const user  = DEMO_USERS.find(u => u.email === email && u.password === pass);
  if (!user) return authMsg('Invalid email or password.');
  loginSuccess(user);
}

// ── SIGNUP ────────────────────────────────────────────────────────
function doSignup() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  const role  = document.getElementById('su-role').value;
  const pass  = document.getElementById('su-pass').value;
  const pass2 = document.getElementById('su-pass2').value;

  if (!name || !email || !pass) return authMsg('All fields required.');
  if (pass.length < 6)          return authMsg('Password must be at least 6 characters.');
  if (pass !== pass2)           return authMsg('Passwords do not match.');

  const newUser = {
    email, password: pass, name, role,
    joined: new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' })
  };
  DEMO_USERS.push(newUser);
  authMsg('Account created! Signing you in…', 'ok');
  setTimeout(() => loginSuccess(newUser), 800);
}

// ── FORGOT PASSWORD / OTP ─────────────────────────────────────────
function sendOTP() {
  const email  = document.getElementById('fp-email').value.trim().toLowerCase();
  const exists = DEMO_USERS.find(u => u.email === email);
  if (!exists) return authMsg('Email not found.');
  otpEmail = email;
  document.getElementById('otp-email-display').textContent = email;
  authMsg(`OTP sent to ${email} (Demo: 123456)`, 'ok');
  setTimeout(() => switchAuthTab('otp'), 1000);
}

function verifyOTP() {
  const code = document.getElementById('otp-input').value.trim();
  if (code !== '123456') return authMsg('Invalid OTP. Try 123456.');
  authMsg('OTP verified!', 'ok');
  setTimeout(() => switchAuthTab('newpass'), 600);
}

function doResetPass() {
  const p1 = document.getElementById('np-pass').value;
  const p2 = document.getElementById('np-pass2').value;
  if (p1.length < 6) return authMsg('Password must be at least 6 characters.');
  if (p1 !== p2)     return authMsg('Passwords do not match.');
  const idx = DEMO_USERS.findIndex(u => u.email === otpEmail);
  if (idx >= 0) DEMO_USERS[idx].password = p1;
  authMsg('Password reset! Signing in…', 'ok');
  setTimeout(() => loginSuccess(DEMO_USERS[idx < 0 ? 0 : idx]), 800);
}

// ── SESSION ───────────────────────────────────────────────────────
function loginSuccess(user) {
  currentUser = user;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sb-avatar-initials').textContent = initials;
  document.getElementById('pf-avatar').textContent          = initials;
  document.getElementById('sb-uname').textContent           = user.name.split(' ')[0];
  document.getElementById('sb-urole').textContent           = user.role;
  document.getElementById('pdd-name').textContent           = user.name;
  document.getElementById('pdd-email').textContent          = user.email;
  document.getElementById('pf-name').textContent            = user.name;
  document.getElementById('pf-role').textContent            = user.role;
  document.getElementById('pf-role2').textContent           = user.role;
  document.getElementById('pf-email').textContent           = user.email;
  document.getElementById('pf-joined').textContent          = user.joined;

  renderAll();
  buildNotifications();
}

function doLogout() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-msg').innerHTML = '';
  switchAuthTab('login');
  closeProfileDD();
}
