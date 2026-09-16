<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function chevalier_pdo(): PDO
{
    if (DB_PASS === '') {
        throw new RuntimeException('Senha do MySQL ainda nao foi configurada.');
    }

    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_state (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            payload LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    return $pdo;
}
