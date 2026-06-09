const API = CONFIG.API_BASE_URL;


document
    .getElementById("themeToggle")
    ?.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        const isDark =
            document.body.classList.contains("dark");

        localStorage.setItem(
            "theme",
            isDark ? "dark" : "light"
        );

        const btn =
            document.getElementById("themeToggle");

        btn.textContent =
            isDark
                ? "☀️"
                : "🌙";
    });

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

let expensePieChart;
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

    const pie =
        document.getElementById(
            "expensePieChart"
        );

    if (pie) {

        expensePieChart =
            new Chart(
                pie,
                {
                    type: "pie",
                    data: {
                        labels: [
                            "Marketing",
                            "Operations",
                            "HR",
                            "Technology"
                        ],
                        datasets: [{
                            data: [
                                35,
                                30,
                                15,
                                20
                            ]
                        }]
                    }
                }
            );
    }
}

async function loadHealthScore() {

    const response =
        await fetch(`${API}/dashboard`);

    const data =
        await response.json();

    const healthScore =
        document.getElementById("healthScore");

    if (!healthScore) return;

    if (
        data.total_revenue === 0 &&
        data.expenses === 0
    ) {
        healthScore.textContent = "N/A";
        return;
    }

    let score = 100;

    if (data.profit_margin < 20)
        score -= 20;

    if (
        data.expenses >
        data.total_revenue * 0.8
    )
        score -= 15;

    healthScore.textContent =
        `${score}%`;
}

