document.addEventListener('DOMContentLoaded', () => {
    function renderSpendingChart() {
  if (!requireLogin()) return;

  const canvas = document.getElementById('spendingChart');
  const summary = document.getElementById('spendingSummary');
  const context = canvas.getContext('2d');
  const now = new Date();
  const months = Array.from(
    { length: 6 },
    (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
  );
  const transactions = userBucket(KEY.transactions, []);

  const totals = months.map(month => transactions
    .filter(item =>
      item.type === 'Transfer' &&
      new Date(item.date).getFullYear() === month.getFullYear() &&
      new Date(item.date).getMonth() === month.getMonth()
    )
    .reduce((sum, item) => {
      const amount = Number.isFinite(Number(item.amountValue))
        ? Number(item.amountValue)
        : Number(String(item.amount).replace(/[^\d.]/g, ''));
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  );

  const total = totals.reduce((sum, value) => sum + value, 0);
  const firstMonth = months[0];
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const count = transactions.filter(item => {
    const date = new Date(item.date);
    return item.type === 'Transfer' && date >= firstMonth && date < nextMonth;
  }).length;

  summary.textContent = count
    ? `${count} demo transfer${count === 1 ? '' : 's'} in the last six months · Total: ${formatMoney(total)}`
    : 'No demo transfers in the last six months yet.';

  const width = Math.max(canvas.getBoundingClientRect().width, 300);
  const height = 280;
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);

  const styles = getComputedStyle(document.body);
  const textColor = styles.getPropertyValue('--muted').trim();
  const gridColor = styles.getPropertyValue('--border').trim();
  const barColor = styles.getPropertyValue('--purple').trim();
  const left = 58;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...totals);
  const slot = chartWidth / months.length;
  const barWidth = Math.min(42, slot * 0.56);

  context.font = '11px Inter, sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'right';

  for (let line = 0; line <= 4; line += 1) {
    const y = top + chartHeight * line / 4;
    const value = max * (4 - line) / 4;

    context.strokeStyle = gridColor;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();

    context.fillStyle = textColor;
    context.fillText(formatMoney(value), left - 8, y);
  }

  months.forEach((month, index) => {
    const barHeight = totals[index] / max * chartHeight;
    const x = left + slot * index + (slot - barWidth) / 2;
    const y = top + chartHeight - barHeight;

    context.fillStyle = barColor;
    context.fillRect(x, y, barWidth, Math.max(barHeight, 2));

    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.fillText(
      month.toLocaleDateString('en-IN', { month: 'short' }),
      x + barWidth / 2,
      height - 19
    );
  });
}
  const KEY = {
    users: 'smartbank_users', current: 'smartbank_current_user', balances: 'smartbank_balances',
    transactions: 'smartbank_transactions', applications: 'smartbank_applications',
    notifications: 'smartbank_notifications', theme: 'smartbank_theme',
    kyc: 'smartbank_kyc', locked: 'smartbank_locked_accounts'
  };
  const titles = {
    home: 'SmartBank AI', login: 'Login', register: 'Create Account', dashboard: 'Dashboard',
    services: 'Services', accountSecurityPage: 'Account Security', atmCardPage: 'ATM Card',
    mobilePage: 'Mobile Update', addressPage: 'Address Update', paymentPage: 'Send Money',
    statementPage: 'Statement', pinPage: 'ATM PIN', newAccountPage: 'New Account',
    kycPage: 'Demo KYC', notificationsPage: 'Notifications', chatPage: 'AI Chatbot',
    transactions: 'Transactions', tracking: 'Application Tracking', about: 'About', contact: 'Contact'
  };
  const getData = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.error(`SmartBank could not read ${key}:`, error);
      return fallback;
    }
  };
  const saveData = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`SmartBank could not save ${key}:`, error);
      return false;
    }
  };
  const currentUser = () => getData(KEY.current, '');
  const userRecord = () => getData(KEY.users, []).find(user => user.username === currentUser());
  const userBucket = (key, fallback = {}) => {
    const data = getData(key, fallback);
    return data[currentUser()] === undefined ? fallback : data[currentUser()];
  };
  const setUserBucket = (key, value) => {
    const data = getData(key, {});
    data[currentUser()] = value;
    return saveData(key, data);
  };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const formatMoney = amount => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const setMessage = (id, text, type = '') => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = text;
    node.className = `message${type ? ` ${type}` : ''}`;
  };
  const requireLogin = id => {
    if (currentUser()) return true;
    showPage('login');
    if (id) setMessage(id, 'Please log in to continue.', 'error');
    return false;
  };
  const addNotification = text => {
    const list = userBucket(KEY.notifications, []);
    list.unshift({ text, date: new Date().toISOString() });
    setUserBucket(KEY.notifications, list);
  };
  const addTransaction = entry => {
    const list = userBucket(KEY.transactions, []);
    list.unshift({ ...entry, date: new Date().toISOString() });
    setUserBucket(KEY.transactions, list);
  };
  const applications = () => userBucket(KEY.applications, []);
  const appStatus = app => {
    const elapsed = Date.now() - new Date(app.created).getTime();
    return elapsed > 60000 ? 'Approved' : elapsed > 15000 ? 'In Review' : 'Submitted';
  };
  const createApplication = (type, details) => {
    const list = applications();
    const item = { id: `APP${Date.now()}`, type, details, status: 'Submitted', created: new Date().toISOString() };
    list.unshift(item);
    setUserBucket(KEY.applications, list);
    addNotification(`${type} application ${item.id} submitted.`);
    return item;
  };
  const refreshDashboard = () => {
    const user = userRecord();
    if (!user) return;
    document.getElementById('welcomeName').textContent = user.name.split(/\s+/)[0];
    const balances = getData(KEY.balances, {});
    if (balances[currentUser()] === undefined) {
      balances[currentUser()] = 25000;
      saveData(KEY.balances, balances);
    }
    document.getElementById('balanceValue').textContent = formatMoney(balances[currentUser()]);
    document.getElementById('cardStatus').textContent = user.cardStatus || 'Not requested';
    const locked = userBucket(KEY.locked, false);
    document.getElementById('accountStatus').textContent = locked ? 'Locked' : 'Active';
    document.querySelector('.avatar').textContent = user.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('homeLogin').classList.toggle('hidden', Boolean(currentUser()));
    document.getElementById('homeDashboard').textContent = currentUser() ? 'Open Dashboard' : 'Explore Demo';
  };
  const renderTransactions = (target, filter = '') => {
    const list = userBucket(KEY.transactions, []);
    const matches = list.filter(item => `${item.description} ${item.type} ${item.date}`.toLowerCase().includes(filter.toLowerCase()));
    target.innerHTML = matches.length ? matches.map(item => `<li class="list-item"><span><strong>${escapeHTML(item.description)}</strong><small>${escapeHTML(new Date(item.date).toLocaleString('en-IN'))} · ${escapeHTML(item.type)}</small></span><span class="list-amount">${escapeHTML(item.amount)}</span></li>`).join('') : '<li class="empty-state">No transactions found.</li>';
  };
  const renderApplications = () => {
    const target = document.getElementById('applicationList');
    const list = applications();
    target.innerHTML = list.length ? list.map(app => `<article class="list-item"><span><strong>${escapeHTML(app.type)} · ${escapeHTML(app.id)}</strong><small>${escapeHTML(app.details)} · ${escapeHTML(new Date(app.created).toLocaleDateString('en-IN'))}</small><small>Submitted → In Review → Approved</small></span><span class="demo-pill">${escapeHTML(appStatus(app))}</span></article>`).join('') : '<p class="empty-state">No applications yet.</p>';
  };

  function showPage(id) {
    if (id === 'spendingChartPage') renderSpendingChart();
    if (id === 'logout') return logoutUser();
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('content-section')) id = 'home';
    if (!currentUser() && !['home', 'login', 'register', 'about', 'contact'].includes(id)) id = 'login';
    if (currentUser() && ['login', 'register'].includes(id)) id = 'dashboard';
    document.querySelectorAll('.content-section').forEach(section => section.classList.toggle('active-page', section.id === id));
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    document.getElementById('pageTitle').textContent = titles[id] || 'SmartBank AI';
    document.getElementById('breadcrumb').textContent = id === 'home' ? 'Welcome' : `SmartBank / ${titles[id] || 'Home'}`;
    document.getElementById('logoutTop').classList.toggle('hidden', !currentUser());
    document.getElementById('sidebarLogout').classList.toggle('hidden', !currentUser());
    if (currentUser()) refreshDashboard();
    if (id === 'transactions') showTransactions();
    if (id === 'tracking') renderApplications();
    if (id === 'notificationsPage') showNotifications();
    if (id === 'chatPage') renderChat();
    history.replaceState(null, '', `#${id}`);
  }

  async function registerUser(mode) {
    if (mode === 'strength') {
      const password = document.getElementById('registerPassword').value;
      const score = Math.min(4, (password.length >= 6 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0));
      const meter = document.getElementById('passwordStrength');
      meter.style.width = `${score * 25}%`;
      meter.style.background = score < 2 ? 'var(--red)' : score < 4 ? '#e7b650' : 'var(--green)';
      return;
    }
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const username = document.getElementById('registerUsername').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !username || password.length < 6 || password !== confirm) {
      setMessage('registerMessage', 'Check all fields, use a valid email, a 6+ character password, and matching passwords.', 'error');
      return;
    }
    const users = getData(KEY.users, []);
    if (users.some(user => user.username === username)) {
      setMessage('registerMessage', 'That username is already registered.', 'error');
      return;
    }
    if (!globalThis.crypto?.subtle) {
      setMessage('registerMessage', 'Secure password hashing is unavailable in this browser context.', 'error');
      return;
    }
    const bytes = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(hashBuffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    users.push({ name, email, username, passwordHash: hash, cardStatus: 'Not requested', pinHash: await hashText('1234') });
    if (!saveData(KEY.users, users)) {
      setMessage('registerMessage', 'Could not save your demo account. Check browser storage settings.', 'error');
      return;
    }
    setMessage('registerMessage', 'Account created. You can now log in.', 'success');
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirm').value = '';
  }

  async function hashText(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function loginUser() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const user = getData(KEY.users, []).find(record => record.username === username);
    if (!user || await hashText(password) !== user.passwordHash) {
      setMessage('loginMessage', 'Username or password is incorrect.', 'error');
      return;
    }
    if (!saveData(KEY.current, username)) {
      setMessage('loginMessage', 'Could not start your session because browser storage is unavailable.', 'error');
      return;
    }
    document.getElementById('loginPassword').value = '';
    setMessage('loginMessage', 'Login successful.', 'success');
    showPage('dashboard');
  }

  function logoutUser() {
    saveData(KEY.current, '');
    showPage('home');
  }

  async function fingerprintLogin() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const user = getData(KEY.users, []).find(record => record.username === username);
    if (!user) {
      setMessage('loginMessage', 'Enter a registered username to use demo fingerprint login.', 'error');
      return;
    }
    if (!saveData(KEY.current, username)) {
      setMessage('loginMessage', 'Could not start your session because browser storage is unavailable.', 'error');
      return;
    }
    setMessage('loginMessage', 'Demo fingerprint accepted.', 'success');
    showPage('dashboard');
  }

  function forgotPassword() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const user = getData(KEY.users, []).find(record => record.username === username);
    if (!user) {
      setMessage('loginMessage', 'Enter your username first, then use Forgot Password.', 'error');
      return;
    }
    const email = window.prompt('Enter the email address registered to this demo username:');
    if (email === null) return;
    if (email.trim().toLowerCase() !== user.email) {
      setMessage('loginMessage', 'Username and email do not match.', 'error');
      return;
    }
    const replacement = window.prompt('Enter a new password with at least 6 characters:');
    if (replacement === null) return;
    if (replacement.length < 6) {
      setMessage('loginMessage', 'The new password must be at least 6 characters.', 'error');
      return;
    }
    hashText(replacement).then(hash => {
      const users = getData(KEY.users, []);
      const index = users.findIndex(item => item.username === username);
      users[index].passwordHash = hash;
      const saved = saveData(KEY.users, users);
      setMessage('loginMessage', saved ? 'Password reset. You can now log in.' : 'Could not save the new password.', saved ? 'success' : 'error');
    });
  }

  function submitSecurityRequest() {
    if (!requireLogin('securityMessage')) return;
    const locked = userBucket(KEY.locked, false);
    const reason = document.getElementById('securityReason').value.trim();
    if (!locked && !reason) {
      setMessage('securityMessage', 'Please provide a reason before locking your account.', 'error');
      return;
    }
    setUserBucket(KEY.locked, !locked);
    addNotification(`Demo account ${locked ? 'unlocked' : 'locked'}${!locked ? `: ${reason}` : ''}.`);
    refreshDashboard();
    setMessage('securityMessage', `Demo account ${locked ? 'unlocked' : 'locked'} successfully.`, 'success');
  }

  function applyCard() {
    if (!requireLogin('cardMessage')) return;
    const user = userRecord();
    if (user.cardStatus !== 'Not requested') {
      setMessage('cardMessage', 'A demo card application already exists for this profile.', 'error');
      return;
    }
    const type = document.getElementById('cardType').value;
    user.cardStatus = 'Application submitted';
    const app = createApplication('ATM card', type);
    user.demoCardRef = `SB-DEMO-${Date.now().toString().slice(-6)}`;
    const users = getData(KEY.users, []);
    users[users.findIndex(item => item.username === currentUser())] = user;
    if (!saveData(KEY.users, users)) return setMessage('cardMessage', 'Could not save your demo card request.', 'error');
    setMessage('cardMessage', `Demo ${type} card request submitted as ${app.id}. Reference: ${user.demoCardRef}. No real card number was created.`, 'success');
    refreshDashboard();
  }

  function updateMobile() {
    if (!requireLogin('mobileMessage')) return;
    const mobile = document.getElementById('mobileNumber').value.trim();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setMessage('mobileMessage', 'Enter a valid 10-digit Indian mobile number starting with 6–9.', 'error');
    const user = userRecord();
    user.mobile = mobile;
    const users = getData(KEY.users, []);
    users[users.findIndex(item => item.username === currentUser())] = user;
    if (!saveData(KEY.users, users)) return setMessage('mobileMessage', 'Could not save your demo profile update.', 'error');
    const app = createApplication('Mobile update', `Mobile ending ${mobile.slice(-4)}`);
    setMessage('mobileMessage', `Update request ${app.id} submitted.`, 'success');
  }

  function updateAddress() {
    if (!requireLogin('addressMessage')) return;
    const city = document.getElementById('addressCity').value.trim();
    const pin = document.getElementById('addressPin').value.trim();
    if (!city || !/^\d{6}$/.test(pin)) return setMessage('addressMessage', 'Enter a city and valid 6-digit PIN code.', 'error');
    const user = userRecord();
    user.address = { city, pin };
    const users = getData(KEY.users, []);
    users[users.findIndex(item => item.username === currentUser())] = user;
    if (!saveData(KEY.users, users)) return setMessage('addressMessage', 'Could not save your demo profile update.', 'error');
    const app = createApplication('Address update', `${city}, PIN ending ${pin.slice(-2)}`);
    setMessage('addressMessage', `Address request ${app.id} submitted.`, 'success');
  }

  async function transferMoney() {
    addTransaction({
  type: 'Transfer',
  description: `Sent to ${receiver} (${upi}) · Receipt ${receipt}`,
  amount: `−${formatMoney(amount)}`,
  amountValue: amount
});
    if (!requireLogin('transferMessage')) return;
    if (userBucket(KEY.locked, false)) return setMessage('transferMessage', 'Transfers are unavailable while your demo account is locked.', 'error');
    const receiver = document.getElementById('receiverName').value.trim();
    const upi = document.getElementById('receiverUpi').value.trim();
    const amount = Number(document.getElementById('transferAmount').value);
    const pin = document.getElementById('transferPin').value;
    const user = userRecord();
    if (!/^[\w.-]+@demo$/i.test(upi)) return setMessage('transferMessage', 'Use a demo UPI ID ending in @demo.', 'error');
    if (!await awaitHashCompare(pin, user.pinHash)) return setMessage('transferMessage', 'The demo PIN is incorrect.', 'error');
    const balances = getData(KEY.balances, {});
    const balance = Number(balances[currentUser()] ?? 25000);
    if (!Number.isFinite(amount) || amount <= 0) return setMessage('transferMessage', 'Enter a valid transfer amount.', 'error');
    if (amount > balance) return setMessage('transferMessage', 'Insufficient demo balance.', 'error');
    balances[currentUser()] = balance - amount;
    saveData(KEY.balances, balances);
    const receipt = `DEMO-${Date.now()}`;
    addTransaction({ type: 'Transfer', description: `Sent to ${receiver} (${upi}) · Receipt ${receipt}`, amount: `−${formatMoney(amount)}` });
    addNotification(`Demo transfer of ${formatMoney(amount)} completed.`);
    document.getElementById('transferPin').value = '';
    refreshDashboard();
    setMessage('transferMessage', `Demo transfer complete. Receipt: ${receipt}. Remaining balance: ${formatMoney(balance - amount)}.`, 'success');
  }

  function awaitHashCompare(value, expected) {
    return hashText(value).then(hash => hash === expected);
  }

  function viewStatement(mode) {
    if (!requireLogin()) return;
    const list = userBucket(KEY.transactions, []);
    if (mode === 'csv') {
      const rows = [['Date', 'Type', 'Description', 'Amount'], ...list.map(item => [new Date(item.date).toLocaleString('en-IN'), item.type, item.description, item.amount])];
      const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      link.download = 'smartbank-demo-statement.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    const target = document.getElementById('statementOutput');
    renderTransactions(target, '');
  }

  async function generatePin() {
    if (!requireLogin('pinMessage')) return;
    const current = document.getElementById('pinCurrent').value;
    const next = document.getElementById('pinNew').value;
    const confirm = document.getElementById('pinConfirm').value;
    const user = userRecord();
    if (!await awaitHashCompare(current, user.pinHash)) return setMessage('pinMessage', 'Current demo PIN is incorrect.', 'error');
    if (!/^\d{4}$/.test(next) || next !== confirm) return setMessage('pinMessage', 'Enter matching new PINs with exactly 4 digits.', 'error');
    user.pinHash = await hashText(next);
    const users = getData(KEY.users, []);
    users[users.findIndex(item => item.username === currentUser())] = user;
    saveData(KEY.users, users);
    document.getElementById('pinCurrent').value = '';
    document.getElementById('pinNew').value = '';
    document.getElementById('pinConfirm').value = '';
    setMessage('pinMessage', 'Demo ATM PIN updated. Remember, this is not a real credential.', 'success');
  }

  function openAccount() {
    if (!requireLogin('accountMessage')) return;
    const type = document.getElementById('accountType').value;
    const reason = document.getElementById('accountReason').value.trim();
    const app = createApplication('New account', `${type} · ${reason}`);
    setMessage('accountMessage', `Application ${app.id} submitted.`, 'success');
  }

  function verifyKYC() {
    if (!requireLogin('kycMessage')) return;
    const id = document.getElementById('kycId').value.trim();
    if (!/^[A-Za-z0-9-]{5,20}$/.test(id) || !/demo/i.test(id)) return setMessage('kycMessage', 'Use a fictional ID containing “DEMO” (5–20 letters, digits, or hyphens).', 'error');
    setUserBucket(KEY.kyc, { status: 'Verified (demo)', id: `••••${id.slice(-3)}` });
    const app = createApplication('Demo KYC', `Fictional ID ending ${id.slice(-3)}`);
    setMessage('kycMessage', `Demo KYC verified. Application ${app.id} submitted.`, 'success');
  }

  function showNotifications(action) {
    if (!requireLogin()) return;
    let list = userBucket(KEY.notifications, []);
    if (action === 'clear') {
      list = [];
      setUserBucket(KEY.notifications, list);
    }
    document.getElementById('notificationList').innerHTML = list.length ? list.map(item => `<li class="list-item"><span><strong>${escapeHTML(item.text)}</strong><small>${escapeHTML(new Date(item.date).toLocaleString('en-IN'))}</small></span><span class="status-dot"></span></li>`).join('') : '<li class="empty-state">You’re all caught up.</li>';
  }

  function showTransactions() {
    if (!requireLogin()) return;
    const target = document.getElementById('transactionList');
    if (target) renderTransactions(target, document.getElementById('transactionSearch').value);
  }

  function trackApplication() {
    if (!requireLogin('trackResult')) return;
    const id = document.getElementById('applicationId').value.trim().toUpperCase();
    const app = applications().find(item => item.id.toUpperCase() === id);
    if (!app) return setMessage('trackResult', 'No application found with that ID.', 'error');
    setMessage('trackResult', `${app.type}: ${appStatus(app)} · Submitted → In Review → Approved`, 'success');
    renderApplications();
  }

  function renderChat() {
    const historyList = userBucket('smartbank_chat_history', []);
    document.getElementById('chatHistory').innerHTML = historyList.length ? historyList.map(item => `<div class="chat-bubble ${item.role === 'user' ? 'user' : ''}">${escapeHTML(item.text)}</div>`).join('') : '<div class="chat-bubble">Hi! I’m your SmartBank demo assistant. Ask me about balance, transfers, PIN, security, or applications.</div>';
    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
  }

  function chatBot() {
    if (!requireLogin('chatMessage')) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    let historyList = userBucket('smartbank_chat_history', []);
    historyList.push({ role: 'user', text });
    const query = text.toLowerCase();
    let reply = 'I can help with balance, transfers, PIN, password, account lock, ATM cards, KYC, applications, or transactions.';
    if (/hello|hi\b|hey/.test(query)) reply = 'Hello! What would you like to know about your demo banking account?';
    else if (/thank/.test(query)) reply = 'You’re welcome! I’m here whenever you need help.';
    else if (/balance/.test(query)) reply = `Your demo balance is ${formatMoney(getData(KEY.balances, {})[currentUser()] ?? 25000)}.`;
    else if (/transfer|send money|upi/.test(query)) reply = 'Open Send Money from your dashboard. Transfers are simulated, require your demo PIN, and need an @demo UPI ID.';
    else if (/pin/.test(query)) reply = 'Change your demo ATM PIN from the ATM PIN service. Never use a real banking PIN here.';
    else if (/password|forgot/.test(query)) reply = 'Use Forgot Password on the login screen and confirm the email address registered to your demo username.';
    else if (/lock|security/.test(query)) reply = 'Open Account Security to lock or unlock your demo profile. Transfers are blocked while locked.';
    else if (/atm|card/.test(query)) reply = 'You can submit a simulated ATM card request from the ATM Card service. No real card number is generated.';
    else if (/kyc/.test(query)) reply = 'Demo KYC accepts fictional IDs that contain the word DEMO. Do not enter real identity details.';
    else if (/application|track/.test(query)) reply = 'Open Application Tracking and enter your APP ID to view its demo status.';
    else if (/transaction|statement/.test(query)) reply = 'Your transaction history is available from Transactions or Statement; you can also download a demo CSV.';
    historyList.push({ role: 'assistant', text: reply });
    setUserBucket('smartbank_chat_history', historyList);
    input.value = '';
    renderChat();
  }

  function toggleTheme() {
    const light = document.body.classList.toggle('light-mode');
    saveData(KEY.theme, light ? 'light' : 'dark');
  }

  window.showPage = showPage;
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logoutUser = logoutUser;
  window.fingerprintLogin = fingerprintLogin;
  window.forgotPassword = forgotPassword;
  window.submitSecurityRequest = submitSecurityRequest;
  window.applyCard = applyCard;
  window.updateMobile = updateMobile;
  window.updateAddress = updateAddress;
  window.transferMoney = transferMoney;
  window.viewStatement = viewStatement;
  window.generatePin = generatePin;
  window.openAccount = openAccount;
  window.verifyKYC = verifyKYC;
  window.showNotifications = showNotifications;
  window.showTransactions = showTransactions;
  window.trackApplication = trackApplication;
  window.chatBot = chatBot;
  window.toggleTheme = toggleTheme;

  if (getData(KEY.theme, 'dark') === 'light') document.body.classList.add('light-mode');
  const savedUser = currentUser();
  if (savedUser && !getData(KEY.users, []).some(user => user.username === savedUser)) saveData(KEY.current, '');
  showPage(location.hash.slice(1) || (currentUser() ? 'dashboard' : 'home'));
});
function calculateLoanEMI() {
  const principal = Number(document.getElementById('loanAmount').value);
  const annualRate = Number(document.getElementById('loanRate').value);
  const months = Number(document.getElementById('loanTenure').value);
  const result = document.getElementById('emiResult');

  if (!Number.isFinite(principal) || principal <= 0 ||
      !Number.isFinite(annualRate) || annualRate < 0 ||
      !Number.isInteger(months) || months < 1 || months > 600) {
    result.innerHTML =
      '<p class="message error">Enter a positive loan amount, a non-negative annual rate, and a tenure from 1 to 600 months.</p>';
    return;
  }

  const monthlyRate = annualRate / 1200;
  const emi = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate * (1 + monthlyRate) ** months /
      ((1 + monthlyRate) ** months - 1);

  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;

  result.innerHTML = `
    <article class="list-item">
      <span>
        <strong>Estimated monthly EMI</strong>
        <small>For ${months} months at ${annualRate}% annual interest</small>
      </span>
      <strong class="list-amount">${escapeHTML(formatMoney(emi))}</strong>
    </article>
    <article class="list-item">
      <span><strong>Total payment</strong></span>
      <strong>${escapeHTML(formatMoney(totalPayment))}</strong>
    </article>
    <article class="list-item">
      <span><strong>Estimated total interest</strong></span>
      <strong>${escapeHTML(formatMoney(totalInterest))}</strong>
    </article>
    <p class="message">Illustrative estimate only. Actual loan terms and charges may differ.</p>`;
}

window.calculateLoanEMI = calculateLoanEMI;
window.renderSpendingChart = renderSpendingChart;
window.addEventListener('resize', () => {
  if (location.hash === '#spendingChartPage') renderSpendingChart();
});