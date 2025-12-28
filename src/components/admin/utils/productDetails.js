// src/components/productDetails.js
export function showProductDetails(product) {
    const overlay = document.createElement('div');
    overlay.className = 'details-overlay';

    // Format hashtags for display
    const hashtags = product.tags && product.tags.length > 0 
        ? product.tags.map(t => `#${t.trim()}`).join(' ') 
        : 'None';

    overlay.innerHTML = `
        <div class="details-modal">
            <div class="modal-header">
                <h3>Product ID <span class="id-number"># ${product.id}</span></h3>
                <button class="close-modal">X</button>
            </div>
            
            <div class="modal-body">
                <section class="details-section">
                    <h4 class="section-label">Products details</h4>
                    <div class="info-grid">
                        <div class="info-row"><label>Product name</label><span>${product.name}</span></div>
                        <div class="info-row"><label>Category</label><span>${product.category}</span></div>
                        <div class="info-row"><label>Description</label><span>${product.description || 'No description provided.'}</span></div>
                        <div class="info-row"><label>Shipping days</label><span>${product.shipping_days || 'N/A'}</span></div>
                        <div class="info-row"><label>Hashtag</label><span>${hashtags}</span></div>
                        <div class="info-row"><label>Created at</label><span>${product.created_at || 'N/A'}</span></div>
                        <div class="info-row"><label>Hero variation</label>
                        <span>
                            ${product.variations && product.variations.length > 0 
                                ? product.variations.find(v => v.varID == product.cover_varID)?.name || 'None'
                                : 'None'}
                        </span>
                        </div>
                    </div>
                </section>

                <hr class="section-divider">

                <section class="details-section">
                    <table class="variations-table">
                        <thead>
                            <tr>
                                <th>Variation</th>
                                <th>Image</th>
                                <th>Sales Price (RM)</th>
                                <th>Reference Price (RM)</th>
                                <th>Stock</th>
                                <th>Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${product.variations && product.variations.length > 0 ? product.variations.map(v => `
                                <tr>
                                    <td>${v.name}</td>
                                    <td>
                                        <img src="${v.img}" class="table-product-img" onerror="this.src='../assets/soap.png'">
                                    </td>
                                    <td>${parseFloat(v.salePrice || 0).toFixed(2)}</td>
                                    <td>${parseFloat(v.rfrPrice || 0).toFixed(2)}</td>
                                    <td>${v.stock}</td>
                                    <td>${v.sold}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6">No variations found</td></tr>'}
                        </tbody>
                    </table>
                </section>

                <hr>

                <section class="details-section">
                    <h4 class="section-label">Seller details</h4>
                    <div class="info-grid">
                        <div class="info-row"><label>Seller</label><span>${product.seller || 'loveshop'}</span></div>
                        <div class="info-row"><label>Location</label><span>${product.location || 'N/A'}</span></div>
                    </div>
                </section>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners for closing
    overlay.querySelector('.close-modal').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}