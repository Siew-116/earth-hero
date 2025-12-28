import { sidebar } from "./sidebar.js"
import { header } from "./header.js"
import { products } from "./products.js";
import { dashboardCard } from "./dashboardCard.js";
import { users } from "../users/userDashboard.js";
import { transactions } from "../transactions/transactionDashboard.js";

const app = document.getElementById("admin-app");

export function loadView(view){
    const main = document.getElementById("admin-main");
    main.innerHTML = "";

    if (view === "dashboard"){
        dashboardCard(main, loadView);
    }

    if (view === "products"){
        products(main);
    }

    if (view === "users"){
        users(main); 
    }

    if (view === "transactions"){
        transactions(main); 
    }
}

app.innerHTML = `
    <div class="admin-layout">
        <div id="admin-sidebar"></div>
        <div class="admin-content">
            <div id="admin-header"></div>
            <main id="admin-main"></main>
        </div>
    </div>
`;

sidebar(document.getElementById("admin-sidebar"), loadView);
header(document.getElementById("admin-header"));

// default view
loadView("dashboard");


