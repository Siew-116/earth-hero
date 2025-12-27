function CheckoutPage() {
    const [checkoutConfirmed, setCheckoutConfirmed] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');
    const [useDefaultAddr, setUseDefaultAddr] = React.useState(false);
    const [recipient, setRecipient] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [postcode, setPostcode] = React.useState('');
    const [city, setCity] = React.useState('');
    const [state, setState] = React.useState('');
    const [country, setCountry] = React.useState('');
    const [availableStates, setAvailableStates] = React.useState([]);
    const [availableCities, setAvailableCities] = React.useState([]);
    const [availablePhoneCodes, setAvailablePhoneCodes] = React.useState([]);
    const [countries, setCountries] = React.useState([]);
    const [phoneCode, setPhoneCode] = React.useState('');
    const [contactNumber, setContactNumber] = React.useState('');
    const [shippingOption, setShippingOption] = React.useState(null);
    const [paymentMethod, setPaymentMethod] = React.useState(null);
    const [checkoutItems, setCheckoutItems] = React.useState([]);
    const [checkoutAmount, setCheckoutAmount] = React.useState([]);
    const txn = checkoutAmount[0] || {};
    const [deliveryFee, setDeliveryFee] = React.useState(0);
    const [total, setTotal] = React.useState(txn.totalPrice || 0);
    const [loading, setLoading] = React.useState(false);
    const [successMessage, setSuccessMessage] = React.useState('');
    const itemsByShop = React.useMemo(() => {
        return checkoutItems.reduce((acc, item) => {
            const shop = item.sellerName || 'Unknown Shop'; 
            if (!acc[shop]) acc[shop] = [];
            acc[shop].push(item);
            return acc;
        }, {});
    }, [checkoutItems]);

    
    
    const shippingOptionsData = {
        self: { 
            deliveryFee: 0, 
            shippingDays: 1, 
            option: "Self Collection" 
        },
        sea: { 
            deliveryFee: 8, 
            shippingDays: 3, 
            option: "Sea Shipping" 
        },
        air: { 
            deliveryFee: 15, 
            shippingDays: 7, 
            option: "Air Shipping" 
        }
    };

    // Expected arrival
    const estimatedArrival = React.useMemo(() => {
        if (!shippingOption) return '';

        const today = new Date();
        const daysToAdd = shippingOptionsData[shippingOption].shippingDays;

        const arrivalDate = new Date(today);
        arrivalDate.setDate(arrivalDate.getDate() + daysToAdd);

        const day = String(arrivalDate.getDate()).padStart(2, '0');
        const month = String(arrivalDate.getMonth() + 1).padStart(2, '0');
        const year = arrivalDate.getFullYear();

        return `${day}/${month}/${year}`;
    }, [shippingOption]);


    React.useEffect(() => {
        fetch("/earth-hero/src/backend/transaction.php?action=checkCheckoutActive", {
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
            if (!data.active) {
                console.log(data);
                window.location.replace("/earth-hero/src/cart.html");
            }
        });
    }, []);


    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!checkoutConfirmed) {
                e.preventDefault();
                e.returnValue = "You have unsaved checkout data. Are you sure you want to leave?";

                navigator.sendBeacon(
                    "/earth-hero/src/backend/transaction.php?action=failCheckout",
                    JSON.stringify({ csrfToken: window.csrfToken })
                );
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [checkoutConfirmed]);


    React.useEffect(() => {
        const fee = shippingOption ? shippingOptionsData[shippingOption].deliveryFee : 0;
        setDeliveryFee(fee);

        const newTotal = (txn.totalPrice || 0) + fee;
        setTotal(newTotal);
    }, [shippingOption, txn.totalPrice]);

    // Load JSON once
    React.useEffect(() => {
        fetch('../data/countries+states+cities.json')
            .then(res => res.json())
            .then(data => {
                setCountries(data);
                setAvailablePhoneCodes(data.map(c => ({ name: c.name, code: c.phone_code })));
            })
            .catch(err => console.error('Failed to load countries JSON', err));
    }, []);

    // Populate states when country changes
    function handleCountryChange(e) {
        const countryName = e.target.value;
        const selected = countries.find(c => c.name === countryName);
        if (selected) {
            setCountry(countryName);
            setAvailableStates(selected.states || []);
            setState('');
            setCity('');
            setAvailableCities([]);
            // Only set phone code if currently empty
            if (!phoneCode) setPhoneCode(selected.phone_code || '');
            // Only clear contact number if currently empty
            if (!contactNumber) setContactNumber('');
        } else {
            setCountry('');
            setAvailableStates([]);
            setState('');
            setCity('');
            setAvailableCities([]);
            // Only reset if currently empty
            if (!phoneCode) setPhoneCode('');
            if (!contactNumber) setContactNumber('');
        }
    }

    // Populate cities when state changes
    function handleStateChange(e) {
        const stateName = e.target.value;
        setState(stateName);

        // Find selected state object
        const selectedState = availableStates.find(s => s.name === stateName);

        // Populate cities
        setAvailableCities(selectedState?.cities || []);
        setCity(''); // reset city selection

        // Autofill postcode only if JSON has it
        if (selectedState?.postcode) {
            setPostcode(selectedState.postcode);
        }
    }

    // Set location dropdown
    React.useEffect(() => {
        if (!countries.length) return;

        if (country) {
            const selectedCountry = countries.find(c => c.name === country);
            if (selectedCountry) {
                setAvailableStates(selectedCountry.states || []);

                if (state) {
                    const selectedState = selectedCountry.states.find(s => s.name === state);
                    setAvailableCities(selectedState?.cities || []);
                }
            }
        }
    }, [countries, country, state]);


    // Get default address
    function handleUseDefaultAddress() {
        fetch('/earth-hero/src/backend/users.php?action=getDefaultAddress', {
            credentials: 'include',
        })
        .then(res => res.json())
        .then(data => {
            if (data.default_address) {
                setRecipient(data.default_address.recipient || '');
                setAddress(data.default_address.address || '');
                setPostcode(data.default_address.postcode || '');
                setCity(data.default_address.city || '');
                setState(data.default_address.state || '');
                setCountry(data.default_address.country || '');
                setPhoneCode(data.default_address.phoneCode || '');
                setContactNumber(data.default_address.contact || '');
            } else {
                setErrorMsg("No default address found");
            }
        })
        .catch(err => console.error("Failed to fetch default address:", err));
    }

    // Get checkout items
    React.useEffect(() => {
        fetch("http://localhost/earth-hero/src/backend/cart.php?action=getCheckoutItems", {
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setCheckoutItems(data.items);
                setCheckoutAmount(data.pendingTransactions);
                console.log(data)
            } else {
                console.error("Failed to load checkout items", data.error);
            }
        })
        .catch(err => console.error("Error fetching checkout items:", err));
    }, []);


    // Revert checkout
    function handleCancelCheckout() {
        fetch("http://localhost/earth-hero/src/backend/transaction.php?action=failCheckout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": window.csrfToken
            },
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = "/earth-hero/src/cart.html";
            } else {
                alert("Failed to revert checkout: " + data.error);
            }
        })
        .catch(err => {
            console.error(err);
            alert("An error occurred while reverting checkout.");
        });
    }

    // Handle Submit (Checkout)
    async function handlePay(e) {
        e.preventDefault();

        if (!recipient.trim()) return setErrorMsg("Recipient name is required");
        if (!address.trim()) return setErrorMsg("Address is required");
        if (!postcode.trim()) return setErrorMsg("Postcode is required");
        if (!country) return setErrorMsg("Country must be selected");
        if (!state) return setErrorMsg("State must be selected");
        if (!city) return setErrorMsg("City must be selected");
        if (!phoneCode) return setErrorMsg("Phone code must be selected");
        if (!contactNumber.trim()) return setErrorMsg("Contact number is required");
        if (!shippingOption) return setErrorMsg("Please select a delivery option");
        if (!paymentMethod) return setErrorMsg("Please select a payment method");

        setErrorMsg(''); // Clear previous error
        setLoading(true);

        try {
            // Send checkout details to backend
            const response = await fetch(
                "/earth-hero/src/backend/transaction.php?action=confirmOrder",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": window.csrfToken
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        orderID: txn.orderID,
                        address: {
                            recipient,
                            address,
                            postcode,
                            city,
                            state,
                            country,
                            phoneCode,
                            contact: contactNumber
                        },
                        shippingOption,       // 'self', 'sea', or 'air'
                        paymentMethod,        // 'Paypal', 'Visa', etc.
                        totalPrice: total     // total including delivery fee
                    })
                }
            );

            const data = await response.json();
            setLoading(false);
            if (data.success) {
                setCheckoutConfirmed(true);
                setSuccessMessage(
                `Checkout successful! Confirmation email sent to ${data.email || 'your email'}`
            );
            } else {
                setErrorMsg("Checkout failed: " + data.error);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
            setErrorMsg("An unexpected error occurred during checkout.");
    }
    }
    
    const totalItems = checkoutItems.reduce((acc, i) => acc + i.qty, 0);

    console.log(shippingOption)
    console.log(paymentMethod)
    console.log(checkoutAmount);
    return e('div', { className: 'checkout-container' },
        // Error overlay
        errorMsg && e(ErrorOverlay, {
            message: errorMsg,
            onClose: () => setErrorMsg('')
        }),
        // Loading overlay
        loading &&
        e('div', { className: 'overlay loading-overlay' },
            e('div', { className: 'loader' }, "Processing your order...")
        ),

        // Success overlay
        successMessage &&
        e('div', { className: 'overlay success-overlay' },
            e('div', { className: 'success-box' },
                e('h2', null, "Order Placed!"),
                e('p', null, successMessage),
                e('button', { className: 'button', onClick: () => {
                    setSuccessMessage('');
                    window.location.href = "/earth-hero/src/purchase.html";
                } }, "Go to Order Details")
            )
        ),

        // TITLE
        e('h1', {className:'title-text'}, "Checkout"),
        // CHECKOUT FORM
        e('form', {className:'checkout-form', onSubmit: handlePay},
            // CHECKOUT DETAILS
            e('div', {className:'checkout-details'},
                // Shipping Details
                e('div', {className:'shipping-details'},
                    e('div', {className:'title-row'},
                        e('h2', {className:'details-title'},"Shipping Details"),
                        e('label', null,
                                e('input', {
                                    type: 'checkbox',
                                    checked: useDefaultAddr,
                                    onChange: e => {
                                        setUseDefaultAddr(e.target.checked);
                                        if (e.target.checked) {
                                            handleUseDefaultAddress();
                                        } else {
                                            setRecipient('');
                                            setAddress('');
                                            setPostcode('');
                                            setCity('');
                                            setState('');
                                            setCountry('');
                                            setPhoneCode('');
                                            setContactNumber('');
                                        }
                                    }
                                }),
                                'AutoFill Default Address'
                            ),
                    ),
                     e('div', { className: 'shipping-input' },
                       e('input', { 
                            type: 'text', 
                            className:'shipping-input-field',
                            placeholder: 'Enter Recipient Name', 
                            value: recipient,
                            onChange: e => setRecipient(e.target.value) 
                            }),
                        e('input', { 
                            type: 'text', 
                            className:'shipping-input-field',
                            placeholder: 'Enter address', 
                            value: address,
                            onChange: e => setAddress(e.target.value)  
                        }),
                        e('input', { type: 'text', className:'shipping-input-field', placeholder: 'Postcode', value: postcode, onChange: e => setPostcode(e.target.value) }),

                        // Country dropdown
                        e('select', {className:'shipping-input-field location-input', value: country, onChange: handleCountryChange },
                            e('option', { value: '' }, 'Select Country'),
                            countries.map((c, idx) => e('option', { key: `country-${idx}`, value: c.name }, c.name))
                        ),

                        // State dropdown
                        e('select', { className:'shipping-input-field location-input', value: state, onChange: handleStateChange },
                            e('option', { value: '' }, 'Select State'),
                            availableStates.map((s, idx) => e('option', { key: `state-${s.name}-${idx}`, value: s.name }, s.name))
                        ),

                        // City dropdown
                        e('select', { className:'shipping-input-field location-input', value: city, onChange: e => setCity(e.target.value) },
                            e('option', { value: '' }, 'Select City'),
                            availableCities.map((c, idx) => e('option', { key: `city-${c.name}-${idx}`, value: c.name }, c.name))
                        ),

                        e('div', { className: 'checkout-phone-row' },
                            // Phone code dropdown
                            e('select', { 
                                className:'shipping-phone-code phone-code-field',
                                value: phoneCode, 
                                onChange: e => setPhoneCode(e.target.value)
                            },
                                e('option', { value: '' }, 'Code'),
                                availablePhoneCodes.map((c, idx) => e('option', { key: `phone-${c.code}-${idx}`, value: c.code }, `+${c.code} (${c.name})`))
                            ),
                            // Contact number input
                            e('input', { 
                                type: 'tel', 
                                className:'shipping-input-field shipping-contact',
                                placeholder: 'Contact Number', 
                                value: contactNumber, 
                                onChange: e => setContactNumber(e.target.value),
                                style: { flex: 1 }
                            })
                        )
                    )
                ),

                // Delivery Options
                e('div', {className:'delivery-options'},
                    e('h2', {className:'details-title'},"Delivery Options"),
                    e('div', {className:'details-row'},
                        e('button', {
                            className: `options-wrapper ${shippingOption === 'self' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setShippingOption('self')
                        },
                            e('h3', {className:'option-name'}, "Self Collection"),
                            e('p', {className:'delivery-price'}, "Free")
                        ),

                        e('button', {
                            className: `options-wrapper ${shippingOption === 'sea' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setShippingOption('sea')
                        },
                            e('h3', {className:'option-name'}, "Sea Shipping"),
                            e('p', {className:'delivery-price'}, "RM8.00")
                        ),

                        e('button', {
                            className: `options-wrapper ${shippingOption === 'air' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setShippingOption('air')
                        },
                            e('h3', {className:'option-name'}, "Air Shipping"),
                            e('p', {className:'delivery-price'}, "RM15.00")
                        )

                    ),
                    e('p', {className:'sub-text'},"Guaranteed to receive within 1 week")
                ),

                // Payment Method
                e('div', {className:'payment-method'},
                    e('h2', {className:'details-title'},"Payment Method"),
                    e('div', {className:'details-row'},
                        e('button', {
                            className: `options-wrapper ${paymentMethod === 'Paypal' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setPaymentMethod('Paypal')
                        },
                            e('h3', {className:'option-name'}, "Paypal"),
                            e('i', {className: "fa-brands fa-cc-paypal"})
                        ),

                        e('button', {
                            className: `options-wrapper ${paymentMethod === 'Visa' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setPaymentMethod('Visa')
                        },
                            e('h3', {className:'option-name'}, "Visa"),
                            e('i', {className: "fa-brands fa-cc-visa"})
                        ),

                        e('button', {
                            className: `options-wrapper ${paymentMethod === 'Mastercard' ? 'active' : ''}`,
                            type: 'button',
                            onClick: () => setPaymentMethod('Mastercard')
                        },
                            e('h3', {className:'option-name'}, "Mastercard"),
                            e('i', {className: "fa-brands fa-cc-mastercard"})
                        )
                    )
                ),

                // Product Subscription
                e('div', {className:'product-subscription'},
                    e('h2', {className:'details-title'},"Product Subscription (Optional)"),
                    e('p', {className:'sub-text'},"Active subscription and never run out of your essentials."),
                    e('div', {className:'details-row'},
                        e('div', {className:'details-col'},
                            e('label', {className:'title-text'},"Frequency"),
                            e('div', {className:'details-row'},
                                e('button', {className:'button-wrapper'},"Weekly"),
                                e('button', {className:'button-wrapper'},"Monthly"),
                                e('button', {className:'button-wrapper'},"Yearly")
                            )
                        ),
                        e('div', {className:'details-col'},
                            e('label', {className:'title-text'},"Period"),
                            e('input', {type: 'text', className:'details-input period-input', placeholder:'e.g. Every 2 weeks'})
                        )
                    ),
                    e('div', {className:'details-col details-date'},
                        e('label', {className:'title-text'},"Starting Date"),
                        e('input', {type: 'date'}),
                    ),
                    e('div', {className:'details-col details-date'},
                        e('label', {className:'title-text'},"Ending Date"),
                        e('input', {type: 'date'}),
                    ),
                    // Unlock overlay 
                e('div', { className: 'unlock-overlay'},
                    e('div', {className: 'fa-solid fa-lock'}),
                    e('p', { className: 'word-text'},"Unlock Product Subscription feature now"),
                    e('button', {className: 'button'}, "Join Member")
                )                    
                ),                
            ),  
            
             // PAYMENT SUMMARY
            e('div', {className:'payment-summary'},
                e('h2', {className:'details-title'},"Payment Details"),
                // Expected arrival
                e('div', {className:'expected-arrival'},
                    shippingOption
                        ? `Estimated Arrival: ${estimatedArrival}`
                        : 'Select deliver option'
                ),
                // Item purchased
                e('div', { className: 'checkout-items-wrapper' },
                    Object.entries(itemsByShop).map(([shopName, items], shopIdx) =>
                        e('div', { key: `shop-${shopIdx}`, className: 'shop-group' },

                            // Shop header
                            e('div', { className: 'seller-container' },
                                e('i', { className: 'fa-solid fa-shop' }),
                                e('p', { className: 'sub-text' }, shopName)
                            ),

                            // Items under this shop
                            items.map((item, idx) =>
                                e('div', {
                                    key: `checkout-item-${shopIdx}-${idx}`,
                                    className: 'item-details-wrapper'
                                },
                                    e('div', { className: 'item-img-container checkout-img' },
                                        e('img', {
                                            className: 'item-img',
                                            src: item.variationImg,
                                            alt: 'img'
                                        })
                                    ),
                                    e('div', { className: 'item-col' },
                                        e('p', { className: 'item-name' }, item.productName),
                                        e('p', { className: 'item-var' }, item.variationName)
                                    ),
                                    e('div', { className: 'item-qty-price' },
                                        e('p', { className: 'sub-text' }, `x${item.qty}`),
                                        e('div', { className: 'item-prices' },
                                            e('h3', null, `RM${item.netPrice.toFixed(2)}`),
                                            e('p', { className: 'ori-price' },
                                                `RM${item.oriPrice.toFixed(2)}`
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),

                // Total Item
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
                    e('p', null, `RM${(deliveryFee || 0).toFixed(2)}`)
                ),
                e('div', {className: 'summary-row'},
                    e('h2', null,"Total"),
                    e('div', {className: 'total-price-summary'},
                        e('h2', null, `RM${(total).toFixed(2)}`),
                        e('p', null, `Saved RM${((txn.subtotal || 0) - (txn.totalPrice || 0)).toFixed(2)}`),
                    )
                ),
                
                e('button', {
                    className: 'button confirm-btn',
                    type: 'submit',
                    onClick: handlePay
                }, "Confirm order"),
                // Cancel button
                e('button', {
                    className: 'button cancel-btn',
                    type: 'button',
                    onClick: handleCancelCheckout
                }, "Cancel")
            )
        )
            
        
    );
}

// ====== Rendering =======
const checkoutContainer = document.getElementById('checkout-container');
ReactDOM.createRoot(checkoutContainer).render(e(CheckoutPage));