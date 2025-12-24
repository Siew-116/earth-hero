function renderHomePage() {
    const topSellersContainer = document.getElementById('top-sellers');
    const newArrivalsContainer = document.getElementById('new-arrivals');

    // Helper function to fetch and render products safely
    function fetchAndRender(url, container) {
        fetch(url)
            .then(res => res.json()) // parse JSON directly
            .then(products => {
                console.log(products);
                // Render even if products array is empty
                ReactDOM.createRoot(container).render(e(ProductList, { products }));
            })
            .catch(err => {
                console.error('Fetch error from', url, err);
                // Render empty product list to avoid breaking UI
                ReactDOM.createRoot(container).render(e(ProductList, { products: [] }));
            });
    }

    // Fetch Top Sellers
    fetchAndRender('/earth-hero/src/backend/products.php?action=top-sellers', topSellersContainer);

    // Fetch New Arrivals
    fetchAndRender('/earth-hero/src/backend/products.php?action=new-arrivals', newArrivalsContainer);
}

// Call the function
renderHomePage();
