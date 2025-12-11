<?php
// config.php
// CORS
header("Access-Control-Allow-Origin: http://localhost/earth-hero"); // allow REACT communicate with PHP from any domain
header("Access-Control-Allow-Headers: Content-Type");
// API Security
header("X-Content-Type-Options: nosniff"); // prevent browsers from sending scripts
header("X-Frame-Options: SAMEORIGIN"); // prevents clickjacking
header("Referrer-Policy: no-referrer-when-downgrade"); // control Referer info sent during click links
// CSP
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
                                    
header("Content-Type: application/json");

// Secure session configuration
session_set_cookie_params([
    'lifetime' => 0,          // expires when browser closes
    'path' => '/',
    'domain' => 'localhost',  // change to your real domain in production
    'secure' => true,         // only send cookie via HTTPS
    'httponly' => true,       // JavaScript cannot read cookie
    'samesite' => 'Strict'    // mitigate CSRF
]);

session_start();

// Database connection
$host = "localhost";
$user = "root";
$pass = "";
$db   = "earthhero";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}


?>

