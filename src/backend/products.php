<?php
// products.php
include 'config.php';

$action = $_GET['action'] ?? '';
$products = [];

// Filter product list(GET)
if ($action === "getProducts") {
    
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
        JOIN variations v ON p.cover_varID = v.varID
        JOIN variations v2 ON v2.productID = p.productID
        JOIN category c ON p.categoryID = c.categoryID
        JOIN sellers s ON p.sellerID = s.sellerID
        LEFT JOIN producttag pt ON p.productID = pt.productID
        LEFT JOIN tags t ON pt.tagID = t.tagID
        WHERE 1=1
    ";

    $params = [];

    // --- Filters ---
    if (!empty($_GET['category']) && $_GET['category'] !== 'All') {
        $sql .= " AND c.name = ?";
        $params[] = $_GET['category'];
    }

    if (!empty($_GET['search'])) {
        $sql .= " AND p.productName LIKE ?";
        $params[] = "%" . $_GET['search'] . "%";
    }

    if (!empty($_GET['location'])) {
        $sql .= " AND s.location = ?";
        $params[] = $_GET['location'];
    }

    if (!empty($_GET['tagName'])) {
        $sql .= " AND t.name = ?";
        $params[] = $_GET['tagName'];
    }

    if (!empty($_GET['lowestPrice'])) {
        $sql .= " AND v.salePrice >= ?";
        $params[] = $_GET['lowestPrice'];
    }

    if (!empty($_GET['highestPrice'])) {
        $sql .= " AND v.salePrice <= ?";
        $params[] = $_GET['highestPrice'];
    }

    // --- Group & order ---
    $sql .= "
        GROUP BY
            p.productID
    ";

    $stmt = $conn->prepare($sql);

    if ($params) {
        $types = str_repeat('s', count($params));
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
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

    echo json_encode($products);
    exit();
}


// New Arrivals (GET)
else if ($action === "new-arrivals") {

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

// Top Sellers (GET)
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

// All hashtags (GET)
else if ($action === "allHashtags") {

    $sql = "
        SELECT
            t.tagID,
            t.name
        FROM tags t
        ORDER BY t.name ASC
    ";

    $result = $conn->query($sql);

    $tags = [];

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tags[] = [
                'id'   => (int)$row['tagID'],
                'name' => $row['name']
            ];
        }
    }

    header('Content-Type: application/json');
    echo json_encode($tags);
    exit;
}



// View products details (GET)
if ($action === "viewProduct" && !empty($_GET['productId'])) {
    $productId = $_GET['productId'];

    $sql = "
        SELECT
            p.productID,
            p.productName,
            p.shipping_days AS shippingDays,
            p.description,
            c.name AS category,
            s.name AS sellerName,
            s.location,
            v.img,
            v.name AS variationName,
            v.salePrice,
            v.rfrPrice,
            v.stock,
            v.sold,
            IFNULL(GROUP_CONCAT(DISTINCT t.name), '') AS tags
        FROM products p
        JOIN category c ON p.categoryID = c.categoryID
        JOIN sellers s ON p.sellerID = s.sellerID
        JOIN variations v ON v.productID = p.productID
        LEFT JOIN variations v2 ON v2.productID = p.productID
        LEFT JOIN producttag pt ON p.productID = pt.productID
        LEFT JOIN tags t ON pt.tagID = t.tagID
        WHERE p.productID = ?
        GROUP BY v.varID;
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $productId);
    $stmt->execute();
    $result = $stmt->get_result();

    $product = null;
    $variations = [];
    $tags = [];

    while ($row = $result->fetch_assoc()) {
        if (!$product) {
            $product = [
                'id' => (int)$row['productID'],
                'name' => $row['productName'],
                'description' => $row['description'],
                'category' => $row['category'],
                'sellerName' => $row['sellerName'],
                'location' => $row['location'],
                'shippingDays' => $row['shippingDays']
            ];
        }

        // Collect variations
        $variations[] = [
            'name' => $row['variationName'],
            'image' => $row['img'],
            'price' => number_format((float)$row['salePrice'], 2, '.', ''),
            'originalPrice' => number_format((float)$row['rfrPrice'], 2, '.', ''),
            'stock' => (int)$row['stock'],
            'sold' => (int)$row['sold']
        ];

        // Collect tags
        if ($row['tags']) {
            $tags = array_unique(array_merge($tags, explode(',', $row['tags'])));
        }
    }

    if ($product) {
        $product['variations'] = $variations;
        $product['tags'] = $tags;
    }

    header('Content-Type: application/json');
    echo json_encode($product ?? []);
    exit();
}



// Get hashtags (GET)

header('Content-Type: application/json');
echo json_encode($products);
exit;
?>
