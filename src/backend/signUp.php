<?php
// signUp.php
include 'config.php';

$action = $_GET['action'] ?? '';


// ACTION: CHECK EMAIL (GET)
if ($action === 'checkEmail') {
    $email = $_GET['email'] ?? '';
    $stmt = $conn->prepare("SELECT userID FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    echo json_encode(["exists" => $stmt->num_rows > 0]);
    $stmt->close();
    $conn->close();
    exit;
}



// ACTION: REGISTER USER (POST)
if ($action === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);

    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';
    
    // Validate fields
    if (!$name || !$email || !$password || !$role) {
        echo json_encode(["success" => false, "message" => "Missing fields."]);
        exit;
    }

    // Check duplicate email
    $stmt = $conn->prepare("SELECT userID FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Account already exists."]);
        exit;
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Insert user
    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $hashedPassword, $role);
    $stmt->execute();

    // Store user info in session
    $_SESSION['name'] = $name;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = $role;

    // Generate CSRF token if not exists
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    // SUCCESS
    echo json_encode([
        "success" => true,
        "name" => $name,
        "email" => $email,
        "role" => $role,
        "csrf_token" => $_SESSION['csrf_token']
    ]);
    exit;
}


// Invalid action
echo json_encode(["error" => "Invalid action"]);
?>
