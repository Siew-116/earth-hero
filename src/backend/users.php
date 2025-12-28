<?php
require_once 'config.php'; // session_start() is here
header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Check if user is logged in
if (!isset($_SESSION['email'])) {
    echo json_encode(['loggedIn' => false]);
    exit;
}

// ACTION: GET USER STATUS AND INFO (GET)
if ($action === "getUser") {
    $email = $_SESSION['email'];

    // Fetch user info from 'users' table
    $stmt = $conn->prepare("SELECT userID, username, name, email, password, role, gender, birthday 
                            FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc(); // result 1

    // If no user found
    if (!$user) {
        echo json_encode(["loggedIn" => false]);
        exit;
    }

    // Fetch default shipping address
    $stmt2 = $conn->prepare("SELECT recipient, address, postcode, city, state, country, phoneCode, contact 
                             FROM shippingdetails 
                             WHERE userID=? AND is_default=1 LIMIT 1");
    $stmt2->bind_param("i", $user['userID']);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $default_address = $result2->fetch_assoc(); // result 2

    // Return combined data
    echo json_encode([
        "loggedIn" => true,
        "user" => $user,
        "default_address" => $default_address,
        'csrf_token' => $_SESSION['csrf_token']
    ]);

    $stmt->close();
    $stmt2->close();
    $conn->close();
    exit;
}


// ACTION: UPDATE USER (POST)
if ($action === 'updateUser') {
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
    
    $csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $csrfHeader)) {
        echo json_encode(["success" => false, "message" => "Invalid CSRF token"]);
        exit;
    }

    if (!isset($_SESSION['email'])) {
        echo json_encode(["success" => false, "message" => "Not logged in"]);
        exit;
    }

    $email = $_SESSION['email'];

    // Get userID 
    $stmt = $conn->prepare("SELECT userID FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    if (!$user) {
        echo json_encode(["success" => false, "message" => "User not found"]);
        exit;
    }
    $userID = $user['userID'];
    
    // Update users table
    $username = $data['username'] ?? '';
    $fullname = $data['fullname'] ?? '';
    $gender   = $data['gender'] ?? '';
    $birthday = $data['birthday'] ?? '';

    $stmt = $conn->prepare("UPDATE users SET username=?, name=?, gender=?, birthday=? WHERE userID=?");
    $stmt->bind_param(
        "ssssi",
        $username,
        $fullname,
        $gender,
        $birthday,
        $userID
    );
    $stmt->execute();

    // Check if default shipping address exists
    $stmtCheck = $conn->prepare("SELECT addressID FROM shippingdetails WHERE userID=? AND is_default=1");
    $stmtCheck->bind_param("i", $userID);
    $stmtCheck->execute();
    $resultCheck = $stmtCheck->get_result();

    $recipient = $data['recipient'] ?? '';
    $address   = $data['address'] ?? '';
    $postcode  = $data['postcode'] ?? '';
    $city      = $data['city'] ?? '';
    $state      = $data['state'] ?? '';
    $country   = $data['country'] ?? '';
    $phoneCode   = $data['phoneCode'] ?? '';
    $contact   = $data['contactNumber'] ?? '';

    if ($resultCheck->num_rows > 0) {
        // Update existing default address
        $stmt2 = $conn->prepare("UPDATE shippingdetails SET recipient=?, address=?, postcode=?, city=?, state=?, country=?, phoneCode=?, contact=? WHERE userID=? AND is_default=1");
        $stmt2->bind_param("ssssssssi", $recipient, $address, $postcode, $city, $state, $country, $phoneCode, $contact, $userID);
        $stmt2->execute();
        $stmt2->close();
    } else {
        // Insert new default address
        $stmt2 = $conn->prepare(
            "INSERT INTO shippingdetails 
            (userID, recipient, address, postcode, city, state, country, phoneCode, contact, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
        );
        $stmt2->bind_param(
            "issssssss", 
            $userID, $recipient, $address, $postcode, $city, $state, $country, $phoneCode, $contact
        );
        $stmt2->execute();
        $stmt2->close();
    }
    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully"
    ]);
    exit;
    $conn->close();
    exit;
}

// ACTION: GET USER VOUCHERS (GET)
if ($action === "getVouchers") {

    // Must be logged in
    if (!isset($_SESSION['email'])) {
        echo json_encode(["success" => false, "message" => "Not logged in"]);
        exit;
    }

    // Get userID
    $stmt = $conn->prepare("SELECT userID FROM users WHERE email=?");
    $stmt->bind_param("s", $_SESSION['email']);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(["success" => false, "message" => "User not found"]);
        exit;
    }

    $userID = $user['userID'];

    // Fetch vouchers:
    $stmt = $conn->prepare("
        SELECT 
            voucherID,
            userID,
            name,
            minSpend,
            vendorLimit,
            expiredDay,
            qty,
            discount
        FROM vouchers
        WHERE userID = ?
          AND qty > 0
        ORDER BY voucherID
    ");

    $stmt->bind_param("i", $userID);
    $stmt->execute();
    $vouchers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode([
        "success" => true,
        "vouchers" => $vouchers
    ]);
    exit;
}

// ACTION: GET DEFAULT ADDRESS (GET)
else if ($action === "getDefaultAddress") {
    header('Content-Type: application/json');

    if (!isset($_SESSION['email'])) {
        echo json_encode(['success' => true, 'default_address' => false]);
        exit;
    }

    $email = $_SESSION['email'];

    // Get userID
    $stmt = $conn->prepare("SELECT userID FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(['success' => true, 'default_address' => false]);
        exit;
    }

    $userID = $user['userID'];

    // Fetch default shipping address
    $stmt2 = $conn->prepare("SELECT recipient, address, postcode, city, state, country, phoneCode, contact 
                             FROM shippingdetails 
                             WHERE userID=? AND is_default=1 LIMIT 1");
    $stmt2->bind_param("i", $userID);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $default_address = $result2->fetch_assoc();
    $stmt2->close();

    echo json_encode([
        'success' => true,
        'default_address' => $default_address ?: false
    ]);
    exit;
}

// Invalid action
echo json_encode(["success" => false, "message" => "Invalid action"]);

?>