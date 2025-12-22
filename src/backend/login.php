<?php
// login.php
include 'config.php';
$action = $_GET['action'] ?? '';

// ACTION: LOGIN ACCOUNT (POST)
if ($action === "login") {

    $data = json_decode(file_get_contents("php://input"), true);
    $email = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');
    $role = trim($data['role'] ?? ''); 

    if (!$email || !$password) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Missing input.']);
    exit;
}

    // Validation
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Invalid email"]);
        exit;
    }

    // Validate role
    $allowedRoles = ["User", "Admin"];
    if (!in_array($role, $allowedRoles)) {
        echo json_encode(["success" => false, "message" => "Invalid role"]);
        exit;
    }

    // Validate password
    if (empty($password)) {
        echo json_encode(["success" => false, "message" => "Password required"]);
        exit;
    }

    $hashedPassword = '';
    $name = '';
    $dbRole = '';
    
    // Prepared statement
    $stmt = $conn->prepare("SELECT userID, password, name, role FROM users WHERE email=? AND role=?");
    $stmt->bind_param("ss", $email, $role);
    $stmt->execute();
    $stmt->bind_result($userID, $hashedPassword, $name, $dbRole);
    
    // If user not found
    if (!$stmt->fetch()) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Account not exsited. Please sign up."]);
        exit;
    }
    $stmt->close();

    // Verify password
    if (!password_verify($password, $hashedPassword)) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Invalid email or password"]);
        exit;
    }

    // Save guess session ID
    $oldSessionId = session_id();
    // Prevent session fixation
    session_regenerate_id(true);

    // Refresh cart
    $stmt = $conn->prepare(
        "SELECT orderID FROM orders 
        WHERE session_id = ? AND userID IS NULL AND status = 'Pending' 
        LIMIT 1"
    );
    $stmt->bind_param("s", $oldSessionId);
    $stmt->execute();
    $guestOrder = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($guestOrder) {
        $guestOrderId = $guestOrder['orderID'];

        // 1. Find user pending order
        $stmt = $conn->prepare(
            "SELECT orderID FROM orders 
            WHERE userID = ? AND status = 'Pending' 
            LIMIT 1"
        );
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $userOrder = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($userOrder) {
            $userOrderId = $userOrder['orderID'];

            // 2. Fetch all guest items
            $stmt = $conn->prepare("SELECT * FROM items WHERE orderID = ?");
            $stmt->bind_param("i", $guestOrderId);
            $stmt->execute();
            $guestItems = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            foreach ($guestItems as $item) {
                // Check if user order already has the same variation
                $stmt = $conn->prepare(
                    "SELECT * FROM items WHERE orderID = ? AND varID = ? LIMIT 1"
                );
                $stmt->bind_param("ii", $userOrderId, $item['varID']);
                $stmt->execute();
                $existing = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if ($existing) {
                    // Sum qty and update netPrice
                    $newQty = $existing['qty'] + $item['qty'];
                    $unitPrice = $item['netPrice'] / $item['qty']; // calculate unit price
                    $newNetPrice = $unitPrice * $newQty;

                    $stmt = $conn->prepare(
                        "UPDATE items SET qty = ?, netPrice = ? WHERE itemID = ?"
                    );
                    $stmt->bind_param("iid", $newQty, $newNetPrice, $existing['itemID']);
                    $stmt->execute();
                    $stmt->close();
                } else {
                    // Move guest item to user order
                    $stmt = $conn->prepare(
                        "UPDATE items SET orderID = ? WHERE itemID = ?"
                    );
                    $stmt->bind_param("ii", $userOrderId, $item['itemID']);
                    $stmt->execute();
                    $stmt->close();
                }
            }

            // Update totalItem count
            $conn->query(
                "UPDATE orders 
                SET totalItem = (SELECT SUM(qty) FROM items WHERE orderID = $userOrderId)
                WHERE orderID = $userOrderId"
            );

            // Delete guest order
            $stmt = $conn->prepare("DELETE FROM orders WHERE orderID = ?");
            $stmt->bind_param("i", $guestOrderId);
            $stmt->execute();
            $stmt->close();
        } else {
            // No user order: assign guest order to user
            $stmt = $conn->prepare(
                "UPDATE orders SET userID = ?, session_id = NULL WHERE orderID = ?"
            );
            $stmt->bind_param("ii", $userID, $guestOrderId);
            $stmt->execute();
            $stmt->close();
        }
    }

    // Store user info in session
    $_SESSION['userID'] = $userID;
    $_SESSION['name'] = $name;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = $dbRole;

    // Generate CSRF token if not exists
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    // SUCCESS
    echo json_encode([
        "success" => true,
        "name" => $name,
        "email" => $email,
        "role" => $dbRole,
        "csrf_token" => $_SESSION['csrf_token']
    ]);
    exit;
}

// INVALID ACTION
echo json_encode(["success" => false, "message" => "Invalid action"]);
?>
