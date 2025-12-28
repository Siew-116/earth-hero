export function sidebar(container, navigate) {
    container.innerHTML = `
        <button class="close-btn mobile-only">&times;</button>

        <div class="sidebar-logo" id="logo-home">
            <img src="../assets/earthhero-green.jpg" alt="Logo">
            <h2>EarthHero</h2>
        </div>

        <nav class="sidebar-nav">
            <button class="active" data-view="dashboard">
                <i class="fa-solid fa-house"></i> Dashboard
            </button>
            <button data-view="users">
                <i class="fa-solid fa-users"></i> Users
            </button>
            <button data-view="products">
                <i class="fa-solid fa-boxes-stacked"></i> Products
            </button>
            <button data-view="transactions">
                <i class="fa-solid fa-clock-rotate-left"></i> Transactions
            </button>
        </nav>
    `;

    const sidebarEl = container; // container itself is the sidebar
    const buttons = sidebarEl.querySelectorAll("nav button");
    const closeBtn = sidebarEl.querySelector(".close-btn");
    const logoHome = sidebarEl.querySelector("#logo-home");

    // Close sidebar button
    closeBtn.onclick = () => sidebarEl.classList.remove("active");

    // Logo click → dashboard
    logoHome.onclick = () => {
        buttons.forEach(b => b.classList.remove("active"));
        const dashBtn = sidebarEl.querySelector('[data-view="dashboard"]');
        if (dashBtn) dashBtn.classList.add("active");

        navigate("dashboard");

        // auto-close sidebar on mobile
        if (window.innerWidth <= 768) sidebarEl.classList.remove("active");
    };

    // Navigation buttons
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            navigate(btn.dataset.view);

            if (window.innerWidth <= 768) sidebarEl.classList.remove("active");
        };
    });
}
