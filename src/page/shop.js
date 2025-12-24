
function Shop() {
    const [successMsg, setSuccessMsg] = React.useState('');
    const [errorMsg, setErrorMsg] = React.useState('');
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'All';
    const initialSearch = urlParams.get('search') || '';
    const initialProductId = urlParams.get('productId');
    const [category, setCategory] = React.useState(initialCategory);
    const [filters, setFilters] = React.useState({
        location: '',
        lowestPrice: '',
        highestPrice: '',
        tagName: ''
    });
    const [tagList, setTagList] = React.useState([]);
    const [products, setProducts] = React.useState([]); // product list
    const [searchText, setSearchText] = React.useState(initialSearch);
    const [selectedProduct, setSelectedProduct] = React.useState(null); // single product
    const [activeVar, setActiveVar] = React.useState(null);
    const [quantity, setQuantity] = React.useState(1);
    const [activeTab, setActiveTab] = React.useState('description'); // default tab

    const [user, setUser] = React.useState({ loggedIn: false });
      const allOutOfStock = React.useMemo(() => {
        if (!selectedProduct?.variations?.length) return true;
        return selectedProduct.variations.every(v => v.stock <= 0);
    }, [selectedProduct]);

    // Authenticate user status
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/earth-hero/src/backend/users.php?action=getUser', { credentials: 'include' });
                const data = await res.json();
                if (data.loggedIn) setUser({ loggedIn: true, ...data.user });
            } catch {
                setUser({ loggedIn: false });
            }
        };

        fetchUser();
    }, []);


    React.useEffect(() => {
        console.log('Selected variation changed:', activeVar);
    }, [activeVar]);

    
    // Track selected product Id to fetch details
    React.useEffect(() => {
        const fetchSelectedProduct = async () => {
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('productId');

            if (!productId) {
                setSelectedProduct(null);
                return;
            }

            console.log(productId);

            try {
                const res = await fetch(
                    `/earth-hero/src/backend/products.php?action=viewProduct&productId=${productId}`
                );
                const data = await res.json();
                console.log(data);
                setSelectedProduct(data);
            } catch (err) {
                console.error(err);
            }
        };

        // run on mount
        fetchSelectedProduct();

        // run when URL changes
        window.addEventListener('popstate', fetchSelectedProduct);
        return () => window.removeEventListener('popstate', fetchSelectedProduct);
    }, []);




    // Get all hashtags to be used in filtering
    React.useEffect(() => {
        const fetchHashtags = async () => {
            try {
                const res = await fetch('/earth-hero/src/backend/products.php?action=allHashtags');
                const data = await res.json();
                setTagList(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchHashtags();
    }, []);



    // Always update filter
    React.useEffect(() => {
        function handleSearchEvent(e) {
            const keyword = e.detail.search;
            setSearchText(keyword);       
        }

        window.addEventListener('searchUpdated', handleSearchEvent);
        return () => window.removeEventListener('searchUpdated', handleSearchEvent);
    }, [category]);


    // Load default variation selection
    React.useEffect(() => {
        if (!selectedProduct?.variations?.length) return;

        const firstAvailable = selectedProduct.variations.find(v => v.stock > 0);

        if (firstAvailable) {
            setActiveVar(firstAvailable);
        } else {
            setActiveVar(selectedProduct.variations[0]); // all out of stock
        }
    }, [selectedProduct]);


    // Fetch products whenever category changes
    React.useEffect(() => {
        let endpoint = 'getProducts';
        let params = new URLSearchParams();

        if (filters.isNewArrival) {
            endpoint = 'new-arrivals';
            setCategory('All');
            setSearchText('');
        }
        else if (filters.isTopSales) {
            endpoint = 'top-sellers';
            setCategory('All');
            setSearchText('');
        }
        else {
            // NORMAL FILTER MODE
            params.set('category', category);
            params.set('location', filters.location);
            params.set('lowestPrice', filters.lowestPrice);
            params.set('highestPrice', filters.highestPrice);
            params.set('tagName', filters.tagName);

            if (searchText) {
                params.set('search', searchText);
            }
        }

        console.log(params.toString());

        const url = `${window.location.pathname}?action=${endpoint}&${params.toString()}`;
        window.history.pushState({}, '', url);

        fetch(`/earth-hero/src/backend/products.php?action=${endpoint}&${params.toString()}`)
            .then(res => res.text())
            .then(text => {
                let data = [];
                try {
                    if (text) data = JSON.parse(text);
                } catch (err) {
                    console.error('JSON parse error', err, text);
                }
                setProducts(data);
            })
            .catch(console.error);

    }, [category, filters, searchText]);


    // Apply filter btn
    function handleApply(e) {
        e.preventDefault(); // prevent page reload

        const params = new URLSearchParams({
            location: filters.location,
            lowestPrice: filters.lowestPrice,
            highestPrice: filters.highestPrice,
            tagName: filters.tagName,
            isNewArrival: filters.isNewArrival ? 1 : '',
            isTopSales: filters.isTopSales ? 1 : '',
            category
        });

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);

        fetch(`/earth-hero/src/backend/products.php?action=getProducts&${params.toString()}`)
            .then(res => res.text())
            .then(text => {
                let data = [];
                try {
                    if (text) data = JSON.parse(text);
                } catch (err) {
                    console.error('JSON parse error', err, text);
                }
                setProducts(data);
                console.log(data);
            })
            .catch(err => console.error(err));
    }

    // Add to cart
    async function handleAddToCart() {
        if (allOutOfStock || !activeVar || !selectedProduct) return;

        const payload = {
            productId: selectedProduct.id,
            variationId: activeVar.varId,
            quantity
        };

        console.log(payload);

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
                setSuccessMsg('Added to cart successfully');
                // Update activeVar stock
                /*setActiveVar(prev => prev ? { 
                    ...prev, 
                    stock: prev.stock - quantity,
                    sold: prev.sold + quantity
                } : prev);
        
                // Update stock inside selectedProduct.variations
                setSelectedProduct(prev => {
                    if (!prev) return prev;

                    const updatedVariations = prev.variations.map(v => 
                        v.varId === activeVar.varId 
                        ? { ...v, stock: v.stock - quantity, sold: v.sold + quantity } 
                        : v
                    );

                    return { ...prev, variations: updatedVariations };
                });*/
                console.log(data);
                const quantity = payload.quantity ?? 0; 
                const event = new CustomEvent('cartUpdated', { detail: { quantity } });
                window.dispatchEvent(event);
            } else {
                setErrorMsg('Update failed: ' + data.message);
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    }

    

    React.useEffect(() => {
        if (!successMsg) return;

        const timer = setTimeout(() => {
            setSuccessMsg('');
        }, 1500); // 3 seconds

        return () => clearTimeout(timer);
    }, [successMsg]);


    // Conditional render (product list/ product details)
    return e('div', { className: 'shop-container' },
        successMsg && e(SuccessOverlay, {
            message: successMsg,
            onClose: () => setSuccessMsg('')
        }),
        errorMsg && e(ErrorOverlay, {
            message: errorMsg,
            onClose: () => setErrorMsg('')
        }),
        selectedProduct
            // Product Details UI
            ? e('div', {className: 'product-details-container'},
                // Back button
                e('button', {
                    className: 'back-btn',
                    onClick: () => {
                        // Clear selected product
                        setSelectedProduct(null);

                        // Remove productId from URL
                        const url = new URL(window.location);
                        url.searchParams.delete('productId');
                        window.history.pushState({}, '', url);
                    }
                }, '< Back to Shop'),
                // Product details card
                e('div', {className: 'details-container'},
                    // Left details
                    e('div', {className: 'left-details'},
                        e('p', { className: 'p-category' }, selectedProduct.category),
                        e('p', { className: 'p-name' }, selectedProduct.name),
                        e('div', { id:'p-tag',className: 'product-tags' },
                            (selectedProduct.tags || []).map((tag, index) => 
                                e('p', { key: index, id: 'hashtags' }, null, tag)
                            )
                        ),
                        e('div', { className: 'p-img-container' },
                        e('img', {
                            className: 'product-img',
                            src: activeVar?.image,
                            alt: selectedProduct.name
                        }))
                    ),
                    // Right details
                    e('div', {className: 'right-details'},
                        e('div', { className: 'price-container' },
                            e('h3', { id: 'p-price' }, null, `RM ${activeVar?.price}`),
                            e('p', { id: 'p-ori-price' }, null, `RM ${activeVar?.originalPrice}`)
                        ),
                        e('div', { className: 'product-info' },
                            e('p',{ id: 'product-sales' }, null, `${activeVar?.sold} sold`),
                            e('p',{ id: 'product-location' }, null, `From ${selectedProduct.location}`)
                        ),
                        e('div', { className: 'seller-container' },
                            e('i', { className: 'fa-solid fa-shop' }),
                            e('p', { className: 'word-text' }, selectedProduct.sellerName)
                        ),
                        e('div', { className: 'ship-container' },
                            e('i', { className: 'fa-solid fa-truck' }),
                            e('p', { className: 'word-text' }, `Shipping within ${selectedProduct.shippingDays} days`)
                        ),
                        e('h4', { className: 'variation-title' }, 'Variations'),
                        //Varaitons
                        e('div', { className: 'variation-buttons' },
                            (selectedProduct?.variations || []).map((v, idx) => {
                                const isSelected = activeVar?.varId === v.varId;
                                const isOutOfStock = v.stock <= 0;

                                return e('button', {
                                    key: v.varId || idx,
                                    className: `
                                        variation-btn
                                        ${isSelected ? 'selected' : ''}
                                        ${isOutOfStock ? 'out-of-stock' : ''}
                                    `,
                                    disabled: isOutOfStock,
                                    onClick: () => {
                                        if (!isOutOfStock) {
                                            setActiveVar(v);
                                            setQuantity(1);
                                        }
                                    }
                                }, v.name);
                            })
                        ),
                        allOutOfStock && e('p', { className: 'out-stock-hint' },
                            'All variations are currently out of stock'
                        ),

                        e('div', { className: 'details-action' },
                            e('div', { className: 'left-selector' },
                                // Selected amount
                                e('div', { className: 'qty-selector' },
                                    e('button', {
                                        className: 'qty-btn',
                                        onClick: () => setQuantity(prev => Math.max(1, prev - 1)) // min 1
                                    }, '-'),
                                    e('span', { className: 'qty-value' }, quantity),
                                    e('button', {
                                        className: 'qty-btn',
                                        onClick: () => setQuantity(prev => Math.min(activeVar?.stock || 1, prev + 1)) // max stock
                                    }, '+')
                                ),
                                // Stock
                                e('p', { className: 'sub-text' }, `${activeVar?.stock} stock available`),
                            ),
                            // Add to cart button
                            e('button', {
                                className: `add-cart-btn ${allOutOfStock ? 'disabled' : ''}`,
                                disabled: allOutOfStock,
                                onClick: allOutOfStock ? null : handleAddToCart
                            },
                                allOutOfStock ? 'Out of Stock' : 'Add to Cart'
                            )


                        )

                    )
                ),

                // Product Info Tabs
                e('div', { className: 'p-info' },

                    // Tab headers
                    e('div', { className: 'p-info-tabs' },
                        ['description', 'eco', 'reviews'].map(tab => {
                            const tabLabel = tab === 'description' ? 'Description'
                                            : tab === 'eco' ? 'Eco Description'
                                            : 'Reviews';

                            const tabClass = activeTab === tab ? 'tab active' : 'tab';

                            return e(
                                'button',
                                {
                                    key: tab,
                                    className: tabClass,
                                    onClick: () => setActiveTab(tab)
                                },
                                tabLabel
                            );
                        })
                    ),

                    // Tab content
                    e('div', { className: 'p-info-content' },
                        activeTab === 'description' && e('p', null, selectedProduct.description),
                        activeTab === 'eco' && e('p', null, "THis i s made by eco dfirned;ly porudct"),
                        activeTab === 'reviews' && e('div', null,
                            e('div', {className: 'review-header'},
                                e('p', {className: 'review-rate'}, '4.2 /5'),
                                e('div', {className: 'star-group1'},
                                    e('i', { className: 'fa fa-star' }),
                                    e('i', { className: 'fa fa-star' }),
                                    e('i', { className: 'fa fa-star' }),
                                    e('i', { className: 'fa fa-star' }),
                                    e('i', { className: 'fa fa-star' })
                                ),
                                e('div', { className: 'review-filter' },
                                    e('button', {className: 'review-btn'}, 'All' ),
                                    e('button', {className: 'review-btn'}, 'With Media' ),
                                    e('select', { 
                                        className: 'review-dropdown',
                                        value: 'Variation 1',
                                        onChange: (event) => console.log(event.target.value)
                                    },
                                        e('option', { value: '' }, 'Choose variation'),
                                        e('option', { value: 'Variation 1' }, 'Variation 1'),
                                        e('option', { value: 'Variation 2' }, 'Variation 2'),
                                        e('option', { value: 'Variation 3' }, 'Variation 3')

                                    ),
                                )   
                            ),
                            e('div', {className: 'review-content'},
                                e('div', {className: 'comment-container'},
                                    e('div', {className: 'comment-title'},
                                        e('h5', {className:'author'}, "Alice1232"),
                                        e('p', null , "Variation1")
                                    ),
                                    e('div', {className: 'star-group2'},
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' })
                                    ),
                                    e('p', {className:'comment-time'} , "2025-11-25 15:58"),
                                    e('p', {className:'comment-text'}, "I really appreciate the sustainability nehind this products.Knowing they are made form organic materials make me feel good for my purchase. The quality is good."),
                                    e('div', {className: 'review-img-container'},
                                        e('img', { src: '../assets/review-img.webp', alt: 'logo' })
                                    )
                                ),
                                e('div', {className: 'comment-container'},
                                    e('div', {className: 'comment-title'},
                                        e('h5', {className:'author'}, "Alice1232"),
                                        e('p', null , "Variation1")
                                    ),
                                    e('div', {className: 'star-group2'},
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' })
                                    ),
                                    e('p', {className:'comment-time'} , "2025-11-25 15:58"),
                                    e('p', {className:'comment-text'}, "I really appreciate the sustainability nehind this products.Knowing they are made form organic materials make me feel good for my purchase. The quality is good."),
                                    e('div', {className: 'review-img-container'},
                                        e('img', { src: '../assets/review-img.webp', alt: 'logo' })
                                    )
                                ),
                                e('div', {className: 'comment-container'},
                                    e('div', {className: 'comment-title'},
                                        e('h5', {className:'author'}, "Alice1232"),
                                        e('p', null , "Variation1")
                                    ),
                                    e('div', {className: 'star-group2'},
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' })
                                    ),
                                    e('p', {className:'comment-time'} , "2025-11-25 15:58"),
                                    e('p', {className:'comment-text'}, "I really appreciate the sustainability nehind this products.Knowing they are made form organic materials make me feel good for my purchase. The quality is good."),
                                    e('div', {className: 'review-img-container'},
                                        e('img', { src: '../assets/review-img.webp', alt: 'logo' })
                                    )
                                ),
                                e('div', {className: 'comment-container'},
                                    e('div', {className: 'comment-title'},
                                        e('h5', {className:'author'}, "Alice1232"),
                                        e('p', null , "Variation1")
                                    ),
                                    e('div', {className: 'star-group2'},
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' }),
                                        e('i', { className: 'fa fa-star' })
                                    ),
                                    e('p', {className:'comment-time'} , "2025-11-25 15:58"),
                                    e('p', {className:'comment-text'}, "I really appreciate the sustainability nehind this products.Knowing they are made form organic materials make me feel good for my purchase. The quality is good."),
                                    e('div', {className: 'review-img-container'},
                                        e('img', { src: '../assets/review-img.webp', alt: 'logo' })
                                    )
                                )
                            )
                        )
                    )
                )
            )

            // Product List UI
            : e(React.Fragment, null, 
            //Filter
            e('div', {className: 'filter-menu'},
                e('form', {className:'filter-form', onSubmit: handleApply},
                    e('h2', null, 'Filters'),
                    // Location
                    e('label', {
                        className:'filter-title'
                    }, 'Location'),
                    e('input', {
                        className:'filter-input', 
                        type: 'text',
                        placeholder: 'Delivery from...',
                        value: filters.location,
                        onChange: (e) => setFilters(prev => ({ ...prev, location: e.target.value }))
                    }),  
                    // Price range
                    e('label', {
                        className:'filter-title'
                    }, 'Price Range'),
                    e('label', null, 'From (RM)'),
                    e('input', {
                        className:'filter-input', 
                        type: 'text',
                        placeholder: 'Lowest price',
                        value: filters.lowestPrice,
                        onChange: (e) => setFilters(prev => ({ ...prev, lowestPrice: e.target.value }))
                    }),
                    e('label', null, 'To (RM)'),
                    e('input', {
                        className:'filter-input', 
                        type: 'text',
                        placeholder: 'Highest price',
                        value: filters.highestPrice,
                        onChange: (e) => setFilters(prev => ({ ...prev, highestPrice: e.target.value }))
                    }),
                    // Tags
                    e('label', {
                        className:'filter-title'
                    }, '# Hashtags'),   
                    e('select', { 
                        className:'tags-dropdown',
                        value: filters.tagName,
                        onChange: (e) =>
                            setFilters(prev => ({ ...prev, tagName: e.target.value }))
                    },
                        e('option', { value: '' }, 'All hashtags'),
                        ...tagList.map(tag =>
                            e('option', { key: tag.name, value: tag.name }, `#${tag.name}`)
                        )
                    ),
                    // Others
                    e('label', {
                        className:'filter-title'
                    }, 'Others'),
                    e('label', {className: 'checkbox-label'},
                        e('input', {
                            type: 'checkbox',
                            className: 'others-checkbox',
                            checked: filters.isNewArrival,
                            onChange: (e) => setFilters(prev => ({ ...prev, isNewArrival: e.target.checked, isTopSales: false }))
                        }), 'New Arrivals'  
                    ),
                    e('label', {className: 'checkbox-label'},
                        e('input', {
                            type: 'checkbox',
                            className: 'others-checkbox',
                            checked: filters.isTopSales,
                            onChange: (e) => setFilters(prev => ({ ...prev, isTopSales: e.target.checked, isNewArrival: false }))
                        }), 'Top Sales'  
                    )
                )
            ),
        
            // Shop Content
            e('div', {className: 'shop-content'},
                // Category
                e('div', { className: 'category-container' },
                    e('div', { className: 'category-list' },

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Home%20%26%20Kitchen',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-kitchen-set' }),
                            e('p', { className: 'category-name' }, 'Home & Kitchen')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Cloth%20%26%20Accessories',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-shirt' }),
                            e('p', { className: 'category-name' }, 'Cloth & Accessories')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Beauty%20%26%20Personal%20Care',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-paintbrush' }),
                            e('p', { className: 'category-name' }, 'Beauty & Personal Care')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Health%20%26%20Wellness',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-prescription-bottle-medical' }),
                            e('p', { className: 'category-name' }, 'Health & Wellness')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Food%20%26%20Beverages',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-utensils' }),
                            e('p', { className: 'category-name' }, 'Food & Beverages')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Electronics%20%26%20Gadgets',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-computer' }),
                            e('p', { className: 'category-name' }, 'Electronics & Gadgets')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Garden%20%26%20Outdoor',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-seedling' }),
                            e('p', { className: 'category-name' }, 'Garden & Outdoor')
                        ),

                        e('a', {
                            href: '/earth-hero/src/shop.html?category=Kids%20%26%20Pets%20Essentials',
                            className: 'category-card'
                        },
                            e('i', { className: 'fa-solid fa-bone' }),
                            e('p', { className: 'category-name' }, 'Kids & Pets Essentials')
                        )
                    )
                ),

                // Search result   
                e('div', {className: 'search-result-container'},
                    e('div', { className: 'search-result-title' },
                        e('span', {
                            className: 'breadcrumb-link',
                            onClick: () => {
                                setCategory('All');
                                setSearchText('');
                                const url = new URL(window.location);
                                url.searchParams.delete('category');
                                url.searchParams.delete('search');
                                window.history.replaceState({}, '', url);
                            }
                        }, 'ALL'),
                        // Category (only if not All)
                        category && category !== 'All' &&
                            e('span', null, ` > ${category}`),

                        // Search text (only if exists)
                        searchText &&
                            e('span', null, ` > "${searchText}"`)
                    ),
                    // Total search results
                    e('div', {className: 'search-result-total'},
                        e('p', null, `${products.length} search result${products.length !== 1 ? 's' : ''} found`)
                    )
                ),
                // Shop List
                e('div', {className: 'product-result'},
                    e(ProductList, { products }),
                ),
                e('div', { className: 'subtext' },
                    "That’s everything we found for you."
                )
            )
        )
    );
    
    
}

function ShopPage() {

    
    return e(Shop);

}

// ====== Rendering =======
const shopContainer = document.getElementById('shop-container');
ReactDOM.createRoot(shopContainer).render(e(ShopPage));