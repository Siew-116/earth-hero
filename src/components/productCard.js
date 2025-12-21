// ========== ProductCard ==========
function ProductCard({ product }) {

    const e = React.createElement;
    return e('div', { className: 'product-container' },
        e('div', { className: 'product-card' },
        e('div', { className: 'img-container' },
            e('img', { className: 'product-img', src: product.image, alt: product.name }),
            // HOVER OVERLAY
                e('div', { className: 'card-overlay' },
                    e('button', { id:'add-cart-btn', className: 'button' }, 'Add to Cart'),
                    e('button', { 
                        id:'view-product-btn', 
                        className: 'button secondary',
                        onClick: () => {
                            const url = new URL(window.location);
                            // clear all search params
                            url.search = '';
                            // add action params
                            url.searchParams.set('action', 'viewProduct');
                            // set only productId
                            url.searchParams.set('productId', product.id);
                            // update URL without reload
                            window.history.pushState({}, '', url);
                            // trigger listener to notify URL changes
                            window.dispatchEvent(new Event('popstate'));
                        }
                    }, 'View Details')
                )
        ),
        e('div', { className: 'product-details' },
            e('p', { className: 'title-text' }, product.category),
            e('p', { className: 'word-text' }, product.name),
            e('div', { className: 'price-container' },
                e('h3', { id: 'product-price' }, null, `RM ${product.price}`),
                e('p', { id: 'product-ori-price' }, null, `RM ${product.originalPrice}`)
            ),
            e('div', { className: 'product-info' },
                e('p',{ id: 'product-sales' }, null, `${product.sales} sold`),
                e('p',{ id: 'product-location' }, null, `From ${product.location}`)
            ),
            e('div', { className: 'product-tags' },
               (product.tags || []).map((tag, index) => 
                    e('p', { key: index, id: 'hashtags' }, null, tag)
                )
            )
        )
        )
    );
}

// ProductList
function ProductList({ products }) {
    return e(React.Fragment, null,
        products.map(product => e(ProductCard, { key: product.id, product }))
    );
}