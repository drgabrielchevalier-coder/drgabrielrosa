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

/* Login — sobrescreva em config.local.php */
if (!defined('AUTH_USER')) {
    define('AUTH_USER', 'gabriel');
}
if (!defined('AUTH_PASS')) {
    define('AUTH_PASS', 'chevalier');
}
/* Opcional: define('AUTH_PASS_HASH', password_hash('sua-senha', PASSWORD_DEFAULT)); */
/* Opcional IA Vision: define('OPENAI_API_KEY', 'sk-...'); define('OPENAI_VISION_MODEL', 'gpt-4o-mini'); */
