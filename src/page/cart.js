function CartPage() {
    const [errorMsg, setErrorMsg] = React.useState('');
    const [cartItems, setCartItems] = React.useState([]); // array of items in cart
    const [allSelected, setAllSelected] = React.useState(false);
    const groupedByShop = cartItems.reduce((acc, item) => {
        if (!acc[item.sellerName]) acc[item.sellerName] = [];
        acc[item.sellerName].push(item);
        return acc;
    }, {});
    const [summaryExpanded, setSummaryExpanded] = React.useState(false);
    
    const selectedItems = cartItems.filter(item => item.selected);
    const showSummary = selectedItems.length > 0;
    const [vouchers, setVouchers] = React.useState([]);
    const [showVoucherOverlay, setShowVoucherOverlay] = React.useState(false);
    const [selectedVoucher, setSelectedVoucher] = React.useState(null);
    const csrf = localStorage.getItem('csrf_token');

    // Get cart items from backend
    const loadCart = async () => {
        try {
            const res = await fetch(
                '/earth-hero/src/backend/cart.php?action=getCart',
                { credentials: 'include' }
            );

            const data = await res.json();

            if (data.success) {
                setCartItems(
                    data.items.map(item => ({
                        ...item,
                        selected: false,
                        stockError:
                            item.variations.find(
                                v => v.name === item.variationName
                            )?.stock <= 0
                    }))
                );
            } else {
                setErrorMsg(data.error);
            }
        } catch (err) {
            setErrorMsg(`Load failed: ${err}`);
        }
    };

   
    React.useEffect(() => {
        loadCart();
    }, []);

    // Load vouchers
    React.useEffect(() => {
        const loadVouchers = async () => {
            try {
                const res = await fetch(
                    '/earth-hero/src/backend/users.php?action=getVouchers',
                    { credentials: 'include' }
                );

                const data = await res.json();
                if (data.success) {
                    setVouchers(data.vouchers);
                } else {
                    setErrorMsg(data.error);
                }
            } catch (err) {
                setErrorMsg(`Delete failed: ${err}`);
            }
        };
        loadVouchers();
    }, []);


    // Update cart items
    const updateItem = async (itemId, update) => {
        const item = cartItems.find(i => i.itemID === itemId);
        if (!item) return;

        const nextVariationName = update.variationName ?? item.variationName;
        const nextQty = update.qty ?? item.qty;

        const nextVar = item.variations.find(v => v.name === nextVariationName);
        if (!nextVar) return;
        if (nextQty < 1) return;

        // Optimistically update local state
        const prevCartItems = [...cartItems]; // backup in case of failure
        setCartItems(prev =>
            prev.map(i =>
                i.itemID === itemId
                    ? { ...i, qty: nextQty, variationName: nextVariationName }
                    : i
            )
        );

        try {
            const res = await fetch(
                '/earth-hero/src/backend/cart.php?action=updateItem',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrf
                    },
                    body: JSON.stringify({
                        itemID: itemId,
                        varID: nextVar.varId,
                        qty: nextQty
                    })
                }
            );

            const data = await res.json();

            if (!data.success) {
                // Revert state if backend fails
                setCartItems(prevCartItems);
                setErrorMsg('Update failed: ' + data.error);
            } 
            await loadCart();
        } catch (err) {
            // Revert on network error
            setCartItems(prevCartItems);
            setErrorMsg(`Update failed: ${err}`);
        }
    };

    // Delete cart item 
    const deleteItem = async (itemId) => {
        try {
            const res = await fetch(
                '/earth-hero/src/backend/cart.php?action=deleteItem',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json',
                        'X-CSRF-Token': csrf },
                    body: JSON.stringify({ itemID: itemId })
                }
            );

            const data = await res.json();

            if (!data.success) {
                setErrorMsg('Delete failed: ' + data.error);
                return;
            }
            // Remove locally
            setCartItems(prev => prev.filter(i => i.itemID !== itemId));
        } catch (err) {
            setErrorMsg(`Delete failed: ${err}`);
        }
    };

    // Update selector
    const updateSelections = (updatedItems) => {
        setCartItems(updatedItems);
        // Check if all items are selected
        setAllSelected(updatedItems.every(item => item.selected));
    };

    const toggleSelectAll = (checked) => {
        const updated = cartItems.map(item => ({ ...item, selected: checked }));
        updateSelections(updated);
    };

    const toggleSelectShop = (sellerName, checked) => {
        const updated = cartItems.map(item =>
            item.sellerName === sellerName ? { ...item, selected: checked } : item
        );
        updateSelections(updated);
    };

    const toggleSelectItem = (itemID, checked) => {
        const updated = cartItems.map(item =>
            item.itemID === itemID ? { ...item, selected: checked } : item
        );
        updateSelections(updated);
    };

    // Helper to check if a shop is fully selected
    const isShopSelected = (sellerName) => groupedByShop[sellerName]?.every(item => item.selected);

    // Subtotal 
    const subtotal = selectedItems.reduce(
        (sum, item) => sum + item.oriPrice * item.qty, 0
    );

    // Discount
    const productDiscount = selectedItems.reduce(
        (sum, item) => sum + (item.oriPrice - item.netPrice) * item.qty, 0
    );

    // Net total price
    const netTotalPrice = selectedItems.reduce(
        (sum, item) => sum + item.netPrice * item.qty, 0
    );

    // Total price
    const totalPrice = netTotalPrice - (selectedVoucher?.discount ?? 0)

    const totalSelectedItems = selectedItems.reduce(
        (sum, item) => sum + item.qty, 0
    );

    // Saved
    const savedPrice = subtotal - totalPrice;

    // Checkout add to transaction table where status = pending (guest cnannot checkout. redirect to register)
    const checkoutItems = async () => {
        if (selectedItems.length === 0) {
            setErrorMsg("Please select at least one item to checkout.");
            return;
        }

        try {
            const itemIDs = selectedItems.map(item => item.itemID);

            const res = await fetch(
                '/earth-hero/src/backend/transaction.php?action=checkout',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf},
                    body: JSON.stringify({
                        itemIDs,                        // send array of selected items
                        voucherID: selectedVoucher?.voucherID || null
                    })
                }
            );

            const data = await res.json();

            if (!data.success) {
                setErrorMsg('Checkout failed: ' + data.error);
                return;
            }

            // Remove locally checked-out items from cart
            setCartItems(prev => prev.filter(i => !itemIDs.includes(i.itemID)));

            // redirect to payment page
            if (data.paymentURL) {
                window.location.href = data.paymentURL;
            } 
        } catch (err) {
            setErrorMsg(`Checkout failed: ${err}`);
        }
    };

    
    return e('div', { className: 'cart-container' },
        // Error overlay
        errorMsg && e(ErrorOverlay, {
            message: errorMsg,
            onClose: () => setErrorMsg('')
        }),
        // Voucher overlay
        showVoucherOverlay && e('div', { className: 'voucher-overlay' },
        e('div', { className: 'voucher-modal' },
            // Header
            e('div', { className: 'voucher-header' },
                e('h2', null, 'Select a Voucher'),
                e('button', {
                    className: 'close-btn',
                    onClick: () => setShowVoucherOverlay(false)
                }, '×')
            ),
            // Voucher list
            vouchers.length === 0
                ? e('p', { className: 'empty-text' }, 'No vouchers available')
                : vouchers.map(voucher =>
                    e('div', { key: voucher.voucherID, className: 'voucher-row' }, 
                        // Voucher card
                        e('div', {
                            className: 'voucher-card',
                            onClick: () => {
                                setSelectedVoucher(voucher);
                                setShowVoucherOverlay(false);
                            }
                        },
                            // Name
                            e('div', { className: 'voucher-name' },
                                e('h4', null, voucher.name)
                            ),
                            // Details
                            e('div', { className: 'voucher-details' },
                                e('p', null, `Min spend of RM${voucher.minSpend}`),
                                e('p', null, `${voucher.vendorLimit}`),
                                e('div', { className: 'voucher-expired' },
                                    e('i', { className: "fa-regular fa-clock" }),
                                    e('p', null, `Expires in ${voucher.expiredDay} day`)
                                )
                            ),
                            // Use button
                            e('div', { className: 'voucher-button' },
                                e('button', { className: 'button use-btn' }, "Use")
                            )
                        ),
                        // Qty
                        e('div', { className: 'sub-text voucher-qty' },
                            e('p', null, `x ${voucher.qty}`)
                        )
                    )
                )

            )
        ),
         e('h2', { className: 'cart-page-title' }, "My Shopping Cart"),

        // Header
        e('div', { className: 'cart-header' },
            e('div', { className: 'selector-wrapper' },
                e('label', { className: 'checkbox-label' },
                    e('input', {
                        type: 'checkbox',
                        checked: allSelected,
                        onChange: e => toggleSelectAll(e.target.checked)
                    }),
                    'Select All'
                )
            ),
            e('p', { className: 'c-title' }, "Variation"),
            e('p', { className: 'c-title' }, "Unit Price"),
            e('p', { className: 'c-title' }, "Quantity"),
            e('p', { className: 'c-title' }, "Total Price")
        ),

        e('div', { className: 'line-wrapper' }, e('hr')),

        // Items list
        e('div', { className: 'item-list-container' },
            Object.entries(groupedByShop).map(([sellerName, items]) =>
                e('div', { key: sellerName, className: 'shop-group' },
                    // Shop header
                    e('div', { className: 'selector-wrapper' },
                        e('label', { className: 'checkbox-label' },
                            e('input', {
                                type: 'checkbox',
                                checked: isShopSelected(sellerName),
                                onChange: e => toggleSelectShop(sellerName, e.target.checked)
                            }),
                            e('div', { className: 'seller-container' },
                                e('i', { className: 'fa-solid fa-shop' }),
                                e('p', { className: 'sub-text' }, sellerName)
                            )
                        )
                    ),
                    e('div', { className: 'line-wrapper' }, e('hr')),
                    // Items
                    items.map(item => {
                        const currentVar = item.variations.find(v => v.name === item.variationName);
                        const isPlusDisabled = item.qty >= (currentVar?.stock || 0);
                        const isMinusDisabled = item.qty <= 1;

                        return e('div', {
                            key: item.itemID,
                            className: `cart-row ${item.stockError ? 'out-of-stock' : ''}`
                        },
                            e('label', { className: 'checkbox-label' },
                                e('input', {
                                    type: 'checkbox',
                                    checked: item.selected,
                                    disabled: item.stockError,
                                    onChange: e => toggleSelectItem(item.itemID, e.target.checked)
                                }),
                                e('div', { className: 'item-img-container' },
                                    e('img', { className: 'item-img', src: item.variationImg, alt: item.productName })
                                )
                            ),
                            e('p', { className: 'item-name' }, item.productName),
                            e('select', {
                                className: 'variation-dropdown',
                                value: item.variationName,
                                disabled: item.variations.every(v => v.stock <= 0),
                                onChange: e => updateItem(item.itemID, { variationName: e.target.value })
                            },
                                item.variations.map(v =>
                                    e('option', { key: v.varId, value: v.name, disabled: v.stock <= 0 },
                                        `${v.name} ${v.stock <= 0 ? "(Out of stock)" : ""}`
                                    )
                                )
                            ),
                            e('div', { className: 'item-price' },
                                e('h3', { id: 'i-price' }, `RM${parseFloat(item.netPrice).toFixed(2)}`),
                                e('p', { id: 'i-ori-price' }, `RM${parseFloat(item.oriPrice).toFixed(2)}`)
                            ),
                            e('div', { className: 'item-qty-selector' },
                                e('button', {
                                    className: 'qty-btn',
                                    onClick: () => updateItem(item.itemID, { qty: item.qty - 1 }),
                                    disabled: isMinusDisabled
                                }, '-'),
                                e('span', { className: 'qty-value' }, item.qty),
                                e('button', {
                                    className: 'qty-btn',
                                    onClick: () => {
                                        if (item.qty >= (currentVar?.stock || 0)) {
                                            setErrorMsg("Sorry, we don't have enough stock!");
                                        } else {
                                            updateItem(item.itemID, { qty: item.qty + 1 });
                                        }
                                    }
                                }, '+')
                            ),
                            e('h3', { id: 'i-price' }, `RM${(item.netPrice * item.qty).toFixed(2)}`),
                            e('i', {
                                className: 'fa-solid fa-trash',
                                onClick: () => deleteItem(item.itemID)
                            })
                        );
                    })
                )
            ),
            e('p', {className: 'sub-text'}, "Go green — explore more eco items...")
        ),
        // Selection summary
        showSummary && e('div', { className: 'cart-summary-overlay' },
            e('div', { className: 'summary-bar' },
                e('div', {className: 'summary-row'},
                    e('button', {
                        className: 'summary-expand-btn',
                        onClick: () => setSummaryExpanded(prev => !prev)
                    }, summaryExpanded ? e('i',{className:"fa-solid fa-angle-down"}) : e('i',{className:"fa-solid fa-angle-up"}))
                ),
                // EXPANDED DETAILS
                summaryExpanded && e('div', { className: 'summary-details' },
                    e('div', { className: 'summary-row voucher-row' },
                        e('p', null, 'Voucher'),
                        e('div', { className: 'summary-row voucher-option' },
                            e('div', { className: 'voucher-chosen' },
                                e('p', null, selectedVoucher ? selectedVoucher.name : 'No voucher selected'),
                                e('button', {
                                        className: 'text-button',
                                        onClick: (e) => {
                                            e.stopPropagation(); // prevent selecting the voucher
                                            setSelectedVoucher(null);
                                            }}, 
                                '×')
                            ),
                            e('button', { className: 'text-button change-btn', onClick: () => setShowVoucherOverlay(true) },"Change")
                        )
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Subtotal'),
                        e('p', null, `RM${subtotal.toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Product Discount'),
                        e('p', null, `- RM${productDiscount.toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Voucher Discount'),
                        e('p', null, `- RM${selectedVoucher ? selectedVoucher.discount : '0.00'}`)
                    )
                ),

                e('div', {className: 'summary-row'},
                    e('h2', null,"Total"),
                    e('div', {className: 'total-price-summary'},
                        e('h2', null,`RM${totalPrice.toFixed(2)}`),
                        e('p', null, `Saved RM${savedPrice.toFixed(2)}`),
                    )
                ),
                e('div', {className: 'summary-row'},
                e('button', {
                    className: 'checkout-btn',
                    onClick: () => {
                        if (!window.loggedIn) {
                            setErrorMsg("Please login or sign up first to continue processing your order.")
                            //window.location.href = '/earth-hero/src/register.html';
                            return;
                        } else {
                            window.location.href = '/earth-hero/src/checkout.html';
                            checkoutItems();
                        }
                    },
                }, `Checkout (${totalSelectedItems})`)
            )
            )
        )

    );
}

// ====== Rendering =======
const cartContainer = document.getElementById('cart-container');
ReactDOM.createRoot(cartContainer).render(e(CartPage));



