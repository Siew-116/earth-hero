<?php
// login.php
include 'config.php';

$action = $_GET['action'] ?? '';

// ACTION: LOGIN ACCOUNT (POST)
if ($action === "login") {

    $data = json_decode(file_get_contents("php://input"), true);
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $role = trim($data['role'] ?? ''); 

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

    // Prepared statement
    $stmt = $conn->prepare("SELECT password, name, role FROM users WHERE email=? AND role=?");
    $stmt->bind_param("ss", $email, $role);
    $stmt->execute();
    $stmt->bind_result($hashedPassword, $name, $dbRole);
    
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

    // Store user info in session
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
