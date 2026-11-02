/**
 * script.js – TestForge Application Logic
 * Vanilla JavaScript, no external dependencies.
 * Data persisted in localStorage under key "testforge_cases".
 */

'use strict';

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */

const STORAGE_KEY = 'testforge_cases';

/** @type {TestCase[]} */
let testCases = [];

/** ID of the test case pending deletion */
let pendingDeleteId = null;

/** Generated test cases waiting to be saved */
let generatedCases = [];

/**
 * @typedef {Object} TestCase
 * @property {string} id
 * @property {string} title
 * @property {string} feature
 * @property {string} requirement
 * @property {string} scenario
 * @property {string} preconditions
 * @property {string} steps
 * @property {string} expected
 * @property {string} actual
 * @property {string} priority  // Low | Medium | High | Critical
 * @property {string} status    // Not Run | Passed | Failed | Blocked
 * @property {number} createdAt
 */

/* ============================================================
   SEED DATA – shown on first load so dashboard isn't empty
   ============================================================ */

const SEED_DATA = [
  {
    id: 'TC-001',
    title: 'Verify successful login with valid credentials',
    feature: 'Authentication',
    requirement: 'User can log in using a registered email and correct password.',
    scenario: 'Positive Testing',
    preconditions: 'User has a registered account with valid credentials.',
    steps: '1. Navigate to /login\n2. Enter valid email address\n3. Enter correct password\n4. Click "Login" button',
    expected: 'User is redirected to the dashboard and a welcome message is displayed.',
    actual: 'User redirected to dashboard successfully.',
    priority: 'Critical',
    status: 'Passed',
    createdAt: Date.now() - 6 * 86400000,
  },
  {
    id: 'TC-002',
    title: 'Verify login fails with invalid password',
    feature: 'Authentication',
    requirement: 'System must reject login attempts with incorrect passwords.',
    scenario: 'Negative Testing',
    preconditions: 'User has a registered account.',
    steps: '1. Navigate to /login\n2. Enter valid email address\n3. Enter incorrect password\n4. Click "Login" button',
    expected: 'An error message "Invalid credentials" is displayed and user stays on login page.',
    actual: 'Error message displayed correctly.',
    priority: 'High',
    status: 'Passed',
    createdAt: Date.now() - 5 * 86400000,
  },
  {
    id: 'TC-003',
    title: 'Verify password minimum length boundary (7 characters)',
    feature: 'Authentication',
    requirement: 'Password must be at least 8 characters long.',
    scenario: 'Boundary Testing',
    preconditions: 'Registration form is accessible.',
    steps: '1. Navigate to /register\n2. Fill in valid email\n3. Enter password with exactly 7 characters\n4. Submit form',
    expected: 'Validation error "Password must be at least 8 characters" is shown.',
    actual: '',
    priority: 'Medium',
    status: 'Not Run',
    createdAt: Date.now() - 4 * 86400000,
  },
  {
    id: 'TC-004',
    title: 'Add product to cart and verify cart total',
    feature: 'Shopping Cart',
    requirement: 'User can add products to cart and cart total updates dynamically.',
    scenario: 'Positive Testing',
    preconditions: 'User is logged in and product catalog is accessible.',
    steps: '1. Navigate to product listing\n2. Click "Add to Cart" on a product\n3. Open the cart\n4. Verify item and price appear',
    expected: 'Cart shows added product with correct name, quantity 1, and correct price.',
    actual: '',
    priority: 'High',
    status: 'Not Run',
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: 'TC-005',
    title: 'Verify checkout fails with expired credit card',
    feature: 'Payment Gateway',
    requirement: 'System must reject payments from expired credit cards.',
    scenario: 'Negative Testing',
    preconditions: 'User has items in cart and is on checkout page.',
    steps: '1. Proceed to checkout\n2. Enter expired card details\n3. Click "Pay Now"',
    expected: 'Error message "Your card has expired" is displayed and payment is not processed.',
    actual: 'Payment declined message did not appear — payment processed.',
    priority: 'Critical',
    status: 'Failed',
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'TC-006',
    title: 'Verify user profile update',
    feature: 'User Profile',
    requirement: 'User can update their display name and profile picture.',
    scenario: 'Positive Testing',
    preconditions: 'User is logged in and on the profile settings page.',
    steps: '1. Navigate to /profile/settings\n2. Change display name\n3. Upload new profile picture\n4. Click "Save Changes"',
    expected: 'Success toast is shown. Updated name and picture are reflected immediately.',
    actual: '',
    priority: 'Medium',
    status: 'Blocked',
    createdAt: Date.now() - 86400000,
  },
];

