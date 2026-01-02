export async function showAddProductOverlay(onAdd) {
    let categories = [];
    let sellers = [];

    // --- Fetch categories from backend ---
    try {
        const res = await fetch("/earth-hero/src/backend/manageProducts.php?action=allCategories");
        categories = await res.json();
    } catch (err) {
        console.error("Failed to load categories", err);
    }

    // --- Fetch sellers from backend ---
    try {
        const res = await fetch("/earth-hero/src/backend/manageProducts.php?action=allSellers");
        sellers = await res.json();
    } catch (err) {
        console.error("Failed to load sellers", err);
    }

    
    const overlay = document.createElement('div');
    overlay.className = 'details-overlay';

    overlay.innerHTML = `
    <div class="details-modal add-product-modal">
        <div class="modal-header">
            <div>
                <h3>Add New Product</h3>
                <p class="product-id-sub">Create a new entry in your inventory</p>
            </div>
            <button type="button" class="close-modal">X</button>
        </div>

        <form id="add-product-form" enctype="multipart/form-data">
            <div class="modal-body">
                <!-- PRODUCT DETAILS -->
                <section class="details-section">
                    <h4>Product details</h4>
                    <div class="form-row-triple">
                        <div class="input-group">
                            <label>Product name</label>
                            <input type="text" name="name" placeholder="Name your product" required>
                        </div>
                        <div class="input-group">
                            <label>Category</label>
                            <select name="categoryID" required>
                                <option value="">Select Category</option>
                                ${categories.map(cat => `<option value="${cat.categoryID}">${cat.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Shipping days</label>
                            <input type="number" name="shipping" placeholder="Estimated shipping days" min="0">
                        </div>
                    </div>

                    <div class="form-row-split">
                        <div class="input-group">
                            <label>Description</label>
                            <textarea name="description" placeholder="Describe your product..."></textarea>
                        </div>
                        <div class="input-group">
                            <label>Hashtags (Optional)</label>
                            <div class="hashtag-container" id="hashtag-area">
                                <input type="text" placeholder="Add Hashtag" class="hashtag-input" id="tag-input">
                            </div>
                            <input type="hidden" name="tags" id="tags-hidden-input">
                        </div>
                    </div>
                </section>

                <!-- VARIATIONS -->
                <section class="details-section">
                    <div class="hero-var-header">
                        <label>Variation</label>
                        <p class="product-id-sub">Choose a variation to be on the cover.</p>
                        <select name="hero_variation">
                            <option value="">Select variation</option>
                        </select>
                    </div>
                    <div class="variations-grid" style="display: flex; flex-wrap: wrap; gap: 20px;">
                        ${[1,2,3].map(i => `
                            <div class="variation-card" style="flex: 1 1 300px;">
                                <div class="var-image-box">
                                    <div class="image-upload-wrapper" style="position: relative; border: 1px dashed #ddd; border-radius: 4px; height: 150px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                        <input type="file" name="v_image[]" class="v-file-input" accept="image/*" style="display: none;">
                                        <div class="upload-placeholder" style="text-align: center; color: #999;">
                                            <p>Drag or upload from device</p>
                                        </div>
                                        <img class="v-preview-img" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                    </div>
                                </div>
                                <div class="var-inputs">
                                    <div class="input-item"><label>Sales Price</label><input type="number" step="0.01" name="v_price[]" placeholder="Sale Price"></div>
                                    <div class="input-item"><label>Ref Price</label><input type="number" step="0.01" name="v_rfr[]" placeholder="Original Price"></div>
                                    <div class="input-item"><label>Stock</label><input type="number" name="v_stock[]" placeholder="Stock"></div>
                                    <div class="input-item"><label>Variation Name</label><input type="text" name="v_name[]" placeholder="Variation name"></div>
                                    <div class="input-item"><label>Sales</label><input type="number" name="v_sales[]" placeholder="Sales"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <!-- SELLER DETAILS -->
                <section class="details-section seller-details-form">
                    <h4>Seller details</h4>
                    <div class="form-row-split">
                        <div class="input-group">
                        <label>Seller</label>
                        <select name="sellerID" required>
                            <option value="">Select Seller</option>
                            ${sellers.map(s => `<option value="${s.sellerID}" data-location="${s.location}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Location</label>
                        <input type="text" name="location" value="${sellers[0]?.location || ''}" readonly>
                    </div>
                    </div>
                </section>
            </div>

            <div class="modal-footer">
                <button type="submit" class="btn-add-submit">Add New</button>
            </div>
        </form>
    </div>`;

    document.body.appendChild(overlay);

    // --- IMAGE UPLOAD ---
    overlay.querySelectorAll('.image-upload-wrapper').forEach(wrapper => {
        const fileInput = wrapper.querySelector('.v-file-input');
        const previewImg = wrapper.querySelector('.v-preview-img');
        const placeholder = wrapper.querySelector('.upload-placeholder');

        const triggerUpload = () => fileInput.click();
        wrapper.onclick = e => { if(e.target !== fileInput) triggerUpload(); };
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    previewImg.src = ev.target.result;
                    previewImg.style.display = 'block';
                    if(placeholder) placeholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        };
    });

    const sellerSelect = overlay.querySelector('select[name="sellerID"]');
    const locationInput = overlay.querySelector('input[name="location"]');

    // Set initial location if a seller is pre-selected
    if (sellerSelect.value) {
        const selectedOption = sellerSelect.selectedOptions[0];
        locationInput.value = selectedOption.dataset.location || '';
    }

    // Update location whenever seller changes
    sellerSelect.addEventListener('change', () => {
        const selectedOption = sellerSelect.selectedOptions[0];
        locationInput.value = selectedOption.dataset.location || '';
    });


    // --- HASHTAG LOGIC ---
    const tagInput = overlay.querySelector('#tag-input');
    const hashtagArea = overlay.querySelector('#hashtag-area');
    const hiddenTagsInput = overlay.querySelector('#tags-hidden-input');
    const updateHiddenTags = () => {
        const currentTags = Array.from(hashtagArea.querySelectorAll('.tag'))
            .map(t => { const clone = t.cloneNode(true); clone.querySelector('button')?.remove(); return clone.textContent.trim(); });
        hiddenTagsInput.value = currentTags.join(',');
    };
    hashtagArea.addEventListener('click', e => {
        if(e.target.classList.contains('remove-tag')) { e.stopPropagation(); e.target.parentElement.remove(); updateHiddenTags(); }
    });
    tagInput.addEventListener('keydown', e => {
        if(e.key==='Enter') { e.preventDefault(); const val = tagInput.value.trim(); if(val){ const newTag = document.createElement('span'); newTag.className='tag'; newTag.innerHTML=`${val} <button type="button" class="remove-tag">x</button>`; hashtagArea.insertBefore(newTag, tagInput); tagInput.value=''; updateHiddenTags(); } }
    });

    // --- HERO VARIATION DROPDOWN ---
    const heroSelect = overlay.querySelector('select[name="hero_variation"]');
    const variationNameInputs = overlay.querySelectorAll('input[name="v_name[]"]');
    const refreshHeroDropdown = () => {
        heroSelect.innerHTML = `<option value="">Select variation</option>`;
        variationNameInputs.forEach(input => {
            const val = input.value.trim();
            if(val){ const option = document.createElement('option'); option.value=val; option.textContent=val; heroSelect.appendChild(option);}
        });
    };
    variationNameInputs.forEach(input => input.addEventListener('input', refreshHeroDropdown));
    refreshHeroDropdown();

    // --- FORM SUBMISSION ---
    overlay.querySelector('#add-product-form').onsubmit = async e => {
        e.preventDefault();
        const variationCards = overlay.querySelectorAll('.variation-card');
        let validVariation = false;
        variationCards.forEach(card => {
            const name = card.querySelector('input[name="v_name[]"]').value.trim();
            const price = card.querySelector('input[name="v_price[]"]').value.trim();
            const rfr = card.querySelector('input[name="v_rfr[]"]').value.trim();
            const stock = card.querySelector('input[name="v_stock[]"]').value.trim();
            const sales = card.querySelector('input[name="v_sales[]"]').value.trim();
            const imgEl = card.querySelector('.v-preview-img');
            if(name && price && rfr && stock && sales && imgEl && imgEl.src) validVariation=true;
        });
        if(!validVariation) return alert("Fill at least one full variation including image.");
        const sellerID = overlay.querySelector('select[name="sellerID"]').value;
        if(!sellerID) return alert("Select a seller.");
        const heroVariation = overlay.querySelector('select[name="hero_variation"]').value;
        if(!heroVariation) return alert("Select hero/cover variation.");

        const formData = new FormData(e.target);
        try {
            const res = await fetch("/earth-hero/src/backend/manageProducts.php?action=addProduct",{method:"POST",body:formData});
            const text = await res.text();
            try {
                const result = JSON.parse(text);
                if(result.status==="success"){ alert("Product added successfully!"); onAdd(); overlay.remove(); }
                else alert("Error: "+result.message);
            } catch(err){ console.error("Server response:",text); alert("Server returned error."); }
        } catch(err){ console.error("Submission failed",err); }
    };

    // --- MODAL CLOSING ---
    overlay.querySelector('.close-modal').onclick = () => overlay.remove();
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
}
