
function Shop() {
    const [csrfToken, setCsrfToken] = React.useState('');
    const [successMsg, setSuccessMsg] = React.useState('');
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'All';
    const [category, setCategory] = React.useState(initialCategory);
    const [filters, setFilters] = React.useState({
        location: '',
        lowestPrice: '',
        highestPrice: '',
        tagName: '',
        //tagList: '',
        //isNewArrival: false,
        //isTopSales: false
    });
    const [products, setProducts] = React.useState([]);

    

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
        const params = new URLSearchParams({
            category,
            location: filters.location,
            lowestPrice: filters.lowestPrice,
            highestPrice: filters.highestPrice,
            tagName: filters.tagName
        });
console.log(params.toString());
        fetch(`/earth-hero/src/backend/products.php?action=getProducts&${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                console.log(data)
                setProducts(data);
            })
            .catch(console.error);

    }, [category, filters]);

    

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

        fetch(`http://localhost/earth-hero/src/backend/products.php?action=getProducts&${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                // Update products list state
                console.log(data);
            })
            .catch(err => console.error(err));
    }

    return e('div', {className: 'shop-container'},
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
                    onChange: (e) => setFilters(prev => ({ ...prev, tagName: e.target.value }))
                },
                    e('option', { value: filters.tagName}, 'Select hashtags')
                    /*,...tagList.map(tag => e('option', { key: tag.id, value: tag.name }, tag.name))*/
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
                        onChange: (e) => setFilters(prev => ({ ...prev, isNewArrival: e.target.checked }))
                    }), 'New Arrivals'  
                ),
                e('label', {className: 'checkbox-label'},
                    e('input', {
                        type: 'checkbox',
                        className: 'others-checkbox',
                        checked: filters.isTopSales,
                        onChange: (e) => setFilters(prev => ({ ...prev, isTopSales: e.target.checked }))
                    }), 'Top Sales'  
                )
            ),
            // Apply button
            e('button', {
                className: 'button', 
                id: 'apply-btn',
            }, 'Apply')
        ),
    
        // Shop Content
        e('div', {className: 'shop-content'},
            // Category
            // Search result
            // Shop List
            e(ProductList, { products })
        )
    );
    
    
}

function ShopPage() {


    return e(Shop);

}

// ====== Rendering =======
const shopContainer = document.getElementById('shop-container');
ReactDOM.createRoot(shopContainer).render(e(ShopPage));