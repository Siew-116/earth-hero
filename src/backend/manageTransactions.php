<?php
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    switch ($action) {
        case 'get_transactions':
            getTransactions($input);
            break;

        case 'get_statistics':
            getStatistics($input);
            break;

        case 'get_statistics_with_comparison':
            getStatisticsWithComparison($input);
            break;

        case 'get_transaction_detail':
            getTransactionDetail($input);
            break;

        case 'export_transaction_details':
            exportTransactionDetails($input);
            break;

        case 'get_revenue_trends':
            getRevenueTrends($input);
            break;

        case 'get_category_breakdown':
            getCategoryBreakdown($input);
            break;

        default:
            sendResponse(false, 'Invalid action');
    }
} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
}

/* =======================================================
   GET TRANSACTIONS
======================================================= */
function getTransactions($input) {
    global $conn;

    $filter   = $input['filter'] ?? 'daily';
    $dateFrom = $input['date_from'] ?? date('Y-m-01');
    $dateTo   = $input['date_to'] ?? date('Y-m-d');

    // Different GROUP BY based on filter
    switch ($filter) {
        case 'weekly':
            $groupBy = "YEARWEEK(t.created_at, 1)";
            $dateSelect = "DATE_FORMAT(MIN(t.created_at), '%Y-W%u') AS period_label,
                          MIN(DATE(t.created_at)) AS period_start,
                          MAX(DATE(t.created_at)) AS period_end";
            break;
        
        case 'monthly':
            $groupBy = "DATE_FORMAT(t.created_at, '%Y-%m')";
            $dateSelect = "DATE_FORMAT(t.created_at, '%Y-%m') AS period_label,
                          MIN(DATE(t.created_at)) AS period_start,
                          MAX(DATE(t.created_at)) AS period_end";
            break;
        
        case 'daily':
        default:
            $groupBy = "DATE(t.created_at)";
            $dateSelect = "DATE(t.created_at) AS period_label,
                          DATE(t.created_at) AS period_start,
                          DATE(t.created_at) AS period_end";
            break;
    }

    $sql = "
    SELECT
        MIN(t.transactionID) AS id,
        $dateSelect,
        COUNT(DISTINCT o.orderID) AS total_transactions,
        SUM(t.totalPrice) AS total_revenue,
        SUM(t.subtotal) AS total_sales,
        SUM(t.product_discount + t.voucher_discount) AS total_discount
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    GROUP BY $groupBy
    ORDER BY period_start DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $dateFrom, $dateTo);
    $stmt->execute();

    $result = $stmt->get_result();
    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'id' => (int)$row['id'],
            'period_label' => $row['period_label'],
            'period_start' => $row['period_start'],
            'period_end' => $row['period_end'],
            'total_transactions' => (int)$row['total_transactions'],
            'total_revenue' => (float)$row['total_revenue'],
            'total_sales' => (float)$row['total_sales'],
            'total_discount' => (float)$row['total_discount']
        ];
    }

    sendResponse(true, 'Success', [
        'transactions' => $rows,
        'total' => count($rows),
        'filter' => $filter
    ]);
}

/* =======================================================
   STATISTICS 
======================================================= */
function getStatistics($input) {
    global $conn;

    // Use the same date range as the table filter
    $dateFrom = $input['date_from'] ?? date('Y-m-01');
    $dateTo   = $input['date_to'] ?? date('Y-m-d');

    $sql = "
    SELECT
        COUNT(DISTINCT o.orderID) AS total_transactions,
        SUM(t.totalPrice) AS total_revenue
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $dateFrom, $dateTo);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_assoc();

    sendResponse(true, 'Stats', [
        'total_transactions' => (int)($data['total_transactions'] ?? 0),
        'total_revenue' => (float)($data['total_revenue'] ?? 0)
    ]);
}

