// User dashboard: add expenses, list them, see reports

const form = document.getElementById('expense-form');
const formMessage = document.getElementById('form-message');
const monthFilter = document.getElementById('month-filter');
const rows = document.getElementById('expense-rows');

document.getElementById('logout').addEventListener('click', logout);

// Fill the category dropdown and default the date to today
document.getElementById('category').innerHTML = CATEGORIES
  .map((c) => `<option value="${c}">${c}</option>`)
  .join('');
form.spent_on.value = todayISO();

async function loadExpenses() {
  const query = monthFilter.value ? `?month=${monthFilter.value}` : '';
  const { expenses } = await api(`/api/expenses${query}`);

  rows.innerHTML = expenses
    .map(
      (e) => `
      <tr>
        <td>${formatDate(e.spent_on)}</td>
        <td><span class="badge">${escapeHtml(e.category)}</span></td>
        <td class="desc">${escapeHtml(e.description) || '<span class="muted">—</span>'}</td>
        <td class="num">${formatMoney(e.amount)}</td>
        <td class="num"><button type="button" class="danger small" data-delete="${e.id}">Delete</button></td>
      </tr>`
    )
    .join('');

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById('list-total').textContent = formatMoney(total);
  document.getElementById('list-empty').hidden = expenses.length > 0;
  document.getElementById('list-empty').textContent = monthFilter.value
    ? 'No expenses in this month.'
    : 'No expenses yet. Add your first one above!';
}

async function loadReport() {
  const report = await api('/api/reports');

  document.getElementById('stat-month').textContent = formatMoney(report.thisMonth);
  document.getElementById('stat-total').textContent = formatMoney(report.total);
  document.getElementById('stat-count').textContent = report.count;

  renderBars(
    document.getElementById('by-category'),
    report.byCategory.map((c) => ({ label: c.category, value: c.total })),
    'Your category breakdown will appear here.'
  );
  renderBars(
    document.getElementById('by-month'),
    report.byMonth.map((m) => ({ label: formatMonth(m.month), value: m.total })),
    'Your monthly totals will appear here.'
  );
}

function refresh() {
  return Promise.all([loadExpenses(), loadReport()]);
}

// Save a new expense
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  formMessage.className = 'message';
  formMessage.textContent = '';
  button.disabled = true;

  try {
    await api('/api/expenses', { method: 'POST', body: Object.fromEntries(new FormData(form)) });
    form.amount.value = '';
    form.description.value = '';
    formMessage.className = 'message success';
    formMessage.textContent = 'Expense saved ✔';
    await refresh();
  } catch (err) {
    formMessage.className = 'message error';
    formMessage.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

// Delete an expense (event delegation on the table)
rows.addEventListener('click', async (e) => {
  const id = e.target.dataset.delete;
  if (!id || !confirm('Delete this expense?')) return;
  try {
    await api(`/api/expenses/${id}`, { method: 'DELETE' });
    await refresh();
  } catch (err) {
    alert(err.message);
  }
});

monthFilter.addEventListener('change', () => loadExpenses().catch((err) => alert(err.message)));
document.getElementById('clear-filter').addEventListener('click', () => {
  monthFilter.value = '';
  loadExpenses().catch((err) => alert(err.message));
});

// Start
(async () => {
  try {
    const user = await requireLogin();
    if (!user) return;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('admin-link').hidden = user.role !== 'admin';
    await refresh();
  } catch (err) {
    alert(err.message);
  }
})();
