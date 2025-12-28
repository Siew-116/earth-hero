const e = React.createElement;
function PageHeader() {
    const [user, setUser] = React.useState({ loggedIn: false });
    const [openProfile, setOpenProfile] = React.useState(false);
    const [openMenu, setOpenMenu] = React.useState(false);
    const [cartCount, setCartCount] = React.useState(0);

   React.useEffect(() => {
        const loadSession = async () => {
            try {
                // 1️⃣ Try to get logged-in user info
                const resUser = await fetch('/earth-hero/src/backend/users.php?action=getUser', {
                    credentials: 'include'
                });
                const dataUser = await resUser.json();
            
                if (dataUser.loggedIn) {
                    // Logged-in user
                    setUser({
                        loggedIn: true,
                        ...dataUser.user,
                        defaultAddress: dataUser.default_address || {}
                    });
                    window.csrfToken = dataUser.csrf_token;
                    window.loggedIn = true;
                } 
            } catch (err) {
                setUser({ loggedIn: false });
            }
        };
        loadSession();
    }, []);


    
    // Get cart count
    React.useEffect(() => {
        fetch('/earth-hero/src/backend/cart.php?action=getCartCount', {
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setCartCount(data.totalItems);
            }
        })
        .catch(err => console.error("Failed to fetch cart count:", err));
    }, []);


    function checkLogin() {
        if (user.loggedIn && user.role === "User") {
            setOpenProfile(prev => !prev);
        } else {
            window.location.href = '/earth-hero/src/register.html';
        }
    }
    
    function handleLogout() {
        fetch("/earth-hero/src/backend/logout.php", {
            method: "POST",
            credentials: "include" 
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // update React state or redirect
                window.location.href = "/earth-hero/src/index.html"; 
            }
        })
        .catch(err => console.error(err));
    }
    
    function goToSection(section) {
        window.location.href = `/earth-hero/src/profile.html?section=${section}`;
    }

    // Listen from shop page add cart
    React.useEffect(() => {
        function handleCartUpdate(e) {
            setCartCount(prev => prev + (e.detail.quantity || 0));
        }

        window.addEventListener('cartUpdated', handleCartUpdate);

        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

    return e('header', { className: 'site-header' },
        e('a', { href: "./index.html", className: 'title-container'},
        // Logo
        e('img', { className: 'logo-img', src: '../assets/earthhero-green.jpg', alt: 'logo'}),
        // Site title
        e('h1', { className: 'app-title' }, 'EarthHero'),
        ),
    
        // Navigation
        e('div', { className: 'nav-container'},
        e('nav', null,
            e('a', { className: 'nav-btn', href: "./index.html" }, 'Home'),
            e('a', { className: 'nav-btn', href: "./shop.html" }, 'Shop Now'),
            e('a', { className: 'nav-btn', href: '#'}, 'About'),
            e('a', { className: 'nav-btn', href: '#' }, 'Pricing'),
            e('a', { className: 'nav-btn', href: '#' }, 'Contact'),
            e('a', { className: 'nav-btn', href: '#' }, 'Join Us'),
            e('a', { className: 'nav-btn', href: "./purchase.html" }, 'My Purchase'),
            e("button", {className: 'cart-btn', onClick: () => { window.location.href = './cart.html'; } },
                e('i', { className: 'fa fa-cart-shopping'}),
                    cartCount > 0 && e('span', {className: 'cart-count-badge'}, cartCount)
            ),
            e("button", {
                onClick: checkLogin,
                id: 'profile-btn', 
                className: 'profile-btn'},
                e('i', { className: 'fa fa-user' }),
            ),
            // Responsive hamburger
            e("button", {onClick: () => setOpenMenu(!openMenu), className: 'hamburger'}, '☰'),    
        )
        ),
        // MENU SIDEBAR
        openMenu && e('div', {
            className: 'sidebar',
            onMouseLeave: () => setOpenMenu(false)
        },
            e('a', { className: 'side-link', href: "./index.html" }, 'Home'),
            e('a', { className: 'side-link', href: "./shop.html" }, 'Shop Now'),
            e('a', { className: 'side-link', href: '#' }, 'About'),
            e('a', { className: 'side-link', href: '#' }, 'Pricing'),
            e('a', { className: 'side-link', href: '#' }, 'Contact'),
            e('a', { className: 'side-link', href: '#' }, 'Join Us'),
            e('a', { className: 'side-link', href: "./purchase.html" }, 'My Purchase'),
            e('a', { className: 'side-link', href: './cart.html' }, `Cart (${cartCount})`),
            e('button', { className: 'side-link', onClick: checkLogin}, 'Account')
        ),
        // PROFILE MENU SIBEBAR
        user.loggedIn && openProfile && e('div', {
            className: 'sidebar',
            onMouseLeave: () => setOpenProfile(false)
        },
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("my-profile") }, 'My Profile'),
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("subcription") }, 'Subscription'),
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("rewards") }, 'Rewards & Voucher'),
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("help") }, 'Help Centre'),
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("privacy") }, 'Privacy Policy'),
            e('button', { className: 'side-link', 
                onClick: ()=> goToSection("terms-conditon") }, 'Terms and Condition'),
            e('button', { className: 'logout-btn', 
                onClick: () => handleLogout() }, 'Logout')
        )
    );
}

// Render the component
const siteHeader = document.getElementById('header-container');
ReactDOM.createRoot(siteHeader).render(e(PageHeader));

