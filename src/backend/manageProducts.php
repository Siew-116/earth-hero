<?php
include 'config.php';
header('Content-Type: application/json');



$action = $_GET['action'] ?? '';

if ($action === 'allCategories') {
    // --- RETURN ALL CATEGORIES ---
    $res = $conn->query("SELECT categoryID, name FROM category ORDER BY name ASC");
    $categories = [];
    while($row = $res->fetch_assoc()) {
        $categories[] = $row;
    }
    echo json_encode($categories);
    exit();
}

if ($action === 'allSellers') {
    // --- RETURN ALL SELLERS ---
    $res = $conn->query("SELECT sellerID, name, location FROM sellers ORDER BY name ASC");
    $sellers = [];
    while($row = $res->fetch_assoc()) {
        $sellers[] = $row;
    }
    echo json_encode($sellers);
    exit();
}

if ($action === 'getSellerLocation') {

    header('Content-Type: application/json; charset=utf-8');

    $sellerID = $_GET['sellerID'] ?? null;

    if (!$sellerID) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Seller ID missing'
        ]);
        exit;
    }

    $stmt = $conn->prepare("SELECT location FROM sellers WHERE sellerID = ?");
    $stmt->bind_param("i", $sellerID);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($row = $res->fetch_assoc()) {
        echo json_encode([
            'status' => 'success',
            'location' => $row['location']
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Seller not found'
        ]);
    }
    exit;
}

