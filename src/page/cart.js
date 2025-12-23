function CartPage() {
    const [errorMsg, setErrorMsg] = React.useState('');
    const [cartItems, setCartItems] = React.useState([]); // array of items in cart
    const [allSelected, setAllSelected] = React.useState(false);
    const [shopItemSelected, setShopItemSelected] = React.useState(false);
    const [itemSelected, setItemSelected] = React.useState(false);
    const groupedByShop = cartItems.reduce((acc, item) => {
        if (!acc[item.sellerName]) acc[item.sellerName] = [];
        acc[item.sellerName].push(item);
        return acc;
    }, {});

    
    // Get cart items from backend
    const loadCart = () => {
        fetch('http://localhost/earth-hero/src/backend/cart.php?action=getCart', {
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setCartItems(
                    data.items.map(item => ({
                        ...item,
                        selected: false,
                        stockError: item.variations.find(
                            v => v.name === item.variationName
                        )?.stock <= 0
                    }))
                );
            }
        })
        .catch(console.error);
    };

    React.useEffect(loadCart, []);

    // Update cart items
    const updateItem = async (itemId, update) => {
        const item = cartItems.find(i => i.itemID === itemId);
        if (!item) return;

        const nextVariationName = update.variationName ?? item.variationName;
        const nextQty = update.qty ?? item.qty;

        const nextVar = item.variations.find(v => v.name === nextVariationName);
        if (!nextVar) return;
        if (nextQty < 1) return;
        if (nextQty > nextVar.stock) return;
        
        try {
            const res = await fetch(
                'http://localhost/earth-hero/src/backend/cart.php?action=updateItem',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemID: itemId,
                        varID: nextVar.varId,
                        qty: nextQty
                    })
                }
            );

            const data = await res.json();
            console.log(data);
            if (!data.success) {
                setErrorMsg('Update failed: ' + data.error);
                return;
            } 
            // reload since backend may MERGE / DELETE items
            loadCart();
        } catch (err) {
            setErrorMsg(`Delete failed: ${err}`);
        }
    };

    // Delete cart item
    const deleteItem = async (itemId) => {
        try {
            const res = await fetch(
                'http://localhost/earth-hero/src/backend/cart.php?action=deleteItem',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemID: itemId })
                }
            );

            const data = await res.json();
            console.log('Delete response:', data);

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
    const isShopSelected = (sellerName) =>
        groupedByShop[sellerName]?.every(item => item.selected);

    React.useEffect(() => {
    console.log(
        '✅ CURRENT SELECTION STATE:',
        cartItems.map(i => ({
            seller: i.sellerName,
            id: i.itemID,
            selected: i.selected
        }))
    );
}, [cartItems]);


    // Checkout add to transaction table where status = pending (guest cnannot checkout. redirect to register)
    
    
    return e('div', { className: 'cart-container' },
        errorMsg && e(ErrorOverlay, {
            message: errorMsg,
            onClose: () => setErrorMsg('')
        }),
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
                            e('div', { className: 'qty-selector' },
                                e('button', {
                                    className: 'qty-btn',
                                    onClick: () => updateItem(item.itemID, { qty: item.qty - 1 }),
                                    disabled: isMinusDisabled
                                }, '-'),
                                e('span', { className: 'qty-value' }, item.qty),
                                e('button', {
                                    className: 'qty-btn',
                                    onClick: () => updateItem(item.itemID, { qty: item.qty + 1 }),
                                    disabled: isPlusDisabled
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
        )
    );
}

// ====== Rendering =======
const cartContainer = document.getElementById('cart-container');
ReactDOM.createRoot(cartContainer).render(e(CartPage));