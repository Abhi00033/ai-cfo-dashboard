let editingVendorId = null;
let isSavingVendor = false;

async function refreshVendors() {

    const btn =
        document.getElementById(
            "refreshBtn"
        );

    if (btn) {

        btn.disabled = true;

        btn.innerHTML =
            "⏳ Refreshing...";
    }

    try {

        await loadVendors();

        showToast(
            "Vendors refreshed successfully"
        );

        if (btn) {

            btn.innerHTML =
                "✅ Refreshed";
        }

    } catch (error) {

        console.error(error);

        if (btn) {

            btn.innerHTML =
                "❌ Failed";
        }

    } finally {

        setTimeout(() => {

            if (btn) {

                btn.innerHTML =
                    "🔄 Refresh";

                btn.disabled = false;
            }

        }, 1500);
    }
}

async function loadVendors() {

    const tbody =
        document.getElementById(
            "vendorsBody"
        );

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                Loading vendors...
            </td>
        </tr>
    `;

    try {

        const response =
            await fetch(
                `${API}/vendors`
            );

        if (!response.ok) {

            throw new Error(
                "Failed to load vendors"
            );
        }

        const vendors =
            await response.json();

        if (!vendors.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        No vendors found
                    </td>
                </tr>
            `;
        } else {

            tbody.innerHTML = "";

            vendors.forEach(
                (vendor, index) => {

                    tbody.innerHTML += `
                        <tr>

                            <td>${index + 1}</td>

                            <td>${vendor.name}</td>

                            <td>${vendor.email || "-"}</td>

                            <td>${vendor.phone || "-"}</td>

                            <td>${vendor.gstin || "-"}</td>

                            <td>

                                <button
                                    class="btn btn-sm btn-primary me-1"
                                    onclick="editVendor(${vendor.id})"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn btn-sm btn-danger"
                                    onclick="deleteVendor(${vendor.id})"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>
                    `;
                }
            );
        }

        const vendorTotal =
            document.getElementById(
                "vendorTotal"
            );

        const emailTotal =
            document.getElementById(
                "emailTotal"
            );

        const gstTotal =
            document.getElementById(
                "gstTotal"
            );

        if (vendorTotal) {

            vendorTotal.innerText =
                vendors.length;
        }

        if (emailTotal) {

            emailTotal.innerText =
                vendors.filter(
                    v => v.email
                ).length;
        }

        if (gstTotal) {

            gstTotal.innerText =
                vendors.filter(
                    v => v.gstin
                ).length;
        }

    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    Failed to load vendors
                </td>
            </tr>
        `;

        showToast(
            "Failed to load vendors",
            true
        );
    }
}

function openVendorModal() {

    if (!editingVendorId) {

        document.getElementById(
            "vendorName"
        ).value = "";

        document.getElementById(
            "vendorEmail"
        ).value = "";

        document.getElementById(
            "vendorPhone"
        ).value = "";

        document.getElementById(
            "vendorGSTIN"
        ).value = "";

        document.querySelector(
            "#vendorModal .modal-title"
        ).innerText =
            "Add Vendor";

        document.getElementById(
            "saveVendorBtn"
        ).innerText =
            "Save Vendor";
    }

    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "vendorModal"
            )
        );

    modal.show();
}

function closeVendorModal() {

    const modal =
        bootstrap.Modal.getInstance(
            document.getElementById(
                "vendorModal"
            )
        );

    if (modal) {

        modal.hide();
    }

    editingVendorId = null;
}

async function saveVendor() {

    if (isSavingVendor) {
        return;
    }

    const payload = {

        name:
            document.getElementById(
                "vendorName"
            ).value.trim(),

        email:
            document.getElementById(
                "vendorEmail"
            ).value.trim(),

        phone:
            document.getElementById(
                "vendorPhone"
            ).value.trim(),

        gstin:
            document.getElementById(
                "vendorGSTIN"
            ).value.trim()
    };

    if (
        payload.phone &&
        payload.phone.length !== 10
    ) {

        showToast(
            "Phone number must be 10 digits",
            true
        );

        return;
    }

    if (!payload.name) {

        showToast(
            "Vendor name is required",
            true
        );

        return;
    }

    const saveBtn =
        document.getElementById(
            "saveVendorBtn"
        );

    const isEdit =
        editingVendorId !== null;

    try {

        isSavingVendor = true;

        saveBtn.disabled = true;

        saveBtn.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-2"
                role="status">
            </span>
            Saving...
        `;

        const response =
            await fetch(

                isEdit
                    ? `${API}/vendors/${editingVendorId}`
                    : `${API}/vendors`,

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
                "Failed to save vendor"
            );
        }

        closeVendorModal();

        await loadVendors();

        showToast(

            isEdit
                ? "Vendor updated successfully"
                : "Vendor added successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to save vendor",
            true
        );

    } finally {

        isSavingVendor = false;

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            isEdit
                ? "Update Vendor"
                : "Save Vendor";
    }
}

async function editVendor(id) {

    try {

        const response =
            await fetch(
                `${API}/vendors/${id}`
            );

        if (!response.ok) {

            throw new Error(
                "Vendor not found"
            );
        }

        const vendor =
            await response.json();

        editingVendorId = id;

        document.getElementById(
            "vendorName"
        ).value =
            vendor.name || "";

        document.getElementById(
            "vendorEmail"
        ).value =
            vendor.email || "";

        document.getElementById(
            "vendorPhone"
        ).value =
            vendor.phone || "";

        document.getElementById(
            "vendorGSTIN"
        ).value =
            vendor.gstin || "";

        document.querySelector(
            "#vendorModal .modal-title"
        ).innerText =
            "Edit Vendor";

        document.getElementById(
            "saveVendorBtn"
        ).innerText =
            "Update Vendor";

        openVendorModal();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load vendor",
            true
        );
    }
}

async function deleteVendor(id) {

    if (
        !confirm(
            "Delete vendor?"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API}/vendors/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );
        }

        await loadVendors();

        showToast(
            "Vendor deleted successfully"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to delete vendor",
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

        loadVendors();

        [
            "vendorName",
            "vendorEmail",
            "vendorPhone",
            "vendorGSTIN"
        ].forEach(id => {

            document
                .getElementById(id)
                ?.addEventListener(
                    "keypress",
                    e => {

                        if (
                            e.key === "Enter"
                        ) {

                            saveVendor();
                        }
                    }
                );
        });
    }
);

document
    .getElementById(
        "vendorModal"
    )
    ?.addEventListener(
        "hidden.bs.modal",
        () => {

            editingVendorId = null;

            document.getElementById(
                "vendorName"
            ).value = "";

            document.getElementById(
                "vendorEmail"
            ).value = "";

            document.getElementById(
                "vendorPhone"
            ).value = "";

            document.getElementById(
                "vendorGSTIN"
            ).value = "";

            document.querySelector(
                "#vendorModal .modal-title"
            ).innerText =
                "Add Vendor";

            document.getElementById(
                "saveVendorBtn"
            ).innerText =
                "Save Vendor";
        }
    );