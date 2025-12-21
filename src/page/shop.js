
function Shop() {
    const [csrfToken, setCsrfToken] = React.useState('');
    const [successMsg, setSuccessMsg] = React.useState('');
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'All';
    const initialSearch = urlParams.get('search') || '';
    const initialProductId = urlParams.get('productId');
    const [selectedProductId, setSelectedProductId] = React.useState(initialProductId);
    const [category, setCategory] = React.useState(initialCategory);
    const [filters, setFilters] = React.useState({
        location: '',
        lowestPrice: '',
        highestPrice: '',
        tagName: '',
        //isNewArrival: false,
        //isTopSales: false
    });
    const [tagList, setTagList] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [searchText, setSearchText] = React.useState(initialSearch);
    const [selectedProduct, setSelectedProduct] = React.useState(null);

    
    // Track search bar
    const resultTitle = React.useMemo(() => {
        const cat = category || 'All';

        if (searchText && searchText.trim() !== '') {
            return `${cat} > "${searchText}"`;
        }

        return cat;
    }, [category, searchText]);

    // Track selected product Id to fetch details
    React.useEffect(() => {
        function fetchSelectedProduct() {
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('productId');
            if (!productId) {
                setSelectedProduct(null);
                return;
            }
            console.log(productId)
            fetch(`/earth-hero/src/backend/products.php?action=viewProduct&productId=${productId}`)
                .then(res => res.json())
                .then(data => {console.log(data);setSelectedProduct(data)})
                .catch(console.error);
        }

        // run on mount
        fetchSelectedProduct();

        // run when URL changes
        window.addEventListener('popstate', fetchSelectedProduct);
        return () => window.removeEventListener('popstate', fetchSelectedProduct);
    }, []);



    // Get all hashtags to be used in filtering
    React.useEffect(() => {
        fetch('/earth-hero/src/backend/products.php?action=allHashtags')
            .then(res => res.json())
            .then(data => setTagList(data))
            .catch(console.error);
    }, []);


    // Always update filter
    React.useEffect(() => {
        function handleSearchEvent(e) {
            const keyword = e.detail.search;
            setSearchText(keyword);       
            fetchProducts(category, keyword);
        }

        window.addEventListener('searchUpdated', handleSearchEvent);
        return () => window.removeEventListener('searchUpdated', handleSearchEvent);
    }, [category]);


    // Fetch all hashtags
    /*React.useEffect(() => {
        fetch('/src/backend/products.php?action=allHashtags') // your backend endpoint
            .then(res => res.json())
            .then(data => setTagList(data))
            .catch(err => console.error(err));
    }, []);*/

    // Return all products (refresh will clear all search result)
    // Return filtered products
    // Redirect and get product details

    // Search (apply to current list)
    // Filter (apply to current list)
    
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
            .then(res => res.json())
            .then(setProducts)
            .catch(console.error);


    }, [category, filters, searchText]);

    // Apply filter btn
    function handleApply() {
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

        fetch(`http://localhost/earth-hero/src/backend/products.php?action=getProducts&${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                // Update products list state
                console.log(data);
            })
            .catch(err => console.error(err));
    }

    

    // Conditional render (product list/ product details)
    
    return e('div', { className: 'shop-container' },
        selectedProduct
            // Product Details UI
            ? e('div', {className: 'product-details-container'},
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
                e('div', null, "CAN YOU SEEEEEEEEE")
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