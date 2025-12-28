export async function fetchProducts(){
    const res = await fetch("./backend/manageProducts.php?action=getProducts");
    if(!res.ok){
        throw new Error("Failed to load products");
    }
    return await res.json();
}