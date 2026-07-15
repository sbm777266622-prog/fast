-- ============================================
-- جداول NetCard Pro (متوافقة مع MariaDB)
-- ============================================

-- Users
CREATE TABLE `users` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `unionId` varchar(255) NOT NULL UNIQUE,
  `name` varchar(255),
  `email` varchar(320),
  `avatar` text,
  `role` enum('super_admin','admin','operator','accountant','viewer') NOT NULL DEFAULT 'operator',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `permissions` json,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_sign_in_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Customers
CREATE TABLE `customers` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `full_name` varchar(255),
  `phone` varchar(50) NOT NULL,
  `email` varchar(320),
  `ip_address` varchar(100),
  `user_agent` text,
  `total_orders` int NOT NULL DEFAULT 0,
  `total_spent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `last_purchase_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `phone_idx` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Packages
CREATE TABLE `packages` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL UNIQUE,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2),
  `currency` varchar(10) NOT NULL DEFAULT 'YER',
  `duration_days` int NOT NULL DEFAULT 30,
  `speed` varchar(100),
  `quota_gb` decimal(10,2),
  `sort_order` int NOT NULL DEFAULT 0,
  `image_url` text,
  `color` varchar(50) DEFAULT '#3B82F6',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `total_cards` int NOT NULL DEFAULT 0,
  `sold_cards` int NOT NULL DEFAULT 0,
  `reserved_cards` int NOT NULL DEFAULT 0,
  `available_cards` int NOT NULL DEFAULT 0,
  `meta` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Cards
CREATE TABLE `cards` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `card_code` varchar(500) NOT NULL UNIQUE,
  `package_id` bigint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` enum('available','reserved','sold','cancelled','expired') NOT NULL DEFAULT 'available',
  `reserved_at` timestamp NULL DEFAULT NULL,
  `reserved_until` timestamp NULL DEFAULT NULL,
  `sold_at` timestamp NULL DEFAULT NULL,
  `order_id` bigint unsigned,
  `customer_id` bigint unsigned,
  `import_batch_id` bigint unsigned,
  `imported_by` bigint unsigned,
  `source_file` varchar(500),
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `status_idx` (`status`),
  INDEX `package_idx` (`package_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Orders
CREATE TABLE `orders` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `order_number` varchar(100) NOT NULL UNIQUE,
  `customer_id` bigint unsigned NOT NULL,
  `package_id` bigint unsigned NOT NULL,
  `card_id` bigint unsigned,
  `price` decimal(10,2) NOT NULL,
  `payment_method` enum('jeibi','floosak','onecash','jawali','cash') NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(255),
  `customer_name` varchar(255),
  `customer_phone` varchar(50) NOT NULL,
  `customer_email` varchar(320),
  `ip_address` varchar(100),
  `user_agent` text,
  `notes` text,
  `meta` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `order_number_idx` (`order_number`),
  INDEX `customer_idx` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Audit Logs
CREATE TABLE `audit_logs` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) NOT NULL,
  `entity_id` bigint unsigned,
  `user_id` bigint unsigned,
  `user_role` varchar(50),
  `user_name` varchar(255),
  `description` text,
  `old_value` json,
  `new_value` json,
  `ip_address` varchar(100),
  `user_agent` text,
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Payment Gateways
CREATE TABLE `payment_gateways` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL UNIQUE,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `config` json,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Import Batches
CREATE TABLE `import_batches` (
  `id` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
  `file_name` varchar(500) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `total_records` int NOT NULL DEFAULT 0,
  `success_count` int NOT NULL DEFAULT 0,
  `failed_count` int NOT NULL DEFAULT 0,
  `package_id` bigint unsigned,
  `imported_by` bigint unsigned,
  `notes` text,
  `meta` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;