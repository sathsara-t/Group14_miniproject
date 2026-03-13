/**
 * script.js - FinanceFlow Custom Logic
 * Handles allowance, expense logging, local storage, and Chart.js visuals
 */

// ========== STATE MANAGEMENT ==========
const API_URL = 'http://localhost:3000/api';
let allowance = 0;
let expenses = [];
const currentMonthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

// Category colors for charts
const categoryColors = {
    'Food & Dining': '#f59e0b',  // warning/amber
    'Transport': '#3b82f6',      // secondary/blue
    'Education': '#8b5cf6',      // primary/purple
    'Entertainment': '#ec4899',  // pink
    'Health': '#10b981',         // accent/green
    'Shopping': '#06b6d4',       // cyan
    'Utilities': '#f97316',      // orange
    'Savings': '#14b8a6',        // teal
    'Other': '#64748b'           // slate
};

// DOM Elements
const els = {
    // Secions
    welcomeSection: document.getElementById('welcomeSection'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    allowanceSection: document.getElementById('allowanceSection'),
    dashboard: document.getElementById('dashboard'),
    navHome: document.getElementById('navHome'),
    navDashboard: document.getElementById('navDashboard'),

    // Header
    monthLabel: document.getElementById('monthLabel'),
    resetBtn: document.getElementById('resetAllBtn'),
    importDataBtn: document.getElementById('importDataBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importFileInput: document.getElementById('importFileInput'),
    currentMonthDisplay: document.getElementById('currentMonthDisplay'),

    // Allowance Setup
    allowanceInput: document.getElementById('allowanceInput'),
    setAllowanceBtn: document.getElementById('setAllowanceBtn'),

    // Dashboard Stats
    statAllowance: document.getElementById('statAllowance'),
    statSpent: document.getElementById('statSpent'),
    statRemaining: document.getElementById('statRemaining'),
    statDaily: document.getElementById('statDaily'),
    editAllowanceBtn: document.getElementById('editAllowanceBtn'),

    // Progress
    progressPct: document.getElementById('progressPct'),
    progressFill: document.getElementById('progressFill'),
    progressMax: document.getElementById('progressMax'),
    budgetStatus: document.getElementById('budgetStatus'),

    // Forms
    expDate: document.getElementById('expDate'),
    expDesc: document.getElementById('expDesc'),
    expAmount: document.getElementById('expAmount'),
    expCategory: document.getElementById('expCategory'),
    addExpenseBtn: document.getElementById('addExpenseBtn'),
    formMsg: document.getElementById('formMsg'),

    // Table
    expenseBody: document.getElementById('expenseBody'),
    searchInput: document.getElementById('searchInput'),
    filterCategory: document.getElementById('filterCategory'),
    filterDate: document.getElementById('filterDate'),
    filterRange: document.getElementById('filterRange'),
    tableEmpty: document.getElementById('tableEmpty'),
    recordCount: document.getElementById('recordCount'),
    exportBtn: document.getElementById('exportBtn'),

    // Modals / Toast
    toast: document.getElementById('toast'),
    deleteModal: document.getElementById('deleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // Charts
    categoryChartEmpty: document.getElementById('categoryChartEmpty'),
    legendList: document.getElementById('legendList')
};

// Chart Instances
let categoryChartInstance = null;
let dailyChartInstance = null;
let expenseToDelete = null;

// ========== INITIALIZATION ==========
function init() {
    els.currentMonthDisplay.textContent = currentMonthStr;
    els.monthLabel.textContent = currentMonthStr;

    // Set default date to today
    els.expDate.valueAsDate = new Date();

    // Restore last active section synchronously to prevent flash
    const lastSection = localStorage.getItem('financeFlow_lastSection') || 'welcome';
    showSection(lastSection);

    // Load data
    loadData();

    // Event Listeners
    els.setAllowanceBtn.addEventListener('click', () => saveAllowance(els.allowanceInput.value));
    els.editAllowanceBtn.addEventListener('click', () => {
        showSection('allowance');
        els.allowanceInput.value = allowance;
        els.allowanceInput.focus();
    });

    els.addExpenseBtn.addEventListener('click', addExpense);
    els.searchInput.addEventListener('input', renderTable);
    els.filterCategory.addEventListener('change', renderTable);
    els.filterDate.addEventListener('change', renderTable);
    els.filterRange.addEventListener('change', renderTable);
    els.resetBtn.addEventListener('click', resetAll);
    els.exportDataBtn.addEventListener('click', exportDataJSON);
    els.exportBtn.addEventListener('click', exportCSV);

    // Nav Listeners
    els.navHome.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('welcome');
    });

    els.navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        if (allowance > 0) {
            showSection('dashboard');
        } else {
            showSection('allowance');
        }
    });

    // Import listeners
    els.importDataBtn.addEventListener('click', () => els.importFileInput.click());
    els.importFileInput.addEventListener('change', importDataJSON);

    // Welcome Screen listeners
    if (els.getStartedBtn) {
        els.getStartedBtn.addEventListener('click', () => {
            if (allowance > 0) {
                showSection('dashboard');
            } else {
                showSection('allowance');
                els.allowanceInput.focus();
            }
        });
    }

    // Modal listeners
    els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    els.confirmDeleteBtn.addEventListener('click', confirmDelete);
}

