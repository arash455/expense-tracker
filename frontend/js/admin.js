// Admin panel: overall stats, manage users, see latest expenses

const userRows = document.getElementById('user-rows');
let me = null;

document.getElementById('logout').addEventListener('click', logout);

async function loadStats() {
  const stats = await api('/api/admin/stats');
  document.getElementById('stat-users').textContent = stats.users;
  document.getElementById('stat-expenses').textContent = stats.expenses;
  document.getElementById('stat-amount').textContent = formatMoney(stats.total_amount);
}

async function loadUsers() {
  const { users } = await api('/api/admin/users');

  userRows.innerHTML = users
    .map((u) => {
      const isMe = u.id === me.id;
      const actions = isMe
        ? '<span class="muted">(you)</span>'
        : `<button type="button" class="ghost small" data-role="${u.role === 'admin' ? 'user' : 'admin'}" data-id="${u.id}">
             ${u.role === 'admin' ? 'Remove admin' : 'Make admin'}
           </button>
           <button type="button" class="danger small" data-delete="${u.id}" data-name="${escapeHtml(u.name)}">Delete</button>`;
      return `
        <tr>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge ${u.role}">${u.role}</span></td>
          <td>${formatDate(u.created_at.slice(0, 10))}</td>
          <td class="num">${u.expense_count}</td>
          <td class="num">${formatMoney(u.total_spent)}</td>
          <td class="num">${actions}</td>
        </tr>`;
    })
    .join('');
}

async function loadExpenses() {
  const { expenses } = await api('/api/admin/expenses');

  document.getElementById('expense-rows').innerHTML = expenses
    .map(
      (e) => `
      <tr>
        <td>${formatDate(e.spent_on)}</td>
        <td>${escapeHtml(e.user_name)} <span class="muted">${escapeHtml(e.user_email)}</span></td>
        <td><span class="badge">${escapeHtml(e.category)}</span></td>
        <td class="desc">${escapeHtml(e.description) || '<span class="muted">—</span>'}</td>
        <td class="num">${formatMoney(e.amount)}</td>
      </tr>`
    )
    .join('');
  document.getElementById('expenses-empty').hidden = expenses.length > 0;
}

function refresh() {
  return Promise.all([loadStats(), loadUsers(), loadExpenses()]);
}

// Make admin / remove admin / delete user buttons
userRows.addEventListener('click', async (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  try {
    if (button.dataset.delete) {
      if (!confirm(`Delete ${button.dataset.name} and all of their expenses? This cannot be undone.`)) return;
      await api(`/api/admin/users/${button.dataset.delete}`, { method: 'DELETE' });
    } else if (button.dataset.role) {
      await api(`/api/admin/users/${button.dataset.id}`, {
        method: 'PATCH',
        body: { role: button.dataset.role },
      });
    }
    await refresh();
  } catch (err) {
    alert(err.message);
  }
});

// Start
(async () => {
  try {
    me = await requireLogin();
    if (!me) return;
    if (me.role !== 'admin') {
      location.href = 'dashboard.html';
      return;
    }
    await refresh();
  } catch (err) {
    alert(err.message);
  }
})();
