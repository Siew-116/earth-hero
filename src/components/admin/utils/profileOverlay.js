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

export function showProfileOverlay(adminData, targetElement) {
    // Check if an overlay already exists and remove it to toggle
    const existing = document.getElementById('profile-dropdown');
    if (existing) {
        existing.remove();
        return;
    }

    const dropdown = document.createElement('div');
    dropdown.id = 'profile-dropdown';
    dropdown.className = 'profile-dropdown-menu';

    dropdown.innerHTML = `
        <div class="profile-info">
            <div class="profile-row">
                <span class="label">Admin ID</span>
                <span class="value">${adminData.userID}</span>
            </div>
            <div class="profile-row">
                <span class="label">Name</span>
                <span class="value">${adminData.name}</span>
            </div>
        </div>
        <button id="logout-btn" class="logout-button">Logout</button>
    `;

    document.body.appendChild(dropdown);

    // Position the dropdown below the header icon
    const rect = targetElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 10}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;

    // Logout logic
    dropdown.querySelector('#logout-btn').onclick = () => {
         handleLogout();
    };

    // Close when clicking outside
    const closeHandler = (e) => {
        if (!dropdown.contains(e.target) && !targetElement.contains(e.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}