/* =======================================================
   GET STATISTICS WITH COMPARISON TO PREVIOUS PERIOD
======================================================= */
function getStatisticsWithComparison($input) {
    global $conn;

    $dateFrom = $input['date_from'] ?? date('Y-m-01');
    $dateTo   = $input['date_to'] ?? date('Y-m-d');

    // Calculate the date range duration
    $from = new DateTime($dateFrom);
    $to = new DateTime($dateTo);
    $daysDiff = $from->diff($to)->days + 1; // +1 to include both start and end dates

    // Calculate previous period dates
    $prevTo = clone $from;
    $prevTo->modify('-1 day');
    $prevFrom = clone $prevTo;
    $prevFrom->modify('-' . ($daysDiff - 1) . ' days');

    $prevDateFrom = $prevFrom->format('Y-m-d');
    $prevDateTo = $prevTo->format('Y-m-d');

    // Get current period stats
    $sql = "
    SELECT
        COUNT(DISTINCT o.orderID) AS total_transactions,
        SUM(t.totalPrice) AS total_revenue
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $dateFrom, $dateTo);
    $stmt->execute();
    $currentData = $stmt->get_result()->fetch_assoc();

    // Get previous period stats
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $prevDateFrom, $prevDateTo);
    $stmt->execute();
    $prevData = $stmt->get_result()->fetch_assoc();

    // Calculate percentage changes
    $currentTx = (int)($currentData['total_transactions'] ?? 0);
    $prevTx = (int)($prevData['total_transactions'] ?? 0);
    $currentRev = (float)($currentData['total_revenue'] ?? 0);
    $prevRev = (float)($prevData['total_revenue'] ?? 0);

    // Calculate transaction change percentage
    $txChangePercent = 0;
    if ($prevTx > 0) {
        $txChangePercent = (($currentTx - $prevTx) / $prevTx) * 100;
    } elseif ($currentTx > 0) {
        $txChangePercent = 100; // If there were no previous transactions but now there are
    }

    // Calculate revenue change percentage
    $revChangePercent = 0;
    if ($prevRev > 0) {
        $revChangePercent = (($currentRev - $prevRev) / $prevRev) * 100;
    } elseif ($currentRev > 0) {
        $revChangePercent = 100; // If there was no previous revenue but now there is
    }

    sendResponse(true, 'Stats with comparison', [
        'total_transactions' => $currentTx,
        'total_revenue' => $currentRev,
        'tx_change_percent' => round($txChangePercent, 1),
        'rev_change_percent' => round($revChangePercent, 1),
        'prev_total_transactions' => $prevTx,
        'prev_total_revenue' => $prevRev,
        'comparison_period' => [
            'current' => ['from' => $dateFrom, 'to' => $dateTo],
            'previous' => ['from' => $prevDateFrom, 'to' => $prevDateTo]
        ]
    ]);
}

/* =======================================================
   TRANSACTION DETAIL 
======================================================= */
function getTransactionDetail($input) {
    global $conn;

    $date = $input['date'] ?? '';
    $filter = $input['filter'] ?? 'daily';
    $periodStart = $input['period_start'] ?? $date;
    $periodEnd = $input['period_end'] ?? $date;

    $sql = "
    SELECT
        COUNT(DISTINCT o.orderID) AS total_transactions,
        SUM(t.subtotal) AS total_sales,
        SUM(t.product_discount + t.voucher_discount) AS total_discount,
        SUM(t.totalPrice) AS total_revenue
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $periodStart, $periodEnd);
    $stmt->execute();
    $data = $stmt->get_result()->fetch_assoc();

    if (!$data) {
        sendResponse(false, 'Transaction not found');
    }

    sendResponse(true, 'Detail', [
        'period_start' => $periodStart,
        'period_end' => $periodEnd,
        'total_transactions' => (int)($data['total_transactions'] ?? 0),
        'total_sales' => (float)($data['total_sales'] ?? 0),
        'total_discount' => (float)($data['total_discount'] ?? 0),
        'total_revenue' => (float)($data['total_revenue'] ?? 0)
    ]);
}

/* =======================================================
   EXPORT TRANSACTION DETAILS WITH ORDER & TRANSACTION DATA
======================================================= */
function exportTransactionDetails($input) {
    global $conn;

    $periodStart = $input['period_start'] ?? '';
    $periodEnd = $input['period_end'] ?? '';

    if (empty($periodStart) || empty($periodEnd)) {
        sendResponse(false, 'Period dates are required');
    }

    $sql = "
    SELECT 
        t.transactionID,
        t.orderID,
        o.status AS order_status,
        t.created_at AS transaction_date,
        t.subtotal,
        t.product_discount,
        t.voucher_discount,
        t.totalPrice AS total_price,
        t.status AS transaction_status,
        o.userID,
        u.username,
        u.name,
        u.email,
        o.created_at AS order_date,
        o.totalItem,
        o.addressID,
        o.deliveryID
    FROM `transaction` t
    INNER JOIN `orders` o ON o.orderID = t.orderID
    LEFT JOIN `users` u ON u.userID = o.userID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    ORDER BY t.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $periodStart, $periodEnd);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'transaction_id' => $row['transactionID'],
            'order_id' => $row['orderID'],
            'order_status' => $row['order_status'],
            'transaction_date' => $row['transaction_date'],
            'order_date' => $row['order_date'],
            'user_id' => $row['userID'],
            'username' => $row['username'] ?? 'N/A',
            'name' => $row['name'],
            'email' => $row['email'],
            'total_items' => (int)$row['totalItem'],
            'subtotal' => (float)$row['subtotal'],
            'product_discount' => (float)$row['product_discount'],
            'voucher_discount' => (float)$row['voucher_discount'],
            'total_price' => (float)$row['total_price'],
            'transaction_status' => $row['transaction_status'],
            'address_id' => $row['addressID'] ?? 'N/A',
            'delivery_id' => $row['deliveryID'] ?? 'N/A'
        ];
    }

    sendResponse(true, 'Export data', [
        'transactions' => $transactions,
        'period_start' => $periodStart,
        'period_end' => $periodEnd,
        'total_records' => count($transactions)
    ]);
}

