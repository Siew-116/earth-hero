function SearchBar() {
    const e = React.createElement;
    const [keyword, setKeyword] = React.useState("");

    function handleChange(e) {
        setKeyword(e.target.value);
    }

    function handleSubmit(e) {
        e.preventDefault();
        const currentPath = window.location.pathname;
        const isShopPage = currentPath.endsWith('shop.html');

        if (isShopPage) {
            // Already on shop.html, update URL param
            const url = new URL(window.location);
            url.searchParams.set('search', keyword);
            if (!url.searchParams.get('category')) {
                url.searchParams.set('category', 'All');
            }
            window.history.replaceState({}, '', url);

            // Dispatch custom event so Shop component can listen
            const event = new CustomEvent('searchUpdated', { detail: { search: keyword } });
            window.dispatchEvent(event);

        } else {
            // On another page, redirect to shop.html with params
            const params = new URLSearchParams();
            params.set('category', 'All');
            if (keyword) params.set('search', keyword);
            window.location.href = `/earth-hero/src/shop.html?${params.toString()}`;
        }
    }

    return e("form", { className: "search-bar", onSubmit: handleSubmit },
        e('div', { className: 'left-wrapper' },
            e("i", { className: "fa fa-search search-icon" }),
            e("input", {
                className: "search-input",
                type: "text",
                placeholder: "Search products by name or description..",
                value: keyword,
                onChange: handleChange
            })
        ),
        e("button", { type: "submit", className: "text-button" }, "Search")
    );
}

// Render
const searchContainer = document.getElementById('search-bar');
ReactDOM.createRoot(searchContainer).render(e(SearchBar));