// --- 1. HANDLE POST REQUESTS (Writing Data) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'addProduct') {
    $conn->begin_transaction();

    try {
        // --- 1. VALIDATE PRODUCT DETAILS ---
        $productName  = trim($_POST['name'] ?? '');
        $categoryID   = $_POST['categoryID'] ?? '';
        $description  = trim($_POST['description'] ?? '');
        $shippingDays = $_POST['shipping'] ?? '';
        $sellerID     = $_POST['sellerID'] ?? '';
        $coverVarName = trim($_POST['hero_variation'] ?? '');
        $tagsInput    = trim($_POST['tags'] ?? '');

        $errors = [];

        if (!$productName)   $errors[] = "Product name is required.";
        if (!$categoryID)    $errors[] = "Category is required.";
        if (!$sellerID)      $errors[] = "Seller ID is required.";
        if (!$coverVarName)  $errors[] = "Hero/Cover variation is required.";
        if ($shippingDays === '') $errors[] = "Shipping days is required.";

        // --- 2. VALIDATE SELLER EXISTS ---
        $stmt = $conn->prepare("SELECT sellerID FROM sellers WHERE sellerID=?");
        if (!$stmt) throw new Exception("Prepare failed for seller check: " . $conn->error);
        $stmt->bind_param("i", $sellerID);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) $errors[] = "Seller does not exist.";

        // --- 3. VALIDATE CATEGORY EXISTS ---
        $stmt = $conn->prepare("SELECT categoryID FROM category WHERE categoryID=?");
        if (!$stmt) throw new Exception("Prepare failed for category check: " . $conn->error);
        $stmt->bind_param("i", $categoryID);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) $errors[] = "Category does not exist.";

        // --- 4. VALIDATE VARIATIONS ---
        $v_names  = $_POST['v_name'] ?? [];
        $v_prices = $_POST['v_price'] ?? [];
        $v_rfr    = $_POST['v_rfr'] ?? [];
        $v_stocks = $_POST['v_stock'] ?? [];
        $v_sales  = $_POST['v_sales'] ?? [];
        $v_images = $_FILES['v_image'] ?? null;

        $validVariations = [];
        $coverVarDBID    = null;

        $uploadsDir = __DIR__ . "/../../assets/";
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

        if (empty($v_names) || !is_array($v_names)) {
            $errors[] = "At least one variation is required.";
        } else {
            foreach ($v_names as $i => $name) {
                $name  = trim($name);
                $price = $v_prices[$i] ?? '';
                $rfr   = $v_rfr[$i] ?? '';
                $stock = $v_stocks[$i] ?? '';
                $sales = $v_sales[$i] ?? '';

                $imageUploaded = isset($v_images['tmp_name'][$i]) && $v_images['tmp_name'][$i];

                if (!$name || $price === '' || $rfr === '' || $stock === '' || $sales === '' || !$imageUploaded) {
                    continue; // skip incomplete variation
                }

                // Save uploaded image
                $ext = pathinfo($v_images['name'][$i], PATHINFO_EXTENSION);
                $imgName = uniqid("prod_") . "." . $ext;
                $imgPath = $uploadsDir . $imgName;

                if (!move_uploaded_file($v_images['tmp_name'][$i], $imgPath)) {
                    $errors[] = "Failed to upload image for variation '$name'.";
                }

                $validVariations[] = [
                    'name'  => $name,
                    'price' => $price,
                    'rfr'   => $rfr,
                    'stock' => $stock,
                    'sales' => $sales,
                    'image' => "../assets/" . $imgName
                ];
            }

            if (count($validVariations) === 0) {
                $errors[] = "All variations must have full details including image.";
            }
        }

        if (!empty($errors)) {
            throw new Exception(implode(" ", $errors));
        }

        // --- 5. INSERT PRODUCT ---
        $stmt = $conn->prepare("INSERT INTO products (productName, categoryID, sellerID, description, shipping_days, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        if (!$stmt) throw new Exception("Prepare failed for product insert: " . $conn->error);
        $stmt->bind_param("siisi", $productName, $categoryID, $sellerID, $description, $shippingDays);
        $stmt->execute();
        $newProductID = $conn->insert_id;

        // --- 6. INSERT VARIATIONS ---
        $vStmt = $conn->prepare("INSERT INTO variations (productID, img, salePrice, rfrPrice, stock, sold, name) VALUES (?, ?, ?, ?, ?, ?, ?)");
        if (!$vStmt) throw new Exception("Prepare failed for variations insert: " . $conn->error);

        foreach ($validVariations as $v) {
            $vStmt->bind_param(
                "isdiiis",
                $newProductID,
                $v['image'],
                $v['price'],
                $v['rfr'],
                $v['stock'],
                $v['sales'],
                $v['name']
            );
            $vStmt->execute();
            $varID = $conn->insert_id;

            if ($v['name'] === $coverVarName) $coverVarDBID = $varID;
        }

        // --- 7. UPDATE PRODUCT WITH COVER VARIATION ---
        if ($coverVarDBID !== null) {
            $upd = $conn->prepare("UPDATE products SET cover_varID=? WHERE productID=?");
            if (!$upd) throw new Exception("Prepare failed for cover update: " . $conn->error);
            $upd->bind_param("ii", $coverVarDBID, $newProductID);
            $upd->execute();
        } else {
            throw new Exception("Cover variation does not match any variation.");
        }

        // --- 8. INSERT TAGS ---
        if ($tagsInput) {
            $tagsArr = array_map('trim', explode(',', $tagsInput));
            foreach ($tagsArr as $tagName) {
                if (!$tagName) continue;

                // Insert tag if not exists
                $stmt = $conn->prepare("SELECT tagID FROM tags WHERE name=?");
                if (!$stmt) throw new Exception("Prepare failed for tag select: " . $conn->error);
                $stmt->bind_param("s", $tagName);
                $stmt->execute();
                $res = $stmt->get_result();

                if ($res->num_rows > 0) {
                    $tagID = $res->fetch_assoc()['tagID'];
                } else {
                    $ins = $conn->prepare("INSERT INTO tags (name) VALUES (?)");
                    if (!$ins) throw new Exception("Prepare failed for tag insert: " . $conn->error);
                    $ins->bind_param("s", $tagName);
                    $ins->execute();
                    $tagID = $conn->insert_id;
                }

                $pt = $conn->prepare("INSERT INTO productTag (productID, tagID) VALUES (?, ?)");
                if (!$pt) throw new Exception("Prepare failed for productTag insert: " . $conn->error);
                $pt->bind_param("ii", $newProductID, $tagID);
                $pt->execute();
            }
        }

        $conn->commit();
        echo json_encode(["status" => "success", "id" => $newProductID]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

    exit();
}

// --- 2. HANDLE GET REQUESTS (Reading Data) ---

// Dynamic Stats for the Dashboard Cards
if ($action === "getStats") {
    $prodResult = $conn->query("SELECT COUNT(*) as total FROM products");
    $totalProds = $prodResult->fetch_assoc()['total'];
    $sellerResult = $conn->query("SELECT COUNT(DISTINCT sellerID) as total FROM products");
    $totalSellers = $sellerResult->fetch_assoc()['total'];

    echo json_encode([
        "totalProducts" => (int)$totalProds,
        "totalSellers" => (int)$totalSellers
    ]);
    exit();
}


if ($action === "getProducts") {
    $sql = $sql = '
        SELECT
            p.productID,
            p.productName,
            p.description,
            p.shipping_days,
            p.created_at,
            c.categoryID,
            c.name AS category,
            s.sellerID,
            s.name AS sellerName,
            s.location,
            p.cover_varID,
            v_cover.img AS cover_img,
            v_cover.name AS hero_variation,
            COALESCE(SUM(v_all.stock),0) AS totalStock,
            COALESCE(SUM(v_all.sold),0) AS totalSold,
            CONCAT(\'[\', GROUP_CONCAT(
                JSON_OBJECT(
                    "varID", v_all.varID, 
                    "name", v_all.name,
                    "img", v_all.img,
                    "salePrice", v_all.salePrice,
                    "rfrPrice", v_all.rfrPrice,
                    "stock", v_all.stock,
                    "sold", v_all.sold
                )
            ), \']\') AS variations_json,
            GROUP_CONCAT(DISTINCT t.name) AS tags
        FROM products p
        LEFT JOIN variations v_cover ON p.cover_varID = v_cover.varID
        LEFT JOIN variations v_all ON p.productID = v_all.productID
        LEFT JOIN category c ON p.categoryID = c.categoryID
        LEFT JOIN sellers s ON p.sellerID = s.sellerID
        LEFT JOIN producttag pt ON p.productID = pt.productID
        LEFT JOIN tags t ON pt.tagID = t.tagID
        GROUP BY p.productID
    ';
    
    $result = $conn->query($sql);
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Decode variations JSON
        $variations = json_decode($row['variations_json'] ?? '[]', true);

        // Normalize images for variations
        foreach ($variations as &$v) {
            $v['img'] = $v['img'] ? '../' . preg_replace('/^(\.\.\/|\.\/|\/)/', '', $v['img']) : '../assets/placeholder.png';
        }

        // Use hero variation image if set, otherwise use first variation's image, fallback to placeholder
        $mainImage = $row['cover_img'] 
            ?: ($variations[0]['img'] ?? '../assets/placeholder.png');

        $products[] = [
            'id' => (int)$row['productID'],
            'name' => $row['productName'],
            'description' => $row['description'] ?: 'No description provided.',
            'shipping_days' => (int)$row['shipping_days'],
            'categoryID' => (int)$row['categoryID'],
            'category' => $row['category'] ?? 'Uncategorized',
            'image' => $mainImage,
            'stock' => (int)$row['totalStock'],
            'sales' => (int)$row['totalSold'],
            'sellerID' => $row['sellerID'] ?? 'N/A',
            'seller' => $row['sellerName'] ?? 'N/A',
            'cover_varID' => (int)$row['cover_varID'],
            'location' => $row['location'] ?? 'N/A',
            'shipping_days' => $row['shipping_days'],
            'created_at' => $row['created_at'],
            'hero_variation' => $row['hero_variation'] ?? ($variations[0]['name'] ?? 'None'),
            'tags' => $row['tags'] ? explode(',', $row['tags']) : [],
            'variations' => $variations
        ];
    }

    echo json_encode($products);
    exit();
}




