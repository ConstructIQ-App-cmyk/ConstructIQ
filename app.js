const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const showView = target => {
  views.forEach(view => view.classList.toggle('active', view.id === `${target}-view`));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.target === target));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));

const dataVersion = 'current-field-data-v2';
const crewKey = 'current-crews-v2';
const jobKey = 'current-jobs-v2';
const profileKey = 'current-profile-name';
const hadExistingInstall = localStorage.getItem(dataVersion) === 'ready';
if (!hadExistingInstall) {
  localStorage.removeItem('current-crews');
  localStorage.removeItem(crewKey);
  localStorage.removeItem(jobKey);
  localStorage.setItem(dataVersion, 'ready');
}
let profileName = localStorage.getItem(profileKey);
if (!profileName && hadExistingInstall) {
  profileName = 'Logan';
  localStorage.setItem(profileKey, profileName);
}
let crews = JSON.parse(localStorage.getItem(crewKey) || '[]');
let jobs = JSON.parse(localStorage.getItem(jobKey) || '[]');
let selectedCrewIndex = null;
let editingJobId = null;
const crewColors = ['orange', 'blue', 'green'];
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

function renderProfile() {
  document.querySelector('#profile-name').textContent = profileName || 'there';
  document.querySelector('#profile-initials').textContent = profileName ? initials(profileName) : '?';
}
document.querySelector('#profile-button').addEventListener('click', () => {
  document.querySelector('#profile-input').value = profileName || '';
  document.querySelector('#profile-modal').hidden = false;
  document.querySelector('#profile-input').focus();
});
document.querySelector('#profile-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#profile-input').value.trim();
  if (!name) return;
  profileName = name;
  localStorage.setItem(profileKey, profileName);
  document.querySelector('#profile-modal').hidden = true;
  renderProfile();
});
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function saveData() {
  localStorage.setItem(crewKey, JSON.stringify(crews));
  localStorage.setItem(jobKey, JSON.stringify(jobs));
  render();
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
  document.querySelector('#home-member-count').textContent = String(crews.reduce((sum, crew) => sum + crew.members.length, 0)).padStart(2, '0');
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
document.querySelector('#job-list').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-job]');
  if (button) openJobForm(jobs.find(job => job.id === button.dataset.editJob));
});
document.querySelector('#team-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#team-name').value.trim(); if (!name) return;
  crews.push({ name, color: crewColors[crews.length % crewColors.length], members: [], jobId: '', jobName: '' }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#member-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#member-name').value.trim(); const role = document.querySelector('#member-role').value.trim(); const crewIndex = Number(document.querySelector('#member-crew').value);
  if (!name || !role || !crews[crewIndex]) return; crews[crewIndex].members.push({ name, role }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
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
    crews.forEach(crew => { if (crew.jobId === editingJobId) crew.jobName = name; });
  } else jobs.push({ id: `${Date.now()}`, name, type, location, due });
  editingJobId = null; event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#crew-assignment-form').addEventListener('submit', event => {
  event.preventDefault(); if (selectedCrewIndex === null) return; const jobId = document.querySelector('#crew-job-select').value; const job = jobs.find(item => item.id === jobId);
  crews[selectedCrewIndex].jobId = jobId; crews[selectedCrewIndex].jobName = job ? job.name : ''; saveData(); showView('teams');
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
  if (action === 'material') { showView('inventory'); document.querySelector('#issue-form').hidden = false; }
  if (action === 'photo') document.querySelector('#photo-input').click();
});
document.querySelector('#issue-form').addEventListener('submit', event => {
  event.preventDefault();
  const material = document.querySelector('#issue-material').value.trim();
  const quantity = document.querySelector('#issue-quantity').value;
  if (!material || !quantity) return;
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  showToast(`${quantity} ${material} issued`);
});
document.querySelector('#photo-input').addEventListener('change', event => {
  const photo = event.target.files[0];
  if (photo) showToast(`${photo.name} selected`);
  event.target.value = '';
});
render();
renderProfile();
if (!profileName) document.querySelector('#profile-modal').hidden = false;
