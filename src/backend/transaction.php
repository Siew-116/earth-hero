<?php


include 'config.php';
require_once __DIR__ . '/mail.php';

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
        // Mark checkout as active
        $_SESSION['checkout_active'] = true;
        $_SESSION['checkout_orderID'] = $newOrderID;

        echo json_encode(['success'=>true, 'orderID'=>$newOrderID, 'totalPrice'=>$totalPrice]);
        exit();

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
        exit();
    }
}



// Revert the checkout if payment failed
if ($action === "failCheckout") {
    if (!isset($_SESSION['userID'])) {
        echo json_encode(['success' => false, 'error' => 'Login required']);
        exit();
    }

    $userID = $_SESSION['userID'];
    $conn->begin_transaction();

    try {
        // Find current Processing order
        $stmt = $conn->prepare("SELECT orderID FROM orders WHERE userID=? AND status='Processing' LIMIT 1");
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $order = $stmt->get_result()->fetch_assoc();
        if (!$order) throw new Exception("No checkout in progress");
        $processingOrderID = (int)$order['orderID'];

        // Find Pending order (if exists)
        $stmt = $conn->prepare("SELECT orderID FROM orders WHERE userID=? AND status='Pending' LIMIT 1");
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $pendingOrder = $stmt->get_result()->fetch_assoc();

        if ($pendingOrder) {
            $pendingOrderID = (int)$pendingOrder['orderID'];

            // Move items back to Pending order
            $stmt = $conn->prepare("UPDATE items SET orderID=? WHERE orderID=?");
            $stmt->bind_param("ii", $pendingOrderID, $processingOrderID);
            $stmt->execute();

            // Update totalItem in Pending order
            $stmt = $conn->prepare(
                "UPDATE orders SET totalItem = (SELECT IFNULL(SUM(qty),0) FROM items WHERE orderID=?) WHERE orderID=?"
            );
            $stmt->bind_param("ii", $pendingOrderID, $pendingOrderID);
            $stmt->execute();
        } else {
            // No pending order exists ,revert items to a new Pending order
            $stmt = $conn->prepare("INSERT INTO orders (userID, status, totalItem) VALUES (?, 'Pending', 0)");
            $stmt->bind_param("i", $userID);
            $stmt->execute();
            $pendingOrderID = $conn->insert_id;

            $stmt = $conn->prepare("UPDATE items SET orderID=? WHERE orderID=?");
            $stmt->bind_param("ii", $pendingOrderID, $processingOrderID);
            $stmt->execute();

            // Update totalItem
            $stmt = $conn->prepare(
                "UPDATE orders SET totalItem = (SELECT IFNULL(SUM(qty),0) FROM items WHERE orderID=?) WHERE orderID=?"
            );
            $stmt->bind_param("ii", $pendingOrderID, $pendingOrderID);
            $stmt->execute();
        }

        // Delete transaction record linked to Processing order
        $stmt = $conn->prepare("DELETE FROM transaction WHERE orderID=?");
        $stmt->bind_param("i", $processingOrderID);
        $stmt->execute();

        // Delete the Processing order itself
        $stmt = $conn->prepare("DELETE FROM orders WHERE orderID=?");
        $stmt->bind_param("i", $processingOrderID);
        $stmt->execute();

        // Clear checkout session
        unset($_SESSION['checkout_active']);
        unset($_SESSION['checkout_orderID']);

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Checkout fully reverted']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }

    exit();
}


// CONFIRM ORDER
if ($action === "confirmOrder") {
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
    $orderID = $data['orderID'] ?? null;
    $addressData = $data['address'] ?? [];
    $shippingOption = $data['shippingOption'] ?? null;
    $paymentMethod = $data['paymentMethod'] ?? null;
    $totalPrice = $data['totalPrice'] ?? null;

    if (!$orderID || !$addressData || !$shippingOption || !$paymentMethod || $totalPrice === null) {
        echo json_encode(['success' => false, 'error' => 'Missing required data']);
        exit();
    }

    $userID = $_SESSION['userID'];
    $conn->begin_transaction();

    try {
        // Insert address for this order
        $stmt = $conn->prepare("
            INSERT INTO shippingDetails
            (userID, recipient, address, postcode, city, state, country, phoneCode, contact, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        if (!$stmt) throw new Exception("Prepare failed (Insert Address): " . $conn->error);
        $stmt->bind_param(
            "issssssss",
            $userID,
            $addressData['recipient'],
            $addressData['address'],
            $addressData['postcode'],
            $addressData['city'],
            $addressData['state'],
            $addressData['country'],
            $addressData['phoneCode'],
            $addressData['contact']
        );
        $stmt->execute();
        $addressID = $conn->insert_id;

        // Insert delivery info
        $shippingLabels = [
            'self' => 'Self Collection',
            'sea'  => 'Sea Shipping',
            'air'  => 'Air Shipping'
        ];
        $shippingFees = ['self'=>0, 'sea'=>8, 'air'=>15];
        $shippingDays = ['self'=>1, 'sea'=>3, 'air'=>7];
        $deliveryFee = $shippingFees[$shippingOption] ?? 0;
        $daysToAdd = $shippingDays[$shippingOption] ?? 1;

        $estimatedArrival = date('Y-m-d', strtotime("+$daysToAdd days"));
        $deliveryOptionEnum = $shippingLabels[$shippingOption] ?? 'Self Collection';

        $stmt = $conn->prepare("
            INSERT INTO delivery 
            (orderID, deliveryFee, shipping_days, estimated_arrival, shipping_option)
            VALUES (?, ?, ?, ?, ?)
        ");
        if (!$stmt) throw new Exception("Prepare failed (Insert Delivery): " . $conn->error);
        $stmt->bind_param(
            "iisss",
            $orderID,
            $deliveryFee,
            $daysToAdd,
            $estimatedArrival,
            $deliveryOptionEnum
        );
        $stmt->execute();
        $deliveryID = $conn->insert_id;

        // Update orders table with addressID, deliveryID, status
        $stmt = $conn->prepare("
            UPDATE orders 
            SET addressID=?, deliveryID=?, status='To Ship'
            WHERE orderID=? AND userID=?
        ");
        if (!$stmt) throw new Exception("Prepare failed (Update Orders): " . $conn->error);
        $stmt->bind_param("iiii", $addressID, $deliveryID, $orderID, $userID);
        $stmt->execute();

        // Update transaction table with totalPrice, paymentMethod, status='Paid'
        $stmt = $conn->prepare("
            UPDATE transaction
            SET totalPrice=?, payment_method=?, status='Paid'
            WHERE orderID=?
        ");
        if (!$stmt) throw new Exception("Prepare failed (Update Transaction): " . $conn->error);
        $stmt->bind_param("dsi", $totalPrice, $paymentMethod, $orderID);
        $stmt->execute();

        $conn->commit();
         // --- Fetch user email ---
        $stmt = $conn->prepare("SELECT email FROM users WHERE userID=? LIMIT 1");
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $userEmail = $stmt->get_result()->fetch_assoc()['email'] ?? null;

        // --- Fetch purchased items for email ---
        $stmt = $conn->prepare("
            SELECT 
                i.qty,
                i.netPrice,
                v.name AS variationName,
                v.varID
            FROM items i
            JOIN variations v ON i.varID = v.varID
            WHERE i.orderID = ?
        ");
        if (!$stmt) throw new Exception("Prepare failed (Fetch items): " . $conn->error);

        $stmt->bind_param("i", $orderID);
        $stmt->execute();
        $res = $stmt->get_result();

        $checkoutItems = [];
        while ($row = $res->fetch_assoc()) {
            $checkoutItems[] = [
                'variationName' => $row['variationName'],
                'varID' => (int)$row['varID'],
                'qty' => (int)$row['qty'],
                'netPrice' => (float)$row['netPrice']
            ];
        }

        $conn->commit();
        
        // --- Send confirmation email ---
        if ($userEmail) {
            if (sendOrderConfirmation($userEmail, $orderID, $checkoutItems, $totalPrice)) {
                error_log("Confirmation email sent to $userEmail for order $orderID");
            } else {
                error_log("Failed to send confirmation email for order $orderID");
            }
        }

        unset($_SESSION['checkout_active']);
        unset($_SESSION['checkout_orderID']);
        echo json_encode([
            'success'=>true,
            'message'=>'Checkout finalized',
            'email'=>$userEmail,
            'orderID'=>$orderID
        ]);
        exit();

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
        exit();
    }
}

if ($action === "checkCheckoutActive") {
    if (!isset($_SESSION['checkout_active']) || $_SESSION['checkout_active'] !== true) {
        echo json_encode(['active' => false]);
    } else {
        echo json_encode([
            'active' => true,
            'orderID' => $_SESSION['checkout_orderID'] ?? null
        ]);
    }
    exit();
}

?>
