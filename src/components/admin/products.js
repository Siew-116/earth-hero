import { showProductDetails } from "./utils/productDetails.js";
import { showDeleteConfirmation } from "./utils/deleteOverlay.js";
import { showAddProductOverlay } from "./utils/addProduct.js";
import { showEditProductOverlay } from "./utils/editProduct.js";
import { fetchProducts } from "./utils/productService.js";

export async function products(container) {
    container.innerHTML = `
        <div class="products-management">
            <h2 class="section-title">Products Management</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <span>Total Products</span>
                    <h3 id="stat-total-products">...</h3>
                </div>
                <div class="stat-card">
                    <span>Total Sellers</span>
                    <h3 id="stat-total-sellers">...</h3>
                </div>
            </div>

            <div class="table-container">
                <div class="table-controls">
                    <div class="control-left">
                        <h3 class="list-title">Product List</h3>
                        <div class="search-bar">
                            <input type="text" id="product-search" placeholder="Search Products">
                        </div>
                    </div>
                    <div class="control-right">
                        <button class="btn-add">+ Add Products</button>
                        <button class="btn-refresh" id="refresh-table">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                        <span class="result-count" id="result-count">0 results</span>
                    </div>
                </div>

                <div class="table-scroll-area">
                    <table id="products-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="master-checkbox"></th>
                                <th>No</th>
                                <th>Product ID</th>
                                <th>Image</th> 
                                <th>Product</th>
                                <th>Category</th>
                                <th>Seller</th>
                                <th>Stock</th>
                                <th>Sales</th>
                                <th>View More</th>
                            </tr>
                        </thead>
                        <tbody id="products-body"></tbody>
                    </table>
                </div>

                <div id="selection-summary" class="selection-footer hidden">
                    <span id="selected-count">0</span> selected
                    <button id="btn-bulk-delete" class="btn-delete-all-pill">
                        <i class="fa-regular fa-trash-can"></i> Delete
                    </button>
                </div>
            </div>
        </div>

        <div id="action-overlay" class="action-overlay hidden">
            <div class="overlay-item" data-action="view"><i class="fa-regular fa-eye"></i> View details</div>
            <div class="overlay-item" data-action="edit"><i class="fa-regular fa-pen-to-square"></i> Edit</div>
            <div class="overlay-item" data-action="delete"><i class="fa-regular fa-trash-can"></i> Delete</div>
        </div>
    `;

    let allProducts = [];
    let searchTimer;

    async function loadProducts() {
        try {
            allProducts = await fetchProducts();

            // Normalize missing fields
            allProducts = allProducts.map(p => ({
                id: p.id ?? 0,
                name: p.name ?? "",
                description: p.description ?? "",
                category: p.category ?? "",
                categoryID: p.categoryID ?? null,   
                seller: p.seller ?? "",
                sellerID: p.sellerID ?? null,      
                location: p.location ?? "",
                shipping_days: p.shipping_days ?? "",
                stock: p.stock ?? 0,
                sales: p.sales ?? 0,
                image: p.image ?? "../assets/soap.png",
                variations: p.variations ?? [],
                tags: p.tags ?? [],
                cover_varID: p.cover_varID ?? null,
                hero_variation: p.hero_variation ?? (p.variations?.find(v => v.varID == p.cover_varID)?.name || 'None'),
                created_at: p.created_at ?? ""
            }));


            document.getElementById("stat-total-products").innerText = allProducts.length;
            document.getElementById("stat-total-sellers").innerText =
                new Set(allProducts.map(p => p.seller)).size;

            renderTable(allProducts);
        } catch (err) {
            console.error("Failed to load products", err);
        }
    }

    function renderTable(items) {
        const tbody = container.querySelector("#products-body");

        tbody.innerHTML = items.map((p, index) => `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-id="${Number(p.id)}"></td>
                <td>${index + 1}</td>
                <td>${p.id}</td>
                <td>
                    <img src="${p.image}" class="table-product-img" onerror="this.src='../assets/soap.png'">
                </td>
                <td class="product-cell">${p.name}</td>
                <td>${p.category}</td>
                <td>${p.seller}</td>
                <td>${p.stock}</td>
                <td>${p.sales}</td>
                <td class="view-more-cell">
                    <button class="btn-more" data-product='${JSON.stringify(p)}'>...</button>
                </td>
            </tr>
        `).join("");

        // Update result count
        const resultCount = container.querySelector("#result-count");
        resultCount.innerText = `${items.length} result${items.length !== 1 ? "s" : ""}`;

        setupSelectionLogic();
        setupOverlayLogic();
    }

    function setupSelectionLogic() {
        const master = container.querySelector("#master-checkbox");
        const summary = container.querySelector("#selection-summary");
        const countText = container.querySelector("#selected-count");

        const updateUI = () => {
            const checked = container.querySelectorAll(".row-checkbox:checked");
            if (checked.length) {
                summary.classList.remove("hidden");
                countText.innerText = checked.length;
            } else {
                summary.classList.add("hidden");
            }
        };

        master.onclick = () => {
            container.querySelectorAll(".row-checkbox").forEach(r => r.checked = master.checked);
            updateUI();
        };

        container.querySelectorAll(".row-checkbox").forEach(r => r.onclick = updateUI);

        // Bulk delete
        container.querySelector("#btn-bulk-delete").onclick = () => {
            const ids = Array.from(container.querySelectorAll(".row-checkbox:checked"))
                .map(r => Number(r.dataset.id));

            if (!ids.length) return alert("No products selected");

            showDeleteConfirmation(async () => {
                try {
                    const fd = new FormData();
                    ids.forEach(id => fd.append("ids[]", id));

                    const res = await fetch(
                        "/earth-hero/src/backend/manageProducts.php?action=deleteProduct",
                        { method: "POST", body: fd }
                    );

                    const result = await res.json();

                    if (result.status === "success") {
                        await loadProducts();
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Bulk delete failed");
                }
            });
        };
    }

    function setupOverlayLogic() {
        const menu = container.querySelector("#action-overlay");
        let activeProduct = null;

        container.querySelectorAll(".btn-more").forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                activeProduct = JSON.parse(btn.dataset.product);
                const rect = btn.getBoundingClientRect();
                menu.style.top = `${rect.bottom + window.scrollY}px`;
                menu.style.left = `${rect.left - 120 + window.scrollX}px`;
                menu.classList.remove("hidden");
            };
        });

        menu.querySelector('[data-action="view"]').onclick = () => {
            showProductDetails(activeProduct);
            menu.classList.add("hidden");
        };

        menu.querySelector('[data-action="edit"]').onclick = () => {
            showEditProductOverlay(activeProduct, loadProducts);
            menu.classList.add("hidden");
        };

        menu.querySelector('[data-action="delete"]').onclick = () => {
            showDeleteConfirmation(async () => {
                try {
                    const fd = new FormData();
                    fd.append("id", Number(activeProduct.id));

                    const res = await fetch(
                        "/earth-hero/src/backend/manageProducts.php?action=deleteProduct",
                        { method: "POST", body: fd }
                    );

                    const result = await res.json();

                    if (result.status === "success") {
                        await loadProducts();
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Delete failed");
                }
            });
            menu.classList.add("hidden");
        };
    }

    container.querySelector("#product-search").oninput = e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const term = e.target.value.toLowerCase();
            renderTable(allProducts.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.category.toLowerCase().includes(term) ||
                p.seller.toLowerCase().includes(term)
            ));
        }, 300);
    };

    container.querySelector("#refresh-table").onclick = loadProducts;
    container.querySelector(".btn-add").onclick = () => showAddProductOverlay(loadProducts);

    loadProducts();
}
