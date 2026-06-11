let editingInvoiceId = null;

async function refreshInvoices() {

    await loadInvoices();

    showToast(
        "Invoices refreshed successfully"
    );
}

async function loadCustomersDropdown() {

    try {

        const response = await fetch(
            `${API}/customers`
        );

        const customers =
            await response.json();

        const select =
            document.getElementById(
                "customerId"
            );

        if (!select) return;

        select.innerHTML =
            `<option value="">
                Select Customer
            </option>`;

        customers.forEach(customer => {

            select.innerHTML += `
                <option value="${customer.id}">
                    ${customer.name}
                </option>
            `;
        });

    } catch (error) {

        console.error(error);
    }
}

function calculateInvoiceTotals() {

    const subtotal =
        parseFloat(
            document.getElementById(
                "subtotal"
            ).value
        ) || 0;

    const gstRate =
        parseFloat(
            document.getElementById(
                "gstRate"
            ).value
        ) || 0;

    const gstAmount =
        (subtotal * gstRate) / 100;

    const totalAmount =
        subtotal + gstAmount;

    document.getElementById(
        "gstAmount"
    ).value =
        gstAmount.toFixed(2);

    document.getElementById(
        "totalAmount"
    ).value =
        totalAmount.toFixed(2);
}

async function loadInvoices() {

    try {

        const response =
            await fetch(
                `${API}/invoices`
            );

        const invoices =
            await response.json();

        const customersResponse =
            await fetch(
                `${API}/customers`
            );

        const customers =
            await customersResponse.json();

        const customerMap = {};

        customers.forEach(c => {

            customerMap[c.id] =
                c.name;
        });

        const tbody =
            document.getElementById(
                "invoicesBody"
            );

        if (!tbody) return;

        tbody.innerHTML = "";

        let revenue = 0;
        let paid = 0;
        let pending = 0;

        invoices.forEach(
            (invoice, index) => {

                revenue +=
                    invoice.total_amount || 0;

                if (
                    invoice.status === "Paid"
                ) {
                    paid++;
                } else {
                    pending++;
                }

                tbody.innerHTML += `
                    <tr>

                        <td>${index + 1}</td>

                        <td>
                            ${invoice.invoice_number}
                        </td>

                        <td>
                            ${customerMap[invoice.customer_id] || "-"}
                        </td>

                        <td>
                            ${invoice.invoice_date?.split("T")[0] || "-"}
                        </td>

                        <td>
                            ${invoice.due_date?.split("T")[0] || "-"}
                        </td>

                        <td>
                            ₹${invoice.subtotal}
                        </td>

                        <td>
                            ₹${invoice.gst_amount}
                        </td>

                        <td>
                            ₹${invoice.total_amount}
                        </td>

                        <td>
                            ${invoice.status}
                        </td>

                        <td>

                            <button
                                class="btn btn-sm btn-primary me-1"
                                onclick="editInvoice(${invoice.id})">

                                Edit

                            </button>

                            <button
                                class="btn btn-sm btn-danger"
                                onclick="deleteInvoice(${invoice.id})">

                                Delete

                            </button>

                        </td>

                    </tr>
                `;
            }
        );

        document.getElementById(
            "invoiceTotal"
        ).innerText =
            invoices.length;

        document.getElementById(
            "revenueTotal"
        ).innerText =
            `₹${revenue.toLocaleString()}`;

        document.getElementById(
            "paidTotal"
        ).innerText =
            paid;

        document.getElementById(
            "pendingTotal"
        ).innerText =
            pending;

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load invoices",
            true
        );
    }
}

function openInvoiceModal() {

    if (!editingInvoiceId) {

        document.getElementById(
            "invoiceNumber"
        ).value = "";

        document.getElementById(
            "customerId"
        ).value = "";

        document.getElementById(
            "invoiceDate"
        ).value = "";

        document.getElementById(
            "dueDate"
        ).value = "";

        document.getElementById(
            "subtotal"
        ).value = "";

        document.getElementById(
            "gstRate"
        ).value = "18";

        document.getElementById(
            "gstAmount"
        ).value = "";

        document.getElementById(
            "totalAmount"
        ).value = "";

        document.getElementById(
            "invoiceStatus"
        ).value = "Draft";

        document.querySelector(
            "#invoiceModal .modal-title"
        ).innerText =
            "Add Invoice";

        document.getElementById(
            "saveInvoiceBtn"
        ).innerText =
            "Save Invoice";
    }

    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "invoiceModal"
            )
        );

    modal.show();
}