/* ============================================================
   LOCAL STORAGE HELPERS
   ============================================================ */

/** Load test cases from localStorage, seeding if empty */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      testCases = JSON.parse(raw);
    } else {
      testCases = SEED_DATA.map(tc => ({ ...tc }));
      saveToStorage();
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    testCases = SEED_DATA.map(tc => ({ ...tc }));
  }
}

/** Persist current testCases array to localStorage */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(testCases));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    showToast('Storage error. Changes may not persist.', 'error');
  }
}

/* ============================================================
   ID GENERATION
   ============================================================ */

/** Generate next test case ID in format TC-NNN */
function generateId() {
  if (testCases.length === 0) return 'TC-001';
  const nums = testCases
    .map(tc => parseInt(tc.id.replace('TC-', ''), 10))
    .filter(n => !isNaN(n));
  const max = Math.max(...nums, 0);
  return 'TC-' + String(max + 1).padStart(3, '0');
}

/* ============================================================
   NAVIGATION
   ============================================================ */

const NAV_CONFIG = {
  dashboard:  { title: 'Dashboard',              subtitle: 'Overview of your testing activities' },
  generator:  { title: 'Test Case Generator',    subtitle: 'Generate test case templates automatically' },
  management: { title: 'Test Case Management',   subtitle: 'Create, read, update, and delete test cases' },
};