// ========== UI NAVIGATION ==========
function showSection(sectionName) {
    // Hide all
    els.welcomeSection.classList.add('hidden');
    els.allowanceSection.classList.add('hidden');
    els.dashboard.classList.remove('active');
    els.dashboard.classList.add('hidden');

    // Update nav links
    els.navHome.classList.remove('active');
    els.navDashboard.classList.remove('active');

    if (sectionName === 'welcome') {
        els.welcomeSection.classList.remove('hidden');
        els.navHome.classList.add('active');
    } else if (sectionName === 'allowance') {
        els.allowanceSection.classList.remove('hidden');
        els.navDashboard.classList.add('active');
    } else if (sectionName === 'dashboard') {
        els.dashboard.classList.remove('hidden');
        els.dashboard.classList.add('active');
        els.navDashboard.classList.add('active');
        updateDashboard();
    }

    // Toggle header actions visibility
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        if (sectionName === 'welcome') {
            headerRight.style.display = 'none';
        } else {
            headerRight.style.display = 'flex';
        }
    }

    // Save current section to localStorage
    localStorage.setItem('financeFlow_lastSection', sectionName);
}

// ========== DATA LAYER ==========
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) throw new Error('Backend not reachable');

        const data = await response.json();

        allowance = data.allowance || 0;
        expenses = data.expenses || [];
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        // UI already handled in init(), but check if we need to update based on data
        if (localStorage.getItem('financeFlow_lastSection') === 'dashboard' && allowance <= 0) {
            showSection('allowance');
        }
    } catch (error) {
        console.error('Failed to load data from server. Falling back to localStorage.', error);
        // Fallback to local storage if server is down
        const storedAllowance = localStorage.getItem('financeFlow_allowance');
        const storedExpenses = localStorage.getItem('financeFlow_expenses');

        if (storedAllowance) {
            allowance = parseFloat(storedAllowance);
        }

        if (storedExpenses) {
            expenses = JSON.parse(storedExpenses);
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // UI already handled in init()
    }
}

