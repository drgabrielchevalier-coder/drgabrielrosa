<?php
declare(strict_types=1);

/**
 * Envio de e-mail (mail() nativo + SMTP opcional via config.local.php).
 *
 * define('MAIL_FROM', 'noreply@seudominio.com');
 * define('MAIL_FROM_NAME', 'Dr Gabriel Rosa');
 * // Opcional SMTP Hostinger:
 * define('MAIL_SMTP_HOST', 'smtp.hostinger.com');
 * define('MAIL_SMTP_PORT', 465);
 * define('MAIL_SMTP_USER', 'noreply@seudominio.com');
 * define('MAIL_SMTP_PASS', '...');
 * define('MAIL_SMTP_SECURE', 'ssl'); // ssl|tls|none
 */

require_once __DIR__ . '/config.php';

function chevalier_mail_from(): string
{
    if (defined('MAIL_FROM') && filter_var((string) MAIL_FROM, FILTER_VALIDATE_EMAIL)) {
        return (string) MAIL_FROM;
    }
    $host = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $host = strtolower(preg_replace('/[^a-z0-9.-]/', '', $host) ?: 'localhost');
    if ($host === 'localhost' || str_starts_with($host, '127.')) {
        return 'noreply@localhost';
    }
    return 'noreply@' . $host;
}

function chevalier_mail_from_name(): string
{
    if (defined('MAIL_FROM_NAME') && trim((string) MAIL_FROM_NAME) !== '') {
        return trim((string) MAIL_FROM_NAME);
    }
    return 'Dr Gabriel Rosa';
}

/**
 * @return array{ok:bool,error?:string}
 */
function chevalier_mail_send(string $to, string $subject, string $textBody, string $htmlBody = ''): array
{
    $to = trim($to);
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Destinatário inválido'];
    }
    $from = chevalier_mail_from();
    $fromName = chevalier_mail_from_name();
    $subject = trim(preg_replace("/[\r\n]+/", ' ', $subject) ?? $subject);

    if (defined('MAIL_SMTP_HOST') && trim((string) MAIL_SMTP_HOST) !== '') {
        return chevalier_mail_send_smtp($to, $subject, $textBody, $htmlBody, $from, $fromName);
    }

    $boundary = 'b_' . bin2hex(random_bytes(12));
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'From: ' . chevalier_mail_encode_address($fromName, $from);
    $headers[] = 'Reply-To: ' . $from;
    $headers[] = 'X-Mailer: ChevalierGestao';
    $headers[] = 'X-Priority: 1';
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

    $body = "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($textBody))
        . "--{$boundary}\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($htmlBody !== '' ? $htmlBody : nl2br(htmlspecialchars($textBody, ENT_QUOTES, 'UTF-8'))))
        . "--{$boundary}--\r\n";

    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), '-f' . $from);
    if (!$ok) {
        return ['ok' => false, 'error' => 'Falha ao enviar e-mail pelo servidor (mail).'];
    }
    return ['ok' => true];
}

function chevalier_mail_encode_address(string $name, string $email): string
{
    $safeName = trim(preg_replace("/[\r\n]+/", '', $name) ?? $name);
    return '=?UTF-8?B?' . base64_encode($safeName) . '?= <' . $email . '>';
}

/**
 * SMTP mínimo (AUTH LOGIN) para Hostinger / provedores comuns.
 *
 * @return array{ok:bool,error?:string}
 */
function chevalier_mail_send_smtp(
    string $to,
    string $subject,
    string $textBody,
    string $htmlBody,
    string $from,
    string $fromName
): array {
    $host = trim((string) MAIL_SMTP_HOST);
    $port = defined('MAIL_SMTP_PORT') ? (int) MAIL_SMTP_PORT : 465;
    $user = defined('MAIL_SMTP_USER') ? (string) MAIL_SMTP_USER : $from;
    $pass = defined('MAIL_SMTP_PASS') ? (string) MAIL_SMTP_PASS : '';
    $secure = strtolower(defined('MAIL_SMTP_SECURE') ? (string) MAIL_SMTP_SECURE : 'ssl');

    if ($pass === '') {
        return ['ok' => false, 'error' => 'MAIL_SMTP_PASS não configurada'];
    }

    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$fp) {
        return ['ok' => false, 'error' => "SMTP connect: {$errstr}"];
    }
    stream_set_timeout($fp, 20);

    $read = static function () use ($fp): string {
        $data = '';
        while (!feof($fp)) {
            $line = fgets($fp, 515);
            if ($line === false) {
                break;
            }
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $cmd = static function (string $line) use ($fp, $read): string {
        fwrite($fp, $line . "\r\n");
        return $read();
    };

    $banner = $read();
    if (!str_starts_with($banner, '220')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'SMTP banner inválido'];
    }

    $ehloHost = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost')) ?: 'localhost';
    $cmd('EHLO ' . $ehloHost);
    if ($secure === 'tls') {
        $resp = $cmd('STARTTLS');
        if (!str_starts_with($resp, '220')) {
            fclose($fp);
            return ['ok' => false, 'error' => 'STARTTLS falhou'];
        }
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            return ['ok' => false, 'error' => 'TLS handshake falhou'];
        }
        $cmd('EHLO ' . $ehloHost);
    }

    $resp = $cmd('AUTH LOGIN');
    if (!str_starts_with($resp, '334')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'AUTH LOGIN não suportado'];
    }
    $resp = $cmd(base64_encode($user));
    if (!str_starts_with($resp, '334')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'SMTP user rejeitado'];
    }
    $resp = $cmd(base64_encode($pass));
    if (!str_starts_with($resp, '235')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'SMTP autenticação falhou'];
    }

    $resp = $cmd('MAIL FROM:<' . $from . '>');
    if (!str_starts_with($resp, '250')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'MAIL FROM rejeitado'];
    }
    $resp = $cmd('RCPT TO:<' . $to . '>');
    if (!str_starts_with($resp, '250') && !str_starts_with($resp, '251')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'RCPT TO rejeitado'];
    }
    $resp = $cmd('DATA');
    if (!str_starts_with($resp, '354')) {
        fclose($fp);
        return ['ok' => false, 'error' => 'DATA rejeitado'];
    }

    $boundary = 'b_' . bin2hex(random_bytes(10));
    $msg = 'From: ' . chevalier_mail_encode_address($fromName, $from) . "\r\n"
        . 'To: <' . $to . ">\r\n"
        . 'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n"
        . "MIME-Version: 1.0\r\n"
        . 'Content-Type: multipart/alternative; boundary="' . $boundary . "\"\r\n"
        . "\r\n"
        . "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($textBody))
        . "--{$boundary}\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($htmlBody !== '' ? $htmlBody : nl2br(htmlspecialchars($textBody, ENT_QUOTES, 'UTF-8'))))
        . "--{$boundary}--\r\n"
        . ".\r\n";

    fwrite($fp, $msg);
    $resp = $read();
    $cmd('QUIT');
    fclose($fp);

    if (!str_starts_with($resp, '250')) {
        return ['ok' => false, 'error' => 'SMTP envio rejeitado'];
    }
    return ['ok' => true];
}
