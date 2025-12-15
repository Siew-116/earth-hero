
function SearchBar({ onSearch }) {
    const e = React.createElement;
    const [query, setQuery] = React.useState("");

    function handleChange(e) {
        setQuery(e.target.value);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (onSearch) onSearch(query);
    }

    return e("form", { className: "search-bar", onSubmit: handleSubmit },
        // search icon
        e('div', { className: 'left-wrapper' },
            e("i", { className: "fa fa-search search-icon" }),
            e("input", {
                className: "search-input",
                type: "text",
                placeholder: "Search eco products..",
                value: query,
                onChange: handleChange
            })
        ),
        e("button",
            { type: "submit", className: "text-button" },
            "Search"            
        )
    );
}
// Render the component
const searchContainer = document.getElementById('search-bar');
ReactDOM.createRoot(searchContainer).render(e(SearchBar));

