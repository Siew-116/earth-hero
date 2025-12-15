<?php
// products.php
include 'config.php';

$action = $_GET['action'] ?? '';
$products = [];

// New Arrivals
if ($action === "new-arrivals") {

    $sql = "
       SELECT
            p.productID,
            p.productName,
            c.name AS category,
            v.img,
            v.salePrice,
            v.rfrPrice,
            COALESCE(SUM(v2.sold), 0) AS totalSold,
            s.location,
            IFNULL(GROUP_CONCAT(DISTINCT t.name), '') AS tags,
            p.created_at
        FROM products p
        JOIN variations v 
            ON p.cover_varID = v.varID
        LEFT JOIN variations v2 
            ON v2.productID = p.productID
        JOIN category c 
            ON p.categoryID = c.categoryID
        JOIN sellers s 
            ON p.sellerID = s.sellerID
        LEFT JOIN producttag pt 
            ON p.productID = pt.productID
        LEFT JOIN tags t 
            ON pt.tagID = t.tagID
        GROUP BY p.productID
        ORDER BY MAX(p.created_at) DESC
        LIMIT 5;

    ";

    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'id' => (int)$row['productID'],
            'name' => $row['productName'],
            'category' => $row['category'],
            'image' => $row['img'],
            'price' => (float)$row['salePrice'],
            'originalPrice' => (float)$row['rfrPrice'],
            'sales' => (int)$row['totalSold'],
            'location' => $row['location'],
            'tags' => $row['tags'] ? explode(',', $row['tags']) : []
        ];
    }
    }
}

// Top Sellers
else if ($action === "top-sellers") {

    $sql = "
        SELECT
            p.productID,
            p.productName,
            c.name AS category,
            v.img,
            v.salePrice,
            v.rfrPrice,
            SUM(v2.sold) AS totalSold,
            s.location,
            GROUP_CONCAT(DISTINCT t.name) AS tags
        FROM products p

        -- cover variation (display)
        JOIN variations v 
            ON p.cover_varID = v.varID

        -- all variations (for SUM)
        JOIN variations v2 
            ON v2.productID = p.productID

        JOIN category c 
            ON p.categoryID = c.categoryID

        JOIN sellers s 
            ON p.sellerID = s.sellerID

        LEFT JOIN producttag pt 
            ON p.productID = pt.productID

        LEFT JOIN tags t 
            ON pt.tagID = t.tagID

        GROUP BY
            p.productID,
            p.productName,
            c.name,
            v.img,
            v.salePrice,
            v.rfrPrice,
            s.location

        ORDER BY totalSold DESC
        LIMIT 5
    ";

    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'id' => (int)$row['productID'],
            'name' => $row['productName'],
            'category' => $row['category'],
            'image' => $row['img'],
            'price' => (float)$row['salePrice'],
            'originalPrice' => (float)$row['rfrPrice'],
            'sales' => (int)$row['totalSold'],
            'location' => $row['location'],
            'tags' => $row['tags'] ? explode(',', $row['tags']) : []
        ];
    }
   
    }
}

// All products

// View products details 

// Filter products

// 

header('Content-Type: application/json');
echo json_encode($products);
exit;
?>
