const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const supabaseUrl = 'https://plzonnnsgbasizvwmfit.supabase.co';
const supabaseAnonKey = 'sb_publishable_YIuhjQvB3Xypa-AWk9shxw_MvPm3snC';
const supabaseClient = window.supabase?.createClient(supabaseUrl, supabaseAnonKey);
let currentUser = null;
let activeCompanyId = localStorage.getItem('current-active-company-id') || null;
let companyInfo = null;
let companyChannel = null;
let normalizedReloadTimer = null;
let normalizedSyncQueue = Promise.resolve();
const usesNormalizedStorage = () => companyInfo?.storage_mode === 'normalized';
const companyCacheKey = key => activeCompanyId ? `${key}:${activeCompanyId}` : key;
const storageKey = key => usesNormalizedStorage() ? companyCacheKey(key) : key;
const newId = () => crypto.randomUUID();
const showView = target => {
  const parentTabs = { 'job-detail': 'jobs', 'crew-detail': 'teams', 'stock-detail': 'inventory', 'time-off': 'home', settings: 'more', reports: 'more' };
  const activeTab = parentTabs[target] || target;
  views.forEach(view => view.classList.toggle('active', view.id === `${target}-view`));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.target === activeTab));
  document.querySelector('#add-button').hidden = ['job-detail', 'stock-detail'].includes(target);
  if (['job-detail', 'stock-detail'].includes(target)) {
    const sheet = document.querySelector('#quick-add-sheet');
    const overlay = document.querySelector('#quick-add-overlay');
    sheet?.classList.remove('open');
    sheet?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('open');
    if (overlay) overlay.hidden = true;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));

