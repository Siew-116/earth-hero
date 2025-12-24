<?php
// products.php
include 'config.php';

$action = $_GET['action'] ?? '';
$products = [];

// Add cart (POST)
if ($action === "addCart") {
    $headers = getallheaders();
    $token = $headers['X-CSRF-Token'] ?? '';

    if (!$token || !isset($_SESSION['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'CSRF token missing']);
        exit();
    }

    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $varId = isset($data['variationId']) ? (int)$data['variationId'] : 0;
    $qty = isset($data['quantity']) ? (int)$data['quantity'] : 1;

    if ($varId <= 0 || $qty < 1) {
        echo json_encode(['error' => 'Invalid input']);
        exit();
    }

    $sessionId = session_id();          
    $userId = $_SESSION['userID'] ?? null;

    // Check if pending order exists
    if ($userId) {
        $stmt = $conn->prepare("SELECT * FROM orders WHERE userID = ? AND status = 'Pending' LIMIT 1");
        $stmt->bind_param("i", $userId);
    } else {
        $stmt = $conn->prepare("SELECT * FROM orders WHERE session_id = ? AND status = 'Pending' LIMIT 1");
        $stmt->bind_param("s", $sessionId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $order = $result->fetch_assoc();

    // Create new pending order if none exists
    if (!$order) {
        $stmt = $conn->prepare("INSERT INTO orders (userID, session_id, status, totalItem) VALUES (?, ?, 'Pending', 0)");
        $stmt->bind_param("is", $userId, $sessionId);
        $stmt->execute();
        $orderId = $conn->insert_id;
    } else {
        $orderId = $order['orderID'];
    }

    // Fetch variation price
    $stmt = $conn->prepare("SELECT salePrice FROM variations WHERE varID = ? LIMIT 1");
    $stmt->bind_param("i", $varId);
    $stmt->execute();
    $res = $stmt->get_result();
    $variation = $res->fetch_assoc();

    if (!$variation) {
        echo json_encode(['error' => 'Variation not found']);
        exit();
    }

    $unitPrice = $variation['salePrice'];

    // Check if item already exists in items table for this order
    $stmt = $conn->prepare("SELECT * FROM items WHERE orderID = ? AND varID = ? LIMIT 1");
    $stmt->bind_param("ii", $orderId, $varId);
    $stmt->execute();
    $res = $stmt->get_result();
    $existingItem = $res->fetch_assoc();

    if ($existingItem) {
        // Update existing item qty and netPrice
        $newQty = $existingItem['qty'] + $qty;
        $newNetPrice = $unitPrice * $newQty;

        $stmt = $conn->prepare("UPDATE items SET qty = ?, netPrice = ? WHERE itemID = ?");
        $stmt->bind_param("iid", $newQty, $newNetPrice, $existingItem['itemID']);
        $stmt->execute();

        $itemId = $existingItem['itemID'];
        $netPrice = $newNetPrice;
    } else {
        // Insert new item
        $netPrice = $unitPrice * $qty;
        $stmt = $conn->prepare("INSERT INTO items (orderID, varID, qty, netPrice) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("iiid", $orderId, $varId, $qty, $netPrice);
        $stmt->execute();
        $itemId = $conn->insert_id;
    }

    // Update totalItem in orders
    $stmt = $conn->prepare("UPDATE orders SET totalItem = totalItem + ? WHERE orderID = ?");
    $stmt->bind_param("ii", $qty, $orderId);
    $stmt->execute();

    // Decrease stock of the variation
    //$stmt = $conn->prepare("UPDATE variations SET stock = stock - ? WHERE varID = ? AND stock >= ?");
    //$stmt->bind_param("iii", $qty, $varId, $qty);
    //$stmt->execute();

    // Increase sold count in the same variation (if you track sold per variation)
    //$stmt = $conn->prepare("UPDATE variations SET sold = sold + ? WHERE varID = ?");
    //$stmt->bind_param("ii", $qty, $varId);
    //$stmt->execute();

    echo json_encode([
        'success' => true,
        'orderID' => $orderId,
        'itemID' => $itemId,
        'qty' => $qty,
        'netPrice' => $netPrice
    ]);
    exit();
    
}


// GET CART COUNT (GET)
else if ($action === "getCartCount") {
    
    $sessionId = session_id();
    $userId = $_SESSION['userID'] ?? null;

    if ($userId) {
        // Count items in user's pending order
        $stmt = $conn->prepare(
            "SELECT SUM(qty) as totalItems 
             FROM items 
             JOIN orders ON items.orderID = orders.orderID 
             WHERE orders.userID = ? AND orders.status = 'Pending'"
        );
        $stmt->bind_param("i", $userId);
    } else {
        // Count items in guest pending order
        $stmt = $conn->prepare(
            "SELECT SUM(qty) as totalItems 
             FROM items 
             JOIN orders ON items.orderID = orders.orderID 
             WHERE orders.session_id = ? AND orders.status = 'Pending'"
        );
        $stmt->bind_param("s", $sessionId);
    }

    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $totalItems = (int)($res['totalItems'] ?? 0);

    echo json_encode([
        'success' => true,
        'totalItems' => $totalItems
    ]);
    exit();
}


// GET CART ITEMS (GET)
else if ($action === "getCart") {
    $sessionId = session_id();
    $userId = $_SESSION['userID'] ?? null;

    if ($userId) {
        $stmt = $conn->prepare("
            SELECT 
                i.itemID,
                i.qty,
                i.netPrice,
                v.varID,
                v.name AS variationName,
                v.salePrice,
                v.stock,
                v.img AS variationImg,
                p.productID,
                p.productName,
                s.name AS sellerName
            FROM items i
            JOIN orders o ON i.orderID = o.orderID
            JOIN variations v ON i.varID = v.varID
            JOIN products p ON v.productID = p.productID
            JOIN sellers s ON p.sellerID = s.sellerID
            WHERE o.userID = ? AND o.status = 'Pending'
            ORDER BY s.name ASC, p.productName ASC
        ");
        $stmt->bind_param("i", $userId);
    } else {
        $stmt = $conn->prepare("
            SELECT 
                i.itemID,
                i.qty,
                i.netPrice,
                v.varID,
                v.name AS variationName,
                v.rfrPrice,
                v.salePrice,
                v.stock,
                v.img AS variationImg,
                p.productID,
                p.productName,
                s.name AS sellerName
            FROM items i
            JOIN orders o ON i.orderID = o.orderID
            JOIN variations v ON i.varID = v.varID
            JOIN products p ON v.productID = p.productID
            JOIN sellers s ON p.sellerID = s.sellerID
            WHERE o.session_id = ? AND o.status = 'Pending'
            ORDER BY i.itemID DESC
        ");
        $stmt->bind_param("s", $sessionId);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $cartItems = [];

    while ($row = $res->fetch_assoc()) {
        // Get all variations for this product
        $varStmt = $conn->prepare("SELECT varID, name, img, rfrPrice, salePrice, stock FROM variations WHERE productID = ?");
        $varStmt->bind_param("i", $row['productID']);
        $varStmt->execute();
        $varRes = $varStmt->get_result();
        $variations = [];
        $chosenVarNetPrice = 0;
        $chosenVarOriPrice = 0;

        while ($v = $varRes->fetch_assoc()) {
            $variations[] = [
                'varId' => (int)$v['varID'],
                'name' => $v['name'],
                'image' => $v['img'],
                'oriPrice' => (float)$v['rfrPrice'],
                'price' => (float)$v['salePrice'],
                'stock' => (int)$v['stock']
            ];

            // If this is the currently selected variation, set netPrice from variation
            if ($v['varID'] === $row['varID']) {
                $chosenVarNetPrice = (float)$v['salePrice'];
                $chosenVarOriPrice = (float)$v['rfrPrice'];
            }


        }

        $cartItems[] = [
            'itemID' => (int)$row['itemID'],
            'qty' => (int)$row['qty'],
            'oriPrice' => $chosenVarOriPrice, 
            'netPrice' => $chosenVarNetPrice, 
            'varID' => (int)$row['varID'],
            'variationName' => $row['variationName'],
            'variationImg' => $row['variationImg'],
            'productID' => (int)$row['productID'],
            'productName' => $row['productName'],
            'sellerName' => $row['sellerName'],
            'variations' => $variations
        ];
    }


    echo json_encode([
        'success' => true,
        'items' => $cartItems
    ]);
    exit();
}

// UPDATE CART ITEM (PUT)
else if ($action === "updateItem") {
    $headers = getallheaders();
    $token = $headers['X-CSRF-Token'] ?? '';

    if (!$token || !isset($_SESSION['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'CSRF token missing']);
        exit();
    }

    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);

    $itemId = (int)$data['itemID'];
    $newVarId = (int)$data['varID'];
    $newQty = (int)$data['qty'];

    if ($itemId <= 0 || $newVarId <= 0 || $newQty < 1) {
        echo json_encode(['success' => false, 'error' => 'Invalid input']);
        exit();
    }

    // Get current item
    $stmt = $conn->prepare("
        SELECT i.orderID, i.varID AS oldVarID, i.qty AS oldQty
        FROM items i
        JOIN orders o ON i.orderID = o.orderID
        WHERE i.itemID = ? AND o.status = 'Pending'
        LIMIT 1
    ");
    $stmt->bind_param("i", $itemId);
    $stmt->execute();
    $item = $stmt->get_result()->fetch_assoc();

    if (!$item) {
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        exit();
    }

    $orderId = (int)$item['orderID'];
    $oldVarId = (int)$item['oldVarID'];
    $oldQty = (int)$item['oldQty'];

    // Get new variation price and stock
    $stmt = $conn->prepare("SELECT salePrice, stock FROM variations WHERE varID = ?");
    $stmt->bind_param("i", $newVarId);
    $stmt->execute();
    $variation = $stmt->get_result()->fetch_assoc();

    if (!$variation) {
        echo json_encode(['success' => false, 'error' => 'Variation not found']);
        exit();
    }

    $unitPrice = (float)$variation['salePrice'];
    $variationStock = (int)$variation['stock'];

    // CASE1: If same variation, update only qty
    if ($newVarId === $oldVarId) {
        if ($newQty > $variationStock) {
            echo json_encode(['success' => false, 'error' => 'Not enough stock for this variation']);
            exit();
        }

        $netPrice = $unitPrice * $newQty;
        $stmt = $conn->prepare("UPDATE items SET qty=?, netPrice=? WHERE itemID=?");
        $stmt->bind_param("idi", $newQty, $netPrice, $itemId);
        $stmt->execute();

        $qtyDiff = $newQty - $oldQty;
        $stmt = $conn->prepare("UPDATE orders SET totalItem = totalItem + ? WHERE orderID=?");
        $stmt->bind_param("ii", $qtyDiff, $orderId);
        $stmt->execute();

        echo json_encode(['success' => true]);
        exit();
    }

    // CASE2: Changing variation — check if same variation exists to merge
    $stmt = $conn->prepare("SELECT itemID, qty FROM items WHERE orderID = ? AND varID = ? LIMIT 1");
    $stmt->bind_param("ii", $orderId, $newVarId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();

    if ($existing) {
        // Merge into existing variation
        $mergedQty = $existing['qty'] + $newQty;

        if ($mergedQty > $variationStock) {
            echo json_encode(['success' => false, 'error' => 'Not enough stock for this variation']);
            exit();
        }

        $mergedNet = $unitPrice * $mergedQty;
        $stmt = $conn->prepare("UPDATE items SET qty=?, netPrice=? WHERE itemID=?");
        $stmt->bind_param("idi", $mergedQty, $mergedNet, $existing['itemID']);
        $stmt->execute();

        // Remove old item
        $stmt = $conn->prepare("DELETE FROM items WHERE itemID=?");
        $stmt->bind_param("i", $itemId);
        $stmt->execute();

    } else {
        // New variation not in cart — check stock
        if ($newQty > $variationStock) {
            echo json_encode(['success' => false, 'error' => 'Not enough stock for this variation']);
            exit();
        }

        $netPrice = $unitPrice * $newQty;
        $stmt = $conn->prepare("UPDATE items SET varID=?, qty=?, netPrice=? WHERE itemID=?");
        $stmt->bind_param("iidi", $newVarId, $newQty, $netPrice, $itemId);
        $stmt->execute();
    }

    echo json_encode(['success' => true]);
    exit();
}


// DELETE CART ITEM (DELETE)
else if ($action === "deleteItem") {
    $headers = getallheaders();
    $token = $headers['X-CSRF-Token'] ?? '';

    if (!$token || !isset($_SESSION['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'CSRF token missing']);
        exit();
    }

    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $itemId = (int)($data['itemID'] ?? 0);

    if ($itemId <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid itemID']);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM items WHERE itemID = ?");
    $stmt->bind_param("i", $itemId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete item']);
    }
    exit();
}


// Checkout


header('Content-Type: application/json');
echo json_encode($products);
exit;
?>
