export async function users(container) {
    container.innerHTML = `
    <div class="uh-content-full">
        <div class='uh-content-header'>
            <h2 class="section-title">Users Management</h2>

            <div class="date-filter">
                <div class="date-field">
                    <label for="fromDate">From</label>
                    <input type="date" id="fromDate">
                </div>

                <div class="date-field">
                    <label for="toDate">To</label>
                    <input type="date" id="toDate">
                </div>
            </div>
        </div>

        <div class="uh-stats-container">
            <div class="uh-cards">
                <div class="uh-card">
                    <h3>New Users</h3>
                    <h2 id="uh-newUsers">0</h2>
                    <span class="uh-trend" id="uh-newUserPercent">% increase compared to last month</span>
                </div>
                <div class="uh-card">
                    <h3>Total Users</h3>
                    <h2 id="uh-totalUsers">0</h2>
                </div>
            </div>

            <div class="uh-charts-grid">
                <div class="uh-chart-box">
                    <h4 class="uh-chart-title">Gender Distribution</h4>
                    <div class="uh-chart-container"><canvas id="uh-genderChart"></canvas></div>
                </div>
                <div class="uh-chart-box">
                    <h4 class="uh-chart-title">Top Countries</h4>
                    <div class="uh-chart-container"><canvas id="uh-countryChart"></canvas></div>
                </div>
                <div class="uh-chart-box">
                    <h4 class="uh-chart-title">Membership Plans</h4>
                    <div class="uh-chart-container"><canvas id="uh-membershipChart"></canvas></div>
                </div>
            </div>
        </div>

        <div class="uh-users-table-section">
            <div class="uh-table-header">
                <strong>Users List</strong>
                <input class="uh-search-input" id="uh-searchInput" placeholder="Search user">
            </div>

            <table class="uh-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th data-sort="1">User ID ⬍</th>
                        <th data-sort="2">Username ⬍</th>
                        <th data-sort="3">Email ⬍</th>
                        <th>Role</th>
                        <th data-sort="5">Created at ⬍</th>
                        <th>View</th>
                    </tr>
                </thead>
                <tbody id="uh-userBody"></tbody>
            </table>
        </div>


        <!-- USER MODAL -->
        <div id="uh-userModal" class="uh-modal">
            <div class="uh-modal-content">
                <div class="uh-modal-header">
                    <div><b>User ID</b> <span id="m_id"></span></div>
                    <span class="uh-close-btn" id="uh-closeModal">✖</span>
                </div>

                <div class="detail-row"><span>Username</span><span id="m_username"></span></div>
                <div class="detail-row"><span>Full Name</span><span id="m_fullname"></span></div>
                <div class="detail-row"><span>Email</span><span id="m_email"></span></div>
                <div class="detail-row"><span>Role</span><span id="m_role"></span></div>
                <div class="detail-row"><span>Gender</span><span id="m_gender"></span></div>
                <div class="detail-row"><span>Birthday</span><span id="m_birthday"></span></div>
                <div class="detail-row"><span>Eco Points</span><span id="m_points"></span></div>

                <hr>

                <div class="detail-row"><span>Recipient Name</span><span id="m_recipient"></span></div>
                <div class="detail-row"><span>Shipping Address</span><span id="m_address"></span></div>
                <div class="detail-row"><span>Postcode</span><span id="m_postcode"></span></div>
                <div class="detail-row"><span>City</span><span id="m_city"></span></div>
                <div class="detail-row"><span>Country</span><span id="m_country"></span></div>
                <div class="detail-row"><span>Phone code</span><span id="m_phone"></span></div>
                <div class="detail-row"><span>Contact Number</span><span id="m_contact"></span></div>

                <hr class="membership-hr">

                <div class="detail-row membership-row"><span>Membership ID</span><span id="m_membershipID"></span></div>
                <div class="detail-row membership-row"><span>Membership Plan</span><span id="m_plan"></span></div>
                <div class="detail-row membership-row"><span>Status</span><span id="m_status"></span></div>
                <div class="detail-row membership-row"><span>Payment Method</span><span id="m_payment"></span></div>
            </div>
        </div>
    </div>
    `;

    let allUsers = [];
    let searchTimer;
    let sortState = {};
    let genderChart, countryChart, membershipChart;

    // ------------------- LOAD DASHBOARD -------------------
    async function loadUsers(fromDate = null, toDate = null) {
        try {
            let url = "/earth-hero/src/backend/manageUsers.php?action=dashboard";

            if (fromDate && toDate) {
                url += `&from=${fromDate}&to=${toDate}`;
            }

            const res = await fetch(url);
            const d = await res.json();

            // Stat cards
            document.getElementById("uh-newUsers").innerText = d.newUsers;
            document.getElementById("uh-totalUsers").innerText = d.totalUsers;

            const percentEl = document.getElementById("uh-newUserPercent");
            const percent = Number(d.newUserPercent);

            if (percent > 0) {
                percentEl.innerText = `+${percent}% increase compared to previous period`;
                percentEl.classList.add("positive");
                percentEl.classList.remove("negative");
            } else if (percent < 0) {
                percentEl.innerText = `${percent}% decrease compared to previous period`;
                percentEl.classList.add("negative");
                percentEl.classList.remove("positive");
            } else {
                percentEl.innerText = `0% no change`;
                percentEl.classList.remove("positive", "negative");
            }

            // Table
            allUsers = d.users;
            renderTable(allUsers);

            // Charts
            drawChart("uh-genderChart", d.gender, genderChart, c => genderChart = c);
            drawChart("uh-countryChart", d.countries, countryChart, c => countryChart = c);
            drawChart("uh-membershipChart", d.memberships, membershipChart, c => membershipChart = c);

        } catch (err) {
            console.error("Dashboard error:", err);
        }
    }


    // ------------------- TABLE -------------------
    function renderTable(users) {
        const tbody = container.querySelector("#uh-userBody");
        tbody.innerHTML = users.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${u.userID}</td>
                <td>${u.username ?? '-'}</td>
                <td>${u.email ?? '-'}</td>
                <td>${u.role ?? '-'}</td>
                <td>${u.created_at ?? '-'}</td>
                <td class="uh-eye-cell">
                    <span class="uh-eye-icon" data-userid="${u.userID}"></span>
                </td>
            </tr>
        `).join("");

        // Attach click events for view user
        tbody.querySelectorAll(".uh-eye-icon").forEach(icon => {
            icon.addEventListener("click", () => viewUser(Number(icon.dataset.userid)));
        });

        // Attach sorting
        container.querySelectorAll("th[data-sort]").forEach(th => {
            th.onclick = () => sortTable(Number(th.dataset.sort));
        });
    }

    // ------------------- VIEW USER -------------------
    async function viewUser(id) {
        try {
            const res = await fetch(`/earth-hero/src/backend/manageUsers.php?action=viewUser&id=${id}`);
            const u = await res.json();

            const setText = (id, value) => {
                const el = container.querySelector(`#${id}`);
                if (el) el.innerText = value ?? '-';
            };

            container.querySelector("#uh-userModal").style.display = "flex";

            // Main info
            setText("m_id", u.userID);
            setText("m_username", u.username);
            setText("m_fullname", u.name);
            setText("m_email", u.email);
            setText("m_role", u.role);
            setText("m_gender", u.gender);
            setText("m_birthday", u.birthday);
            setText("m_points", u.ecoPoints);

            // Shipping info
            setText("m_recipient", u.recipient);
            setText("m_address", u.address);
            setText("m_postcode", u.postcode);
            setText("m_city", u.city);
            setText("m_country", u.country);
            setText("m_phone", u.phoneCode);
            setText("m_contact", u.contact);

            // Membership info
            setText("m_membershipID", u.membershipID);
            setText("m_plan", u.plan);
            setText("m_status", u.status);
            setText("m_payment", u.paymentMethod);


        } catch (err) {
            console.error("View user error:", err);
        }
    }

    // ------------------- MODAL -------------------
    container.querySelector("#uh-closeModal").onclick = () => {
        container.querySelector("#uh-userModal").style.display = "none";
    };

    // ------------------- SEARCH -------------------
    container.querySelector("#uh-searchInput").addEventListener("input", e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const q = e.target.value.toLowerCase();
            renderTable(allUsers.filter(u =>
                u.userID.toString().includes(q) ||
                (u.username ?? '').toLowerCase().includes(q) ||
                (u.email ?? '').toLowerCase().includes(q)
            ));
        }, 300);
    });

    // ------------------- SORTING -------------------
    function sortTable(colIndex) {
        sortState[colIndex] = (sortState[colIndex] || 0) + 1;
        if (sortState[colIndex] > 2) sortState[colIndex] = 0;
        if (sortState[colIndex] === 0) return renderTable(allUsers);

        const asc = sortState[colIndex] === 1;
        const sorted = [...allUsers].sort((a, b) => {
            const valA = Object.values(a)[colIndex - 1] ?? '';
            const valB = Object.values(b)[colIndex - 1] ?? '';
            return asc ? valA.toString().localeCompare(valB.toString())
                       : valB.toString().localeCompare(valA.toString());
        });
        renderTable(sorted);
    }

    // ------------------- CHARTS -------------------
    function drawChart(canvasId, data, chartInstance, assign) {
        if (chartInstance) chartInstance.destroy();
        const c = new Chart(container.querySelector(`#${canvasId}`), {
            type: 'doughnut',
            data: { labels: Object.keys(data), datasets: [{ data: Object.values(data) }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } } }
        });
        assign(c);
    }

    // ------------------- INIT -------------------
    loadUsers();


    // ------------------- FILTER USER BY REGISTER TIME -------------------
    const fromInput = container.querySelector("#fromDate");
    const toInput = container.querySelector("#toDate");

    // default: this month
    const today = new Date().toISOString().slice(0, 10);
    toInput.value = today;

    fromInput.addEventListener("change", reloadWithDate);
    toInput.addEventListener("change", reloadWithDate);

    function reloadWithDate() {
        const from = fromInput.value;
        const to = toInput.value;

        if (!from || !to) return;
        if (from > to) {
            alert("From date cannot be later than To date");
            return;
        }

        loadUsers(from, to);
    }

}
