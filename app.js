const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const showView = (target) => {
  views.forEach(view => view.classList.toggle('active', view.id === `${target}-view`));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.target === target));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.querySelectorAll('[data-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.target)));
document.querySelectorAll('.filter').forEach(filter => filter.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
  filter.classList.add('active');
}));

const search = document.querySelector('#stock-search');
search?.addEventListener('input', () => {
  const term = search.value.toLowerCase();
  document.querySelectorAll('.inventory-item').forEach(item => {
    item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none';
  });
});

const toast = document.querySelector('#toast');
document.querySelector('#add-button').addEventListener('click', () => {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
});

const defaultCrews = [
  { name: 'Crew A', job: 'Riverside Medical Center', color: 'orange', members: [{ name: 'Logan Morris', role: 'Foreman' }, { name: 'James Miller', role: 'Journeyman' }, { name: 'Rosa Chen', role: 'Apprentice' }] },
  { name: 'Crew B', job: 'Northline Apartments', color: 'blue', members: [{ name: 'Ava Smith', role: 'Foreman' }, { name: 'Derek Tran', role: 'Journeyman' }, { name: 'Khalil Harris', role: 'Apprentice' }] },
  { name: 'Crew C', job: 'Coastal Retail Fit-Out', color: 'green', members: [{ name: 'Maya Brown', role: 'Foreman' }, { name: 'Noah Wilson', role: 'Journeyman' }] }
];
const crewStorageKey = 'current-crews';
let crews = JSON.parse(localStorage.getItem(crewStorageKey) || 'null') || defaultCrews;
const crewColors = ['orange', 'blue', 'green'];
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

function renderCrews() {
  const list = document.querySelector('#crew-list');
  const select = document.querySelector('#member-crew');
  if (!list || !select) return;
  list.innerHTML = crews.map((crew, index) => `
    <article class="crew-card">
      <div class="crew-badge ${crew.color || crewColors[index % crewColors.length]}">${crew.name.replace('Crew ', '').slice(0, 1).toUpperCase()}</div>
      <div class="crew-info"><h3>${crew.name} <span class="status-dot"></span></h3><p>${crew.job || 'Unassigned'} · ${crew.members.length} member${crew.members.length === 1 ? '' : 's'}</p><div class="avatars">${crew.members.slice(0, 4).map(member => `<span title="${member.name}, ${member.role}">${initials(member.name)}</span>`).join('')}</div></div>
      <span class="chevron">›</span>
    </article>`).join('');
  select.innerHTML = crews.map((crew, index) => `<option value="${index}">${crew.name}</option>`).join('');
  document.querySelector('#crew-count').textContent = String(crews.length).padStart(2, '0');
  document.querySelector('#field-count').textContent = String(crews.reduce((total, crew) => total + crew.members.length, 0)).padStart(2, '0');
}

function saveCrews() {
  localStorage.setItem(crewStorageKey, JSON.stringify(crews));
  renderCrews();
}

document.querySelector('#show-team-form').addEventListener('click', () => {
  document.querySelector('#team-form').hidden = !document.querySelector('#team-form').hidden;
  document.querySelector('#member-form').hidden = true;
});
document.querySelector('#show-member-form').addEventListener('click', () => {
  document.querySelector('#member-form').hidden = !document.querySelector('#member-form').hidden;
  document.querySelector('#team-form').hidden = true;
});
document.querySelector('#team-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#team-name');
  const name = input.value.trim();
  if (!name) return;
  crews.push({ name, job: 'Unassigned', color: crewColors[crews.length % crewColors.length], members: [] });
  input.value = '';
  event.currentTarget.hidden = true;
  saveCrews();
});
document.querySelector('#member-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.querySelector('#member-name').value.trim();
  const role = document.querySelector('#member-role').value.trim();
  const crewIndex = Number(document.querySelector('#member-crew').value);
  if (!name || !role || !crews[crewIndex]) return;
  crews[crewIndex].members.push({ name, role });
  event.currentTarget.reset();
  event.currentTarget.hidden = true;
  saveCrews();
});
renderCrews();