const dataVersion = 'current-field-data-v2';
const crewKey = 'current-crews-v2';
const jobKey = 'current-jobs-v2';
const toolKey = 'current-tools-v1';
const stockLocationKey = 'current-stock-locations-v1';
const materialCatalogKey = 'current-material-catalog-v1';
const scheduleKey = 'current-today-schedule-v1';
const scheduleDateKey = 'current-today-schedule-date-v1';
const serviceNotesKey = 'current-service-notes-v1';
const timeOffKey = 'current-time-off-messages-v1';
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
let materialCatalog = JSON.parse(localStorage.getItem(materialCatalogKey) || '[]');
const localCalendarDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
if (localStorage.getItem(scheduleDateKey) !== localCalendarDate()) {
  localStorage.setItem(scheduleDateKey, localCalendarDate());
  localStorage.removeItem(scheduleKey);
}
let todaySchedule = JSON.parse(localStorage.getItem(scheduleKey) || '[]');
let serviceNotes = JSON.parse(localStorage.getItem(serviceNotesKey) || '[]');
let timeOffMessages = JSON.parse(localStorage.getItem(timeOffKey) || '[]');
let editingTimeOffMessageId = null;
let selectedStockLocationId = null;
let selectedStockItemId = null;
let selectedRestockStockItemId = null;
let selectedCatalogMaterialId = null;
let editingCatalogMaterialId = null;
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
function updateTimeGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.querySelector('#time-greeting').textContent = greeting;
  document.querySelector('#current-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
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
function clearVisibleCompanyData() {
  currentUser = null;
  activeCompanyId = null;
  companyInfo = null;
  if (companyChannel && supabaseClient) supabaseClient.removeChannel(companyChannel);
  companyChannel = null;
  jobs = []; crews = []; tools = []; stockLocations = []; materialCatalog = []; todaySchedule = []; serviceNotes = []; timeOffMessages = [];
  localStorage.removeItem('current-active-company-id');
  updateCompanyUI();
  render();
}
async function initializeAuth() {
  if (!supabaseClient) { showAuthMessage('Sign-in service could not load. Check your connection.', true); authModal.hidden = false; return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) { applySignedInUser(session.user); await initializeCompanyWorkspace(session.user); }
  else authModal.hidden = false;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) { applySignedInUser(session.user); initializeCompanyWorkspace(session.user); }
    else { clearVisibleCompanyData(); authModal.hidden = false; }
  });
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
  else if (result.data.user) { applySignedInUser(result.data.user); await initializeCompanyWorkspace(result.data.user); }
});
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function saveData() {
  localStorage.setItem(storageKey(crewKey), JSON.stringify(crews));
  localStorage.setItem(storageKey(jobKey), JSON.stringify(jobs));
  render();
  syncSharedState();
}
function saveTools() {
  localStorage.setItem(storageKey(toolKey), JSON.stringify(tools));
  renderTools();
  syncSharedState();
}
function saveStockLocations() {
  localStorage.setItem(storageKey(stockLocationKey), JSON.stringify(stockLocations));
  renderStockLocations();
  syncSharedState();
}
function saveMaterialCatalog() {
  localStorage.setItem(storageKey(materialCatalogKey), JSON.stringify(materialCatalog));
  renderMaterialCatalog();
  syncSharedState();
}
function saveTodaySchedule() {
  localStorage.setItem(storageKey(scheduleDateKey), localCalendarDate());
  localStorage.setItem(storageKey(scheduleKey), JSON.stringify(todaySchedule));
  renderTodaySchedule();
  syncSharedState();
}
function saveServiceNotes() {
  localStorage.setItem(storageKey(serviceNotesKey), JSON.stringify(serviceNotes));
  renderServiceNotes();
  syncSharedState();
}
function saveTimeOffMessages() {
  localStorage.setItem(storageKey(timeOffKey), JSON.stringify(timeOffMessages));
  renderTimeOffMessages();
  syncSharedState();
}
function sharedPayload() {
  return { jobs, crews, tools, stockLocations, materialCatalog, todaySchedule, scheduleDate: localStorage.getItem(scheduleDateKey), serviceNotes, timeOffMessages };
}
function cacheSharedPayload(payload, notifyNewTimeOff = false) {
  const previousTimeOffIds = new Set(timeOffMessages.map(message => message.id));
  jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  crews = Array.isArray(payload.crews) ? payload.crews : [];
  tools = Array.isArray(payload.tools) ? payload.tools : [];
  stockLocations = Array.isArray(payload.stockLocations) ? payload.stockLocations : [];
  materialCatalog = Array.isArray(payload.materialCatalog) ? payload.materialCatalog : [];
  todaySchedule = Array.isArray(payload.todaySchedule) ? payload.todaySchedule : [];
  serviceNotes = Array.isArray(payload.serviceNotes) ? payload.serviceNotes : [];
  timeOffMessages = Array.isArray(payload.timeOffMessages) ? payload.timeOffMessages : [];
  localStorage.setItem(jobKey, JSON.stringify(jobs));
  localStorage.setItem(crewKey, JSON.stringify(crews));
  localStorage.setItem(toolKey, JSON.stringify(tools));
  localStorage.setItem(stockLocationKey, JSON.stringify(stockLocations));
  localStorage.setItem(materialCatalogKey, JSON.stringify(materialCatalog));
  localStorage.setItem(scheduleKey, JSON.stringify(todaySchedule));
  localStorage.setItem(scheduleDateKey, payload.scheduleDate || localCalendarDate());
  localStorage.setItem(serviceNotesKey, JSON.stringify(serviceNotes));
  localStorage.setItem(timeOffKey, JSON.stringify(timeOffMessages));
  render();
  const newRequest = notifyNewTimeOff ? timeOffMessages.find(message => !previousTimeOffIds.has(message.id) && message.authorId !== currentUser?.id) : null;
  if (newRequest) {
    showToast(`${newRequest.authorName} posted a time-off request`);
    if ('Notification' in window && Notification.permission === 'granted') new Notification('New time-off request', { body: `${newRequest.authorName}: ${newRequest.text}` });
  }
}
async function syncSharedState() {
  if (usesNormalizedStorage()) {
    normalizedSyncQueue = normalizedSyncQueue.then(syncNormalizedState).catch(error => showToast(`Sync issue: ${error.message}`));
    return normalizedSyncQueue;
  }
  if (!supabaseClient || !activeCompanyId || !currentUser) return;
  const { error } = await supabaseClient.from('company_app_state').upsert({
    company_id: activeCompanyId,
    data: sharedPayload(),
    updated_by: currentUser.id,
    updated_at: new Date().toISOString()
  }, { onConflict: 'company_id' });
  if (error) showToast(`Sync issue: ${error.message}`);
}
async function syncNormalizedTable(table, rows, scope = {}) {
  if (rows.length) {
    const { error } = await supabaseClient.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
  let selectQuery = supabaseClient.from(table).select('id').eq('company_id', activeCompanyId);
  Object.entries(scope).forEach(([column, value]) => { selectQuery = selectQuery.eq(column, value); });
  const { data: existing, error: selectError } = await selectQuery;
  if (selectError) throw selectError;
  const keep = new Set(rows.map(row => row.id));
  for (const record of existing || []) {
    if (!keep.has(record.id)) {
      let deleteQuery = supabaseClient.from(table).delete().eq('id', record.id).eq('company_id', activeCompanyId);
      Object.entries(scope).forEach(([column, value]) => { deleteQuery = deleteQuery.eq(column, value); });
      const { error } = await deleteQuery;
      if (error) throw error;
    }
  }
}
async function syncNormalizedState() {
  if (!supabaseClient || !activeCompanyId || !currentUser || !usesNormalizedStorage()) return;
  const now = new Date().toISOString();
  const jobRows = jobs.map(job => ({ id: job.id, company_id: activeCompanyId, name: job.name, job_type: job.type, location: job.location || '', due_date: job.due || null, status: job.status || 'active', updated_by: currentUser.id, updated_at: now }));
  const inspectionRows = jobs.flatMap(job => (job.inspections || []).map((item, index) => ({ id: item.id, company_id: activeCompanyId, job_id: job.id, name: item.name, completed: Boolean(item.completed), sort_order: index })));
  const crewRows = crews.map(crew => ({ id: crew.id, company_id: activeCompanyId, name: crew.name, job_id: crew.jobId || null, color: crew.color || null, updated_by: currentUser.id, updated_at: now }));
  const memberRows = crews.flatMap(crew => crew.members.map(member => ({ id: member.id, company_id: activeCompanyId, crew_id: crew.id, name: member.name, role: member.role, user_id: member.userId || null, updated_at: now })));
  const toolRows = tools.map(tool => ({ id: tool.id, company_id: activeCompanyId, name: tool.name, tool_identifier: tool.toolId || null, checked_out_to: tool.checkedOutTo || null, updated_at: now }));
  const catalogRows = materialCatalog.map(material => ({ id: material.id, company_id: activeCompanyId, name: material.name, default_unit: material.unit, updated_by: currentUser.id, updated_at: now }));
  const locationRows = stockLocations.map(location => ({ id: location.id, company_id: activeCompanyId, name: location.name, updated_by: currentUser.id, updated_at: now }));
  const stockRows = stockLocations.flatMap(location => location.items.map(item => ({ id: item.id, company_id: activeCompanyId, stock_location_id: location.id, material_id: item.materialId || materialCatalog.find(material => material.name.toLowerCase() === item.name.toLowerCase())?.id || null, name: item.name, quantity: Number(item.quantity), unit: item.unit, low_stock_threshold: Number(item.minimum || 0), updated_by: currentUser.id, updated_at: now })));
  const scheduleRows = todaySchedule.map(assignment => ({ id: assignment.id, company_id: activeCompanyId, assignment_date: localCalendarDate(), assignment_type: assignment.crewId ? 'crew' : 'person', crew_id: assignment.crewId || null, person_name: assignment.crewId ? null : assignment.person, job_id: assignment.jobId || jobs.find(job => job.name === assignment.jobName)?.id || null, location: assignment.location || null, created_by: currentUser.id, updated_at: now }));
  const noteRows = serviceNotes.map(note => ({ id: note.id, company_id: activeCompanyId, job_id: note.jobId, note: note.note, materials_needed: note.materials || null, created_by: currentUser.id, updated_at: now }));
  const timeOffRows = timeOffMessages.filter(message => (message.authorId || currentUser.id) === currentUser.id).map(message => ({ id: message.id, company_id: activeCompanyId, author_id: currentUser.id, author_name: message.authorName, message: message.text, created_at: message.createdAt || now, edited_at: message.editedAt || null }));
  await syncNormalizedTable('jobs', jobRows);
  await syncNormalizedTable('crews', crewRows);
  await syncNormalizedTable('material_catalog', catalogRows);
  await syncNormalizedTable('stock_locations', locationRows);
  await syncNormalizedTable('inspection_items', inspectionRows);
  await syncNormalizedTable('crew_members', memberRows);
  await syncNormalizedTable('tools', toolRows);
  await syncNormalizedTable('stock_items', stockRows);
  await syncNormalizedTable('schedule_assignments', scheduleRows);
  await syncNormalizedTable('service_notes', noteRows);
  await syncNormalizedTable('time_off_messages', timeOffRows, { author_id: currentUser.id });
}
async function loadSharedState() {
  if (usesNormalizedStorage()) { await loadNormalizedState(); return; }
  const { data, error } = await supabaseClient.from('company_app_state').select('data').eq('company_id', activeCompanyId).maybeSingle();
  if (error) { showToast(`Could not load company data: ${error.message}`); return; }
  if (data?.data && Object.keys(data.data).length) cacheSharedPayload(data.data);
  else await syncSharedState();
}
async function loadNormalizedState() {
  if (!supabaseClient || !activeCompanyId) return;
  const today = localCalendarDate();
  const results = await Promise.all([
    supabaseClient.from('jobs').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('inspection_items').select('*').eq('company_id', activeCompanyId).order('sort_order'),
    supabaseClient.from('crews').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('crew_members').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('tools').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('stock_locations').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('stock_items').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('material_catalog').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('schedule_assignments').select('*').eq('company_id', activeCompanyId).eq('assignment_date', today),
    supabaseClient.from('service_notes').select('*').eq('company_id', activeCompanyId),
    supabaseClient.from('time_off_messages').select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false })
  ]);
  const failed = results.find(result => result.error);
  if (failed) { showToast(`Could not load company data: ${failed.error.message}`); return; }
  const [jobRows, inspectionRows, crewRows, memberRows, toolRows, locationRows, stockRows, catalogRows, scheduleRows, noteRows, timeOffRows] = results.map(result => result.data || []);
  jobs = jobRows.map(job => ({
    id: job.id, name: job.name, type: job.job_type, location: job.location || '', due: job.due_date || '', status: job.status,
    inspections: inspectionRows.filter(item => item.job_id === job.id).map(item => ({ id: item.id, name: item.name, completed: item.completed }))
  }));
  crews = crewRows.map(crew => {
    const job = jobs.find(item => item.id === crew.job_id);
    return { id: crew.id, name: crew.name, color: crew.color || 'orange', jobId: crew.job_id || '', jobName: job?.name || '', members: memberRows.filter(member => member.crew_id === crew.id).map(member => ({ id: member.id, name: member.name, role: member.role })) };
  });
  tools = toolRows.map(tool => ({ id: tool.id, name: tool.name, toolId: tool.tool_identifier || '', checkedOutTo: tool.checked_out_to || '' }));
  materialCatalog = catalogRows.map(material => ({ id: material.id, name: material.name, unit: material.default_unit }));
  stockLocations = locationRows.map(location => ({
    id: location.id, name: location.name,
    items: stockRows.filter(item => item.stock_location_id === location.id).map(item => ({ id: item.id, materialId: item.material_id, name: item.name, quantity: String(item.quantity), unit: item.unit, minimum: String(item.low_stock_threshold) }))
  }));
  todaySchedule = scheduleRows.map(assignment => {
    const crew = crews.find(item => item.id === assignment.crew_id);
    const job = jobs.find(item => item.id === assignment.job_id);
    return { id: assignment.id, crewId: assignment.crew_id, person: crew?.name || assignment.person_name || 'Team member', location: assignment.location || 'Location not added', jobId: assignment.job_id, jobName: job?.name || '' };
  });
  serviceNotes = noteRows.map(note => {
    const job = jobs.find(item => item.id === note.job_id);
    return { id: note.id, jobId: note.job_id, jobName: job?.name || 'Job', jobType: job?.type || '', note: note.note, materials: note.materials_needed || '' };
  });
  timeOffMessages = timeOffRows.map(message => ({ id: message.id, authorId: message.author_id, authorName: message.author_name, text: message.message, createdAt: message.created_at, editedAt: message.edited_at }));
  localStorage.setItem(companyCacheKey(jobKey), JSON.stringify(jobs));
  localStorage.setItem(companyCacheKey(crewKey), JSON.stringify(crews));
  localStorage.setItem(companyCacheKey(toolKey), JSON.stringify(tools));
  localStorage.setItem(companyCacheKey(stockLocationKey), JSON.stringify(stockLocations));
  localStorage.setItem(companyCacheKey(materialCatalogKey), JSON.stringify(materialCatalog));
  localStorage.setItem(companyCacheKey(scheduleKey), JSON.stringify(todaySchedule));
  localStorage.setItem(companyCacheKey(serviceNotesKey), JSON.stringify(serviceNotes));
  localStorage.setItem(companyCacheKey(timeOffKey), JSON.stringify(timeOffMessages));
  render();
}
function updateCompanyUI() {
  document.querySelector('#company-join-code').textContent = companyInfo?.join_code || 'Not connected';
  document.querySelector('#company-sync-status').textContent = companyInfo?.name ? `${companyInfo.name} · shared live` : 'Not connected';
  const workspaceBanner = document.querySelector('#workspace-banner');
  workspaceBanner.hidden = !companyInfo?.name;
  document.querySelector('#company-workspace-name').textContent = companyInfo?.name || '';
}
function subscribeToCompanyState() {
  if (!supabaseClient || !activeCompanyId) return;
  if (companyChannel) supabaseClient.removeChannel(companyChannel);
  if (usesNormalizedStorage()) {
    const tables = ['jobs', 'inspection_items', 'crews', 'crew_members', 'tools', 'stock_locations', 'stock_items', 'material_catalog', 'schedule_assignments', 'service_notes', 'time_off_messages'];
    companyChannel = supabaseClient.channel(`company-tables-${activeCompanyId}`);
    tables.forEach(table => companyChannel.on('postgres_changes', {
      event: '*', schema: 'public', table, filter: `company_id=eq.${activeCompanyId}`
    }, payload => {
      if (table === 'time_off_messages' && payload.eventType === 'INSERT' && payload.new.author_id !== currentUser?.id) {
        showToast(`${payload.new.author_name} posted a time-off request`);
        if ('Notification' in window && Notification.permission === 'granted') new Notification('New time-off request', { body: `${payload.new.author_name}: ${payload.new.message}` });
      }
      clearTimeout(normalizedReloadTimer);
      normalizedReloadTimer = setTimeout(loadNormalizedState, 180);
    }));
    companyChannel.subscribe();
    return;
  }
  companyChannel = supabaseClient.channel(`company-state-${activeCompanyId}`).on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'company_app_state', filter: `company_id=eq.${activeCompanyId}`
  }, payload => {
    if (payload.new.updated_by === currentUser?.id) return;
    cacheSharedPayload(payload.new.data || {}, true);
    showToast('Company data updated');
  }).subscribe();
}
async function connectCompany(companyId) {
  const { data, error } = await supabaseClient.from('companies').select('id,name,join_code,storage_mode').eq('id', companyId).single();
  if (error) { showWorkspaceMessage(error.message, true); return; }
  activeCompanyId = companyId;
  companyInfo = data;
  localStorage.setItem('current-active-company-id', companyId);
  document.querySelector('#workspace-modal').hidden = true;
  updateCompanyUI();
  await loadSharedState();
  subscribeToCompanyState();
}
function showWorkspaceMessage(message, isError = false) {
  const messageElement = document.querySelector('#workspace-message');
  messageElement.textContent = message;
  messageElement.classList.toggle('error', isError);
}
async function initializeCompanyWorkspace(user) {
  currentUser = user;
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('company_members').select('company_id').eq('user_id', user.id).limit(1);
  if (error) { showWorkspaceMessage(`Company setup error: ${error.message}`, true); document.querySelector('#workspace-modal').hidden = false; return; }
  if (data?.length) await connectCompany(data[0].company_id);
  else document.querySelector('#workspace-modal').hidden = false;
}
document.querySelector('#create-company-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = document.querySelector('#company-name').value.trim();
  const submitButton = event.currentTarget.querySelector('button');
  if (!name || !supabaseClient || !currentUser) return;
  submitButton.disabled = true;
  showWorkspaceMessage('Creating your company workspace…');
  const { data, error } = await supabaseClient.rpc('create_company_workspace', { company_name: name });
  submitButton.disabled = false;
  if (error) { showWorkspaceMessage(`Could not create workspace: ${error.message}`, true); return; }
  const workspace = Array.isArray(data) ? data[0] : data;
  if (!workspace?.company_id) { showWorkspaceMessage('Could not create workspace. Please try again.', true); return; }
  await connectCompany(workspace.company_id);
  showToast(`Workspace created. Your company code is ${workspace.join_code}.`);
});
document.querySelector('#join-company-form').addEventListener('submit', async event => {
  event.preventDefault();
  const code = document.querySelector('#company-code').value.trim().toUpperCase();
  const submitButton = event.currentTarget.querySelector('button');
  if (!code || !supabaseClient || !currentUser) return;
  submitButton.disabled = true;
  showWorkspaceMessage('Joining company workspace…');
  const { data, error } = await supabaseClient.rpc('join_company_with_code', { company_code: code });
  submitButton.disabled = false;
  if (error) { showWorkspaceMessage(`Could not join workspace: ${error.message}`, true); return; }
  const workspace = Array.isArray(data) ? data[0] : data;
  if (!workspace?.company_id) { showWorkspaceMessage('That company code was not found.', true); return; }
  await connectCompany(workspace.company_id);
  showToast('Joined company workspace.');
});
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
    const dueLabel = job.due ? new Date(`${job.due}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase() : 'NO DUE DATE';
    const locationLabel = job.location || 'No location added';
    return `<article class="job-card"><div class="job-color blue"></div><div class="job-content"><p class="job-meta">DUE ${dueLabel}</p><h3>${escapeHtml(job.name)}</h3><p>${escapeHtml(locationLabel)} · ${escapeHtml(assigned)}</p><div class="progress"><span style="width:0%"></span></div></div></article>`;
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
  homeNext.innerHTML = jobs.length ? `<article class="job-card" data-target="jobs"><div class="job-color blue"></div><div class="job-content"><p class="job-meta">UP NEXT</p><h3>${escapeHtml(jobs[0].name)}</h3><p>${escapeHtml(jobs[0].location || 'No location added')}</p><div class="progress"><span style="width:0%"></span></div></div><span class="chevron">›</span></article>` : '<p class="empty-state home-empty">No jobs created yet.</p>';
  homeNext.querySelector('[data-target]')?.addEventListener('click', () => showView('jobs'));
  document.querySelector('#home-job-count').textContent = jobs.length;
}
function render() {
  renderCrews();
  renderJobs();
  renderTools();
  renderStockLocations();
  renderMaterialCatalog();
  renderTodaySchedule();
  renderServiceNotes();
  renderReports();
  renderTimeOffMessages();
  document.querySelector('#home-member-count').textContent = String(crews.reduce((sum, crew) => sum + crew.members.length, 0)).padStart(2, '0');
}
function renderTimeOffMessages() {
  const list = document.querySelector('#time-off-messages');
  const summary = document.querySelector('#time-off-widget-summary');
  if (!list || !summary) return;
  const sorted = [...timeOffMessages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  summary.textContent = sorted.length ? `${sorted.length} request${sorted.length === 1 ? '' : 's'} · Latest from ${sorted[0].authorName}` : 'No requests posted yet';
  list.innerHTML = sorted.length ? sorted.map(message => { const canManage = message.authorId ? message.authorId === currentUser?.id : message.authorName === (profileFullName || profileName); return `<article class="time-off-message"><header><strong>${escapeHtml(message.authorName)}</strong><time datetime="${escapeHtml(message.createdAt)}">${new Date(message.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${message.editedAt ? ' · edited' : ''}</time></header><p>${escapeHtml(message.text)}</p>${canManage ? `<div class="time-off-message-actions"><button data-edit-time-off="${message.id}">EDIT</button><button class="delete-time-off" data-delete-time-off="${message.id}">DELETE</button></div>` : ''}</article>`; }).join('') : '<p class="empty-state">No time-off requests have been posted.</p>';
}
function renderReports() {
  const overview = document.querySelector('#report-overview');
  const list = document.querySelector('#reports-list');
  if (!overview || !list) return;
  const crewMembers = crews.reduce((sum, crew) => sum + crew.members.length, 0);
  const allStock = stockLocations.flatMap(location => location.items || []);
  const lowStock = stockAttentionItems().length;
  const commercialJobs = jobs.filter(job => job.type === 'Commercial Jobs');
  const inspections = commercialJobs.flatMap(job => Array.isArray(job.inspections) ? job.inspections : []);
  const inspectionsComplete = inspections.filter(item => item.completed).length;
  const serviceJobs = jobs.filter(job => ['Service', 'Generators', 'Generator Service'].includes(job.type));
  const checkedOutTools = tools.filter(tool => tool.checkedOutTo).length;
  const assignedCrews = crews.filter(crew => crew.jobId).length;
  overview.innerHTML = `<article><span>ACTIVE JOBS</span><strong>${jobs.length}</strong><small>${assignedCrews} crew assigned</small></article><article><span>FIELD TODAY</span><strong>${todaySchedule.length}</strong><small>assignments</small></article><article><span>STOCK FLAGS</span><strong>${lowStock}</strong><small>${allStock.length} items tracked</small></article>`;
  const reports = [
    { mark: 'DAY', title: 'Daily field report', detail: `${todaySchedule.length} assignment${todaySchedule.length === 1 ? '' : 's'} scheduled today · ${crewMembers} crew member${crewMembers === 1 ? '' : 's'} on roster`, target: 'home' },
    { mark: 'JOB', title: 'Job progress report', detail: `${jobs.length} active job${jobs.length === 1 ? '' : 's'} · ${assignedCrews} crew${assignedCrews === 1 ? '' : 's'} assigned`, target: 'jobs' },
    { mark: 'SVC', title: 'Service & generator report', detail: `${serviceJobs.length} service/generator job${serviceJobs.length === 1 ? '' : 's'} · ${serviceNotes.length} field note${serviceNotes.length === 1 ? '' : 's'}`, target: 'jobs' },
    { mark: 'MAT', title: 'Material & stock report', detail: `${allStock.length} stock item${allStock.length === 1 ? '' : 's'} across ${stockLocations.length} location${stockLocations.length === 1 ? '' : 's'} · ${lowStock} need attention`, target: 'inventory' },
    { mark: 'CREW', title: 'Crew activity report', detail: `${crews.length} crew${crews.length === 1 ? '' : 's'} · ${crewMembers} people · ${todaySchedule.length} today assignment${todaySchedule.length === 1 ? '' : 's'}`, target: 'teams' },
    { mark: 'INSP', title: 'Inspection report', detail: `${inspectionsComplete} of ${inspections.length} commercial inspection item${inspections.length === 1 ? '' : 's'} completed`, target: 'jobs' },
    { mark: 'TOOL', title: 'Tool accountability report', detail: `${checkedOutTools} checked out · ${Math.max(tools.length - checkedOutTools, 0)} available · ${tools.length} tool${tools.length === 1 ? '' : 's'} tracked`, target: 'tools' },
    { mark: 'WK', title: 'Weekly operations summary', detail: `${jobs.length} active jobs · ${todaySchedule.length} scheduled today · ${lowStock} stock flag${lowStock === 1 ? '' : 's'}`, target: 'home' }
  ];
  list.innerHTML = reports.map(report => `<button class="report-card" data-target="${report.target}"><span class="report-mark">${report.mark}</span><span><b>${report.title}</b><small>${report.detail}</small></span><em>›</em></button>`).join('');
  list.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));
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
  document.querySelector('#location-use-form').hidden = true;
  document.querySelector('#location-restock-form').hidden = true;
  selectedStockItemId = null;
  selectedRestockStockItemId = null;
  document.querySelector('#stock-item-form').reset();
  renderStockItems(location);
  showView('stock-detail');
}
function renderStockItems(location) {
  const list = document.querySelector('#stock-item-list');
  list.innerHTML = location.items.length ? location.items.map(item => { const low = Number(item.quantity) <= Number(item.minimum || 0); return `<article class="stock-item-record ${low ? 'low-stock-item' : ''}"><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} · Minimum: ${escapeHtml(item.minimum ?? 0)}${low ? ' · Needs attention' : ''}</small></div><div class="stock-item-actions"><button class="restock-stock-item" data-restock-stock-item="${item.id}">ADD</button><button class="use-stock-item" data-use-stock-item="${item.id}">USE</button><button class="remove-stock-item" data-remove-stock-item="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">&times;</button></div></article>`; }).join('') : '<p class="empty-state">No material added to this location yet.</p>';
}
function renderTodaySchedule() {
  if (!usesNormalizedStorage() && localStorage.getItem(scheduleDateKey) !== localCalendarDate()) {
    todaySchedule = [];
    localStorage.setItem(scheduleDateKey, localCalendarDate());
    localStorage.removeItem(scheduleKey);
  }
  const list = document.querySelector('#home-next-job');
  const jobSelect = document.querySelector('#schedule-job');
  const crewSelect = document.querySelector('#schedule-crew');
  if (!list || !jobSelect) return;
  jobSelect.innerHTML = `<option value="">Select job (optional)</option>${jobs.map(job => `<option value="${job.id}">${escapeHtml(job.name)}</option>`).join('')}`;
  crewSelect.innerHTML = crews.length ? crews.map((crew, index) => `<option value="${index}">${escapeHtml(crew.name)}</option>`).join('') : '<option value="">Create a crew first</option>';
  crewSelect.disabled = !crews.length;
  list.innerHTML = todaySchedule.length ? todaySchedule.map(assignment => `<article class="schedule-record"><span>${initials(assignment.person)}</span><div><b>${escapeHtml(assignment.person)}</b><small>${escapeHtml(assignment.location)}${assignment.jobName ? ` · ${escapeHtml(assignment.jobName)}` : ''}</small></div><button data-remove-schedule="${assignment.id}" aria-label="Remove ${escapeHtml(assignment.person)}">&times;</button></article>`).join('') : '<p class="empty-state home-empty">No assignments added for today.</p>';
}
function renderServiceNotes() {
  const list = document.querySelector('#service-note-list');
  const jobSelect = document.querySelector('#service-note-job');
  if (!list || !jobSelect) return;
  const eligibleJobs = jobs.filter(job => ['Service', 'Generators', 'Generator Service'].includes(job.type));
  jobSelect.innerHTML = eligibleJobs.length ? `<option value="">Select service or generator job</option>${eligibleJobs.map(job => `<option value="${job.id}">${escapeHtml(job.name)} · ${escapeHtml(job.type)}</option>`).join('')}` : '<option value="">Create a service or generator job first</option>';
  list.innerHTML = serviceNotes.length ? serviceNotes.map(note => `<article class="service-note-record"><div><p>${escapeHtml(note.jobName)} · ${escapeHtml(note.jobType)}</p><b>${escapeHtml(note.note)}</b>${note.materials ? `<small>Material needed: ${escapeHtml(note.materials)}</small>` : ''}</div><button data-remove-service-note="${note.id}" aria-label="Delete note">&times;</button></article>`).join('') : '<p class="empty-state">No service or generator notes yet.</p>';
}
function renderMaterialCatalog(searchTerm = document.querySelector('#catalog-search')?.value || '') {
  const list = document.querySelector('#catalog-list');
  if (!list) return;
  const term = searchTerm.toLowerCase().trim();
  const matches = materialCatalog.filter(material => material.name.toLowerCase().includes(term));
  list.innerHTML = matches.length ? matches.map(material => `<article class="catalog-record"><div><b>${escapeHtml(material.name)}</b><small>Default unit: ${escapeHtml(material.unit)}</small></div><div class="catalog-actions"><button class="edit-catalog-material" data-edit-catalog-material="${material.id}">EDIT</button><button data-add-catalog-material="${material.id}">ADD TO STOCK</button></div></article>`).join('') : `<p class="empty-state">${materialCatalog.length ? 'No material matches your search.' : 'No materials in your list yet. Add your first material above.'}</p>`;
}
function openCatalogForm(material = null) {
  editingCatalogMaterialId = material?.id || null;
  const form = document.querySelector('#catalog-form');
  form.hidden = false;
  document.querySelector('#catalog-form-title').textContent = material ? 'Edit material' : 'Add material to list';
  document.querySelector('#catalog-submit').textContent = material ? 'Save changes' : 'Add material';
  document.querySelector('#catalog-material-name').value = material?.name || '';
  document.querySelector('#catalog-material-unit').value = material?.unit || '';
  document.querySelector('#catalog-material-name').focus();
}
function openCatalogStockForm(material) {
  if (!material) return;
  selectedCatalogMaterialId = material.id;
  const form = document.querySelector('#catalog-stock-form');
  const locationSelect = document.querySelector('#catalog-stock-location');
  document.querySelector('#catalog-stock-name').value = material.name;
  document.querySelector('#catalog-stock-unit').value = material.unit;
  document.querySelector('#catalog-stock-quantity').value = '';
  document.querySelector('#catalog-stock-minimum').value = '';
  locationSelect.innerHTML = stockLocations.length ? stockLocations.map(location => `<option value="${location.id}">${escapeHtml(location.name)}</option>`).join('') : '<option value="">Add a stock location first</option>';
  locationSelect.disabled = !stockLocations.length;
  form.hidden = false;
  requestAnimationFrame(() => form.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  showToast(`Add ${material.name} to a stock location`);
}
function createCommercialChecklist() {
  return commercialInspectionDefaults.map(name => ({ id: newId(), name, completed: false }));
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
  const dueLabel = job.due ? new Date(`${job.due}T12:00:00`).toLocaleDateString() : 'No due date added';
  document.querySelector('#job-detail-location').textContent = `${job.location || 'No location added'} · ${dueLabel}`;
  const crewOptions = document.querySelector('#job-crew-options');
  crewOptions.innerHTML = crews.length ? crews.map((crew, index) => `<label class="job-crew-option"><input type="checkbox" data-crew-index="${index}" ${crew.jobId === job.id ? 'checked' : ''} /><span><b>${escapeHtml(crew.name)}</b><small>${crew.jobId && crew.jobId !== job.id ? `Currently assigned to ${escapeHtml(crew.jobName || 'another job')}` : (crew.members.length ? `${crew.members.length} member${crew.members.length === 1 ? '' : 's'}` : 'No members')}</small></span></label>`).join('') : '<p class="empty-state">No crews created yet.</p>';
  document.querySelector('#job-crew-form').querySelector('button[type="submit"]').disabled = !crews.length;
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
  document.querySelector('#crew-assignment-title').textContent = crew.jobId ? 'Edit job assignment' : 'Assign to a job';
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
document.querySelector('#show-catalog-form').addEventListener('click', () => {
  const form = document.querySelector('#catalog-form');
  if (form.hidden || editingCatalogMaterialId) openCatalogForm();
  else form.hidden = true;
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
document.querySelectorAll('[data-jobs-panel]').forEach(button => button.addEventListener('click', () => {
  const showingNotes = button.dataset.jobsPanel === 'notes';
  document.querySelector('#job-board-panel').hidden = showingNotes;
  document.querySelector('#service-notes-panel').hidden = !showingNotes;
  document.querySelectorAll('[data-jobs-panel]').forEach(item => item.classList.toggle('active', item === button));
  if (showingNotes) renderServiceNotes();
}));
document.querySelector('#show-service-note-form').addEventListener('click', () => {
  renderServiceNotes();
  document.querySelector('#service-note-form').hidden = !document.querySelector('#service-note-form').hidden;
});
document.querySelector('#show-schedule-form').addEventListener('click', () => {
  renderTodaySchedule();
  document.querySelector('#schedule-form').hidden = !document.querySelector('#schedule-form').hidden;
});
function renderScheduleAssignmentType() {
  const isCrew = document.querySelector('#schedule-assignment-type').value === 'crew';
  document.querySelector('#schedule-crew').hidden = !isCrew;
  document.querySelector('#schedule-crew').required = isCrew;
  document.querySelector('#schedule-person').hidden = isCrew;
  document.querySelector('#schedule-person').required = !isCrew;
}
document.querySelector('#schedule-assignment-type').addEventListener('change', renderScheduleAssignmentType);
document.querySelector('#schedule-job').addEventListener('change', event => {
  const job = jobs.find(item => item.id === event.target.value);
  const location = document.querySelector('#schedule-location');
  if (job?.location && !location.value) location.value = job.location;
});
document.querySelectorAll('[data-cancel-form]').forEach(button => button.addEventListener('click', () => {
  const form = document.querySelector(`#${button.dataset.cancelForm}`);
  form.reset();
  if (button.dataset.cancelForm === 'job-form') editingJobId = null;
  if (button.dataset.cancelForm === 'catalog-form') editingCatalogMaterialId = null;
  if (button.dataset.cancelForm === 'location-use-form') selectedStockItemId = null;
  if (button.dataset.cancelForm === 'location-restock-form') selectedRestockStockItemId = null;
  if (button.dataset.cancelForm === 'schedule-form') renderScheduleAssignmentType();
  if (button.dataset.cancelMode !== 'reset') form.hidden = true;
}));
document.querySelector('#job-list').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-job]');
  if (button) { openJobForm(jobs.find(job => job.id === button.dataset.editJob)); return; }
  const card = event.target.closest('[data-open-job]');
  if (card) openJob(jobs.find(job => job.id === card.dataset.openJob));
});
document.querySelector('#service-note-form').addEventListener('submit', event => {
  event.preventDefault();
  const job = jobs.find(item => item.id === document.querySelector('#service-note-job').value);
  const note = document.querySelector('#service-note-text').value.trim();
  const materials = document.querySelector('#service-note-materials').value.trim();
  if (!job || !note) return;
  serviceNotes.push({ id: newId(), jobId: job.id, jobName: job.name, jobType: job.type, note, materials });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveServiceNotes();
});
document.querySelector('#service-note-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-service-note]');
  if (!button || !confirm('Delete this service note?')) return;
  serviceNotes = serviceNotes.filter(note => note.id !== button.dataset.removeServiceNote);
  saveServiceNotes();
});
document.querySelector('#schedule-form').addEventListener('submit', event => {
  event.preventDefault();
  const isCrew = document.querySelector('#schedule-assignment-type').value === 'crew';
  const crewIndex = Number(document.querySelector('#schedule-crew').value);
  const person = isCrew ? crews[crewIndex]?.name : document.querySelector('#schedule-person').value.trim();
  const location = document.querySelector('#schedule-location').value.trim();
  const job = jobs.find(item => item.id === document.querySelector('#schedule-job').value);
  if (!person) return;
  todaySchedule.push({ id: newId(), crewId: isCrew ? crews[crewIndex]?.id || null : null, person, location: location || 'Location not added', jobId: job?.id || null, jobName: job?.name || '' });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  renderScheduleAssignmentType();
  saveTodaySchedule();
});
document.querySelector('#home-next-job').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-schedule]');
  if (!button || !confirm('Remove this assignment from today’s schedule?')) return;
  todaySchedule = todaySchedule.filter(item => item.id !== button.dataset.removeSchedule);
  saveTodaySchedule();
});
document.querySelector('#team-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#team-name').value.trim(); if (!name) return;
  crews.push({ id: newId(), name, color: crewColors[crews.length % crewColors.length], members: [], jobId: '', jobName: '' }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#member-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#member-name').value.trim(); const role = document.querySelector('#member-role').value.trim(); const crewIndex = Number(document.querySelector('#member-crew').value);
  if (!name || !role || !crews[crewIndex]) return; crews[crewIndex].members.push({ id: newId(), name, role }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#tool-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#tool-name').value.trim();
  const toolId = document.querySelector('#tool-id').value.trim();
  if (!name) return;
  tools.push({ id: newId(), name, toolId, checkedOutTo: '' });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveTools();
});
document.querySelector('#stock-location-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#stock-location-name').value.trim();
  if (!name) return;
  stockLocations.push({ id: newId(), name, items: [] });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
});
document.querySelector('#catalog-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#catalog-material-name').value.trim();
  const unit = document.querySelector('#catalog-material-unit').value.trim();
  if (!name || !unit) return;
  if (materialCatalog.some(material => material.id !== editingCatalogMaterialId && material.name.toLowerCase() === name.toLowerCase())) { showToast('That material is already in your list'); return; }
  const material = materialCatalog.find(item => item.id === editingCatalogMaterialId);
  if (material) {
    material.name = name;
    material.unit = unit;
  } else materialCatalog.push({ id: newId(), name, unit });
  editingCatalogMaterialId = null;
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveMaterialCatalog();
});
document.querySelector('#catalog-search').addEventListener('input', event => renderMaterialCatalog(event.target.value));
document.querySelector('#catalog-list').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-catalog-material]');
  if (editButton) { openCatalogForm(materialCatalog.find(material => material.id === editButton.dataset.editCatalogMaterial)); return; }
  const addButton = event.target.closest('[data-add-catalog-material]');
  if (addButton) openCatalogStockForm(materialCatalog.find(material => material.id === addButton.dataset.addCatalogMaterial));
});
document.querySelector('#catalog-stock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const material = materialCatalog.find(item => item.id === selectedCatalogMaterialId);
  const location = stockLocations.find(item => item.id === document.querySelector('#catalog-stock-location').value);
  const quantity = Number(document.querySelector('#catalog-stock-quantity').value);
  const unit = document.querySelector('#catalog-stock-unit').value.trim();
  const minimum = document.querySelector('#catalog-stock-minimum').value;
  if (!material || !location || !unit || Number.isNaN(quantity) || quantity < 0 || minimum === '') return;
  location.items ||= [];
  const existing = location.items.find(item => item.name.toLowerCase() === material.name.toLowerCase() && item.unit.toLowerCase() === unit.toLowerCase());
  if (existing && usesNormalizedStorage() && quantity > 0) {
    const { error } = await supabaseClient.rpc('restock_item', { target_stock_item_id: existing.id, amount_added: quantity, restock_note: null });
    if (error) { showToast(error.message); return; }
    const { error: thresholdError } = await supabaseClient.from('stock_items').update({ low_stock_threshold: Number(minimum), updated_by: currentUser.id, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('company_id', activeCompanyId);
    if (thresholdError) { showToast(thresholdError.message); return; }
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    await loadNormalizedState();
    showToast(`${material.name} added to ${location.name}`);
    return;
  }
  if (existing) { existing.quantity = String(Number(existing.quantity) + quantity); existing.minimum = minimum; }
  else location.items.push({ id: newId(), materialId: material.id, name: material.name, quantity: String(quantity), unit, minimum });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
  showToast(`${material.name} added to ${location.name}`);
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
  location.items.push({ id: newId(), name, quantity, unit, minimum });
  event.currentTarget.reset();
  saveStockLocations();
  renderStockItems(location);
});
document.querySelector('#stock-item-list').addEventListener('click', event => {
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  const restockButton = event.target.closest('[data-restock-stock-item]');
  if (restockButton && location) {
    const item = location.items.find(stock => stock.id === restockButton.dataset.restockStockItem);
    if (!item) return;
    selectedRestockStockItemId = item.id;
    document.querySelector('#location-restock-name').value = `${item.name} · ${item.quantity} ${item.unit} available`;
    document.querySelector('#location-restock-quantity').value = '';
    const form = document.querySelector('#location-restock-form');
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector('#location-restock-quantity').focus();
    return;
  }
  const useButton = event.target.closest('[data-use-stock-item]');
  if (useButton && location) {
    const item = location.items.find(stock => stock.id === useButton.dataset.useStockItem);
    if (!item) return;
    selectedStockItemId = item.id;
    document.querySelector('#location-use-name').value = `${item.name} · ${item.quantity} ${item.unit} available`;
    document.querySelector('#location-use-quantity').value = '';
    const form = document.querySelector('#location-use-form');
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector('#location-use-quantity').focus();
    return;
  }
  const removeButton = event.target.closest('[data-remove-stock-item]');
  if (!removeButton || !location || !confirm('Delete this stock item?')) return;
  location.items = location.items.filter(item => item.id !== removeButton.dataset.removeStockItem);
  saveStockLocations();
  renderStockItems(location);
});
document.querySelector('#location-restock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  const item = location?.items?.find(stock => stock.id === selectedRestockStockItemId);
  const added = Number(document.querySelector('#location-restock-quantity').value);
  if (!location || !item || !added || added <= 0) return;
  if (usesNormalizedStorage()) {
    const { error } = await supabaseClient.rpc('restock_item', { target_stock_item_id: item.id, amount_added: added, restock_note: null });
    if (error) { showToast(error.message); return; }
    selectedRestockStockItemId = null;
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    await loadNormalizedState();
    const refreshedLocation = stockLocations.find(record => record.id === location.id);
    if (refreshedLocation) renderStockItems(refreshedLocation);
    showToast(`${added} ${item.unit} added to ${item.name}`);
    return;
  }
  item.quantity = String(Number(item.quantity) + added);
  selectedRestockStockItemId = null;
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
  renderStockItems(location);
  showToast(`${added} ${item.unit} added to ${item.name}`);
});
document.querySelector('#location-use-form').addEventListener('submit', async event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === selectedStockLocationId);
  const item = location?.items?.find(stock => stock.id === selectedStockItemId);
  const used = Number(document.querySelector('#location-use-quantity').value);
  if (!location || !item || !used || used <= 0) return;
  const onHand = Number(item.quantity);
  if (used > onHand) { showToast(`Only ${item.quantity} ${item.unit} available`); return; }
  if (usesNormalizedStorage()) {
    const { data, error } = await supabaseClient.rpc('use_stock_item', { target_stock_item_id: item.id, amount_used: used, target_job_id: null, usage_note: null });
    if (error) { showToast(error.message); return; }
    selectedStockItemId = null;
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    await loadNormalizedState();
    const refreshedLocation = stockLocations.find(record => record.id === location.id);
    if (refreshedLocation) renderStockItems(refreshedLocation);
    showToast(data?.needs_attention ? `${item.name} in ${location.name} needs attention` : `${used} ${item.unit} of ${item.name} used`);
    return;
  }
  item.quantity = String(onHand - used);
  selectedStockItemId = null;
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
  renderStockItems(location);
  const low = Number(item.quantity) <= Number(item.minimum || 0);
  showToast(low ? `${item.name} in ${location.name} needs attention` : `${used} ${item.unit} of ${item.name} used`);
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
  crews[selectedCrewIndex].members.push({ id: newId(), name, role });
  saveData();
  openCrew(selectedCrewIndex);
});
document.querySelector('#job-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#job-name').value.trim(); const type = document.querySelector('#job-type').value; const location = document.querySelector('#job-location').value.trim(); const due = document.querySelector('#job-due').value;
  if (!name || !type) return;
  if (editingJobId) {
    const job = jobs.find(item => item.id === editingJobId);
    if (job) Object.assign(job, { name, type, location, due });
    if (job?.type === 'Commercial Jobs' && !Array.isArray(job.inspections)) job.inspections = createCommercialChecklist();
    crews.forEach(crew => { if (crew.jobId === editingJobId) crew.jobName = name; });
  } else jobs.push({ id: newId(), name, type, location, due, inspections: type === 'Commercial Jobs' ? createCommercialChecklist() : [] });
  editingJobId = null; event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#crew-assignment-form').addEventListener('submit', event => {
  event.preventDefault(); if (selectedCrewIndex === null) return; const jobId = document.querySelector('#crew-job-select').value; const job = jobs.find(item => item.id === jobId);
  crews[selectedCrewIndex].jobId = jobId; crews[selectedCrewIndex].jobName = job ? job.name : ''; saveData(); showView('teams');
});
document.querySelector('#job-crew-form').addEventListener('submit', event => {
  event.preventDefault();
  const job = jobs.find(item => item.id === selectedJobId);
  if (!job) return;
  const selectedIndexes = new Set([...document.querySelectorAll('#job-crew-options input:checked')].map(input => Number(input.dataset.crewIndex)));
  crews.forEach((crew, index) => {
    if (selectedIndexes.has(index)) {
      crew.jobId = job.id;
      crew.jobName = job.name;
    } else if (crew.jobId === job.id) {
      crew.jobId = '';
      crew.jobName = '';
    }
  });
  saveData();
  openJob(job);
  showToast('Crew assignments updated');
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
  job.inspections.push({ id: newId(), name, completed: false });
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
const pullRefresh = document.querySelector('#pull-refresh');
const pullRefreshLabel = document.querySelector('#pull-refresh-label');
let pullStartY = 0;
let pullDistance = 0;
let isPulling = false;
let isRefreshing = false;
const pullThreshold = 78;
function resetPullRefresh() {
  pullRefresh.classList.remove('show', 'ready', 'refreshing');
  pullRefresh.style.transform = '';
  pullRefreshLabel.textContent = 'PULL TO REFRESH';
  pullDistance = 0;
  isPulling = false;
}
function refreshFromPull() {
  if (isRefreshing) return;
  isRefreshing = true;
  pullRefresh.classList.add('show', 'refreshing');
  pullRefresh.classList.remove('ready');
  pullRefresh.style.transform = 'translate(-50%, 8px)';
  pullRefreshLabel.textContent = 'REFRESHING…';
  if (navigator.vibrate) navigator.vibrate(18);
  setTimeout(() => window.location.reload(), 280);
}
document.addEventListener('touchstart', event => {
  if (isRefreshing || window.scrollY > 0 || event.target.closest('input, textarea, select, .auth-modal, .workspace-modal, .profile-modal')) return;
  pullStartY = event.touches[0].clientY;
  pullDistance = 0;
  isPulling = true;
}, { passive: true });
document.addEventListener('touchmove', event => {
  if (!isPulling || isRefreshing) return;
  const distance = Math.max(0, event.touches[0].clientY - pullStartY);
  if (!distance) return;
  if (window.scrollY > 0) { resetPullRefresh(); return; }
  pullDistance = Math.min(distance * .5, 105);
  pullRefresh.classList.add('show');
  pullRefresh.classList.toggle('ready', pullDistance >= pullThreshold);
  pullRefresh.style.transform = `translate(-50%, ${pullDistance - 57}px)`;
  pullRefreshLabel.textContent = pullDistance >= pullThreshold ? 'RELEASE TO REFRESH' : 'PULL TO REFRESH';
  if (distance > 10) event.preventDefault();
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!isPulling) return;
  if (pullDistance >= pullThreshold) refreshFromPull();
  else resetPullRefresh();
}, { passive: true });
document.addEventListener('touchcancel', resetPullRefresh, { passive: true });
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
document.querySelector('#issue-form').addEventListener('submit', async event => {
  event.preventDefault();
  const location = stockLocations.find(item => item.id === document.querySelector('#issue-location').value);
  const item = location?.items?.find(stock => stock.id === document.querySelector('#issue-item').value);
  const used = Number(document.querySelector('#issue-quantity').value);
  if (!location || !item || !used || used <= 0) return;
  const onHand = Number(item.quantity);
  if (used > onHand) { showToast(`Only ${item.quantity} ${item.unit} available`); return; }
  if (usesNormalizedStorage()) {
    const { data, error } = await supabaseClient.rpc('use_stock_item', { target_stock_item_id: item.id, amount_used: used, target_job_id: null, usage_note: null });
    if (error) { showToast(error.message); return; }
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    await loadNormalizedState();
    showToast(data?.needs_attention ? `${item.name} in ${location.name} needs attention` : `${used} ${item.unit} of ${item.name} used`);
    return;
  }
  item.quantity = String(onHand - used);
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveStockLocations();
  const low = Number(item.quantity) <= Number(item.minimum || 0);
  showToast(low ? `${item.name} in ${location.name} needs attention` : `${used} ${item.unit} of ${item.name} used`);
  if (low && 'Notification' in window && Notification.permission === 'granted') new Notification('Stock needs attention', { body: `${item.name} in ${location.name} is at or below its threshold.` });
});
document.querySelector('#time-off-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.querySelector('#time-off-message');
  const text = input.value.trim();
  if (!text) return;
  const authorName = profileFullName || profileName || currentUser?.user_metadata?.full_name || currentUser?.email || 'Team member';
  const existing = timeOffMessages.find(message => message.id === editingTimeOffMessageId);
  if (existing) {
    existing.text = text;
    existing.editedAt = new Date().toISOString();
  } else timeOffMessages.push({ id: newId(), authorId: currentUser?.id || null, authorName, text, createdAt: new Date().toISOString() });
  const wasEditing = Boolean(existing);
  editingTimeOffMessageId = null;
  event.currentTarget.reset();
  document.querySelector('#time-off-form-title').textContent = 'Post a time-off request';
  document.querySelector('#time-off-submit').textContent = 'Post to company';
  document.querySelector('#cancel-time-off-edit').hidden = true;
  saveTimeOffMessages();
  showToast(wasEditing ? 'Time-off request updated' : 'Time-off request posted');
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') showToast('Time-off notifications enabled');
  }
});
document.querySelector('#time-off-messages').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-time-off]');
  if (editButton) {
    const message = timeOffMessages.find(item => item.id === editButton.dataset.editTimeOff);
    const canManage = message && (message.authorId ? message.authorId === currentUser?.id : message.authorName === (profileFullName || profileName));
    if (!canManage) return;
    editingTimeOffMessageId = message.id;
    document.querySelector('#time-off-message').value = message.text;
    document.querySelector('#time-off-form-title').textContent = 'Edit time-off request';
    document.querySelector('#time-off-submit').textContent = 'Save changes';
    document.querySelector('#cancel-time-off-edit').hidden = false;
    document.querySelector('#time-off-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector('#time-off-message').focus();
    return;
  }
  const deleteButton = event.target.closest('[data-delete-time-off]');
  const message = timeOffMessages.find(item => item.id === deleteButton?.dataset.deleteTimeOff);
  const canManage = message && (message.authorId ? message.authorId === currentUser?.id : message.authorName === (profileFullName || profileName));
  if (!deleteButton || !canManage || !confirm('Delete this time-off request?')) return;
  timeOffMessages = timeOffMessages.filter(message => message.id !== deleteButton.dataset.deleteTimeOff);
  saveTimeOffMessages();
  showToast('Time-off request deleted');
});
document.querySelector('#cancel-time-off-edit').addEventListener('click', () => {
  editingTimeOffMessageId = null;
  document.querySelector('#time-off-form').reset();
  document.querySelector('#time-off-form-title').textContent = 'Post a time-off request';
  document.querySelector('#time-off-submit').textContent = 'Post to company';
  document.querySelector('#cancel-time-off-edit').hidden = true;
});
document.querySelector('#photo-input').addEventListener('change', event => {
  const photo = event.target.files[0];
  if (photo) showToast(`${photo.name} selected`);
  event.target.value = '';
});
render();
renderProfile();
updateTimeGreeting();
setInterval(updateTimeGreeting, 60000);
renderAuthMode();
initializeAuth();
