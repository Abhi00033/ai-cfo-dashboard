const API = CONFIG.API_BASE_URL;

// Initialize Charts
let revenueChart, cashflowChart;

function showToast(message, isError = false) {

    const toast = document.getElementById('toast');

    toast.textContent = message;

    toast.className = isError
        ? 'error'
        : '';

    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function initCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Revenue (₹ Cr)',
                data: [6.2, 7.1, 7.8, 8.24],
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // Cashflow Chart
    const cashflowCtx = document.getElementById('cashflowChart');
    cashflowChart = new Chart(cashflowCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                label: 'Revenue',
                data: [45, 62, 38, 71, 55],
                backgroundColor: '#22c55e'
            }, {
                label: 'Expenses',
                data: [32, 28, 41, 25, 30],
                backgroundColor: '#ef4444'
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
}

// Populate Transactions from Backend
async function loadTransactions(page = 1) {

    const tbody =
        document.querySelector('#transactions-table tbody');

    if (!tbody) return;

    tbody.innerHTML = '';

    try {

        const response =
            await fetch(`${API}/transactions`);

        if (!response.ok)
            throw new Error();

        const data =
            await response.json();
        data.reverse();

        if (data.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center">
                        No transactions found
                    </td>
                </tr>
            `;

            return;
        }

        const isTransactionsPage =
            window.location.pathname.includes('transactions.html');

        let transactionsToShow = [];

        if (isTransactionsPage) {

            const rowsPerPage = 10;

            const start =
                (page - 1) * rowsPerPage;

            const end =
                start + rowsPerPage;

            transactionsToShow =
                data.slice(start, end);

            renderPagination(data, page);

        } else {

            // Dashboard shows only latest 5
            transactionsToShow =
                data.slice(0, 5);
        }

        transactionsToShow.forEach(t => {

            const tr =
                document.createElement('tr');

            const amountClass =
                t.type === 'income'
                    ? 'positive'
                    : 'negative';

            const amountDisplay =
                t.type === 'income'
                    ? `+₹${(t.amount / 100000).toFixed(2)}L`
                    : `-₹${Math.abs(t.amount / 100000).toFixed(2)}L`;

            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.category}</td>
                <td>${t.description}</td>
                <td class="${amountClass}">
                    ${amountDisplay}
                </td>
                <td>
                    <button
                        class="delete-btn"
                        onclick="deleteTransaction(${t.id})">
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (e) {

        console.error(e);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center">
                    Failed to load transactions
                </td>
            </tr>
        `;
    }
}

function renderPagination(data, currentPage) {

    const pagination =
        document.getElementById('pagination');

    if (!pagination) return;

    const rowsPerPage = 10;

    const totalPages =
        Math.ceil(data.length / rowsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    if (currentPage > 1) {

        html += `
            <button class="page-btn"
                onclick="loadTransactions(${currentPage - 1})">
                Previous
            </button>
        `;
    }

    for (let i = 1; i <= totalPages; i++) {

        html += `
            <button
                class="page-btn ${i === currentPage ? 'active-page' : ''}"
                onclick="loadTransactions(${i})">
                ${i}
            </button>
        `;
    }

    if (currentPage < totalPages) {

        html += `
            <button class="page-btn"
                onclick="loadTransactions(${currentPage + 1})">
                Next
            </button>
        `;
    }

    pagination.innerHTML = html;
}

// AI Chat
const chatMessages =
    document.getElementById('chat-messages');

function addMessage(text, type) {
    if (!chatMessages) return;
    const msg = document.createElement('div');
    msg.className = `chat-message ${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {

    const input =
        document.getElementById('chat-input');

    const query =
        input.value.trim();

    if (!query) {
        return;
    }

    addMessage(
        query,
        'user'
    );

    input.value = '';

    const typing =
        document.createElement('div');

    typing.className =
        'chat-message bot';

    typing.textContent =
        'Thinking...';

    chatMessages.appendChild(typing);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    try {

        const response =
            await fetch(
                `${API}/ai/assistant`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: query
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                'AI service unavailable'
            );
        }

        const data =
            await response.json();

        typing.remove();

        addMessage(
            data.response,
            'bot'
        );

    } catch (error) {

        console.error(error);

        typing.remove();

        addMessage(
            'AI Assistant is currently unavailable.',
            'bot'
        );

        showToast(
            'Failed to connect to AI Assistant',
            true
        );
    }
}

// Backend Integration (Connected to FastAPI)
async function fetchDashboardData() {

    try {

        const response =
            await fetch(`${API}/dashboard`);

        if (!response.ok)
            throw new Error('Backend not responding');

        const data =
            await response.json();

        const revenue =
            document.getElementById('revenue');

        const cashflow =
            document.getElementById('cashflow');

        const expenses =
            document.getElementById('expenses');

        const profit =
            document.getElementById('profit');

        if (revenue) {
            revenue.textContent =
                `₹${(data.total_revenue / 10000000).toFixed(2)} Cr`;
        }

        if (cashflow) {
            cashflow.textContent =
                `₹${(data.cash_flow / 10000000).toFixed(2)} Cr`;
        }

        if (expenses) {
            expenses.textContent =
                `₹${(data.expenses / 10000000).toFixed(2)} Cr`;
        }

        if (profit) {
            profit.textContent =
                `${data.profit_margin}%`;
        }

        console.log(
            "✅ Dashboard data loaded from backend"
        );

    } catch (e) {

        console.error(e);

        showToast(
            "Failed to load dashboard",
            true
        );
    }
}

async function refreshDashboard() {

    const btn = document.getElementById('refreshBtn');

    try {

        btn.disabled = true;
        btn.innerHTML = '⏳ Refreshing...';

        await loadTransactions();

        if (document.getElementById('revenueChart')) {

            await fetchDashboardData();
            await loadStats();
            await loadAnalytics();
        }

        if (document.getElementById('compliance')) {
            await loadCompliance();
        }

        if (document.getElementById('fraud')) {
            await loadFraud();
        }

        btn.innerHTML = '✅ Refreshed';

    } catch (e) {

        console.error(e);
        btn.innerHTML = '❌ Failed';

    } finally {

        setTimeout(() => {
            btn.innerHTML = '🔄 Refresh';
            btn.disabled = false;
        }, 1500);
    }
}


// Initialize everything
window.onload = function () {

    loadTeamInfo();
    loadTransactions();
    loadCategories();
    loadWeather();

    // Dashboard & Analytics Pages
    if (document.getElementById('revenueChart')) {

        initCharts();
        fetchDashboardData();
        loadStats();
        loadAnalytics();
    }

    // Compliance Page
    if (document.getElementById('compliance')) {
        loadCompliance();
    }

    if (document.getElementById('fraud')) {
        loadFraud();
    }

    // AI Assistant Page
    const chatInput =
        document.getElementById('chat-input');

    if (chatInput) {

        chatInput.addEventListener('keypress', function (e) {

            if (e.key === 'Enter') {
                sendMessage();
            }

        });

        setTimeout(() => {

            addMessage(
                "Hello! I'm your AI CFO Assistant. How can I help you today?",
                'bot'
            );

        }, 600);
    }
};

function openTransactionModal() {

    const modal = new bootstrap.Modal(
        document.getElementById('transactionModal')
    );

    modal.show();
}


function closeTransactionModal() {

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById('transactionModal')
        );

    if (modal) {
        modal.hide();
    }
}

async function saveTransaction() {

    const payload = {
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(document.getElementById('txAmount').value),
        category: document.getElementById('txCategory').value,
        description: document.getElementById('txDescription').value.trim(),
        type: document.getElementById('txType').value
    };

    if (!payload.amount || payload.amount <= 0) {
        showToast("Please enter valid amount", true);
        return;
    }

    if (!payload.description) {
        showToast("Please enter description", true);
        return;
    }

    try {

        const response = await fetch(
            `${API}/transactions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (response.ok) {

            closeTransactionModal();

            document.getElementById('txAmount').value = '';
            document.getElementById('txCategory').selectedIndex = 0;
            document.getElementById('txDescription').value = '';
            document.getElementById('txType').selectedIndex = 0;

            await loadTransactions();

            if (document.getElementById('revenue')) {

                await fetchDashboardData();
                await loadStats();
                await loadAnalytics();
            }

            showToast(
                "Transaction added successfully"
            );

        } else {

            showToast(
                "Failed to add transaction",
                true
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed",
            true
        );

    }
}

async function loadWeather() {

    try {

        const response = await fetch(
            "https://wttr.in/?format=j1"
        );

        const data = await response.json();

        const current =
            data.current_condition[0];

        document.getElementById(
            "weatherWidget"
        ).innerHTML =
            `🌤️ ${current.temp_C}°C`;
    }

    catch (error) {

        document.getElementById(
            "weatherWidget"
        ).innerHTML =
            "🌤️ Weather Unavailable";
    }
}

function downloadCSVTemplate() {

    const csvContent =
        `amount,category,description,type
10000,Revenue,Website Project,income
5000,Marketing,Google Ads Campaign,expense
2500,HR,Recruitment Expense,expense
15000,Investment,Mutual Fund Return,income`;

    const blob = new Blob(
        [csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "transaction_template.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}



async function uploadCSV() {

    const fileInput =
        document.getElementById("csvFile");

    if (!fileInput.files.length) {

        alert("Please select a CSV file");

        return;
    }

    const formData = new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    try {

        const response = await fetch(
            `${CONFIG.API_BASE_URL}/transactions/upload-csv`,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail || "Upload failed"
            );
        }

        alert(data.message);

        fileInput.value = "";

        refreshDashboard();

        const modal =
            bootstrap.Modal.getInstance(
                document.getElementById(
                    "transactionModal"
                )
            );

        if (modal) {

            modal.hide();
        }

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}


async function loadCategories() {

    const response =
        await fetch(`${API}/categories`);

    const categories =
        await response.json();

    const select =
        document.getElementById('txCategory');

    if (!select) return;

    select.innerHTML = '';

    categories.forEach(category => {

        select.innerHTML += `
            <option value="${category}">
                ${category}
            </option>
        `;
    });
}

async function loadStats() {

    const txCount =
        document.getElementById('txCount');

    if (!txCount) return;

    const response =
        await fetch(`${API}/stats`);

    const data =
        await response.json();

    txCount.textContent =
        data.transactions;
}


async function loadAnalytics() {

    try {

        const response =
            await fetch(`${API}/analytics`);

        const data =
            await response.json();

        revenueChart.data.labels =
            data.labels;

        revenueChart.data.datasets[0].data =
            data.revenue;

        revenueChart.update();

        cashflowChart.data.labels =
            data.labels;

        cashflowChart.data.datasets = [
            {
                label: 'Revenue',
                data: data.revenue,
                backgroundColor: '#22c55e'
            },
            {
                label: 'Expenses',
                data: data.expenses,
                backgroundColor: '#ef4444'
            }
        ];

        cashflowChart.update();

    } catch (error) {

        console.error(
            'Analytics loading failed',
            error
        );

        showToast(
            'Failed to load analytics',
            true
        );
    }
}
async function deleteTransaction(id) {

    if (!confirm("Delete transaction?")) {
        return;
    }

    try {

        const response = await fetch(
            `${API}/transactions/${id}`,
            {
                method: "DELETE"
            }
        );

        if (response.ok) {

            showToast(
                "Transaction deleted successfully"
            );

            await loadTransactions();

            if (document.getElementById('revenue')) {

                await fetchDashboardData();
                await loadStats();
                await loadAnalytics();
            }

        } else {

            showToast(
                "Failed to delete transaction",
                true
            );

        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed",
            true
        );

    }
}

async function loadCompliance() {

    try {

        const compliance =
            document.getElementById('compliance');

        if (!compliance) return;

        const response =
            await fetch(
                `${API}/compliance/check`
            );

        const data =
            await response.json();

        compliance.innerHTML =
            `${data.status}<br>
            <small>${data.gst_filing}</small>`;

    } catch (error) {

        console.error(error);

        showToast(
            'Failed to load compliance',
            true
        );
    }
}

async function loadFraud() {

    try {

        const fraud =
            document.getElementById('fraud');

        if (!fraud) return;

        const response =
            await fetch(`${API}/fraud/detect`);

        const data =
            await response.json();

        fraud.textContent =
            data.status;

    } catch (error) {

        console.error(error);

        showToast(
            'Failed to load fraud status',
            true
        );
    }
}

function loadTeamInfo() {

    const teamName =
        document.getElementById('teamName');

    const teamRole =
        document.getElementById('teamRole');

    if (teamName) {
        teamName.textContent =
            CONFIG.TEAM_NAME;
    }

    if (teamRole) {
        teamRole.textContent =
            `${CONFIG.CREATED_BY} • ${CONFIG.ROLE}`;
    }
}