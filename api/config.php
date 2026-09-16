<?php
declare(strict_types=1);

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    require $local;
}

if (!defined('DB_HOST')) {
    define('DB_HOST', 'localhost');
}
if (!defined('DB_NAME')) {
    define('DB_NAME', 'u680963503_drgabriel');
}
if (!defined('DB_USER')) {
    define('DB_USER', 'u680963503_drgabriel');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', '');
}
