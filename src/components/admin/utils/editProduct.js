export async function showEditProductOverlay(product, onSave) {
    let categories = [];
    let sellerLocation = ''; // fetched from backend
    console.log("Product:", product);

    // Fetch categories
    try {
        const res = await fetch("./backend/manageProducts.php?action=allCategories");
        categories = await res.json();
        console.log("Categories:", categories);
    } catch (err) {
        console.error("Failed to load categories", err);
    }

    // Fetch seller location
    try {
        if (!product.sellerID) throw new Error("Missing sellerID in product");

        const res = await fetch(
            `./backend/manageProducts.php?action=getSellerLocation&sellerID=${product.sellerID}`
        );
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.message);
        sellerLocation = data.location;
        console.log("Seller location:", sellerLocation);
    } catch (err) {
        console.error("Failed to fetch seller location", err);
    }

    const overlay = document.createElement('div');
    overlay.className = 'details-overlay';

    let currentTags = product.tags ? [...product.tags] : [];

    const renderModal = () => {
        overlay.innerHTML = `
        <div class="details-modal add-product-modal">
            <div class="modal-header">
                <h3 class="modal-title">Edit Product ID <span class="id-number"># ${product.id}</span></h3>
                <button type="button" class="close-modal">&times;</button>
            </div>

            <form id="edit-product-form" enctype="multipart/form-data">
                <input type="hidden" name="productID" value="${product.id}">

                <div class="modal-body">
                    <!-- Product Details -->
                    <section class="details-section">
                        <h4 class="section-label">Product Details</h4>
                        <div class="form-row-triple">
                            <div class="input-group">
                                <label>Product Name</label>
                                <input type="text" name="name" value="${product.name}" required>
                            </div>
                            <div class="input-group">
                                <label>Category</label>
                                <select name="categoryID" required>
                                    ${categories.map(c => `
                                        <option value="${c.categoryID}" ${product.categoryID == c.categoryID ? 'selected' : ''}>
                                            ${c.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Shipping Days</label>
                                <input type="number" name="shipping" value="${product.shipping_days || ''}">
                            </div>
                        </div>

                        <div class="form-row-split">
                            <div class="input-group">
                                <label>Description</label>
                                <textarea name="description" rows="4">${product.description || ''}</textarea>
                            </div>
                            <div class="input-group">
                                <label>Hashtags (Optional)</label>
                                <div class="hashtag-container" id="edit-tag-area">
                                    ${currentTags.map(t => `<span class="tag">${t} <button type="button" class="remove-tag" data-tag="${t}">x</button></span>`).join('')}
                                    <input type="text" placeholder="Add Hashtag" class="hashtag-input" id="edit-tag-input">
                                </div>
                                <input type="hidden" name="tags" id="edit-tags-hidden" value="${currentTags.join(',')}">
                            </div>
                        </div>
                    </section>

                    <!-- Hero Variation -->
                    <section class="details-section">
                        <div class="hero-var-header">
                            <label>Hero Variation</label>
                            <select name="hero_variation">
                                ${product.variations && product.variations.length > 0 ? product.variations.map(v => `
                                    <option value="${v.varID}" ${product.cover_varID == v.varID ? 'selected' : ''}>
                                        ${v.name}
                                    </option>
                                `).join('') : '<option value="">None</option>'}
                            </select>

                        </div>

                        <div class="variations-grid">
                            ${product.variations.map(v => `
                                <div class="variation-card">
                                    <input type="hidden" name="varID[]" value="${v.varID || ''}">
                                    <div class="var-image-box image-upload-wrapper">
                                        <img src="${v.img || '../assets/soap.png'}" class="v-preview-img" onerror="this.src='../assets/soap.png'">
                                        <input type="file" name="v_image[]" class="v-file-input" style="display:none">
                                        <button type="button" class="change-btn">Change</button>
                                    </div>
                                    <div class="var-inputs">
                                        <div class="input-row">
                                            <div class="input-item">
                                                <label>Sales Price (RM)</label>
                                                <input type="number" step="0.01" name="v_price[]" value="${v.salePrice || 0}">
                                            </div>
                                            <div class="input-item">
                                                <label>Reference Price (RM)</label>
                                                <input type="number" step="0.01" name="v_rfr[]" value="${v.rfrPrice || 0}">
                                            </div>
                                        </div>
                                        <div class="input-row">
                                            <div class="input-item">
                                                <label>Stock</label>
                                                <input type="number" name="v_stock[]" value="${v.stock || 0}">
                                            </div>
                                            <div class="input-item">
                                                <label>Sales</label>
                                                <input type="number" value="${v.sold || 0}" disabled>
                                            </div>
                                        </div>
                                        <div class="input-item full-width">
                                            <label>Variation Name</label>
                                            <input type="text" value="${v.name}" disabled>
                                        </div>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </section>

                    <!-- Seller Details -->
                    <section class="details-section">
                        <h4 class="section-label">Seller Details</h4>
                        <div class="form-row-split">
                            <div class="input-group">
                                <label>Seller</label>
                                <input type="text" name="seller_name" value="${product.seller}" readonly class="readonly-input">
                            </div>
                            <div class="input-group">
                                <label>Location</label>
                                <input type="text" name="location" value="${sellerLocation}" readonly class="readonly-input">
                            </div>
                        </div>
                    </section>
                </div>

                <div class="modal-footer">
                    <button type="submit" class="btn-save-changes">Save Changes</button>
                </div>
            </form>
        </div>`;

        setupInteractions();
    };

    const setupInteractions = () => {
        // Remove tags
        overlay.querySelectorAll('.remove-tag').forEach(btn => {
            btn.onclick = () => {
                currentTags = currentTags.filter(t => t !== btn.dataset.tag);
                renderModal();
            };
        });

        // Add tag
        const tagInput = overlay.querySelector('#edit-tag-input');
        tagInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = tagInput.value.trim();
                if (val && !currentTags.includes(val)) { currentTags.push(val); renderModal(); }
            }
        };

        // Image change
        overlay.querySelectorAll('.image-upload-wrapper').forEach(wrapper => {
            const input = wrapper.querySelector('.v-file-input');
            const preview = wrapper.querySelector('.v-preview-img');
            wrapper.querySelector('.change-btn').onclick = () => input.click();
            input.onchange = (e) => { const file = e.target.files[0]; if (file) preview.src = URL.createObjectURL(file); };
        });

        // Close modal
        overlay.querySelector('.close-modal').onclick = () => overlay.remove();

        // Form submission
        overlay.querySelector('#edit-product-form').onsubmit = async (e) => {
            e.preventDefault();
            overlay.querySelector('#edit-tags-hidden').value = currentTags.join(',');

            const formData = new FormData(e.target);

            try {
                const res = await fetch("./backend/manageProducts.php?action=updateProduct", {
                    method: "POST",
                    body: formData
                });
                const result = await res.json();
                if (result.status === "success") {
                    alert("Product updated successfully!");
                    if (typeof onSave === 'function') await onSave();
                    overlay.remove();
                } else {
                    alert("Update failed: " + result.message);
                }
            } catch (err) {
                console.error("Update Error:", err);
                alert("An error occurred during update.");
            }
        };
    };

    document.body.appendChild(overlay);
    renderModal();
}
