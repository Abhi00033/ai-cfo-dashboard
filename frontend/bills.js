let editingBillId = null;

async function refreshBills() {

    await loadBills();

    showToast(
        "Bills refreshed successfully"
    );
}

async function loadVendorsDropdown() {

    try {

        const response = await fetch(
            `${API}/vendors`
        );

        const vendors =
            await response.json();

        const select =
            document.getElementById(
                "vendorId"
            );

        if (!select) return;

        select.innerHTML = `
            <option value="">
                Select Vendor
            </option>
        `;

        vendors.forEach(vendor => {

            select.innerHTML += `
                <option value="${vendor.id}">
                    ${vendor.name}
                </option>
            `;
        });

    } catch (error) {

        console.error(error);
    }
}

function calculateBillTotals() {

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

async function loadBills() {

    try {

        const response =
            await fetch(
                `${API}/bills`
            );

        const bills =
            await response.json();

        const vendorsResponse =
            await fetch(
                `${API}/vendors`
            );

        const vendors =
            await vendorsResponse.json();

        const vendorMap = {};

        vendors.forEach(vendor => {

            vendorMap[
                vendor.id
            ] = vendor.name;
        });

        const tbody =
            document.getElementById(
                "billsBody"
            );

        if (!tbody) return;

        tbody.innerHTML = "";

        let totalExpense = 0;
        let pendingCount = 0;
        let paidCount = 0;

        bills.forEach(
            (bill, index) => {

                totalExpense +=
                    bill.total_amount || 0;

                if (
                    bill.status ===
                    "Pending"
                ) {
                    pendingCount++;
                }

                if (
                    bill.status ===
                    "Paid"
                ) {
                    paidCount++;
                }

                tbody.innerHTML += `
                    <tr>

                        <td>${index + 1}</td>

                        <td>${bill.bill_number}</td>

                        <td>
                            ${vendorMap[bill.vendor_id] || "-"}
                        </td>

                        <td>
                            ${bill.bill_date
                        ?.split("T")[0] || "-"}
                        </td>

                        <td>
                            ${bill.due_date
                        ?.split("T")[0] || "-"}
                        </td>

                        <td>
                            ₹${bill.subtotal}
                        </td>

                        <td>
                            ₹${bill.gst_amount}
                        </td>

                        <td>
                            ₹${bill.total_amount}
                        </td>

                        <td>
                            ${bill.status}
                        </td>

                        <td>

                            <button
                                class="btn btn-sm btn-primary me-1"
                                onclick="editBill(${bill.id})">

                                Edit

                            </button>

                            <button
                                class="btn btn-sm btn-danger"
                                onclick="deleteBill(${bill.id})">

                                Delete

                            </button>

                        </td>

                    </tr>
                `;
            }
        );

        document.getElementById(
            "billTotal"
        ).innerText =
            bills.length;

        document.getElementById(
            "expenseTotal"
        ).innerText =
            `₹${totalExpense.toFixed(2)}`;

        document.getElementById(
            "pendingTotal"
        ).innerText =
            pendingCount;

        document.getElementById(
            "paidTotal"
        ).innerText =
            paidCount;

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load bills",
            true
        );
    }
}

function openBillModal() {

    if (!editingBillId) {

        document.getElementById(
            "billNumber"
        ).value = "";

        document.getElementById(
            "vendorId"
        ).value = "";

        document.getElementById(
            "billDate"
        ).value = "";

        document.getElementById(
            "dueDate"
        ).value = "";

        document.getElementById(
            "subtotal"
        ).value = "";

        document.getElementById(
            "gstRate"
        ).value = 18;

        document.getElementById(
            "gstAmount"
        ).value = "";

        document.getElementById(
            "totalAmount"
        ).value = "";

        document.getElementById(
            "billStatus"
        ).value = "Pending";

        document.querySelector(
            "#billModal .modal-title"
        ).innerText =
            "Add Bill";

        document.getElementById(
            "saveBillBtn"
        ).innerText =
            "Save Bill";
    }

    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "billModal"
            )
        );

    modal.show();
}

function closeBillModal() {

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById(
                "billModal"
            )
        );

    if (modal) {
        modal.hide();
    }

    editingBillId = null;
}

async function saveBill() {

    const saveBtn =
        document.getElementById(
            "saveBillBtn"
        );

    if (saveBtn.disabled) {
        return;
    }

    const payload = {

        bill_number:
            document.getElementById(
                "billNumber"
            ).value.trim(),

        vendor_id:
            parseInt(
                document.getElementById(
                    "vendorId"
                ).value
            ),

        bill_date:
            document.getElementById(
                "billDate"
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
                "billStatus"
            ).value
    };

    if (
        !payload.bill_number ||
        !payload.vendor_id
    ) {

        showToast(
            "Bill Number and Vendor are required",
            true
        );

        return;
    }

    const isEdit =
        editingBillId !== null;

    try {

        saveBtn.disabled = true;

        saveBtn.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-2">
            </span>
            ${isEdit ? "Updating..." : "Saving..."}
        `;

        const response =
            await fetch(

                isEdit
                    ? `${API}/bills/${editingBillId}`
                    : `${API}/bills`,

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
                "Failed to save bill"
            );
        }

        closeBillModal();

        await loadBills();

        showToast(
            isEdit
                ? "Bill updated successfully"
                : "Bill added successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to save bill",
            true
        );

    } finally {

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            editingBillId
                ? "Update Bill"
                : "Save Bill";
    }
}

async function editBill(id) {

    try {

        const response =
            await fetch(
                `${API}/bills/${id}`
            );

        const bill =
            await response.json();

        editingBillId = id;

        document.getElementById(
            "billNumber"
        ).value =
            bill.bill_number;

        document.getElementById(
            "vendorId"
        ).value =
            bill.vendor_id;

        document.getElementById(
            "billDate"
        ).value =
            bill.bill_date.split("T")[0];

        document.getElementById(
            "dueDate"
        ).value =
            bill.due_date.split("T")[0];

        document.getElementById(
            "subtotal"
        ).value =
            bill.subtotal;

        document.getElementById(
            "gstRate"
        ).value =
            bill.gst_rate;

        document.getElementById(
            "billStatus"
        ).value =
            bill.status;

        calculateBillTotals();

        document.querySelector(
            "#billModal .modal-title"
        ).innerText =
            "Edit Bill";

        document.getElementById(
            "saveBillBtn"
        ).innerText =
            "Update Bill";

        openBillModal();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load bill",
            true
        );
    }
}

async function deleteBill(id) {

    if (
        !confirm(
            "Delete bill?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/bills/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );
        }

        await loadBills();

        showToast(
            "Bill deleted successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to delete bill",
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

        await loadVendorsDropdown();

        await loadBills();
    }
);

document
    .getElementById(
        "billModal"
    )
    ?.addEventListener(
        "hidden.bs.modal",
        () => {

            editingBillId = null;

            document.querySelector(
                "#billModal .modal-title"
            ).innerText =
                "Add Bill";

            document.getElementById(
                "saveBillBtn"
            ).innerText =
                "Save Bill";
        }
    );