/* =======================================================
   GET REVENUE TRENDS WITH SMART AUTO-GROUPING
======================================================= */
function getRevenueTrends($input) {
    global $conn;

    $dateFrom = $input['date_from'] ?? date('Y-m-01');
    $dateTo   = $input['date_to'] ?? date('Y-m-d');

    // Calculate date range in days
    $from = new DateTime($dateFrom);
    $to = new DateTime($dateTo);
    $daysDiff = $from->diff($to)->days;

    // Determine grouping strategy based on date range
    if ($daysDiff <= 31) {
        // Daily grouping (up to 1 month)
        $groupBy = "DATE(t.created_at)";
        $dateSelect = "DATE(t.created_at) AS period_date";
        $groupType = 'daily';
    } elseif ($daysDiff <= 90) {
        // Weekly grouping (1-3 months)
        $groupBy = "YEARWEEK(t.created_at, 1)";
        $dateSelect = "
            MIN(DATE(t.created_at)) AS period_date,
            YEAR(MIN(t.created_at)) AS year,
            WEEK(MIN(t.created_at), 1) AS week_num
        ";
        $groupType = 'weekly';
    } elseif ($daysDiff <= 365) {
        // Monthly grouping (3 months - 1 year)
        $groupBy = "DATE_FORMAT(t.created_at, '%Y-%m')";
        $dateSelect = "
            DATE_FORMAT(MIN(t.created_at), '%Y-%m-01') AS period_date,
            DATE_FORMAT(MIN(t.created_at), '%Y-%m') AS year_month
        ";
        $groupType = 'monthly';
    } else {
        // Quarterly grouping (> 1 year)
        $groupBy = "CONCAT(YEAR(t.created_at), '-', QUARTER(t.created_at))";
        $dateSelect = "
            DATE_FORMAT(MIN(t.created_at), '%Y-%m-01') AS period_date,
            YEAR(MIN(t.created_at)) AS year,
            QUARTER(MIN(t.created_at)) AS quarter
        ";
        $groupType = 'quarterly';
    }

    $sql = "
    SELECT
        $dateSelect,
        SUM(t.totalPrice) AS revenue,
        COUNT(DISTINCT o.orderID) AS transaction_count
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    GROUP BY $groupBy
    ORDER BY MIN(t.created_at) ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $dateFrom, $dateTo);
    $stmt->execute();

    $result = $stmt->get_result();
    $data = [];

    while ($row = $result->fetch_assoc()) {
        // Format label based on group type
        $label = '';
        
        if ($groupType === 'daily') {
            $label = $row['period_date'];
        } elseif ($groupType === 'weekly') {
            $label = $row['period_date']; // Will be formatted in JS
            $row['week_num'] = $row['week_num'] ?? '';
            $row['year'] = $row['year'] ?? '';
        } elseif ($groupType === 'monthly') {
            $label = $row['year_month'] ?? $row['period_date'];
        } elseif ($groupType === 'quarterly') {
            $label = $row['year'] . '-Q' . $row['quarter'];
        }

        $data[] = [
            'date' => $row['period_date'] ?? $label,
            'label' => $label,
            'revenue' => (float)$row['revenue'],
            'transaction_count' => (int)$row['transaction_count'],
            'year' => $row['year'] ?? null,
            'week_num' => $row['week_num'] ?? null,
            'quarter' => $row['quarter'] ?? null
        ];
    }

    sendResponse(true, 'Revenue trends', [
        'data' => $data,
        'group_type' => $groupType,
        'date_range_days' => $daysDiff,
        'total_periods' => count($data)
    ]);
}

/* =======================================================
   GET CATEGORY BREAKDOWN (FOR CHART)
======================================================= */
function getCategoryBreakdown($input) {
    global $conn;

    $dateFrom = $input['date_from'] ?? date('Y-m-01');
    $dateTo = $input['date_to'] ?? date('Y-m-d');

    $sql = "
    SELECT
        c.name AS category,
        SUM(i.netPrice * i.qty) AS total_sales
    FROM transaction t
    INNER JOIN orders o ON o.orderID = t.orderID
    INNER JOIN items i ON i.orderID = o.orderID
    INNER JOIN variations v ON v.varID = i.varID
    INNER JOIN products p ON p.productID = v.productID
    INNER JOIN category c ON c.categoryID = p.categoryID
    WHERE DATE(t.created_at) BETWEEN ? AND ?
      AND t.status = 'Paid'
      AND o.status = 'Completed'
    GROUP BY c.categoryID, c.name
    ORDER BY total_sales DESC
    LIMIT 5
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $dateFrom, $dateTo);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = [
            'category' => $row['category'] ?? 'Uncategorized',
            'total_sales' => (float)$row['total_sales']
        ];
    }

    sendResponse(true, 'Category breakdown', ['data' => $data]);
}

/* =======================================================
   RESPONSE HELPER
======================================================= */
function sendResponse($success, $message, $data = []) {
    header('Content-Type: application/json');
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message
    ], $data));
    exit();
}
?>