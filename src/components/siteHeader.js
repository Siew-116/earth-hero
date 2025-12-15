const e = React.createElement;
function PageHeader() {
    const [user, setUser] = React.useState({ loggedIn: false });
    const [openProfile, setOpenProfile] = React.useState(false);
    const [openMenu, setOpenMenu] = React.useState(false);
    const [cartCount, setCartCount] = React.useState(3);

    // Check session on page load
    React.useEffect(() => {
        fetch('http://localhost/earth-hero/src/backend/current_user.php', {
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
            setUser(data);
        });
    }, []);

    function checkLogin() {
        if (user.loggedIn) {
            setOpenProfile(prev => !prev);
        } else {
            window.location.href = 'http://localhost/earth-hero/src/register.html';
        }
    }
    
    function handleLogout() {
        fetch("http://localhost/earth-hero/src/backend/logout.php", {
            method: "POST",
            credentials: "include"  // important for session cookies
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log("Logged out successfully");
                // update React state or redirect
                window.location.href = "http://localhost/earth-hero/src/index.html"; 
            }
        })
        .catch(err => console.error(err));
    }
    
    function goToSection(section) {
        window.location.href = `http://localhost/earth-hero/src/profile.html?section=${section}`;
    }


    return e('header', { className: 'site-header' },
        e('div', { className: 'title-container'},
        // Logo
        e('img', { className: 'logo-img', src: '../assets/earthhero-green.jpg', alt: 'logo'}),
        // Site title
        e('h1', { className: 'app-title' }, 'EarthHero'),
        ),
    
        // Navigation
        e('div', { className: 'nav-container'},
        e('nav', null,
            e('a', { className: 'nav-btn', href: '#' }, 'Home'),
            e('a', { className: 'nav-btn', href: '#' }, 'Shop Now'),
            e('a', { className: 'nav-btn', href: '#'}, 'About'),
            e('a', { className: 'nav-btn', href: '#' }, 'Pricing'),
            e('a', { className: 'nav-btn', href: '#' }, 'Contact'),
            e('a', { className: 'nav-btn', href: '#' }, 'Join Us'),
            e('a', { className: 'nav-btn', href: '#' }, 'My Purchase'),
            e("button", {className: 'cart-btn'},
                e('i', { className: 'fa fa-cart-shopping' }),
                    cartCount > 0 && e('span', {className: 'cart-count-badge',}, 10)
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
            e('a', { className: 'side-link', href: '#' }, 'Home'),
            e('a', { className: 'side-link', href: '#' }, 'Shop Now'),
            e('a', { className: 'side-link', href: '#' }, 'About'),
            e('a', { className: 'side-link', href: '#' }, 'Pricing'),
            e('a', { className: 'side-link', href: '#' }, 'Contact'),
            e('a', { className: 'side-link', href: '#' }, 'Join Us'),
            e('a', { className: 'side-link', href: '#' }, 'My Purchase'),
            e('a', { className: 'side-link', href: '#' }, 'Cart'),
            e('a', { className: 'side-link', href: '#' }, 'My Profile')
        ),
        // PROFILE MENU SIBEBAR
        user.loggedIn && openProfile && e('div', {
            className: 'sidebar',
            onMouseLeave: () => setOpenProfile(false)
        },
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("my-profile") }, 'My Profile'),
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("subcription") }, 'Subscription'),
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("rewards") }, 'Rewards & Voucher'),
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("help") }, 'Help Centre'),
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("privacy") }, 'Privacy Policy'),
            e('button', { className: 'side-link', 
                onClick: ()=> setCurrentSection("terms-conditon") }, 'Terms and Condition'),
            e('button', { className: 'logout-btn', 
                onClick: () => handleLogout() }, 'Logout')
        )
    );
}

// Render the component
const siteHeader = document.getElementById('header-container');
ReactDOM.createRoot(siteHeader).render(e(PageHeader));

