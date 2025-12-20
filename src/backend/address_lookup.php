<?php
header('Content-Type: application/json');

if (!isset($_GET['postcode'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing postcode"]);
    exit;
}

$postcode = trim($_GET['postcode']);

$url = "https://nominatim.openstreetmap.org/search?" .
       "q=" . urlencode($postcode) .
       "&format=json&addressdetails=1&limit=1";

$options = [
    "http" => [
        "header" =>
            "User-Agent: EarthHero/1.0 (contact: admin@earthhero.test)\r\n" .
            "Accept: application/json\r\n"
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "OpenStreetMap request failed"]);
    exit;
}

$data = json_decode($response, true);

if (!empty($data)) {
    $address = $data[0]['address'] ?? [];
    echo json_encode([
        "city" => $address['city'] ?? $address['town'] ?? $address['village'] ?? '',
        "country" => $address['country'] ?? ''
    ]);
} else {
    echo json_encode(["city" => "", "country" => ""]);
}
