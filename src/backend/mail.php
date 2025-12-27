<?php
require_once __DIR__ . '/loadEnv.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Composer autoload (recommended if you installed via Composer)
require_once __DIR__ . '/vendor/autoload.php';

function sendOrderConfirmation($to, $orderID) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = getenv('MAIL_HOST');
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('MAIL_USERNAME');
        $mail->Password   = getenv('MAIL_PASSWORD');
        $mail->Port       = getenv('MAIL_PORT');

        $mail->setFrom(
            getenv('MAIL_FROM'),
            getenv('MAIL_FROM_NAME')
        );

        $mail->addAddress($to);
        $mail->Subject = "Order Confirmation (#$orderID)";
        $mail->Body    = "Thank you for your order!\n\nOrder ID: $orderID";

        $mail->send();
        return true;

    } catch (Exception $e) {
        error_log("Email error: " . $mail->ErrorInfo);
        return false;
    }
}