/** Navigate to a section by name */
function navigateTo(section) {
  // Update sections visibility
  document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`section-${section}`);
  if (target) {
    target.classList.remove('hidden');
    // Re-trigger animation
    target.style.animation = 'none';
    requestAnimationFrame(() => { target.style.animation = ''; });
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${section}`);
  if (navBtn) navBtn.classList.add('active');

  // Update header
  const cfg = NAV_CONFIG[section] || {};
  setText('page-title', cfg.title || section);
  setText('page-subtitle', cfg.subtitle || '');

  // Refresh content
  if (section === 'dashboard') renderDashboard();
  if (section === 'management') renderTable();

  // Close sidebar on mobile
  closeSidebar();
}

/* ============================================================
   SIDEBAR TOGGLE (mobile)
   ============================================================ */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('hidden');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

/* ============================================================
   DASHBOARD RENDERING
   ============================================================ */

function renderDashboard() {
  const total   = testCases.length;
  const notRun  = testCases.filter(tc => tc.status === 'Not Run').length;
  const passed  = testCases.filter(tc => tc.status === 'Passed').length;
  const failed  = testCases.filter(tc => tc.status === 'Failed').length;
  const blocked = testCases.filter(tc => tc.status === 'Blocked').length;

  setText('stat-total',   total);
  setText('stat-notrun',  notRun);
  setText('stat-passed',  passed);
  setText('stat-failed',  failed);
  setText('stat-blocked', blocked);

  // Progress bar
  const ran = passed + failed + blocked;
  const pct = total > 0 ? Math.round((ran / total) * 100) : 0;
  setText('progress-pct', pct + '%');
  const pW = total > 0 ? (passed  / total * 100).toFixed(1) : 0;
  const fW = total > 0 ? (failed  / total * 100).toFixed(1) : 0;
  const bW = total > 0 ? (blocked / total * 100).toFixed(1) : 0;
  document.getElementById('progress-passed').style.width  = pW + '%';
  document.getElementById('progress-failed').style.width  = fW + '%';
  document.getElementById('progress-blocked').style.width = bW + '%';

  // Recent test cases (last 5 by createdAt)
  const recent = [...testCases]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const container = document.getElementById('dashboard-recent-list');
  container.innerHTML = '';

  if (recent.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'py-10 text-center text-gray-400 text-sm';
    empty.textContent = 'No test cases yet. Add one to get started!';
    container.appendChild(empty);
    return;
  }

  recent.forEach(tc => {
    const item = document.createElement('div');
    item.className = 'recent-item';

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3 min-w-0';

    const idSpan = document.createElement('span');
    idSpan.className = 'text-xs font-mono text-gray-400 shrink-0';
    idSpan.textContent = tc.id;

    const info = document.createElement('div');
    info.className = 'min-w-0';

    const titleEl = document.createElement('p');
    titleEl.className = 'text-sm font-medium text-gray-800 truncate';
    titleEl.textContent = tc.title;

    const featureEl = document.createElement('p');
    featureEl.className = 'text-xs text-gray-400 truncate';
    featureEl.textContent = tc.feature;

    info.appendChild(titleEl);
    info.appendChild(featureEl);
    left.appendChild(idSpan);
    left.appendChild(info);

    const right = document.createElement('div');
    right.className = 'flex items-center gap-2 shrink-0 ml-3';

    right.appendChild(createBadge(tc.priority, 'priority'));
    right.appendChild(createBadge(tc.status, 'status'));

    item.appendChild(left);
    item.appendChild(right);
    container.appendChild(item);
  });
}

/* ============================================================
   TEST CASE MANAGEMENT TABLE
   ============================================================ */

function renderTable(filtered) {
  const data = filtered !== undefined ? filtered : testCases;
  const tbody = document.getElementById('tc-table-body');
  const emptyState = document.getElementById('tc-empty-state');
  const resultsInfo = document.getElementById('tc-results-info');

  tbody.innerHTML = '';

  if (data.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('show-empty');
    resultsInfo.textContent = '';
    return;
  }

  emptyState.classList.add('hidden');
  emptyState.classList.remove('show-empty');

  const totalStr = filtered !== undefined
    ? `Showing ${data.length} of ${testCases.length} test cases`
    : `${data.length} test case${data.length !== 1 ? 's' : ''}`;
  resultsInfo.textContent = totalStr;

  // Sort by createdAt descending
  const sorted = [...data].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  sorted.forEach(tc => {
    const tr = document.createElement('tr');

    // ID
    const tdId = createTd('');
    const idCode = document.createElement('code');
    idCode.className = 'text-xs font-mono text-gray-500';
    idCode.textContent = tc.id;
    tdId.appendChild(idCode);

    // Title / Feature
    const tdTitle = createTd('');
    const titleP = document.createElement('p');
    titleP.className = 'font-medium text-gray-800 text-sm';
    titleP.textContent = tc.title;
    const featP = document.createElement('p');
    featP.className = 'text-xs text-gray-400 mt-0.5';
    featP.textContent = tc.feature;
    tdTitle.appendChild(titleP);
    tdTitle.appendChild(featP);
    tdTitle.className = 'px-4 py-3 max-w-xs';

    // Scenario (hidden on small screens)
    const tdScenario = createTd(tc.scenario);
    tdScenario.className = 'px-4 py-3 text-sm text-gray-600 hidden md:table-cell';

    // Priority
    const tdPriority = createTd('');
    tdPriority.appendChild(createBadge(tc.priority, 'priority'));

    // Status
    const tdStatus = createTd('');
    tdStatus.appendChild(createBadge(tc.status, 'status'));

    // Actions
    const tdActions = createTd('');
    tdActions.className = 'px-4 py-3';
    tdActions.appendChild(createActionButtons(tc.id, tc.title));

    tr.appendChild(tdId);
    tr.appendChild(tdTitle);
    tr.appendChild(tdScenario);
    tr.appendChild(tdPriority);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

/** Create a <td> with base padding and optional text */
function createTd(text) {
  const td = document.createElement('td');
  td.className = 'px-4 py-3';
  if (text) td.textContent = text;
  return td;
}

/** Create action buttons for a table row */
function createActionButtons(id, title) {
  const wrap = document.createElement('div');
  wrap.className = 'flex items-center gap-1';

  // View
  const viewBtn = document.createElement('button');
  viewBtn.className = 'p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors';
  viewBtn.title = 'View Details';
  viewBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
  viewBtn.addEventListener('click', () => openDetailModal(id));

  // Edit
  const editBtn = document.createElement('button');
  editBtn.className = 'p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors';
  editBtn.title = 'Edit';
  editBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`;
  editBtn.addEventListener('click', () => openEditModal(id));

  // Delete
  const delBtn = document.createElement('button');
  delBtn.className = 'p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors';
  delBtn.title = 'Delete';
  delBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
  delBtn.addEventListener('click', () => openDeleteModal(id, title));

  wrap.appendChild(viewBtn);
  wrap.appendChild(editBtn);
  wrap.appendChild(delBtn);
  return wrap;
}