// Populate Transactions from Backend
async function loadTransactions(page = 1) {

    const tbody =
        document.querySelector('#transactions-table tbody');

    if (!tbody) return;

    tbody.innerHTML = '';

    const counter =
        document.getElementById(
            "selectedCount"
        );

    if (counter) {

        counter.textContent =
            "0 Selected";
    }

    const selectAll =
        document.getElementById(
            "selectAll"
        );

    if (selectAll) {

        selectAll.checked = false;
    }

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

            if (isTransactionsPage) {

                tr.innerHTML = `
        <td>
            <input
                type="checkbox"
                class="transaction-checkbox"
                value="${t.id}"
                onchange="updateSelectedCount()"
            >
        </td>

        <td>${t.date}</td>
        <td>${t.category}</td>
        <td>${t.description}</td>

        <td class="${amountClass}">
            ${amountDisplay}
        </td>

        <td>
            <button
                class="delete-btn"
                onclick="deleteTransaction(${t.id})"
            >
                Delete
            </button>
        </td>
    `;

            } else {

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
                            onclick="deleteTransaction(${t.id})"
                        >
                            Delete
                        </button>
                    </td>
                `;
            }

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
    msg.innerHTML = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")
        .replace(/•/g, "👉 ");
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    localStorage.setItem(
        "chatHistory",
        chatMessages.innerHTML
    );
}

const AI_SUGGESTIONS = [
    "How is my cash flow?",
    "Analyze my business health",
    "Any fraud risks?",
    "How can I improve profit?",
    "Show expense optimization ideas",
    "Review compliance status",
    "Summarize recent transactions",
    "What are my biggest risks?"
];
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

    typing.innerHTML =
        '🤖 AI CFO is analyzing revenue, expenses, fraud risk and compliance...';

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



const savedTheme =
    localStorage.getItem("theme");

if (savedTheme === "dark") {

    document.body.classList.add("dark");

    window.addEventListener(
        "DOMContentLoaded",
        () => {

            const btn =
                document.getElementById(
                    "themeToggle"
                );

            if (btn) {

                btn.textContent =
                    "☀️";
            }
        }
    );
}


// Initialize everything
window.onload = function () {

    loadTeamInfo();
    loadTransactions();
    loadTransactionSummary();
    loadCategories();
    loadWeather();
    loadSmartAlerts();
    loadHealthScore();
    loadComplianceInsights();
    loadAssistantStats();

    // Dashboard & Analytics Pages
    if (document.getElementById('revenueChart')) {

        initCharts();
        fetchDashboardData();
        loadStats();
        loadAnalytics();
        loadInsights();
        loadExpenseBreakdown();
    }

    if (
        window.location.pathname
            .includes("gst.html")
    ) {

        loadGSTData();
    }

    if (
        window.location.pathname
            .includes("reports.html")
    ) {

        loadReports();
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

    const history =
        localStorage.getItem(
            "chatHistory"
        );

    if (
        history &&
        chatMessages
    ) {
        chatMessages.innerHTML =
            history;
    }

    if (chatInput) {

        chatInput.addEventListener('keypress', function (e) {

            if (e.key === 'Enter') {
                sendMessage();
            }

        });

        const history =
            localStorage.getItem(
                "chatHistory"
            );

        if (!history) {

            setTimeout(() => {

                addMessage(
                    "Hello! I'm your AI CFO Assistant. How can I help you today?",
                    "bot"
                );

            }, 600);
        }
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

async function loadInsights() {

    const response =
        await fetch(
            `${API}/dashboard-insights`
        );

    const data =
        await response.json();

    if (
        !data ||
        (
            Number(data.growth || 0) === 0 &&
            Number(data.avg_expense || 0) === 0 &&
            Number(data.revenue_change || 0) === 0 &&
            Number(data.cashflow_change || 0) === 0 &&
            Number(data.expense_change || 0) === 0 &&
            Number(data.profit_change || 0) === 0
        )
    ) {

        document.getElementById(
            "revenueGrowth"
        ).textContent = "0%";

        const revenueChange =
            document.getElementById("revenueChange");

        const cashflowChange =
            document.getElementById("cashflowChange");

        const expenseChange =
            document.getElementById("expenseChange");

        const profitChange =
            document.getElementById("profitChange");

        if (revenueChange)
            revenueChange.textContent = "Add transactions to view trends";

        if (cashflowChange)
            cashflowChange.textContent = "Add transactions to view trends";

        if (expenseChange)
            expenseChange.textContent = "Add transactions to view trends";

        if (profitChange)
            profitChange.textContent = "Add transactions to view trends";

        return;
    }

    document.getElementById(
        "revenueGrowth"
    ).textContent =
        `${data.growth}%`;

    document.getElementById(
        "avgExpense"
    ).textContent =
        `₹${(
            data.avg_expense / 100000
        ).toFixed(2)}L`;

    // Revenue

    const revenueChange =
        document.getElementById(
            "revenueChange"
        );

    if (revenueChange) {

        revenueChange.className =
            data.revenue_change >= 0
                ? "positive"
                : "negative";

        revenueChange.textContent =
            data.revenue_change !== undefined
                ? `${data.revenue_change}% this month`
                : "No data available";
    }

    // Cashflow

    const cashflowChange =
        document.getElementById(
            "cashflowChange"
        );

    if (cashflowChange) {

        cashflowChange.className =
            data.cashflow_change >= 0
                ? "positive"
                : "negative";

        cashflowChange.textContent =
            data.cashflow_change !== undefined
                ? `${data.cashflow_change}% this month`
                : "No data available";
    }

    // Expense

    const expenseChange =
        document.getElementById(
            "expenseChange"
        );

    if (expenseChange) {

        expenseChange.className =
            data.expense_change <= 80
                ? "positive"
                : "negative";

        expenseChange.textContent =
            data.expense_change !== undefined
                ? `${data.expense_change}% of revenue`
                : "No revenue data";
    }

    // Profit

    const profitChange =
        document.getElementById(
            "profitChange"
        );

    if (profitChange) {

        profitChange.className =
            data.profit_change >= 0
                ? "positive"
                : "negative";

        profitChange.textContent =
            data.profit_change !== undefined
                ? `${data.profit_change}% this month`
                : "No data available";
    }
}


async function loadTransactionSummary() {

    try {

        const response =
            await fetch(
                `${API}/transactions`
            );

        const transactions =
            await response.json();

        let income = 0;
        let expense = 0;

        transactions.forEach(t => {

            if (t.type === "income") {

                income += Number(
                    t.amount
                );

            } else {

                expense += Math.abs(
                    Number(t.amount)
                );
            }

        });

        const incomeEl =
            document.getElementById(
                "incomeTotal"
            );

        const expenseEl =
            document.getElementById(
                "expenseTotal"
            );

        const totalEl =
            document.getElementById(
                "transactionTotal"
            );

        if (incomeEl) {

            incomeEl.textContent =
                `₹${(
                    income / 100000
                ).toFixed(2)}L`;
        }

        if (expenseEl) {

            expenseEl.textContent =
                `₹${(
                    expense / 100000
                ).toFixed(2)}L`;
        }

        if (totalEl) {

            totalEl.textContent =
                transactions.length;
        }

    } catch (error) {

        console.error(
            "Failed to load transaction summary",
            error
        );
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
            await loadTransactionSummary();

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

    const uploadBtn =
        document.getElementById(
            "uploadCsvBtn"
        );

    if (!fileInput.files.length) {

        alert("Please select a CSV file");

        return;
    }

    const formData = new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    uploadBtn.disabled = true;

    uploadBtn.innerHTML =
        "⏳ Uploading...";

    showToast(
        "Importing transactions..."
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

        showToast(data.message);

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

        showToast(
            error.message,
            true
        );

    } finally {

        uploadBtn.disabled = false;

        uploadBtn.innerHTML =
            "Upload CSV";
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
            await loadTransactionSummary();

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


function toggleSelectAll(source) {

    const checkboxes =
        document.querySelectorAll(
            ".transaction-checkbox"
        );

    checkboxes.forEach(cb => {

        cb.checked = source.checked;

    });

    updateSelectedCount();
}

function updateSelectedCount() {

    const checked =
        document.querySelectorAll(
            ".transaction-checkbox:checked"
        ).length;

    const counter =
        document.getElementById(
            "selectedCount"
        );

    if (counter) {

        counter.textContent =
            `${checked} Selected`;
    }
}

async function deleteSelectedTransactions() {

    const selected = Array.from(
        document.querySelectorAll(
            ".transaction-checkbox:checked"
        )
    ).map(
        cb => Number(cb.value)
    );

    if (selected.length === 0) {

        alert(
            "Please select transactions"
        );

        return;
    }

    if (
        !confirm(
            `Delete ${selected.length} transaction(s)?`
        )
    ) {

        return;
    }

    try {

        const response =
            await fetch(
                `${API}/transactions/delete-multiple`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        ids: selected
                    })
                }
            );

        const data =
            await response.json();

        showToast(data.message);

        await loadTransactions();
        await loadTransactionSummary();

        if (
            document.getElementById(
                "revenue"
            )
        ) {

            await fetchDashboardData();
            await loadStats();
            await loadAnalytics();
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to delete transactions",
            true
        );
    }
}


async function loadSmartAlerts() {

    const alerts =
        document.getElementById(
            "smartAlerts"
        );

    if (!alerts) return;

    alerts.innerHTML = "";

    try {

        const fraudResponse =
            await fetch(
                `${API}/fraud/detect`
            );

        const fraud =
            await fraudResponse.json();

        const dashboardResponse =
            await fetch(
                `${API}/dashboard`
            );

        const dashboard =
            await dashboardResponse.json();

        let alertCount = 0;

        // Fraud Alert
        if (
            fraud.flagged_transactions > 0
        ) {

            alertCount++;

            alerts.innerHTML += `
                <li>
                    ⚠ ${fraud.flagged_transactions}
                    suspicious transaction(s) detected
                </li>
            `;
        }

        // Profit Margin Alert
        if (
            dashboard.profit_margin < 20
        ) {

            alertCount++;

            alerts.innerHTML += `
                <li>
                    📉 Profit margin is below 20%
                </li>
            `;
        }

        // Expense Alert
        if (
            dashboard.expenses >
            dashboard.total_revenue * 0.8
        ) {

            alertCount++;

            alerts.innerHTML += `
                <li>
                    💸 Expenses exceed 80% of revenue
                </li>
            `;
        }

        // Positive Alert
        if (
            dashboard.profit_margin >= 20
        ) {

            alerts.innerHTML += `
                <li>
                    📈 Healthy profit margin maintained
                </li>
            `;
        }

        // No Alerts
        if (alertCount === 0) {

            alerts.innerHTML += `
                <li>
                    ✅ No critical financial alerts
                </li>
            `;
        }

        const alertCounter =
            document.getElementById(
                "alertCount"
            );

        if (alertCounter) {

            alertCounter.textContent =
                alertCount;
        }

    } catch (error) {

        console.error(error);

        alerts.innerHTML = `
            <li>
                ❌ Failed to load alerts
            </li>
        `;
    }
}

async function loadExpenseBreakdown() {

    const response =
        await fetch(
            `${API}/expense-breakdown`
        );

    const data =
        await response.json();

    expensePieChart.data.labels =
        data.labels;

    expensePieChart.data.datasets[0].data =
        data.values;

    expensePieChart.update();
}


async function loadComplianceInsights() {

    try {

        const complianceResponse =
            await fetch(
                `${API}/compliance/check`
            );

        const compliance =
            await complianceResponse.json();

        const fraudResponse =
            await fetch(
                `${API}/fraud/detect`
            );

        const fraud =
            await fraudResponse.json();

        const score =
            fraud.flagged_transactions === 0
                ? 95
                : 80;

        const alerts =
            fraud.flagged_transactions;

        const complianceScore =
            document.getElementById(
                "complianceScore"
            );

        if (complianceScore) {

            complianceScore.textContent =
                `${score}%`;
        }

        const riskAlerts =
            document.getElementById(
                "riskAlerts"
            );

        if (riskAlerts) {

            riskAlerts.textContent =
                alerts;
        }

        const auditReadiness =
            document.getElementById(
                "auditReadiness"
            );

        if (auditReadiness) {

            auditReadiness.textContent =
                score > 90
                    ? "Ready"
                    : "Review";
        }

        const gstStatus =
            document.getElementById(
                "gstStatus"
            );

        if (gstStatus) {

            gstStatus.textContent =
                compliance.status;
        }

        const auditScore =
            document.getElementById(
                "auditScore"
            );

        if (auditScore) {

            auditScore.textContent =
                `${score}%`;
        }

        const summary =
            document.getElementById(
                "complianceSummary"
            );

        if (summary) {

            summary.innerHTML = "";

            summary.innerHTML += `
                <li>
                    GST Status:
                    ${compliance.status}
                </li>
            `;

            summary.innerHTML += `
                <li>
                    Fraud Alerts:
                    ${fraud.flagged_transactions}
                </li>
            `;

            summary.innerHTML += `
                <li>
                    Audit Readiness:
                    ${score > 90 ? "Ready" : "Review"}
                </li>
            `;

            summary.innerHTML += `
                <li>
                    Compliance Score:
                    ${score}%
                </li>
            `;
        }

    } catch (error) {

        console.error(error);
    }
}

function askQuickQuestion(question) {

    const input =
        document.getElementById(
            "chat-input"
        );

    input.value = question;

    sendMessage();
}

function clearChat() {

    if (
        !confirm(
            "Clear entire chat history?"
        )
    ) {
        return;
    }

    const chat =
        document.getElementById(
            "chat-messages"
        );

    if (!chat) return;

    chat.innerHTML = "";

    localStorage.removeItem(
        "chatHistory"
    );

    addMessage(
        "Hello! I'm your AI CFO Assistant. How can I help you today?",
        "bot"
    );
}


async function loadAssistantStats() {

    const response =
        await fetch(
            `${API}/dashboard`
        );

    const data =
        await response.json();

    document.getElementById(
        "assistantRevenue"
    ).textContent =
        `₹${(data.total_revenue / 10000000).toFixed(2)} Cr`;

    document.getElementById(
        "assistantExpenses"
    ).textContent =
        `₹${(data.expenses / 10000000).toFixed(2)} Cr`;

    document.getElementById(
        "assistantProfit"
    ).textContent =
        `${data.profit_margin}%`;
}

async function loadGSTData() {

    try {

        const response =
            await fetch(
                `${API}/gst/summary`
            );

        const data =
            await response.json();

        document.getElementById(
            "gstCollected"
        ).textContent =
            `₹${(
                data.gst_collected /
                100000
            ).toFixed(2)}L`;

        document.getElementById(
            "gstPayable"
        ).textContent =
            `₹${(
                data.gst_payable /
                100000
            ).toFixed(2)}L`;

        document.getElementById(
            "invoiceCount"
        ).textContent =
            data.invoice_count;

        document.getElementById(
            "gstStatus"
        ).textContent =
            data.status;

        document.getElementById(
            "auditReadiness"
        ).textContent =
            data.audit_readiness;

        document.getElementById(
            "gstComplianceScore"
        ).textContent =
            `${data.compliance_score}%`;

        const tbody =
            document.getElementById(
                "gstTableBody"
            );

        if (tbody) {

            tbody.innerHTML = `
                <tr>

                    <td>
                        ₹${(
                    data.revenue /
                    100000
                ).toFixed(2)}L
                    </td>

                    <td>
                        ₹${(
                    data.gst_collected /
                    100000
                ).toFixed(2)}L
                    </td>

                    <td>
                        ₹${(
                    data.gst_payable /
                    100000
                ).toFixed(2)}L
                    </td>

                </tr>
            `;
        }

        const alerts =
            document.getElementById(
                "gstAlerts"
            );

        if (alerts) {

            alerts.innerHTML = `
                <li>
                    ✅ GST Status Healthy
                </li>

                <li>
                    📄 ${data.invoice_count}
                    invoices processed
                </li>

                <li>
                    ⚠ GST Filing Due In 7 Days
                </li>
            `;
        }

    } catch (error) {

        console.error(
            "GST Error",
            error
        );
    }
}

async function loadReports() {

    const response =
        await fetch(
            `${API}/reports/summary`
        );

    const data =
        await response.json();

    document.getElementById(
        "reportRevenue"
    ).textContent =
        `₹${(
            data.revenue / 10000000
        ).toFixed(2)} Cr`;

    document.getElementById(
        "reportExpenses"
    ).textContent =
        `₹${(
            data.expenses / 10000000
        ).toFixed(2)} Cr`;

    document.getElementById(
        "reportProfit"
    ).textContent =
        `${data.profit_margin}%`;

    const health =
        document.getElementById(
            "healthScore"
        );

    if (health) {

        health.textContent =
            data.revenue === 0 &&
                data.expenses === 0
                ? "N/A"
                : `${data.health_score}%`;
    }

    document.getElementById(
        "reportFraud"
    ).textContent =
        data.fraud_status;

    document.getElementById(
        "reportCompliance"
    ).textContent =
        data.compliance_status;

    document.getElementById(
        "reportGST"
    ).textContent =
        data.gst_status;

    document.getElementById(
        "reportTable"
    ).innerHTML = `
        <tr>

            <td>
                Revenue
            </td>

            <td>
                ₹${(
            data.revenue /
            10000000
        ).toFixed(2)} Cr
            </td>

        </tr>

        <tr>

            <td>
                Expenses
            </td>

            <td>
                ₹${(
            data.expenses /
            10000000
        ).toFixed(2)} Cr
            </td>

        </tr>

        <tr>

            <td>
                Profit Margin
            </td>

            <td>
                ${data.profit_margin}%
            </td>

        </tr>

        <tr>

            <td>
                GST Collected
            </td>

            <td>
                ₹${(
            data.gst_collected /
            100000
        ).toFixed(2)}L
            </td>

        </tr>
    `;
}

async function downloadReport() {

    try {

        const response =
            await fetch(
                `${API}/reports/summary`
            );

        const data =
            await response.json();

        const report = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI CFO Financial Report</title>

    <style>

        body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #333;
        }

        h1 {
            color: #2563eb;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }

        th {
            background: #f5f5f5;
        }

    </style>

</head>

<body>

    <h1>🤖 AI CFO Financial Report</h1>

    <p>
        Generated:
        ${new Date().toLocaleString()}
    </p>

    <table>

        <tr>
            <th>Metric</th>
            <th>Value</th>
        </tr>

        <tr>
            <td>Revenue</td>
            <td>₹${(data.revenue / 10000000).toFixed(2)} Cr</td>
        </tr>

        <tr>
            <td>Expenses</td>
            <td>₹${(data.expenses / 10000000).toFixed(2)} Cr</td>
        </tr>

        <tr>
            <td>Profit Margin</td>
            <td>${data.profit_margin}%</td>
        </tr>

        <tr>
            <td>Cash Flow</td>
            <td>₹${(data.cash_flow / 10000000).toFixed(2)} Cr</td>
        </tr>

        <tr>
            <td>Fraud Status</td>
            <td>${data.fraud_status}</td>
        </tr>

        <tr>
            <td>Compliance Status</td>
            <td>${data.compliance_status}</td>
        </tr>

        <tr>
            <td>GST Status</td>
            <td>${data.gst_status}</td>
        </tr>

        <tr>
            <td>Health Score</td>
            <td>${data.health_score}%</td>
        </tr>

    </table>

    <br>

    <h3>AI CFO Summary</h3>

    <p>
        Revenue stands at
        ₹${(data.revenue / 10000000).toFixed(2)} Cr
        with a profit margin of
        ${data.profit_margin}%.
        Current fraud status is
        ${data.fraud_status}
        and compliance status is
        ${data.compliance_status}.
    </p>

</body>
</html>
`;

        const blob =
            new Blob(
                [report],
                {
                    type: "text/html"
                }
            );

        const link =
            document.createElement("a");

        link.href =
            URL.createObjectURL(blob);

        link.download =
            "AI_CFO_Report.html";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(link.href);

        showToast(
            "Report downloaded successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to download report",
            true
        );
    }
}

async function refreshReports() {

    const btn =
        event.currentTarget;

    const originalText =
        btn.innerHTML;

    btn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    btn.disabled = true;

    try {

        await loadReports();

        showToast(
            "Report data refreshed successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to refresh report data",
            true
        );

    } finally {

        btn.innerHTML =
            originalText;

        btn.disabled = false;
    }
}


async function exportTransactionsCSV() {

    try {

        const response =
            await fetch(
                `${API}/transactions`
            );

        const transactions =
            await response.json();

        let csv =
            "Date,Category,Description,Type,Amount\n";

        transactions.forEach(t => {

            csv +=
                `${t.date},${t.category},"${t.description}",${t.type},${t.amount}\n`;
        });

        const blob =
            new Blob(
                [csv],
                {
                    type: "text/csv"
                }
            );

        const link =
            document.createElement("a");

        link.href =
            URL.createObjectURL(blob);

        link.download =
            "transactions_export.csv";

        link.click();

        showToast(
            "Transactions exported"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Export failed",
            true
        );
    }
}