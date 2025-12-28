<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

/* ================= DASHBOARD ================= */
if ($action === 'dashboard') {

    // TOTAL USERS
    $totalUsers = $conn->query("
        SELECT COUNT(*) c FROM users
    ")->fetch_assoc()['c'];

    // NEW USERS (THIS MONTH)
    $newUsers = $conn->query("
        SELECT COUNT(*) c FROM users
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
    ")->fetch_assoc()['c'];

    // LAST MONTH USERS
    $lastMonth = $conn->query("
        SELECT COUNT(*) c FROM users
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH)
        AND YEAR(created_at) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
    ")->fetch_assoc()['c'];

    // % CHANGE
    $newUserPercent = ($lastMonth == 0)
        ? 100
        : round((($newUsers - $lastMonth) / $lastMonth) * 100, 1);

    // USERS LIST
    $users = [];
    $res = $conn->query("
        SELECT userID, username, email, role, created_at
        FROM users
        ORDER BY created_at DESC
    ");
    while ($row = $res->fetch_assoc()) {
        $users[] = $row;
    }

    // GENDER DISTRIBUTION
    $gender = [];
    $res = $conn->query("
        SELECT gender, COUNT(*) c
        FROM users
        GROUP BY gender
    ");
    while ($row = $res->fetch_assoc()) {
        $gender[$row['gender'] ?? 'OTHERS'] = $row['c'];
    }

    // TOP COUNTRIES (FROM SHIPPING)
    $countries = [];
    $res = $conn->query("
        SELECT country, COUNT(*) c
        FROM shippingdetails
        GROUP BY country
        ORDER BY c DESC
        LIMIT 5
    ");
    while ($row = $res->fetch_assoc()) {
        $countries[$row['country'] ?? 'Unknown'] = $row['c'];
    }

    // MEMBERSHIP TYPES
    $memberships = [];
    $res = $conn->query("
        SELECT plan, COUNT(*) c
        FROM membership
        GROUP BY plan
    ");
    while ($row = $res->fetch_assoc()) {
        $memberships[$row['plan']] = $row['c'];
    }

    echo json_encode([
        'totalUsers' => $totalUsers,
        'newUsers' => $newUsers,
        'newUserPercent' => $newUserPercent,
        'users' => $users,
        'gender' => $gender,
        'countries' => $countries,
        'memberships' => $memberships
    ]);
    exit;
}

/* ================= SINGLE USER MODAL ================= */
if ($action === 'viewUser') {

    $id = intval($_GET['id']);

    $stmt = $conn->prepare("
        SELECT 
            u.userID, u.username, u.name, u.email, u.role, 
            u.gender, u.birthday, u.created_at, u.ecoPoints,
            s.recipient, s.address, s.postcode, s.city, s.country,s.phoneCode, s.contact,
            m.membershipID, m.plan, m.status, m.paymentMethod
        FROM users u
        LEFT JOIN shippingdetails s 
            ON u.userID = s.userID 
        LEFT JOIN membership m 
            ON u.userID = m.userID
        WHERE u.userID = ?
    ");

    $stmt->bind_param("i", $id);
    $stmt->execute();

    echo json_encode($stmt->get_result()->fetch_assoc());
    exit;
}

echo json_encode(['error' => 'Invalid action']);