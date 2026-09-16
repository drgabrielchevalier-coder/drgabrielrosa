<?php
declare(strict_types=1);
require_once __DIR__ . '/app-version-lib.php';
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
$root = dirname(__DIR__);
echo json_encode([
    'ok' => true,
    'build' => chevalier_app_build($root),
    'release' => chevalier_release_manifest($root),
    'checkedAt' => gmdate('c'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
