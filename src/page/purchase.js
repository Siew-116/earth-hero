function PurchasePage() {
    // Load purchase history
    // Filter
    // Refund
    // Order Received

    
    return e('div', { className: 'purchase-container' },
        e('h2', { className: 'title-text' }, "My Purchase History")
    );
}

// ====== Rendering =======
const purchaseContainer = document.getElementById('purchase-container');
ReactDOM.createRoot(purchaseContainer).render(e(PurchasePage));