// Helper to populate the Category Dropdown in Add/Edit forms
if ($action === "allCategories") {
    // match database table category
    $result = $conn->query("SELECT categoryID as id, name FROM category ORDER BY name ASC");
    $cats = [];
    while($row = $result->fetch_assoc()) {
        $cats[] = $row;
    }
    echo json_encode($cats);
    exit();
}

// UPDATE PRODUCTS
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'updateProduct') {

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    header('Content-Type: application/json; charset=utf-8');

    $debug = [];
    $conn->begin_transaction();

    try {
        // --- GET POST DATA ---
        $productID    = (int)($_POST['productID'] ?? 0);
        $productName  = trim($_POST['name'] ?? '');
        $categoryID   = (int)($_POST['categoryID'] ?? 0);
        $description  = trim($_POST['description'] ?? '');
        $shippingDays = (int)($_POST['shipping'] ?? 0);
        $tagsInput    = trim($_POST['tags'] ?? '');
        $heroVarID    = (int)($_POST['hero_variation'] ?? 0);

        if (!$productID) throw new Exception("Product ID missing");

        $debug['POST'] = $_POST;

        // --- FETCH CURRENT PRODUCT ---
        $stmt = $conn->prepare("SELECT * FROM products WHERE productID=?");
        $stmt->bind_param("i", $productID);
        $stmt->execute();
        $product = $stmt->get_result()->fetch_assoc();
        if (!$product) throw new Exception("Product not found");

        // --- UPDATE PRODUCT FIELDS ---
        $fields = [];
        $params = [];
        $types  = '';

        if ($productName && $productName !== $product['productName']) {
            $fields[] = "productName=?";
            $params[] = $productName;
            $types .= 's';
        }
        if ($categoryID && $categoryID != $product['categoryID']) {
            $fields[] = "categoryID=?";
            $params[] = $categoryID;
            $types .= 'i';
        }
        if ($description !== $product['description']) {
            $fields[] = "description=?";
            $params[] = $description;
            $types .= 's';
        }
        if ($shippingDays != $product['shipping_days']) {
            $fields[] = "shipping_days=?";
            $params[] = $shippingDays;
            $types .= 'i';
        }

        if ($fields) {
            $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE productID=?";
            $params[] = $productID;
            $types .= 'i';

            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();

            $debug['product_update_sql'] = $sql;
            $debug['product_rows'] = $stmt->affected_rows;
        }

        // --- UPDATE VARIATIONS ---
        $vIDs    = $_POST['varID'] ?? [];
        $vPrices = $_POST['v_price'] ?? [];
        $vRFRs   = $_POST['v_rfr'] ?? [];
        $vStocks = $_POST['v_stock'] ?? [];

        $varUpdates = [];
        foreach ($vIDs as $i => $varID) {
            $stmt = $conn->prepare("
                UPDATE variations 
                SET salePrice=?, rfrPrice=?, stock=? 
                WHERE varID=?
            ");
            $stmt->bind_param(
                "ddii",
                $vPrices[$i],
                $vRFRs[$i],
                $vStocks[$i],
                $varID
            );
            $stmt->execute();

            $varUpdates[] = [
                'varID' => $varID,
                'affected' => $stmt->affected_rows
            ];
        }
        $debug['variations'] = $varUpdates;

        // --- UPDATE HERO VARIATION ---
        if ($heroVarID) {
            $stmt = $conn->prepare("UPDATE products SET cover_varID=? WHERE productID=?");
            $stmt->bind_param("ii", $heroVarID, $productID);
            $stmt->execute();
            $debug['cover_rows'] = $stmt->affected_rows;
        }

        // --- UPDATE TAGS ---
        $conn->query("DELETE FROM productTag WHERE productID=$productID");

        if ($tagsInput) {
            foreach (explode(',', $tagsInput) as $tag) {
                $tag = trim($tag);
                if (!$tag) continue;

                // Insert tag if not exists
                $stmt = $conn->prepare("INSERT IGNORE INTO tags (name) VALUES (?)");
                $stmt->bind_param("s", $tag);
                $stmt->execute();

                // Get tagID
                $tagID = $conn->insert_id ?: $conn
                    ->query("SELECT tagID FROM tags WHERE name='". $conn->real_escape_string($tag) ."'")
                    ->fetch_assoc()['tagID'];

                // Insert product-tag relation
                $stmt = $conn->prepare("INSERT INTO productTag (productID, tagID) VALUES (?, ?)");
                $stmt->bind_param("ii", $productID, $tagID);
                $stmt->execute();
            }
        }

        $conn->commit();

        echo json_encode([
            "status" => "success",
            "message" => "Product updated successfully",
            "debug" => $debug
        ]);

    } catch (Throwable $e) {
        $conn->rollback();
        error_log($e->getMessage());

        echo json_encode([
            "status" => "error",
            "message" => $e->getMessage(),
            "debug" => $debug
        ]);
    }
    exit;
}


// --- DELETE PRODUCT (POST method) ---
if ($action === 'deleteProduct' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    $ids = [];

    if (isset($_POST['id'])) {
        $ids[] = (int)$_POST['id'];
    } elseif (isset($_POST['ids']) && is_array($_POST['ids'])) {
        $ids = array_map('intval', $_POST['ids']);
    }

    if (empty($ids)) {
        echo json_encode(["status"=>"error","message"=>"No product IDs provided"]);
        exit();
    }

    $idList = implode(',', $ids);

    $conn->begin_transaction();

    try {
        // NULL cover_varID (VERY IMPORTANT)
        $conn->query("
            UPDATE products
            SET cover_varID = NULL
            WHERE productID IN ($idList)
        ");

        //  Get variation IDs
        $varIDs = [];
        $res = $conn->query("
            SELECT varID, img
            FROM variations
            WHERE productID IN ($idList)
        ");
        while ($row = $res->fetch_assoc()) {
            $varIDs[] = (int)$row['varID'];

            // delete image file
            if (!empty($row['img'])) {
                $imgPath = __DIR__ . "/../../" . $row['img'];
                if (file_exists($imgPath)) unlink($imgPath);
            }
        }

        // Delete items (child of variations)
        if (!empty($varIDs)) {
            $varList = implode(',', $varIDs);
            $conn->query("
                DELETE FROM items
                WHERE varID IN ($varList)
            ");
        }

        //  Delete variations
        $conn->query("
            DELETE FROM variations
            WHERE productID IN ($idList)
        ");

        //  Delete product tags
        $conn->query("
            DELETE FROM productTag
            WHERE productID IN ($idList)
        ");

        //  Delete products
        $conn->query("
            DELETE FROM products
            WHERE productID IN ($idList)
        ");

        if ($conn->affected_rows === 0) {
            throw new Exception("No products deleted");
        }

        $conn->commit();
        echo json_encode(["status"=>"success"]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
    }
    exit();
}


?>