export function dashboardCard(container, navigate){
    // We append to the title already created in loadView
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';

    grid.innerHTML = `
        <div class="card" id="card-users">
            <i class="fa-solid fa-users-viewfinder"></i>
            <p>View Users</p>
        </div>
        <div class="card" id="card-products">
            <i class="fa-solid fa-box-archive"></i>
            <p>Manage Products</p>
        </div>
        <div class="card" id="card-transactions">
            <i class="fa-solid fa-money-bill-transfer"></i>
            <p>View Transaction Summary</p>
        </div>
    `;
    container.appendChild(grid);

    // add click event for the Products card
    const userCard = grid.querySelector("#card-users");
    const productCard = grid.querySelector("#card-products");
    const transCard = grid.querySelector("#card-transactions");

    if(userCard) userCard.onclick = () => navigate("users"); 
    if(productCard) productCard.onclick = () => navigate("products"); 
    if(transCard) transCard.onclick = () => navigate("transactions"); 





    grid.querySelector("#card-users").onclick = () => navigate("users");
    grid.querySelector("#card-transactions").onclick = () => navigate("transactions");
}