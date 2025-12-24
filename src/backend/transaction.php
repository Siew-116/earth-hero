<?php
include 'config.php';

$action = $_GET['action'] ?? '';

if ($action === "checkout") {
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

    if (!isset($_SESSION['userID'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $itemIDs = $data['itemIDs'] ?? [];
    $voucherID = $data['voucherID'] ?? null;
    $userID = $_SESSION['userID'];

    if (empty($itemIDs)) {
        echo json_encode(['success' => false, 'error' => 'No items selected']);
        exit();
    }

    $conn->begin_transaction();

    try {
        // 1️⃣ Find Pending Order
        $stmt = $conn->prepare("SELECT orderID FROM orders WHERE userID = ? AND status='Pending' LIMIT 1");
        if (!$stmt) throw new Exception("Prepare failed (Pending Order): " . $conn->error);
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $pendingOrder = $stmt->get_result()->fetch_assoc();
        if (!$pendingOrder) throw new Exception("Cart not found");
        $pendingOrderID = (int)$pendingOrder['orderID'];

        // 2️⃣ Fetch selected items
        $placeholders = implode(',', array_fill(0, count($itemIDs), '?'));
        $types = str_repeat('i', count($itemIDs)+1); // +1 for orderID
        $sql = "SELECT i.*, v.salePrice, v.rfrPrice, v.stock
                FROM items i
                JOIN variations v ON i.varID = v.varID
                WHERE i.orderID = ? AND i.itemID IN ($placeholders)";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed (Items Fetch): " . $conn->error);

        // Build params for bind_param
        $params = array_merge([$pendingOrderID], $itemIDs);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $items = $stmt->get_result();
        if ($items->num_rows === 0) throw new Exception("Invalid items");

        // 3️⃣ Compute totals
        $subtotal = $productDiscount = $totalQty = 0;
        $checkoutItems = [];
        while ($row = $items->fetch_assoc()) {
            if ($row['qty'] > $row['stock']) throw new Exception("Stock insufficient for item {$row['itemID']}");
            $subtotal += $row['rfrPrice'] * $row['qty'];
            $productDiscount += ($row['rfrPrice'] - $row['salePrice']) * $row['qty'];
            $totalQty += $row['qty'];
            $checkoutItems[] = $row;
        }

        // 4️⃣ Voucher discount
        $voucherDiscount = 0;
        if ($voucherID) {
            $stmt = $conn->prepare("SELECT discount, minSpend FROM vouchers WHERE voucherID = ? AND userID = ?");
            if (!$stmt) throw new Exception("Prepare failed (Voucher): " . $conn->error);
            $stmt->bind_param("ii", $voucherID, $userID);
            $stmt->execute();
            $voucher = $stmt->get_result()->fetch_assoc();
            if ($voucher && $subtotal >= $voucher['minSpend']) {
                $voucherDiscount = (float)$voucher['discount'];
            }
        }

        $totalPrice = $subtotal - $productDiscount - $voucherDiscount;

        // 5️⃣ Create new order
        $stmt = $conn->prepare("INSERT INTO orders (userID, status, totalItem) VALUES (?, 'Processing', ?)");
        if (!$stmt) throw new Exception("Prepare failed (New Order): " . $conn->error);
        $stmt->bind_param("ii", $userID, $totalQty);
        $stmt->execute();
        $newOrderID = $conn->insert_id;

        // 6️⃣ Move items
        $placeholders = implode(',', array_fill(0, count($itemIDs), '?'));
        $types = str_repeat('i', count($itemIDs)+1);
        $sql = "UPDATE items SET orderID=? WHERE itemID IN ($placeholders)";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed (Move Items): " . $conn->error);
        $params = array_merge([$newOrderID], $itemIDs);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        // 7️⃣ Update pending order total
        $stmt = $conn->prepare("UPDATE orders SET totalItem = (SELECT IFNULL(SUM(qty),0) FROM items WHERE orderID=?) WHERE orderID=?");
        if (!$stmt) throw new Exception("Prepare failed (Update Pending): " . $conn->error);
        $stmt->bind_param("ii", $pendingOrderID, $pendingOrderID);
        $stmt->execute();

        // 8️⃣ Insert transaction
        $sql = "
            INSERT INTO transaction
            (orderID, subtotal, product_discount, voucher_discount, totalPrice, status)
            VALUES (?, ?, ?, ?, ?, 'Pending')
        ";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed (Transaction): " . $conn->error);
        }

        $stmt->bind_param(
            "idddd",
            $newOrderID,
            $subtotal,
            $productDiscount,
            $voucherDiscount,
            $totalPrice
        );


        if (!$stmt->execute()) {
            throw new Exception("Execute failed (Transaction): " . $stmt->error);
        }


        $conn->commit();
        echo json_encode(['success'=>true, 'orderID'=>$newOrderID, 'totalPrice'=>$totalPrice]);
        exit();

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
        exit();
    }
}
?>
