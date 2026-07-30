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
if (localStorage.getItem(dataVersion) !== 'ready') {
  localStorage.removeItem('current-crews');
  localStorage.removeItem(crewKey);
  localStorage.removeItem(jobKey);
  localStorage.setItem(dataVersion, 'ready');
}
let crews = JSON.parse(localStorage.getItem(crewKey) || '[]');
let jobs = JSON.parse(localStorage.getItem(jobKey) || '[]');
let selectedCrewIndex = null;
const crewColors = ['orange', 'blue', 'green'];
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
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
  document.querySelector('#crew-detail-members').innerHTML = crew.members.length ? crew.members.map(member => `<div class="member-row"><span>${initials(member.name)}</span><div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}</small></div></div>`).join('') : '<p class="empty-state">No members assigned to this crew.</p>';
  document.querySelector('#crew-job-select').innerHTML = `<option value="">Unassigned</option>${jobs.map(job => `<option value="${job.id}" ${crew.jobId === job.id ? 'selected' : ''}>${escapeHtml(job.name)}</option>`).join('')}`;
  showView('crew-detail');
}
document.querySelector('#crew-list').addEventListener('click', event => {
  const card = event.target.closest('[data-crew-index]');
  if (card) openCrew(Number(card.dataset.crewIndex));
});
document.querySelector('#show-team-form').addEventListener('click', () => {
  document.querySelector('#team-form').hidden = !document.querySelector('#team-form').hidden;
  document.querySelector('#member-form').hidden = true;
});
document.querySelector('#show-member-form').addEventListener('click', () => {
  document.querySelector('#member-form').hidden = !document.querySelector('#member-form').hidden;
  document.querySelector('#team-form').hidden = true;
});
document.querySelector('#show-job-form').addEventListener('click', () => document.querySelector('#job-form').hidden = !document.querySelector('#job-form').hidden);
document.querySelector('#team-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#team-name').value.trim(); if (!name) return;
  crews.push({ name, color: crewColors[crews.length % crewColors.length], members: [], jobId: '', jobName: '' }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#member-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#member-name').value.trim(); const role = document.querySelector('#member-role').value.trim(); const crewIndex = Number(document.querySelector('#member-crew').value);
  if (!name || !role || !crews[crewIndex]) return; crews[crewIndex].members.push({ name, role }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#job-form').addEventListener('submit', event => {
  event.preventDefault(); const name = document.querySelector('#job-name').value.trim(); const location = document.querySelector('#job-location').value.trim(); const due = document.querySelector('#job-due').value;
  if (!name || !location || !due) return; jobs.push({ id: `${Date.now()}`, name, location, due }); event.currentTarget.reset(); event.currentTarget.hidden = true; saveData();
});
document.querySelector('#crew-assignment-form').addEventListener('submit', event => {
  event.preventDefault(); if (selectedCrewIndex === null) return; const jobId = document.querySelector('#crew-job-select').value; const job = jobs.find(item => item.id === jobId);
  crews[selectedCrewIndex].jobId = jobId; crews[selectedCrewIndex].jobName = job ? job.name : ''; saveData(); showView('teams');
});
document.querySelectorAll('.filter').forEach(filter => filter.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); filter.classList.add('active'); }));
const search = document.querySelector('#stock-search');
search?.addEventListener('input', () => { const term = search.value.toLowerCase(); document.querySelectorAll('.inventory-item').forEach(item => { item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none'; }); });
const toast = document.querySelector('#toast');
document.querySelector('#add-button').addEventListener('click', () => { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); });
render();