function closeInvoiceModal() {

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById(
                "invoiceModal"
            )
        );

    if (modal) {
        modal.hide();
    }

    editingInvoiceId = null;
}

async function saveInvoice() {

    const saveBtn =
        document.getElementById(
            "saveInvoiceBtn"
        );

    if (saveBtn.disabled) {
        return;
    }

    const payload = {

        invoice_number:
            document.getElementById(
                "invoiceNumber"
            ).value.trim(),

        customer_id:
            parseInt(
                document.getElementById(
                    "customerId"
                ).value
            ),

        invoice_date:
            document.getElementById(
                "invoiceDate"
            ).value,

        due_date:
            document.getElementById(
                "dueDate"
            ).value,

        subtotal:
            parseFloat(
                document.getElementById(
                    "subtotal"
                ).value
            ),

        gst_rate:
            parseFloat(
                document.getElementById(
                    "gstRate"
                ).value
            ),

        status:
            document.getElementById(
                "invoiceStatus"
            ).value
    };

    if (
        !payload.invoice_number ||
        !payload.customer_id
    ) {

        showToast(
            "Please fill all required fields",
            true
        );

        return;
    }

    const isEdit =
        editingInvoiceId !== null;

    try {

        saveBtn.disabled = true;

        saveBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            ${isEdit ? "Updating..." : "Saving..."}
        `;

        const response =
            await fetch(

                isEdit
                    ? `${API}/invoices/${editingInvoiceId}`
                    : `${API}/invoices`,

                {
                    method:
                        isEdit
                            ? "PUT"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        if (!response.ok) {

            throw new Error(
                "Failed to save invoice"
            );
        }

        closeInvoiceModal();

        await loadInvoices();

        showToast(
            isEdit
                ? "Invoice updated successfully"
                : "Invoice created successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to save invoice",
            true
        );

    } finally {

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            editingInvoiceId
                ? "Update Invoice"
                : "Save Invoice";
    }
}

async function editInvoice(id) {

    try {

        const response =
            await fetch(
                `${API}/invoices/${id}`
            );

        const invoice =
            await response.json();

        editingInvoiceId = id;

        document.getElementById(
            "invoiceNumber"
        ).value =
            invoice.invoice_number;

        document.getElementById(
            "customerId"
        ).value =
            invoice.customer_id;

        document.getElementById(
            "invoiceDate"
        ).value =
            invoice.invoice_date.split("T")[0];

        document.getElementById(
            "dueDate"
        ).value =
            invoice.due_date.split("T")[0];

        document.getElementById(
            "subtotal"
        ).value =
            invoice.subtotal;

        document.getElementById(
            "gstRate"
        ).value =
            invoice.gst_rate;

        document.getElementById(
            "invoiceStatus"
        ).value =
            invoice.status;

        calculateInvoiceTotals();

        document.querySelector(
            "#invoiceModal .modal-title"
        ).innerText =
            "Edit Invoice";

        document.getElementById(
            "saveInvoiceBtn"
        ).innerText =
            "Update Invoice";

        openInvoiceModal();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load invoice",
            true
        );
    }
}

async function deleteInvoice(id) {

    if (
        !confirm(
            "Delete invoice?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/invoices/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );
        }

        await loadInvoices();

        showToast(
            "Invoice deleted successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to delete invoice",
            true
        );
    }
}

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        loadTeamInfo();

        loadWeather();

        setupChat();

        await loadCustomersDropdown();

        await loadInvoices();
    }
);

document
    .getElementById(
        "invoiceModal"
    )
    ?.addEventListener(
        "hidden.bs.modal",
        () => {

            editingInvoiceId = null;

            document.querySelector(
                "#invoiceModal .modal-title"
            ).innerText =
                "Add Invoice";

            document.getElementById(
                "saveInvoiceBtn"
            ).innerText =
                "Save Invoice";
        }
    );