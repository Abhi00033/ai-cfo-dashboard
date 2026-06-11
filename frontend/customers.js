let editingCustomerId = null;


async function refreshCustomers() {

    await loadCustomers();

    showToast(
        "Customers refreshed successfully"
    );
}

async function loadCustomers() {

    try {

        const response = await fetch(
            `${API}/customers`
        );

        const customers = await response.json();

        const tbody =
            document.getElementById(
                "customersBody"
            );

        if (!tbody) return;

        tbody.innerHTML = "";

        customers.forEach((customer, index) => {

            tbody.innerHTML += `
                <tr>

                    <td>${index + 1}</td>

                    <td>${customer.name}</td>

                    <td>${customer.email || "-"}</td>

                    <td>${customer.phone || "-"}</td>

                    <td>${customer.gstin || "-"}</td>

                    <td>

                        <button
                            class="btn btn-sm btn-primary me-1"
                            onclick="editCustomer(${customer.id})"
                        >
                            Edit
                        </button>

                        <button
                            class="btn btn-sm btn-danger"
                            onclick="deleteCustomer(${customer.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        });
        // Stats

        const customerTotal =
            document.getElementById(
                "customerTotal"
            );

        const emailTotal =
            document.getElementById(
                "emailTotal"
            );

        const gstTotal =
            document.getElementById(
                "gstTotal"
            );

        if (customerTotal) {
            customerTotal.innerText =
                customers.length;
        }

        if (emailTotal) {
            emailTotal.innerText =
                customers.filter(
                    c => c.email
                ).length;
        }

        if (gstTotal) {
            gstTotal.innerText =
                customers.filter(
                    c => c.gstin
                ).length;
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load customers",
            true
        );
    }
}

async function editCustomer(id) {

    try {

        const response =
            await fetch(
                `${API}/customers/${id}`
            );

        if (!response.ok) {

            throw new Error(
                "Failed to fetch customer"
            );
        }

        const customer =
            await response.json();

        editingCustomerId = id;

        document.getElementById(
            "customerName"
        ).value =
            customer.name || "";

        document.getElementById(
            "customerEmail"
        ).value =
            customer.email || "";

        document.getElementById(
            "customerPhone"
        ).value =
            customer.phone || "";

        document.getElementById(
            "customerGSTIN"
        ).value =
            customer.gstin || "";

        document.querySelector(
            "#customerModal .modal-title"
        ).innerText =
            "Edit Customer";

        openCustomerModal();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load customer",
            true
        );
    }
}

function openCustomerModal() {

    if (!editingCustomerId) {

        document.getElementById(
            "customerName"
        ).value = "";

        document.getElementById(
            "customerEmail"
        ).value = "";

        document.getElementById(
            "customerPhone"
        ).value = "";

        document.getElementById(
            "customerGSTIN"
        ).value = "";

        document.querySelector(
            "#customerModal .modal-title"
        ).innerText =
            "Add Customer";
    }

    const modal = new bootstrap.Modal(
        document.getElementById(
            "customerModal"
        )
    );

    modal.show();
}


function closeCustomerModal() {

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById(
                "customerModal"
            )
        );

    if (modal) {
        modal.hide();
    }

    editingCustomerId = null;

    document.querySelector(
        "#customerModal .modal-title"
    ).innerText =
        "Add Customer";
}


async function saveCustomer() {

    const payload = {

        name:
            document.getElementById(
                "customerName"
            ).value.trim(),

        email:
            document.getElementById(
                "customerEmail"
            ).value.trim(),

        phone:
            document.getElementById(
                "customerPhone"
            ).value.trim(),

        gstin:
            document.getElementById(
                "customerGSTIN"
            ).value.trim()
    };

    if (!payload.name) {

        showToast(
            "Customer name is required",
            true
        );

        return;
    }

    try {

        const url = editingCustomerId
            ? `${API}/customers/${editingCustomerId}`
            : `${API}/customers`;

        const method = editingCustomerId
            ? "PUT"
            : "POST";

        const response = await fetch(
            url,
            {
                method,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(
                    payload
                )
            }
        );

        if (!response.ok) {

            throw new Error(
                "Failed to save customer"
            );
        }

        document.getElementById(
            "customerName"
        ).value = "";

        document.getElementById(
            "customerEmail"
        ).value = "";

        document.getElementById(
            "customerPhone"
        ).value = "";

        document.getElementById(
            "customerGSTIN"
        ).value = "";

        const isEdit =
            editingCustomerId !== null;

        editingCustomerId = null;

        closeCustomerModal();

        await loadCustomers();

        showToast(
            isEdit
                ? "Customer updated successfully"
                : "Customer added successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to save customer",
            true
        );
    }
}


async function deleteCustomer(id) {

    if (
        !confirm(
            "Delete customer?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/customers/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );
        }

        await loadCustomers();

        showToast(
            "Customer deleted successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to delete customer",
            true
        );
    }
}

window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTeamInfo();

        loadWeather();

        setupChat();

        loadCustomers();
    }
);

document
    .getElementById("customerModal")
    .addEventListener(
        "hidden.bs.modal",
        () => {

            editingCustomerId = null;

            document.querySelector(
                "#customerModal .modal-title"
            ).innerText =
                "Add Customer";
        }
    );