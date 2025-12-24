// ========== ProductCard ==========
function ProductCard({ product }) {
    const [successMsg, setSuccessMsg] = React.useState('');
    const [stock, setStock] = React.useState(product.stock);
    const [sales, setSales] = React.useState(product.sales);

    async function handleAddToCart() {
        // ALL variations out of stock → do nothing
        if (product.allOutOfStock) return;

        // Cover variation out of stock → redirect to details
        if (stock <= 0) {
            window.location.href =
                `/earth-hero/src/shop.html?action=viewProduct&productId=${product.id}`;
            return;
        }

        const payload = {
            productId: product.id,
            variationId: product.coverVarId,
            quantity: 1
        };

        // Add to cart
        try {
            const res = await fetch('/earth-hero/src/backend/cart.php?action=addCart', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-CSRF-Token': window.csrfToken 
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                // update UI immediately
                // setStock(prev => prev - 1);
                // setSales(prev => prev + 1);

                window.dispatchEvent(
                    new CustomEvent('cartUpdated', { detail: { quantity: 1 } })
                );

                setSuccessMsg('Added to cart successfully');
            }
        } catch (err) {
            console.error(err);
        }
    }

    let buttonText = 'Add to Cart';
    let buttonClass = 'button';
    let buttonDisabled = false;

    if (product.allOutOfStock) {
        buttonText = 'Out of Stock';
        buttonClass = 'button disabled';
        buttonDisabled = true;
    } else if (stock <= 0) {
        buttonText = 'Choose Options';
    }

    React.useEffect(() => {
        if (!successMsg) return;

        const timer = setTimeout(() => {
            setSuccessMsg('');
        }, 1500); // 3 seconds

        return () => clearTimeout(timer);
    }, [successMsg]);
    
    const e = React.createElement;
    return e('div', { className: 'product-container' },
        successMsg && e(SuccessOverlay, {
            message: successMsg,
            onClose: () => setSuccessMsg('')
        }),
        e('div', { className: 'product-card' },
        e('div', { className: 'img-container' },
            e('img', { className: 'product-img', src: product.image, alt: product.name }),
            // HOVER OVERLAY
                e('div', { className: 'card-overlay' },
                    e('button', {
                        id: 'add-cart-btn',
                        className: buttonClass,
                        disabled: buttonDisabled,
                        onClick: handleAddToCart
                    }, buttonText),
                    e('button', { 
                        id:'view-product-btn', 
                        className: 'button secondary',
                        onClick: () => {
                            window.location.href = `/earth-hero/src/shop.html?action=viewProduct&productId=${product.id}`;
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
                e('p',{ id: 'product-sales' }, null, `${sales} sold`),
                e('p',{ id: 'product-location' }, null, `From ${product.location}`)
            ),
            e('div', { className: 'product-tags' },
               (product.tags || []).map((tag, index) => 
                    e('p', { key: index, id: 'hashtags' }, null, tag)
                )
            ),
            product.allOutOfStock && e('p', { className: 'out-stock-hint' }, 'Currently out of stock')
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