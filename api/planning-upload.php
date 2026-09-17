<?php
declare(strict_types=1);

/**
 * Upload de arquivos de planejamento (ICON, CBCT, PDF, imagens, STL).
 */
require_once __DIR__ . '/auth-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

chevalier_auth_boot();
chevalier_security_headers();
if (!chevalier_auth_logged_in()) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'needsAuth' => true, 'error' => 'Faça login.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$root = dirname(__DIR__);
$dir = $root . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'planning';
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível criar a pasta de uploads.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$ht = $dir . DIRECTORY_SEPARATOR . '.htaccess';
if (!is_file($ht)) {
    @file_put_contents($ht, "Require all denied\n");
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['id'] ?? ''));
    if ($id === '') {
        echo json_encode(['ok' => true, 'hint' => 'POST multipart file=...'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $metaFile = $dir . DIRECTORY_SEPARATOR . $id . '.json';
    if (!is_file($metaFile)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Arquivo não encontrado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $meta = json_decode((string) file_get_contents($metaFile), true);
    if (!is_array($meta) || empty($meta['stored'])) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Metadados inválidos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $path = $dir . DIRECTORY_SEPARATOR . basename((string) $meta['stored']);
    if (!is_file($path)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Arquivo ausente no disco.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $mime = (string) ($meta['mime'] ?? 'application/octet-stream');
    $safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '_', (string) ($meta['name'] ?? $id)) ?: $id;
    $isImage = str_starts_with($mime, 'image/');
    $download = !empty($_GET['download']) || !$isImage;
    header('X-Content-Type-Options: nosniff');
    header('Content-Type: ' . ($isImage ? $mime : 'application/octet-stream'));
    header('Content-Length: ' . (string) filesize($path));
    header('Content-Disposition: ' . ($download ? 'attachment' : 'inline') . '; filename="' . $safeName . '"');
    readfile($path);
    exit;
}

if ($method === 'DELETE') {
    chevalier_csrf_require();
    $raw = chevalier_request_body();
    $data = json_decode($raw ?: 'null', true);
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) (($data['id'] ?? $_GET['id'] ?? '')));
    if ($id === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Informe id.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $metaFile = $dir . DIRECTORY_SEPARATOR . $id . '.json';
    if (is_file($metaFile)) {
        $meta = json_decode((string) file_get_contents($metaFile), true);
        if (is_array($meta) && !empty($meta['stored'])) {
            $path = $dir . DIRECTORY_SEPARATOR . basename((string) $meta['stored']);
            if (is_file($path)) {
                @unlink($path);
            }
        }
        @unlink($metaFile);
    }
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

$csrfHeader = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf'] ?? '');
if (!chevalier_csrf_validate($csrfHeader)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Token CSRF inválido ou ausente.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Envie o arquivo (campo file).'], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Falha no upload (código ' . (int) ($file['error'] ?? 0) . ').'], JSON_UNESCAPED_UNICODE);
    exit;
}

$maxBytes = 40 * 1024 * 1024; // 40 MB
$size = (int) ($file['size'] ?? 0);
if ($size <= 0 || $size > $maxBytes) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Arquivo muito grande (máx. 40 MB).'], JSON_UNESCAPED_UNICODE);
    exit;
}

$origName = basename((string) ($file['name'] ?? 'arquivo'));
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
$allowed = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff',
    'pdf', 'dcm', 'dicom', 'stl', 'ply', 'obj', 'zip',
    'icon', 'xml', 'json', 'csv', 'txt',
];
if ($ext === '' || !in_array($ext, $allowed, true)) {
    http_response_code(415);
    echo json_encode(['ok' => false, 'error' => 'Tipo não suportado. Use imagem, PDF, DICOM, STL, ZIP ou export ICON.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: 'application/octet-stream';
$mimeOk = [
    'jpg' => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png' => ['image/png'],
    'webp' => ['image/webp'],
    'gif' => ['image/gif'],
    'bmp' => ['image/bmp', 'image/x-ms-bmp'],
    'tif' => ['image/tiff'],
    'tiff' => ['image/tiff'],
    'pdf' => ['application/pdf'],
    'json' => ['application/json', 'text/plain'],
    'xml' => ['application/xml', 'text/xml', 'text/plain'],
    'csv' => ['text/csv', 'text/plain'],
    'txt' => ['text/plain'],
    'zip' => ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    'stl' => ['application/octet-stream', 'model/stl', 'text/plain'],
    'ply' => ['application/octet-stream', 'text/plain'],
    'obj' => ['application/octet-stream', 'text/plain'],
    'dcm' => ['application/dicom', 'application/octet-stream'],
    'dicom' => ['application/dicom', 'application/octet-stream'],
    'icon' => ['application/octet-stream', 'application/json', 'text/plain', 'application/xml', 'text/xml'],
];
$allowedMimes = $mimeOk[$ext] ?? ['application/octet-stream'];
if (!in_array($mime, $allowedMimes, true)) {
    // Aceita octet-stream genérico só para formatos binários clínicos
    if (!in_array($ext, ['dcm', 'dicom', 'stl', 'ply', 'obj', 'icon', 'zip'], true) || $mime !== 'application/octet-stream') {
        http_response_code(415);
        echo json_encode(['ok' => false, 'error' => 'MIME não corresponde à extensão (' . $mime . ').'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$id = 'pl_' . bin2hex(random_bytes(8));
$stored = $id . '.' . $ext;
$dest = $dir . DIRECTORY_SEPARATOR . $stored;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao gravar o arquivo.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$kind = trim((string) ($_POST['kind'] ?? 'planejamento'));
$title = trim((string) ($_POST['title'] ?? pathinfo($origName, PATHINFO_FILENAME)));
$patient = trim((string) ($_POST['patient'] ?? ''));
$notes = trim((string) ($_POST['notes'] ?? ''));
$kind = substr($kind, 0, 80);
$title = substr($title, 0, 160);
$patient = substr($patient, 0, 120);
$notes = substr($notes, 0, 2000);

$meta = [
    'id' => $id,
    'name' => $origName,
    'title' => $title !== '' ? $title : $origName,
    'patient' => $patient,
    'notes' => $notes,
    'kind' => $kind,
    'mime' => $mime,
    'ext' => $ext,
    'size' => $size,
    'stored' => $stored,
    'url' => 'api/planning-upload.php?id=' . rawurlencode($id),
    'uploadedAt' => gmdate('c'),
    'isImage' => str_starts_with($mime, 'image/') || in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'], true),
    'isTomo' => in_array($ext, ['dcm', 'dicom'], true) || str_contains(strtolower($title . ' ' . $origName), 'tomo') || str_contains(strtolower($kind), 'tomo'),
];
file_put_contents($dir . DIRECTORY_SEPARATOR . $id . '.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

echo json_encode(['ok' => true, 'file' => $meta], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
