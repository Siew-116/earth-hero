<?php
require_once 'config.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

/* ================= DASHBOARD ================= */
if ($action === 'dashboard') {

    $from = $_GET['from'] ?? null;
    $to   = $_GET['to'] ?? null;

    $useDate = ($from && $to);

    if ($useDate) {
        $fromDate = "$from 00:00:00";
        $toDate   = "$to 23:59:59";
    }

    /* ---------- TOTAL USERS ---------- */
    if ($useDate) {
        $stmt = $conn->prepare("
            SELECT COUNT(*) c
            FROM users
            WHERE created_at BETWEEN ? AND ?
        ");
        $stmt->bind_param("ss", $fromDate, $toDate);
        $stmt->execute();
        $totalUsers = $stmt->get_result()->fetch_assoc()['c'];
    } else {
        $totalUsers = $conn->query("
            SELECT COUNT(*) c FROM users
        ")->fetch_assoc()['c'];
    }

    /* ---------- NEW USERS (SAME AS TOTAL IN RANGE) ---------- */
    $newUsers = $totalUsers;

    /* ---------- % CHANGE (DISABLED – FRONTEND RANGE BASED) ---------- */
    $newUserPercent = 0;

    /* ---------- USERS LIST ---------- */
    if ($useDate) {
        $stmt = $conn->prepare("
            SELECT userID, username, email, role, created_at
            FROM users
            WHERE created_at BETWEEN ? AND ?
            ORDER BY created_at DESC
        ");
        $stmt->bind_param("ss", $fromDate, $toDate);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query("
            SELECT userID, username, email, role, created_at
            FROM users
            ORDER BY created_at DESC
        ");
    }

    $users = [];
    while ($row = $res->fetch_assoc()) {
        $users[] = $row;
    }

    /* ---------- GENDER DISTRIBUTION ---------- */
    $gender = [];

    if ($useDate) {
        $stmt = $conn->prepare("
            SELECT gender, COUNT(*) c
            FROM users
            WHERE created_at BETWEEN ? AND ?
            GROUP BY gender
        ");
        $stmt->bind_param("ss", $fromDate, $toDate);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query("
            SELECT gender, COUNT(*) c
            FROM users
            GROUP BY gender
        ");
    }

    while ($row = $res->fetch_assoc()) {
        $gender[$row['gender'] ?? 'OTHERS'] = $row['c'];
    }

    /* ---------- TOP COUNTRIES ---------- */
    $countries = [];

    if ($useDate) {
        $stmt = $conn->prepare("
            SELECT s.country, COUNT(*) c
            FROM shippingdetails s
            JOIN users u ON s.userID = u.userID
            WHERE u.created_at BETWEEN ? AND ?
            GROUP BY s.country
            ORDER BY c DESC
            LIMIT 5
        ");
        $stmt->bind_param("ss", $fromDate, $toDate);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query("
            SELECT country, COUNT(*) c
            FROM shippingdetails
            GROUP BY country
            ORDER BY c DESC
            LIMIT 5
        ");
    }

    while ($row = $res->fetch_assoc()) {
        $countries[$row['country'] ?? 'Unknown'] = $row['c'];
    }

    /* ---------- MEMBERSHIP PLANS ---------- */
    $memberships = [];

    if ($useDate) {
        $stmt = $conn->prepare("
            SELECT m.plan, COUNT(*) c
            FROM membership m
            JOIN users u ON m.userID = u.userID
            WHERE u.created_at BETWEEN ? AND ?
            GROUP BY m.plan
        ");
        $stmt->bind_param("ss", $fromDate, $toDate);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query("
            SELECT plan, COUNT(*) c
            FROM membership
            GROUP BY plan
        ");
    }

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
            s.recipient, s.address, s.postcode, s.city, s.country, s.phoneCode, s.contact,
            m.membershipID, m.plan, m.status, m.paymentMethod
        FROM users u
        LEFT JOIN shippingdetails s ON u.userID = s.userID
        LEFT JOIN membership m ON u.userID = m.userID
        WHERE u.userID = ?
    ");

    $stmt->bind_param("i", $id);
    $stmt->execute();

    echo json_encode($stmt->get_result()->fetch_assoc());
    exit;
}

echo json_encode(['error' => 'Invalid action']);