/* ============================================================
   SEARCH & FILTER
   ============================================================ */

function filterTestCases() {
  const query   = document.getElementById('search-input').value.trim().toLowerCase();
  const status  = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;

  const filtered = testCases.filter(tc => {
    const matchesSearch = !query ||
      tc.id.toLowerCase().includes(query) ||
      tc.title.toLowerCase().includes(query) ||
      tc.feature.toLowerCase().includes(query);

    const matchesStatus   = !status   || tc.status === status;
    const matchesPriority = !priority || tc.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  renderTable(filtered);
}

/* ============================================================
   ADD / EDIT MODAL
   ============================================================ */

function openAddModal() {
  clearModalForm();
  document.getElementById('modal-tc-id').value = '';
  setText('modal-title', 'Add Test Case');
  showModal('modal-overlay');
}

function openEditModal(id) {
  const tc = testCases.find(t => t.id === id);
  if (!tc) return;

  clearModalForm();
  document.getElementById('modal-tc-id').value    = tc.id;
  document.getElementById('modal-title-input').value = tc.title;
  document.getElementById('modal-feature').value   = tc.feature;
  document.getElementById('modal-scenario').value  = tc.scenario;
  document.getElementById('modal-requirement').value = tc.requirement || '';
  document.getElementById('modal-preconditions').value = tc.preconditions || '';
  document.getElementById('modal-steps').value     = tc.steps;
  document.getElementById('modal-expected').value  = tc.expected;
  document.getElementById('modal-actual').value    = tc.actual || '';
  document.getElementById('modal-priority').value  = tc.priority;
  document.getElementById('modal-status').value    = tc.status;
  setText('modal-title', 'Edit Test Case');
  showModal('modal-overlay');
}

function closeModal() {
  hideModal('modal-overlay');
}

function clearModalForm() {
  const ids = ['modal-title-input','modal-feature','modal-scenario','modal-requirement',
    'modal-preconditions','modal-steps','modal-expected','modal-actual'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  document.getElementById('modal-priority').value = '';
  document.getElementById('modal-status').value = 'Not Run';
}

/** Validate and save (create or update) a test case from the modal */
function saveTestCase() {
  const id       = document.getElementById('modal-tc-id').value.trim();
  const title    = document.getElementById('modal-title-input').value.trim();
  const feature  = document.getElementById('modal-feature').value.trim();
  const scenario = document.getElementById('modal-scenario').value.trim();
  const steps    = document.getElementById('modal-steps').value.trim();
  const expected = document.getElementById('modal-expected').value.trim();
  const priority = document.getElementById('modal-priority').value;
  const status   = document.getElementById('modal-status').value;

  // Validation
  const errors = [];
  if (!title)    errors.push('modal-title-input');
  if (!feature)  errors.push('modal-feature');
  if (!scenario) errors.push('modal-scenario');
  if (!steps)    errors.push('modal-steps');
  if (!expected) errors.push('modal-expected');
  if (!priority) errors.push('modal-priority');
  if (!status)   errors.push('modal-status');

  // Clear previous errors
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));

  if (errors.length > 0) {
    errors.forEach(eid => {
      const el = document.getElementById(eid);
      if (el) el.classList.add('error');
    });
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const tcData = {
    title,
    feature,
    scenario,
    requirement: document.getElementById('modal-requirement').value.trim(),
    preconditions: document.getElementById('modal-preconditions').value.trim(),
    steps,
    expected,
    actual: document.getElementById('modal-actual').value.trim(),
    priority,
    status,
  };

  if (id) {
    // Update existing
    const idx = testCases.findIndex(tc => tc.id === id);
    if (idx !== -1) {
      testCases[idx] = { ...testCases[idx], ...tcData };
    }
    showToast(`Test case ${id} updated successfully.`, 'success');
  } else {
    // Create new
    const newId = generateId();
    testCases.push({ id: newId, ...tcData, createdAt: Date.now() });
    showToast(`Test case ${newId} created successfully.`, 'success');
  }

  saveToStorage();
  closeModal();
  renderTable();
  renderDashboard();
}

/* ============================================================
   DETAIL MODAL
   ============================================================ */

function openDetailModal(id) {
  const tc = testCases.find(t => t.id === id);
  if (!tc) return;

  setText('detail-tc-id', tc.id);
  setText('detail-tc-title', tc.title);

  const body = document.getElementById('detail-modal-body');
  body.innerHTML = '';

  const fields = [
    { label: 'Feature',        value: tc.feature },
    { label: 'Scenario',       value: tc.scenario },
    { label: 'Priority',       value: tc.priority, type: 'priority-badge' },
    { label: 'Status',         value: tc.status,   type: 'status-badge' },
    { label: 'Requirement',    value: tc.requirement || '—' },
    { label: 'Preconditions',  value: tc.preconditions || '—' },
    { label: 'Test Steps',     value: tc.steps },
    { label: 'Expected Result',value: tc.expected },
    { label: 'Actual Result',  value: tc.actual || '—' },
  ];

  fields.forEach(f => {
    const row = document.createElement('dl');
    row.className = 'detail-row';

    const dt = document.createElement('dt');
    dt.textContent = f.label;

    const dd = document.createElement('dd');
    if (f.type === 'priority-badge') {
      dd.appendChild(createBadge(f.value, 'priority'));
    } else if (f.type === 'status-badge') {
      dd.appendChild(createBadge(f.value, 'status'));
    } else {
      dd.textContent = f.value;
    }

    row.appendChild(dt);
    row.appendChild(dd);
    body.appendChild(row);

    // Separator
    const hr = document.createElement('hr');
    hr.className = 'border-gray-100';
    body.appendChild(hr);
  });

  // Wire up the Edit button in the footer
  const editBtn = document.getElementById('detail-edit-btn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeDetailModal();
      openEditModal(id);
    };
  }

  showModal('detail-modal-overlay');
}

function closeDetailModal() {
  hideModal('detail-modal-overlay');
}

/* ============================================================
   DELETE MODAL
   ============================================================ */

function openDeleteModal(id, title) {
  pendingDeleteId = id;
  setText('delete-tc-label', `"${title}" (${id})`);
  showModal('delete-modal-overlay');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  hideModal('delete-modal-overlay');
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  testCases = testCases.filter(tc => tc.id !== id);
  saveToStorage();
  closeDeleteModal();
  filterTestCases(); // re-run current filter
  renderDashboard();
  showToast(`Test case ${id} deleted.`, 'info');
}

/* ============================================================
   TEST CASE GENERATOR
   ============================================================ */

/**
 * Template generator that produces test cases based on feature info and type.
 * Uses rule-based templates — no external AI service.
 */
function generateTestCases() {
  const feature     = document.getElementById('gen-feature').value.trim();
  const requirement = document.getElementById('gen-requirement').value.trim();
  const type        = document.getElementById('gen-type').value;

  // Validation
  let hasError = false;
  ['gen-feature', 'gen-requirement', 'gen-type'].forEach(id => {
    const el = document.getElementById(id);
    const val = el.value.trim();
    if (!val) {
      el.classList.add('error');
      hasError = true;
    } else {
      el.classList.remove('error');
    }
  });

  if (hasError) {
    showToast('Please fill in all generator fields.', 'error');
    return;
  }

  const types = type === 'all'
    ? ['positive', 'negative', 'boundary']
    : [type];

  generatedCases = [];
  types.forEach(t => {
    generatedCases.push(buildTemplate(feature, requirement, t));
  });

  renderGeneratedResults();
}

/**
 * Build a single test case template for a given feature and scenario type.
 * @param {string} feature
 * @param {string} requirement
 * @param {'positive'|'negative'|'boundary'} type
 * @returns {TestCase}
 */
function buildTemplate(feature, requirement, type) {
  const scenarioMap = {
    positive: 'Positive Testing',
    negative: 'Negative Testing',
    boundary: 'Boundary Testing',
  };

  const priorityMap = {
    positive: 'High',
    negative: 'High',
    boundary: 'Medium',
  };

  const templates = {
    positive: {
      title: `Verify successful ${feature} with valid input`,
      preconditions: `System is accessible. User has valid credentials/data required for ${feature}.`,
      steps: `1. Navigate to the ${feature} section.\n2. Provide valid, well-formed input as per requirement.\n3. Submit or trigger the ${feature} action.\n4. Observe the system response.`,
      expected: `The ${feature} completes successfully. The system behaves as described: "${requirement}".`,
    },
    negative: {
      title: `Verify ${feature} rejection with invalid or missing input`,
      preconditions: `System is accessible. Invalid test data (empty, incorrect type, wrong format) is prepared for ${feature}.`,
      steps: `1. Navigate to the ${feature} section.\n2. Provide invalid, empty, or malformed input.\n3. Submit or trigger the ${feature} action.\n4. Observe the system error response.`,
      expected: `The system rejects the request and displays a clear validation or error message. No data is corrupted. The requirement "${requirement}" is enforced.`,
    },
    boundary: {
      title: `Verify ${feature} at input boundary values`,
      preconditions: `System is accessible. Boundary values (min-1, min, max, max+1) for ${feature} inputs are identified from the requirement.`,
      steps: `1. Navigate to the ${feature} section.\n2. Enter input at the minimum allowed boundary value.\n3. Verify behavior. Repeat with minimum-1 (below boundary).\n4. Enter input at the maximum allowed boundary value.\n5. Verify behavior. Repeat with maximum+1 (above boundary).\n6. Record results for each boundary condition.`,
      expected: `Inputs at valid boundaries are accepted. Inputs outside the boundaries are rejected with appropriate messages. Requirement: "${requirement}".`,
    },
  };

  const tpl = templates[type];

  return {
    id: '',                       // assigned on save
    title: tpl.title,
    feature: feature,
    requirement: requirement,
    scenario: scenarioMap[type],
    preconditions: tpl.preconditions,
    steps: tpl.steps,
    expected: tpl.expected,
    actual: '',
    priority: priorityMap[type],
    status: 'Not Run',
    createdAt: Date.now(),
  };
}

/** Render the generated test cases as editable cards */
function renderGeneratedResults() {
  const container = document.getElementById('gen-results-container');
  const list      = document.getElementById('gen-results-list');
  const count     = document.getElementById('gen-count');

  list.innerHTML = '';
  count.textContent = `(${generatedCases.length} generated)`;

  generatedCases.forEach((tc, idx) => {
    const card = document.createElement('div');
    card.className = 'gen-card';

    // Card header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-4';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'flex items-center gap-2';

    const badge = createBadge(tc.scenario, 'scenario');
    const priorityBadge = createBadge(tc.priority, 'priority');
    headerLeft.appendChild(badge);
    headerLeft.appendChild(priorityBadge);

    const headerRight = document.createElement('button');
    headerRight.className = 'flex items-center gap-1.5 text-accent text-xs font-medium hover:underline';
    headerRight.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>Save this`;
    headerRight.addEventListener('click', () => saveSingleGenerated(idx));

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    // Fields
    const fields = [
      { label: 'Title',           id: `gen-title-${idx}`,         value: tc.title,         type: 'input'    },
      { label: 'Preconditions',   id: `gen-pre-${idx}`,           value: tc.preconditions, type: 'textarea' },
      { label: 'Test Steps',      id: `gen-steps-${idx}`,         value: tc.steps,         type: 'textarea', rows: 5 },
      { label: 'Expected Result', id: `gen-expected-${idx}`,      value: tc.expected,      type: 'textarea' },
    ];

    const grid = document.createElement('div');
    grid.className = 'space-y-3';

    fields.forEach(f => {
      const group = document.createElement('div');

      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = f.label;

      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = f.rows || 3;
      } else {
        input = document.createElement('input');
        input.type = 'text';
      }
      input.id = f.id;
      input.className = 'form-input';
      input.value = f.value;

      // Keep generatedCases in sync when user edits
      input.addEventListener('input', () => syncGeneratedField(idx, f.label, input.value));

      group.appendChild(label);
      group.appendChild(input);
      grid.appendChild(group);
    });

    card.appendChild(header);
    card.appendChild(grid);
    list.appendChild(card);
  });

  container.classList.remove('hidden');
}

/** Sync an edited field back to the generatedCases array */
function syncGeneratedField(idx, fieldLabel, value) {
  if (!generatedCases[idx]) return;
  const map = {
    'Title':           'title',
    'Preconditions':   'preconditions',
    'Test Steps':      'steps',
    'Expected Result': 'expected',
  };
  const key = map[fieldLabel];
  if (key) generatedCases[idx][key] = value;
}

/** Save a single generated test case to management */
function saveSingleGenerated(idx) {
  const tc = generatedCases[idx];
  if (!tc) return;

  // Sync current field values from DOM
  syncFromDom(idx);

  const newId = generateId();
  testCases.push({ ...generatedCases[idx], id: newId, createdAt: Date.now() });
  saveToStorage();
  renderDashboard();
  showToast(`${newId} saved to Test Case Management.`, 'success');
}

/** Save all generated test cases */
function saveAllGenerated() {
  if (generatedCases.length === 0) return;

  // Sync all from DOM
  generatedCases.forEach((_, idx) => syncFromDom(idx));

  const savedIds = [];
  generatedCases.forEach(tc => {
    const newId = generateId();
    testCases.push({ ...tc, id: newId, createdAt: Date.now() });
    savedIds.push(newId);
  });

  saveToStorage();
  renderDashboard();
  showToast(`${savedIds.length} test case(s) saved: ${savedIds.join(', ')}.`, 'success');
  generatedCases = [];
  document.getElementById('gen-results-container').classList.add('hidden');
  // Clear generator form
  ['gen-feature', 'gen-requirement'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('gen-type').value = '';
}

/** Sync one generated case from DOM fields before saving */
function syncFromDom(idx) {
  const titleEl    = document.getElementById(`gen-title-${idx}`);
  const preEl      = document.getElementById(`gen-pre-${idx}`);
  const stepsEl    = document.getElementById(`gen-steps-${idx}`);
  const expectedEl = document.getElementById(`gen-expected-${idx}`);

  if (titleEl)    generatedCases[idx].title        = titleEl.value;
  if (preEl)      generatedCases[idx].preconditions = preEl.value;
  if (stepsEl)    generatedCases[idx].steps         = stepsEl.value;
  if (expectedEl) generatedCases[idx].expected      = expectedEl.value;
}

/* ============================================================
   BADGE HELPER
   ============================================================ */

const STATUS_BADGE_CLASS = {
  'Not Run': 'badge-notrun',
  'Passed':  'badge-passed',
  'Failed':  'badge-failed',
  'Blocked': 'badge-blocked',
};

const PRIORITY_BADGE_CLASS = {
  'Low':      'badge-low',
  'Medium':   'badge-medium',
  'High':     'badge-high',
  'Critical': 'badge-critical',
};

const SCENARIO_BADGE_CLASS = {
  'Positive Testing': 'badge-passed',
  'Negative Testing': 'badge-failed',
  'Boundary Testing': 'badge-blocked',
};

/**
 * Create a styled badge element.
 * @param {string} value
 * @param {'status'|'priority'|'scenario'} type
 */
function createBadge(value, type) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = value || '—';

  let cls = '';
  if (type === 'status')   cls = STATUS_BADGE_CLASS[value]   || 'badge-notrun';
  if (type === 'priority') cls = PRIORITY_BADGE_CLASS[value] || 'badge-medium';
  if (type === 'scenario') cls = SCENARIO_BADGE_CLASS[value] || 'badge-medium';

  if (cls) span.classList.add(cls);
  return span;
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

const TOAST_ICONS = {
  success: `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  error:   `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  info:    `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>`,
  warning: `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
};

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Icon
  const iconWrap = document.createElement('span');
  iconWrap.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
  toast.appendChild(iconWrap);

  // Message (text node — no innerHTML from user input)
  const msgNode = document.createTextNode(message);
  toast.appendChild(msgNode);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/** Safely set text content of an element by ID */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/** Show a modal overlay */
function showModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('show');
  }
}

/** Hide a modal overlay */
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('show');
    el.classList.add('hidden');
  }
}

/* ============================================================
   KEYBOARD & CLICK-OUTSIDE HANDLERS
   ============================================================ */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDetailModal();
    closeDeleteModal();
    closeSidebar();
  }
});

// Close modals when clicking the backdrop
['modal-overlay', 'detail-modal-overlay'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function(e) {
      if (e.target === this) {
        hideModal(id);
      }
    });
  }
});

/* ============================================================
   INITIALISE APP
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  navigateTo('dashboard');
});
