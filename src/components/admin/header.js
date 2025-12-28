import { showProfileOverlay } from "./utils/profileOverlay.js";

async function fetchCurrentUser() {
    const res = await fetch(
        "/earth-hero/src/backend/users.php?action=getUser",
        {
            method: "GET",
            credentials: "include" 
        }
    );

    const data = await res.json();
    console.log(data)
    if (!data.loggedIn) {
        throw new Error("Not logged in");
    }
    return data.user;
}

export function header(container) {
    container.innerHTML = `
        <header class="admin-header">
            <button id="menu-toggle" class="menu-toggle">
                <i class="fa-solid fa-bars"></i>
            </button>
            <h1>EarthHero Admin Portal</h1>
            <div id="profile-trigger" class="user-profile">
                <i class="fa-solid fa-circle-user"></i>
            </div>
        </header>
    `;

    // ⚡ Immediately verify Admin role on page load
    (async () => {
        try {
            const user = await fetchCurrentUser();
            if (user.role !== "Admin") {
                window.location.href = "/earth-hero/src/register.html";
                return;
            }
        } catch (err) {
            console.error(err);
            window.location.href = "/earth-hero/src/register.html";
        }
    })();

    const profileTrigger = container.querySelector("#profile-trigger");
    profileTrigger.onclick = async () => {
        try {
            const user = await fetchCurrentUser();

            if (user.role !== "Admin") {
                window.location.href = "/earth-hero/src/register.html";
                return;
            }

            showProfileOverlay(user, profileTrigger);
        } catch (err) {
            console.error(err);
            window.location.href = "/earth-hero/src/register.html";
        }
    };

    // sidebar toggle logic
    const toggleBtn = container.querySelector("#menu-toggle");
    toggleBtn.onclick = (e) => {
        const sidebar = document.getElementById("admin-sidebar");
        if(sidebar){
            sidebar.classList.toggle("active");
        }
    };
}
