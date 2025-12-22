<?php
// products.php
include 'config.php';

$action = $_GET['action'] ?? '';
$products = [];

// Add cart (POST)
if ($action === "addCart") {
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
            "SELECT SUM(qty) as totalItems FROM items 
             JOIN orders ON items.orderID = orders.orderID
             WHERE orders.userID = ? AND orders.status = 'Pending'"
        );
        $stmt->bind_param("i", $userId);
    } else {
        // Count items in guest pending order
        $stmt = $conn->prepare(
            "SELECT SUM(qty) as totalItems FROM items 
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
// Update cart 
// Delete cart
// Checkout


header('Content-Type: application/json');
echo json_encode($products);
exit;
?>
