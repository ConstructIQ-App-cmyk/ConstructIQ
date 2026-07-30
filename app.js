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
