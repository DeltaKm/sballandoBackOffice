-- Aggiunge i campi dress_code e age_recommended alla tabella events
-- Esegui questo SQL direttamente sul database MySQL

ALTER TABLE `events` 
ADD COLUMN `dress_code` VARCHAR(255) NULL AFTER `qr_enter`,
ADD COLUMN `age_recommended` VARCHAR(50) NULL AFTER `dress_code`;
