<?php
declare(strict_types=1);
/**
 * Web App Manifest com URLs absolutas (caminho) — evita ícone genérico no Chrome PWA.
 */
require_once __DIR__ . '/api/app-version-lib.php';

header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$base = chevalier_web_base_path();
$u = static function (string $rel) use ($base): string {
    return $base . '/' . ltrim($rel, '/');
};

$icons = [];
foreach ([
    [16, 'assets/img/icons/icon-16.png', 'any'],
    [32, 'assets/img/icons/icon-32.png', 'any'],
    [48, 'assets/img/icons/icon-48.png', 'any'],
    [96, 'assets/img/icons/icon-96.png', 'any'],
    [128, 'assets/img/icons/icon-128.png', 'any'],
    [144, 'assets/img/icons/icon-144.png', 'any'],
    [180, 'assets/img/icons/apple-touch-icon.png', 'any'],
    [192, 'icon-192.png', 'any'],
    [192, 'assets/img/icons/icon-192.png', 'any'],
    [256, 'assets/img/icons/icon-256.png', 'any'],
    [384, 'assets/img/icons/icon-384.png', 'any'],
    [512, 'icon-512.png', 'any'],
    [512, 'assets/img/icons/icon-512.png', 'any'],
    [512, 'assets/img/icons/icon-512-maskable.png', 'maskable'],
] as [$size, $path, $purpose]) {
    $icons[] = [
        'src' => $u($path),
        'sizes' => $size . 'x' . $size,
        'type' => 'image/png',
        'purpose' => $purpose,
    ];
}

$manifest = [
    'name' => 'Dr Gabriel Rosa — Gestão',
    'short_name' => 'Gabriel Rosa',
    'description' => 'Gestão clínica, financeira, pacientes e próteses — Dr Gabriel Rosa.',
    'id' => $u('index.php'),
    'start_url' => $u('index.php'),
    'scope' => $base === '' ? '/' : $base . '/',
    'display' => 'standalone',
    'orientation' => 'any',
    'background_color' => '#0d0e0c',
    'theme_color' => '#0d0e0c',
    'lang' => 'pt-BR',
    'icons' => $icons,
];

echo json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
