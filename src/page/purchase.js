function PurchasePage() {
    const [orders, setOrders] = React.useState([]);
    const [errorMsg, setErrorMsg] = React.useState('');

    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') || 'All';
    const statuses = ['All','To Ship','To Receive','Completed','Cancelled'];

    // Load purchase history
    React.useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch(`/earth-hero/src/backend/transaction.php?action=getPurchase&status=${encodeURIComponent(status)}`, {
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (!data.success) {
                    setErrorMsg(data.error || 'Failed to fetch orders');
                    return;
                }
                
                setOrders(data.orders);
            } catch (err) {
                setErrorMsg('Error fetching orders: ' + err.message);
            }
        };

        fetchOrders();
    }, [status]);

    // Update status button
    const updateOrderStatus = async (orderID, newOrderStatus, newTxnStatus = null) => {
        try {
            const res = await fetch('/earth-hero/src/backend/transaction.php?action=updateOrderStatus', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', "X-CSRF-Token": window.csrfToken },
                body: JSON.stringify({
                    orderID,
                    orderStatus: newOrderStatus,
                    transactionStatus: newTxnStatus,
                })
            });

            const data = await res.json();
            if (!data.success) {
                setErrorMsg(data.error || 'Failed to update order');
                return;
            }

            // UI updates immediately
            setOrders(prev => prev.filter(o => o.orderID !== orderID));

        } catch (err) {
            setErrorMsg('Error updating order');
        }
    };



    return e('div', { className: 'purchase-container' },
        e('h2', { className: 'title-text' }, "My Purchase History"),

        // Status filters
        e('div', { className: 'order-status-list' },
            statuses.map(s =>
                e('a', {
                    key: s,
                    href: `/earth-hero/src/purchase.html?status=${encodeURIComponent(s)}`,
                    className: `order-status ${status === s ? 'active' : ''}`
                }, e('p', null, s))
            )
        ),

        // Render all orders
        orders.map((order, idx) => {
            const txn = order.transaction;
            const delivery = order.delivery;
            const addr = order.address;

            const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
            const deliveryFee = delivery?.deliveryFee || 0;
            const total = txn.totalPrice || 0;

            return e('div', { key: `order-${idx}`, className: 'purchase-card' },
                e('p', { className: 'main-text status-name-2' }, order.orderStatus),
                e('div', { className: 'purchase-details' },
                    // ORDER DETAILS
                    e('div', { className: 'order-details' },
                        e('div', { className: 'details-row' },
                            e('p', null, 'Order ID'),
                            e('p', { className: 'sub-text' }, order.orderID)
                        )
                    ),

                    // ITEMS RECEIPT 
                    e('div', { className: 'checkout-items-wrapper' },
                        e('div', { className: 'shop-group' },
                            e('div', { className: 'seller-container' },
                                e('i', { className: 'fa-solid fa-shop' }),
                                e('p', { className: 'sub-text' }, 'Shop') 
                            ),
                            order.items.map((item, idx2) =>
                                e('div', { key: idx2, className: 'item-details-wrapper' },
                                    e('div', { className: 'item-img-container checkout-img' },
                                        e('img', { className: 'item-img', src: item.variationImg || '', alt: 'img' })
                                    ),
                                    e('div', { className: 'item-col' },
                                        e('p', { className: 'item-name' }, item.productName),
                                        e('p', { className: 'item-var' }, item.variationName)
                                    ),
                                    e('div', { className: 'item-qty-price' },
                                        e('p', { className: 'sub-text' }, `x${item.qty}`),
                                        e('div', { className: 'item-prices' },
                                            e('h3', null, `RM${item.price.toFixed(2)}`)
                                        )
                                    )
                                )
                            )
                        )
                    ),

                    // TOTAL SUMMARY
                    e('h5', { className: 'title-text total-item' }, `(Total ${totalItems} items)`),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Subtotal'),
                        e('p', null, `RM${(txn.subtotal || 0).toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Product Discount'),
                        e('p', null, `- RM${(txn.product_discount || 0).toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Voucher Discount'),
                        e('p', null, `- RM${(txn.voucher_discount || 0).toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row price-details' },
                        e('p', null, 'Delivery Fee'),
                        e('p', null, `RM${deliveryFee.toFixed(2)}`)
                    ),
                    e('div', { className: 'summary-row' },
                        e('h2', null,"Total"),
                        e('div', { className: 'total-price-summary' },
                            e('h2', null, `RM${total.toFixed(2)}`),
                            e('p', null, `Saved RM${((txn.subtotal || 0) - total).toFixed(2)}`)
                        )
                    )
                ),

                // DELIVERY TRACKING
                e('div', { className: 'delivery-tracking' },
                    e('p', { className: 'main-text status-name' }, order.orderStatus),
                    e('h3', { className: 'title-text' }, 'Shipping Details'),
                    e('p', { className: 'sub-text' }, addr.recipient),
                    e('p', { className: 'sub-text' }, addr.address),
                    e('p', { className: 'sub-text' }, addr.postcode + ' ' + addr.city),
                    e('p', { className: 'sub-text' }, addr.state),
                    e('p', { className: 'sub-text' }, addr.country),
                    e('p', { className: 'sub-text' }, addr.contact),
                    e('h3', { className: 'title-text' }, 'Tracking Number'),
                    e('p', { className: 'sub-text trackingNo' }, `${delivery.trackingNo || '-'}`),
                    e('div', { className: 'expected-arrival' }, `Estimated Arrival: ${delivery.estimated_arrival || ''}`),
                    // Static tracking steps for demo
                    e('div', { className: 'tracking' },
                        e('div', { className: 'timeline' },
                            e('p', { className: 'sub-text track-date' }, delivery.estimated_arrival || ''),
                            e('p', { className: 'sub-text track-time' }, '13:45')
                        ),
                        e('p', { className: 'sub-text track-time' }, 'Your parcel has been shipped')
                    ),
                    e('div', { className: 'tracking' },
                        e('div', { className: 'timeline' },
                            e('p', { className: 'sub-text track-date' }, delivery.estimated_arrival || ''),
                            e('p', { className: 'sub-text track-time' }, '13:45')
                        ),
                        e('p', { className: 'sub-text track-time' }, 'Seller is preparing your order')
                    ),
                    (order.orderStatus === 'To Ship' || order.orderStatus === 'To Receive') &&
                    e('div', { className: 'track-buttons' },

                        // Refund
                        e('button', {
                            className: 'button refund-btn',
                            onClick: () => {
                                updateOrderStatus(order.orderID, 'Cancelled', 'Refunded');
                            }
                        }, "Refund"),

                        // Order Received
                        e('button', {
                            className: 'button receive-btn',
                            onClick: () => {
                                updateOrderStatus(order.orderID, 'Completed');
                            }
                        }, "Order Received")
                    ),
                    order.orderStatus === 'Completed' &&
                    e('p', { className: 'reward-text' },
                        "You've earned 5 ECO points!"
                    )

                )
            );
        }),
        e('p', {className: 'sub-text'}, "No more records...")
    );
}

// ====== Rendering =======
const purchaseContainer = document.getElementById('purchase-container');
ReactDOM.createRoot(purchaseContainer).render(e(PurchasePage));