async function saveAllowance(val) {
    const amt = parseFloat(val);
    if (isNaN(amt) || amt <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    allowance = amt;

    // Save to server
    try {
        await fetch(`${API_URL}/allowance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowance })
        });
    } catch (e) { console.error('Server sync failed'); }

    // Fallback local persistence
    localStorage.setItem('financeFlow_allowance', allowance.toString());

    showToast('Budget set successfully!');
    showSection('dashboard');
}

// Global hook for quick set buttons
window.quickSet = function (amount) {
    saveAllowance(amount);
};

async function addExpense() {
    const date = els.expDate.value;
    const desc = els.expDesc.value.trim();
    const amt = parseFloat(els.expAmount.value);
    const cat = els.expCategory.value;

    if (!date || !desc || isNaN(amt) || amt <= 0) {
        els.formMsg.textContent = 'Please fill all fields correctly.';
        els.formMsg.className = 'form-msg error';
        setTimeout(() => els.formMsg.textContent = '', 3000);
        return;
    }

    const newExpense = {
        id: Date.now().toString(),
        date,
        desc,
        amount: amt,
        category: cat
    };

    expenses.push(newExpense);
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save to server
    try {
        await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense)
        });
    } catch (e) { console.error('Server sync failed'); }

    // Fallback local persistence
    localStorage.setItem('financeFlow_expenses', JSON.stringify(expenses));

    // Reset form
    els.expDesc.value = '';
    els.expAmount.value = '';
    els.expDesc.focus();

    showToast('Expense added! 💸');
    updateDashboard();
}

function promptDelete(id) {
    expenseToDelete = id;
    els.deleteModal.classList.add('active');
}

function closeDeleteModal() {
    els.deleteModal.classList.remove('active');
    expenseToDelete = null;
}

async function confirmDelete() {
    if (expenseToDelete) {
        expenses = expenses.filter(e => e.id !== expenseToDelete);

        // Server sync
        try {
            await fetch(`${API_URL}/expenses/${expenseToDelete}`, { method: 'DELETE' });
        } catch (e) { console.error('Server sync failed'); }

        // Fallback local storage
        localStorage.setItem('financeFlow_expenses', JSON.stringify(expenses));

        showToast('Expense deleted');
        updateDashboard();
        closeDeleteModal();
    }
}

async function resetAll() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        // Server sync
        try {
            await fetch(`${API_URL}/reset`, { method: 'POST' });
        } catch (e) { console.error('Server sync failed'); }

        // Backup local clear
        localStorage.removeItem('financeFlow_allowance');
        localStorage.removeItem('financeFlow_expenses');

        allowance = 0;
        expenses = [];
        showSection('welcome');
        els.allowanceInput.value = '';
        showToast('All data reset.');
    }
}

// ========== UI UPDATES ==========
function formatCurrency(num) {
    return 'LKR ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function updateDashboard() {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = allowance - totalSpent;
    const pctRemaining = allowance > 0 ? Math.max(0, (remaining / allowance) * 100) : 0;
    const pctSpent = allowance > 0 ? (totalSpent / allowance) * 100 : 0;

    const today = new Date();
    const daysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
    const daysRemaining = daysInMonth - today.getDate() + 1;
    const dailyBudget = remaining > 0 ? remaining / daysRemaining : 0;

    // Stats
    els.statAllowance.textContent = formatCurrency(allowance);
    els.statSpent.textContent = formatCurrency(totalSpent);

    els.statRemaining.textContent = formatCurrency(remaining);
    els.statRemaining.style.color = remaining < 0 ? 'var(--danger)' : '#fff';

    els.statDaily.textContent = formatCurrency(dailyBudget);

    // Progress Bar
    const displayPct = pctRemaining.toFixed(1);
    els.progressPct.textContent = displayPct + '%';
    els.progressMax.textContent = formatCurrency(allowance);
    els.progressFill.style.width = displayPct + '%';

    els.progressFill.className = 'progress-fill';
    if (pctRemaining <= 10) els.progressFill.classList.add('danger');
    else if (pctRemaining <= 25) els.progressFill.classList.add('warning');

    // Status text
    if (pctSpent >= 100) {
        els.budgetStatus.innerHTML = `⚠️ <span style="color:var(--danger)">You have exceeded your budget by ${formatCurrency(totalSpent - allowance)}!</span>`;
    } else if (pctSpent >= 80) {
        els.budgetStatus.innerHTML = `🔔 <span style="color:var(--warning)">Careful! You've used most of your budget.</span>`;
    } else {
        els.budgetStatus.innerHTML = `✅ You're within your budget limit. Good job!`;
    }

    renderTable();
    updateCharts();
}

function renderTable() {
    const search = els.searchInput.value.toLowerCase();
    const filterCat = els.filterCategory.value;
    const filterDate = els.filterDate.value;
    const filterRange = els.filterRange.value;

    const now = new Date();
    // Normalize "now" to midnight for accurate day comparison
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = expenses.filter(e => {
        const matchSearch = e.desc.toLowerCase().includes(search);
        const matchCat = filterCat === 'all' || e.category === filterCat;
        const matchDate = !filterDate || e.date === filterDate;
        
        // Range filter logic
        let matchRange = true;
        if (filterRange !== 'all') {
            const expDate = new Date(e.date);
            if (filterRange === '7days') {
                const sevenDaysAgo = new Date(todayMidnight);
                sevenDaysAgo.setDate(todayMidnight.getDate() - 7);
                matchRange = expDate >= sevenDaysAgo;
            } else if (filterRange === 'lastMonth') {
                const oneMonthAgo = new Date(todayMidnight);
                oneMonthAgo.setMonth(todayMidnight.getMonth() - 1);
                matchRange = expDate >= oneMonthAgo;
            }
        }

        return matchSearch && matchCat && matchDate && matchRange;
    });

    els.expenseBody.innerHTML = '';

    if (filtered.length === 0) {
        els.tableEmpty.style.display = 'block';
    } else {
        els.tableEmpty.style.display = 'none';
        filtered.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td>${e.desc}</td>
        <td><span class="badge-category" style="color: ${categoryColors[e.category] || '#fff'}; border: 1px solid ${categoryColors[e.category] || '#fff'}">${e.category}</span></td>
        <td class="amt-cell">${formatCurrency(e.amount)}</td>
        <td>
          <button class="btn-icon" onclick="promptDelete('${e.id}')" title="Delete">🗑️</button>
        </td>
      `;
            els.expenseBody.appendChild(tr);
        });
    }

    els.recordCount.textContent = `${filtered.length} record(s)`;
}

// ========== CHARTS ==========
function updateCharts() {
    updateCategoryChart();
    updateDailyChart();
}

function updateCategoryChart() {
    // Aggregate by category
    const catSums = {};
    expenses.forEach(e => {
        catSums[e.category] = (catSums[e.category] || 0) + e.amount;
    });

    const labels = Object.keys(catSums);
    const data = Object.values(catSums);
    const bgColors = labels.map(l => categoryColors[l] || '#cbd5e1');

    if (labels.length === 0) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        els.categoryChartEmpty.style.display = 'block';
        els.legendList.innerHTML = '';
        return;
    }
    els.categoryChartEmpty.style.display = 'none';

    // Render Custom Legend
    els.legendList.innerHTML = labels.map((l, i) => {
        // Find if there's an emoji to strip out
        const parts = l.split(' ');
        const labelText = parts[0].length <= 2 ? parts.slice(1).join(' ') : l; // simplistic emoji check
        return `
    <div class="legend-item">
      <div class="legend-color" style="background:${bgColors[i]}"></div>
      <span>${labelText} (${Math.round((data[i] / data.reduce((a, b) => a + b, 0)) * 100)}%)</span>
    </div>
  `;
    }).join('');

    const ctx = document.getElementById('categoryChart').getContext('2d');

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    if (categoryChartInstance) {
        categoryChartInstance.data.labels = labels;
        categoryChartInstance.data.datasets[0].data = data;
        categoryChartInstance.data.datasets[0].backgroundColor = bgColors;
        categoryChartInstance.update();
    } else {
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { size: 14, family: "'Outfit', sans-serif" },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function (context) {
                                return ' ' + formatCurrency(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateDailyChart() {
    // Get current month days
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    const labels = [];
    const dailyData = new Array(daysInMonth).fill(0);

    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i);
    }

    // Aggregate expenses for current month
    expenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
            dailyData[d.getDate() - 1] += e.amount;
        }
    });

    const ctx = document.getElementById('dailyChart').getContext('2d');

    if (dailyChartInstance) {
        dailyChartInstance.data.labels = labels;
        dailyChartInstance.data.datasets[0].data = dailyData;
        dailyChartInstance.update();
    } else {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)'); // primary
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        dailyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Spent',
                    data: dailyData,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });
    }
}

// ========== UTILITIES ==========
function showToast(msg, type = 'success') {
    els.toast.textContent = msg;
    els.toast.className = `toast show ${type}`;
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, 3000);
}

function exportCSV() {
    if (expenses.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    let csv = 'Date,Description,Category,Amount\n';
    expenses.forEach(e => {
        csv += `"${e.date}","${e.desc.replace(/"/g, '""')}","${e.category}",${e.amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'financeFlow_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportDataJSON() {
    const data = {
        allowance: allowance,
        expenses: expenses,
        exportDate: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'financeFlow_data.json');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast('Data exported successfully! 💾');
}

function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.allowance !== undefined && Array.isArray(data.expenses)) {
                allowance = parseFloat(data.allowance);
                expenses = data.expenses;

                // Sync to server
                fetch(`${API_URL}/data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ allowance, expenses })
                }).catch(err => console.error('Server sync failed: ', err));

                // Fallback
                localStorage.setItem('financeFlow_allowance', allowance.toString());
                localStorage.setItem('financeFlow_expenses', JSON.stringify(expenses));

                showToast('Data imported successfully! 📥');

                // Refresh UI
                if (allowance > 0) {
                    showSection('dashboard');
                } else {
                    showSection('allowance');
                }
            } else {
                showToast('Invalid backup file format.', 'error');
            }
        } catch (err) {
            showToast('Error reading the backup file.', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again if needed
    event.target.value = '';
}

// Start
document.addEventListener('DOMContentLoaded', init);
window.promptDelete = promptDelete; // Expose for inline handlers
