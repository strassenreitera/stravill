<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $phone = htmlspecialchars($_POST["phone"]);
    $message = htmlspecialchars($_POST["message"]);

    $to = "strassenreiter.a@gmail.com";
    $subject = "Új üzenet a weboldalról - StraVill";

    $body = "Név: $name\n".
            "E-mail: $email\n".
            "Telefon: $phone\n\n".
            "Üzenet:\n$message";

    $headers = "From: noreply@stra-vill.hu\r\n";
    $headers .= "Reply-To: $email\r\n";

    if (mail($to, $subject, $body, $headers)) {
        echo "Sikeres üzenetküldés!";
    } else {
        echo "Hiba történt az üzenet küldése közben.";
    }
}
?>
