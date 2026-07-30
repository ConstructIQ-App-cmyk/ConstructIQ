const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const supabaseUrl = 'https://plzonnnsgbasizvwmfit.supabase.co';
const supabaseAnonKey = 'sb_publishable_YIuhjQvB3Xypa-AWk9shxw_MvPm3snC';
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseAnonKey);
const showView = target => {
  const parentTabs = { 'job-detail': 'jobs', 'crew-detail': 'teams', 'stock-detail': 'inventory', settings: 'more' };
  const activeTab = parentTabs[target] || target;
  views.forEach(view => view.classList.toggle('active', view.id === `${target}-view`));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.target === activeTab));
  document.querySelector('#add-button').hidden = target === 'job-detail';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));

const dataVersion = 'current-field-data-v2';
const crewKey = 'current-crews-v2';
const jobKey = 'current-jobs-v2';
const toolKey = 'current-tools-v1';
const stockLocationKey = 'current-stock-locations-v1';
const profileKey = 'current-profile-name';
const profileFullNameKey = 'current-profile-full-name';
const hadExistingInstall = localStorage.getItem(dataVersion) === 'ready';
if (!hadExistingInstall) {
  localStorage.removeItem('current-crews');
  localStorage.removeItem(crewKey);
  localStorage.removeItem(jobKey);
  localStorage.setItem(dataVersion, 'ready');
}
let profileName = localStorage.getItem(profileKey);
let profileFullName = localStorage.getItem(profileFullNameKey) || profileName || '';
if (!profileName && hadExistingInstall) {
  profileName = 'Logan';
  localStorage.setItem(profileKey, profileName);
}
let crews = JSON.parse(localStorage.getItem(crewKey) || '[]');
let jobs = JSON.parse(localStorage.getItem(jobKey) || '[]');
let tools = JSON.parse(localStorage.getItem(toolKey) || '[]');
let stockLocations = JSON.parse(localStorage.getItem(stockLocationKey) || '[]');
let selectedStockLocationId = null;
let selectedCrewIndex = null;
let editingJobId = null;
let selectedJobId = null;
const crewColors = ['orange', 'blue', 'green'];
const commercialInspectionDefaults = ['Permit and approved plans on site', 'Underground / slab rough-in', 'Service equipment inspection', 'Grounding and bonding inspection', 'Rough-in wiring inspection', 'Above-ceiling inspection', 'Fire alarm rough-in inspection', 'Emergency and egress lighting inspection', 'Final electrical inspection', 'Final fire alarm inspection'];
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
const greetingName = name => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.` : (parts[0] || 'there');
};

function renderProfile() {
  document.querySelector('#profile-name').textContent = profileName || 'there';
  document.querySelector('#profile-initials').textContent = profileName ? initials(profileName) : '?';
  document.querySelector('#settings-profile-name').textContent = profileName || 'Not set';
}
document.querySelector('#profile-button').addEventListener('click', () => {
  document.querySelector('#profile-input').value = profileFullName || profileName || '';
  document.querySelector('#profile-modal').hidden = false;
  document.querySelector('#profile-input').focus();
});
document.querySelector('#settings-profile').addEventListener('click', () => {
  document.querySelector('#profile-input').value = profileFullName || profileName || '';
  document.querySelector('#profile-modal').hidden = false;
  document.querySelector('#profile-input').focus();
});
document.querySelector('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.querySelector('#profile-input').value.trim();
  if (!name) return;
  profileFullName = name;
  profileName = greetingName(profileFullName);
  localStorage.setItem(profileKey, profileName);
  localStorage.setItem(profileFullNameKey, profileFullName);
  if (supabaseClient) await supabaseClient.auth.updateUser({ data: { full_name: profileFullName } });
  document.querySelector('#profile-modal').hidden = true;
  renderProfile();
});
let isSignUp = false;
const authModal = document.querySelector('#auth-modal');
const authMessage = document.querySelector('#auth-message');
function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}
function renderAuthMode() {
  document.querySelector('#auth-title').textContent = isSignUp ? 'Create your account' : 'Sign in to your workspace';
  document.querySelector('#auth-description').textContent = isSignUp ? 'Create an account with your work email.' : 'Use your work email to access the field command center.';
  document.querySelector('#auth-first-name').hidden = !isSignUp;
  document.querySelector('#auth-last-name').hidden = !isSignUp;
  document.querySelector('#auth-first-name').required = isSignUp;
  document.querySelector('#auth-last-name').required = isSignUp;
  document.querySelector('#auth-password').autocomplete = isSignUp ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit').textContent = isSignUp ? 'Create account' : 'Sign in';
  document.querySelector('#auth-toggle').textContent = isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one';
  showAuthMessage('');
}
function applySignedInUser(user) {
  profileFullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
  profileName = greetingName(profileFullName);
  localStorage.setItem(profileKey, profileName);
  localStorage.setItem(profileFullNameKey, profileFullName);
  renderProfile();
  authModal.hidden = true;
  document.querySelector('#profile-modal').hidden = true;
}
async function initializeAuth() {
  if (!supabaseClient) { showAuthMessage('Sign-in service could not load. Check your connection.', true); authModal.hidden = false; return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) applySignedInUser(session.user);
  else authModal.hidden = false;
  supabaseClient.auth.onAuthStateChange((_event, session) => { if (session) applySignedInUser(session.user); });
}
document.querySelector('#auth-toggle').addEventListener('click', () => { isSignUp = !isSignUp; renderAuthMode(); });
document.querySelector('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabaseClient) return;
  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  const firstName = document.querySelector('#auth-first-name').value.trim();
  const lastName = document.querySelector('#auth-last-name').value.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  showAuthMessage(isSignUp ? 'Creating account…' : 'Signing in…');
  const result = isSignUp
    ? await supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName, first_name: firstName, last_name: lastName } } })
    : await supabaseClient.auth.signInWithPassword({ email, password });
  if (result.error) { showAuthMessage(result.error.message, true); return; }
  if (isSignUp && !result.data.session) showAuthMessage('Check your email to confirm your account, then sign in.');
  else if (result.data.user) applySignedInUser(result.data.user);
});
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function saveData() {
  localStorage.setItem(crewKey, JSON.stringify(crews));
  localStorage.setItem(jobKey, JSON.stringify(jobs));
  render();
}
function saveTools() {
  localStorage.setItem(toolKey, JSON.stringify(tools));
  renderTools();
}
function saveStockLocations() {
  localStorage.setItem(stockLocationKey, JSON.stringify(stockLocations));
  renderStockLocations();
}
function renderCrews() {
  const list = document.querySelector('#crew-list');
  const select = document.querySelector('#member-crew');
  list.innerHTML = crews.length ? crews.map((crew, index) => `
    <button class="crew-card crew-button" data-crew-index="${index}">
      <div class="crew-badge ${crew.color}">${escapeHtml(crew.name).slice(0, 1).toUpperCase()}</div>
      <div class="crew-info"><h3>${escapeHtml(crew.name)} <span class="status-dot"></span></h3><p>${escapeHtml(crew.jobName || 'Unassigned')} · ${crew.members.length} member${crew.members.length === 1 ? '' : 's'}</p><div class="avatars">${crew.members.slice(0, 4).map(member => `<span title="${escapeHtml(member.name)}, ${escapeHtml(member.role)}">${initials(member.name)}</span>`).join('')}</div></div><span class="chevron">›</span>
    </button>`).join('') : '<p class="empty-state">No crews yet. Add your first crew above.</p>';
  select.innerHTML = crews.length ? crews.map((crew, index) => `<option value="${index}">${escapeHtml(crew.name)}</option>`).join('') : '<option value="">Create a crew first</option>';
  document.querySelector('#crew-count').textContent = String(crews.length).padStart(2, '0');
}
function renderJobs() {
  const list = document.querySelector('#job-list');
  list.innerHTML = jobs.length ? jobs.map(job => {
    const assigned = crews.filter(crew => crew.jobId === job.id).map(crew => crew.name).join(', ') || 'No crew assigned';
    return `<article class="job-card"><div class="job-color blue"></div><div class="job-content"><p class="job-meta">DUE ${new Date(`${job.due}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</p><h3>${escapeHtml(job.name)}</h3><p>${escapeHtml(job.location)} · ${escapeHtml(assigned)}</p><div class="progress"><span style="width:0%"></span></div></div></article>`;
  }).join('') : '<p class="empty-state">No jobs yet. Add your first job to start assigning crews.</p>';
  list.querySelectorAll('.job-card').forEach((card, index) => {
    const job = jobs[index];
    card.dataset.openJob = job.id;
    const meta = card.querySelector('.job-meta');
    meta.textContent = `${job.type || 'Commercial Jobs'} · ${meta.textContent}`;
    const editButton = document.createElement('button');
    editButton.className = 'edit-job-button';
    editButton.dataset.editJob = job.id;
    editButton.textContent = 'EDIT';
    card.append(editButton);
  });
  const homeNext = document.querySelector('#home-next-job');
  homeNext.innerHTML = jobs.length ? `<article class="job-card" data-target="jobs"><div class="job-color blue"></div><div class="job-content"><p class="job-meta">UP NEXT</p><h3>${escapeHtml(jobs[0].name)}</h3><p>${escapeHtml(jobs[0].location)}</p><div class="progress"><span style="width:0%"></span></div></div><span class="chevron">›</span></article>` : '<p class="empty-state home-empty">No jobs created yet.</p>';
  homeNext.querySelector('[data-target]')?.addEventListener('click', () => showView('jobs'));
  document.querySelector('#home-job-count').textContent = jobs.length;
}
function render() {
  renderCrews();
  renderJobs();
  renderTools();
  renderStockLocations();
  document.querySelector('#home-member-count').textContent = String(crews.reduce((sum, crew) => sum + crew.members.length, 0)).padStart(2, '0');
}
function renderTools() {
  const list = document.querySelector('#tool-list');
  if (!list) return;
  list.innerHTML = tools.length ? tools.map(tool => `<article class="tool-record"><span class="tool-mark">T</span><div><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.toolId || 'No tool ID')} · ${tool.checkedOutTo ? `Out to ${escapeHtml(tool.checkedOutTo)}` : 'Available'}</p></div><button data-tool-action="${tool.checkedOutTo ? 'checkin' : 'checkout'}" data-tool-id="${tool.id}" class="${tool.checkedOutTo ? 'checkin-tool' : 'checkout-tool'}">${tool.checkedOutTo ? 'CHECK IN' : 'CHECK OUT'}</button></article>`).join('') : '<p class="empty-state">No tools added yet. Add equipment to begin tracking check in/out.</p>';
}
function renderStockLocations() {
  const list = document.querySelector('#stock-location-list');
  if (!list) return;
  list.innerHTML = stockLocations.length ? stockLocations.map(location => { const attention = (location.items || []).filter(item => Number(item.quantity) <= Number(item.minimum || 0)).length; return `<button class="stock-location-record" data-stock-location-id="${location.id}"><span>S</span><div><b>${escapeHtml(location.name)}</b><small>${(location.items || []).length} item${(location.items || []).length === 1 ? '' : 's'}${attention ? ` · ${attention} needs attention` : ''}</small></div><em>›</em></button>`; }).join('') : '<p class="empty-state">No stock locations yet. Add a location to begin tracking stock.</p>';
  renderStockSummary();
  renderIssueOptions();
}
function stockAttentionItems() {
  return stockLocations.flatMap(location => (location.items || []).filter(item => Number(item.quantity) <= Number(item.minimum || 0)).map(item => ({ location, item })));
}
function renderStockSummary() {
  const allItems = stockLocations.flatMap(location => location.items || []);
  document.querySelector('#inventory-sku-count').textContent = String(allItems.length).padStart(2, '0');
  document.querySelector('#inventory-attention-count').textContent = String(stockAttentionItems().length).padStart(2, '0');
}
function renderIssueOptions() {
  const locationSelect = document.querySelector('#issue-location');
  const itemSelect = document.querySelector('#issue-item');
  if (!locationSelect || !itemSelect) return;
  locationSelect.innerHTML = stockLocations.length ? stockLocations.map(location => `<option value="${location.id}">${escapeHtml(location.name)}</option>`).join('') : '<option value="">Add a stock location first</option>';
  locationSelect.disabled = !stockLocations.length;
  renderIssueItemOptions(locationSelect.value);
}
function renderIssueItemOptions(locationId) {
  const itemSelect = document.querySelector('#issue-item');
  const location = stockLocations.find(item => item.id === locationId);
  const items = location?.items || [];
  itemSelect.innerHTML = items.length ? items.map(item => `<option value="${item.id}">${escapeHtml(item.name)} (${item.quantity} ${escapeHtml(item.unit)})</option>`).join('') : '<option value="">Add stock to this location first</option>';
  itemSelect.disabled = !items.length;
}
function openStockLocation(location) {
  if (!location) return;
  selectedStockLocationId = location.id;
  location.items ||= [];
  document.querySelector('#stock-detail-name').textContent = location.name;
  document.querySelector('#stock-edit-name').value = location.name;
  document.querySelector('#stock-edit-form').hidden = true;
  document.querySelector('#stock-item-form').reset();
  renderStockItems(location);
  showView('stock-detail');
}
function renderStockItems(location) {
  const list = document.querySelector('#stock-item-list');
  list.innerHTML = location.items.length ? location.items.map(item => { const low = Number(item.quantity) <= Number(item.minimum || 0); return `<article class="stock-item-record ${low ? 'low-stock-item' : ''}"><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} · Minimum: ${escapeHtml(item.minimum ?? 0)}${low ? ' · Needs attention' : ''}</small></div><button data-remove-stock-item="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">&times;</button></article>`; }).join('') : '<p class="empty-state">No material added to this location yet.</p>';
}
function createCommercialChecklist() {
  return commercialInspectionDefaults.map((name, index) => ({ id: `inspection-${Date.now()}-${index}`, name, completed: false }));
}
function renderInspectionChecklist(job) {
  const inspections = job.inspections || [];
  const complete = inspections.filter(item => item.completed).length;
  document.querySelector('#inspection-progress').textContent = `${complete}/${inspections.length}`;
  document.querySelector('#inspection-list').innerHTML = inspections.map(item => `<label class="inspection-item"><input type="checkbox" data-inspection-id="${item.id}" ${item.completed ? 'checked' : ''} /><span></span><b>${escapeHtml(item.name)}</b><button type="button" class="remove-inspection-button" data-remove-inspection="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">&times;</button></label>`).join('');
}
function openJob(job) {
  if (!job) return;
  selectedJobId = job.id;
  document.querySelector('#job-detail-name').textContent = job.name;
  document.querySelector('#job-detail-type').textContent = job.type || 'JOB DETAILS';
  document.querySelector('#job-detail-location').textContent = `${job.location} · Due ${new Date(`${job.due}T12:00:00`).toLocaleDateString()}`;
  const isCommercial = job.type === 'Commercial Jobs';
  document.querySelector('#inspection-panel').hidden = !isCommercial;
  document.querySelector('#non-commercial-panel').hidden = isCommercial;
  if (isCommercial) {
    if (!Array.isArray(job.inspections)) { job.inspections = createCommercialChecklist(); saveData(); }
    renderInspectionChecklist(job);
  }
  showView('job-detail');
}
function openCrew(index) {
  selectedCrewIndex = index;
  const crew = crews[index];
  document.querySelector('#crew-detail-name').textContent = crew.name;
  document.querySelector('#crew-detail-members').innerHTML = crew.members.length ? crew.members.map((member, index) => `<div class="member-row"><span>${initials(member.name)}</span><div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}</small></div><button class="remove-member-button" data-remove-member="${index}">REMOVE</button></div>`).join('') : '<p class="empty-state">No members assigned to this crew.</p>';
  document.querySelector('#crew-job-select').innerHTML = `<option value="">Unassigned</option>${jobs.map(job => `<option value="${job.id}" ${crew.jobId === job.id ? 'selected' : ''}>${escapeHtml(job.name)}</option>`).join('')}`;
  document.querySelector('#crew-member-form').reset();
  showView('crew-detail');
}
document.querySelector('#crew-list').addEventListener('click', event => {
  const card = event.target.closest('[data-crew-index]');
  if (card) openCrew(Number(card.dataset.crewIndex));
});
document.querySelector('#crew-detail-members').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-member]');
  if (!button || selectedCrewIndex === null) return;
  if (confirm('Remove this member from the crew?')) {
    crews[selectedCrewIndex].members.splice(Number(button.dataset.removeMember), 1);
    saveData();
    openCrew(selectedCrewIndex);
  }
});
document.querySelector('#show-team-form').addEventListener('click', () => {
  document.querySelector('#team-form').hidden = !document.querySelector('#team-form').hidden;
  document.querySelector('#member-form').hidden = true;
});
document.querySelector('#show-member-form').addEventListener('click', () => {
  document.querySelector('#member-form').hidden = !document.querySelector('#member-form').hidden;
  document.querySelector('#team-form').hidden = true;
});
document.querySelector('#show-tool-form').addEventListener('click', () => {
  document.querySelector('#tool-form').hidden = !document.querySelector('#tool-form').hidden;
});
document.querySelector('#show-stock-location-form').addEventListener('click', () => {
  document.querySelector('#stock-location-form').hidden = !document.querySelector('#stock-location-form').hidden;
});
function openJobForm(job = null) {
  editingJobId = job?.id || null;
  const form = document.querySelector('#job-form');
  form.hidden = false;
  document.querySelector('#job-form-title').textContent = job ? 'Edit job' : 'New job';
  document.querySelector('#job-submit').textContent = job ? 'Save changes' : 'Create job';
  document.querySelector('#job-name').value = job?.name || '';
  document.querySelector('#job-type').value = job?.type || '';
  document.querySelector('#job-location').value = job?.location || '';
  document.querySelector('#job-due').value = job?.due || '';
}
document.querySelector('#show-job-form').addEventListener('click', () => openJobForm());
document.querySelectorAll('[data-cancel-form]').forEach(button => button.addEventListener('click', () => {
  const form = document.querySelector(`#${button.dataset.cancelForm}`);
  form.reset();
  if (button.dataset.cancelForm === 'job-form') editingJobId = null;
  if (button.dataset.cancelMode !== 'reset') form.hidden = true;
}));
document.querySelector('#job-list').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-job]');
  if (button) { openJobForm(jobs.find(job => job.id === button.dataset.editJob)); return; }
  const card = event.target.closest('[data-open-job]');
  if (card) openJob(jobs.find(job => job.id === card.dataset.openJob));
});
document.querySelector('#team-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#team-name').value.trim(); if (!name) return;
  crews.push({ name, color: crewColors[crews.length % crewColors.length], members: [], jobId: '', jobName: '' }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#member-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#member-name').value.trim(); const role = document.querySelector('#member-role').value.trim(); const crewIndex = Number(document.querySelector('#member-crew').value);
  if (!name || !role || !crews[crewIndex]) return; crews[crewIndex].members.push({ name, role }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#tool-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#tool-name').value.trim();
  const toolId = document.querySelector('#tool-id').value.trim();
  if (!name) return;
  tools.push({ id: `tool-${Date.now()}`, name, toolId, checkedOutTo: '' });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveTools();
});
document.querySelector('#stock-location-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#stock-location-name').value.trim();
  if (!name) return;
  stockLocations.push({ id: `stock-${Date.now()}`, name, items: [] });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
});
document.querySelector('#stock-location-list').addEventListener('click', event => {
  const card = event.target.closest('[data-stock-location-id]');
  if (card) openStockLocation(stockLocations.find(location => location.id === card.dataset.stockLocationId));
});
document.querySelector('#show-stock-edit-form').addEventListener('click', () => {
  document.querySelector('#stock-edit-form').hidden = !document.querySelector('#stock-edit-form').hidden;
});
document.querySelector('#stock-edit-form').addEventListener('submit', event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  const name = document.querySelector('#stock-edit-name').value.trim();
  if (!location || !name) return;
  location.name = name;
  event.currentTarget.hidden = true;
  saveStockLocations();
  openStockLocation(location);
});
document.querySelector('#stock-item-form').addEventListener('submit', event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  const name = document.querySelector('#stock-item-name').value.trim();
  const quantity = document.querySelector('#stock-item-quantity').value;
  const unit = document.querySelector('#stock-item-unit').value.trim();
  const minimum = document.querySelector('#stock-item-minimum').value;
  if (!location || !name || quantity === '' || !unit || minimum === '') return;
  location.items ||= [];
  location.items.push({ id: `item-${Date.now()}`, name, quantity, unit, minimum });
  event.currentTarget.reset();
  saveStockLocations();
  renderStockItems(location);
});
document.querySelector('#stock-item-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-stock-item]');
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  if (!button || !location || !confirm('Delete this stock item?')) return;
  location.items = location.items.filter(item => item.id !== button.dataset.removeStockItem);
  saveStockLocations();
  renderStockItems(location);
});
document.querySelector('#delete-stock-location-button').addEventListener('click', () => {
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  if (!location || !confirm(`Delete ${location.name} and all stock inside it?`)) return;
  stockLocations = stockLocations.filter(item => item.id !== selectedStockLocationId);
  selectedStockLocationId = null;
  saveStockLocations();
  showView('inventory');
});
document.querySelector('#tool-list').addEventListener('click', event => {
  const button = event.target.closest('[data-tool-action]');
  if (!button) return;
  const tool = tools.find(item => item.id === button.dataset.toolId);
  if (!tool) return;
  if (button.dataset.toolAction === 'checkout') {
    const person = prompt(`Check out ${tool.name} to:`, '');
    if (!person?.trim()) return;
    tool.checkedOutTo = person.trim();
  } else tool.checkedOutTo = '';
  saveTools();
});
document.querySelector('#crew-member-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#crew-member-name').value.trim();
  const role = document.querySelector('#crew-member-role').value.trim();
  if (!name || !role || selectedCrewIndex === null) return;
  crews[selectedCrewIndex].members.push({ name, role });
  saveData();
  openCrew(selectedCrewIndex);
});
document.querySelector('#job-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#job-name').value.trim(); const type = document.querySelector('#job-type').value; const location = document.querySelector('#job-location').value.trim(); const due = document.querySelector('#job-due').value;
  if (!name || !type || !location || !due) return;
  if (editingJobId) {
    const job = jobs.find(item => item.id === editingJobId);
    if (job) Object.assign(job, { name, type, location, due });
    if (job?.type === 'Commercial Jobs' && !Array.isArray(job.inspections)) job.inspections = createCommercialChecklist();
    crews.forEach(crew => { if (crew.jobId === editingJobId) crew.jobName = name; });
  } else jobs.push({ id: `${Date.now()}`, name, type, location, due, inspections: type === 'Commercial Jobs' ? createCommercialChecklist() : [] });
  editingJobId = null; event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#crew-assignment-form').addEventListener('submit', event => {
  event.preventDefault(); if (selectedCrewIndex === null) return; const jobId = document.querySelector('#crew-job-select').value; const job = jobs.find(item => item.id === jobId);
  crews[selectedCrewIndex].jobId = jobId; crews[selectedCrewIndex].jobName = job ? job.name : ''; saveData(); showView('teams');
});
document.querySelector('#inspection-list').addEventListener('change', event => {
  const checkbox = event.target.closest('[data-inspection-id]');
  const job = jobs.find(item => item.id === selectedJobId);
  if (!checkbox || !job) return;
  const item = job.inspections.find(inspection => inspection.id === checkbox.dataset.inspectionId);
  if (!item) return;
  item.completed = checkbox.checked;
  saveData();
  renderInspectionChecklist(job);
});
document.querySelector('#inspection-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-inspection]');
  const job = jobs.find(item => item.id === selectedJobId);
  if (!button || !job) return;
  event.preventDefault();
  event.stopPropagation();
  if (!confirm('Delete this inspection item?')) return;
  job.inspections = job.inspections.filter(item => item.id !== button.dataset.removeInspection);
  saveData();
  renderInspectionChecklist(job);
});
document.querySelector('#custom-inspection-form').addEventListener('submit', event => {
  event.preventDefault();
  const job = jobs.find(item => item.id === selectedJobId);
  const input = document.querySelector('#custom-inspection-name');
  const name = input.value.trim();
  if (!job || !name) return;
  job.inspections.push({ id: `custom-${Date.now()}`, name, completed: false });
  input.value = '';
  saveData();
  renderInspectionChecklist(job);
});
document.querySelector('#delete-crew-button').addEventListener('click', () => {
  if (selectedCrewIndex === null || !confirm(`Delete ${crews[selectedCrewIndex].name}? This cannot be undone.`)) return;
  crews.splice(selectedCrewIndex, 1);
  selectedCrewIndex = null;
  saveData();
  showView('teams');
});
document.querySelectorAll('.filter').forEach(filter => filter.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); filter.classList.add('active'); }));
const search = document.querySelector('#stock-search');
search?.addEventListener('input', () => { const term = search.value.toLowerCase(); document.querySelectorAll('.inventory-item').forEach(item => { item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none'; }); });
const toast = document.querySelector('#toast');
const showToast = message => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
};
const quickSheet = document.querySelector('#quick-add-sheet');
const quickOverlay = document.querySelector('#quick-add-overlay');
const closeQuickAdd = () => {
  quickSheet.classList.remove('open');
  quickSheet.setAttribute('aria-hidden', 'true');
  quickOverlay.classList.remove('open');
  setTimeout(() => { quickOverlay.hidden = true; }, 260);
};
document.querySelector('#add-button').addEventListener('click', () => {
  quickOverlay.hidden = false;
  requestAnimationFrame(() => {
    quickSheet.classList.add('open');
    quickSheet.setAttribute('aria-hidden', 'false');
    quickOverlay.classList.add('open');
  });
});
document.querySelector('#close-quick-add').addEventListener('click', closeQuickAdd);
quickOverlay.addEventListener('click', closeQuickAdd);
document.querySelector('#quick-add-sheet').addEventListener('click', event => {
  const action = event.target.closest('[data-quick-action]')?.dataset.quickAction;
  if (!action) return;
  closeQuickAdd();
  if (action === 'job') { showView('jobs'); openJobForm(); }
  if (action === 'crew') { showView('teams'); document.querySelector('#team-form').hidden = false; document.querySelector('#member-form').hidden = true; }
  if (action === 'member') { showView('teams'); document.querySelector('#member-form').hidden = false; document.querySelector('#team-form').hidden = true; }
  if (action === 'material') { showView('inventory'); renderIssueOptions(); document.querySelector('#issue-form').hidden = false; }
  if (action === 'photo') document.querySelector('#photo-input').click();
});
document.querySelector('#issue-location').addEventListener('change', event => renderIssueItemOptions(event.target.value));
document.querySelector('#issue-form').addEventListener('submit', event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === document.querySelector('#issue-location').value);
  const item = location?.items?.find(stock => stock.id === document.querySelector('#issue-item').value);
  const used = Number(document.querySelector('#issue-quantity').value);
  if (!location || !item || !used || used <= 0) return;
  const onHand = Number(item.quantity);
  if (used > onHand) { showToast(`Only ${item.quantity} ${item.unit} available`); return; }
  item.quantity = String(onHand - used);
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
  const low = Number(item.quantity) <= Number(item.minimum || 0);
  showToast(low ? `${item.name} in ${location.name} needs attention` : `${used} ${item.unit} of ${item.name} used`);
  if (low && 'Notification' in window && Notification.permission === 'granted') new Notification('Stock needs attention', { body: `${item.name} in ${location.name} is at or below its threshold.` });
});
document.querySelector('#photo-input').addEventListener('change', event => {
  const photo = event.target.files[0];
  if (photo) showToast(`${photo.name} selected`);
  event.target.value = '';
});
render();
renderProfile();
renderAuthMode();
initializeAuth();
