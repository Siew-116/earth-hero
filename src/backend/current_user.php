<?php
require_once 'config.php'; // session_start() is here

header('Content-Type: application/json');

if (isset($_SESSION['email'])) {
    echo json_encode([
        'loggedIn' => true,
        'email' => $_SESSION['email'],
        'role' => $_SESSION['role'],
        'name' => $_SESSION['name'] ?? null
    ]);
} else {
    echo json_encode([
        'loggedIn' => false
    ]);
}
