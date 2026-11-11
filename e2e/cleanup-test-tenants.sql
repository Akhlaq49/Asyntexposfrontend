-- Removes the throwaway tenants and catalogue rows the browser tests create.
-- LOCAL DEV DATABASE ONLY (PharmaPosDb). Never run against production.
--   mysql -u <user> -p PharmaPosDb < e2e/cleanup-test-tenants.sql

DROP PROCEDURE IF EXISTS e2e_cleanup;
DELIMITER $$
CREATE PROCEDURE e2e_cleanup()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE t VARCHAR(64);
    DECLARE cur CURSOR FOR
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = DATABASE() AND column_name = 'TenantId' AND table_name <> 'tenants';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    DROP TEMPORARY TABLE IF EXISTS e2e_ids;
    CREATE TEMPORARY TABLE e2e_ids AS
        SELECT Id FROM tenants WHERE Email LIKE 'e2e-browser-%@test.local';

    SET FOREIGN_KEY_CHECKS = 0;
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO t;
        IF done THEN LEAVE read_loop; END IF;
        SET @sql = CONCAT('DELETE FROM `', t, '` WHERE TenantId IN (SELECT Id FROM e2e_ids)');
        PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    END LOOP;
    CLOSE cur;
    DELETE FROM tenants WHERE Id IN (SELECT Id FROM e2e_ids);
    DELETE FROM medicinemasters WHERE BrandName LIKE 'E2EBrufen%';
    DELETE FROM druginteractions WHERE Note = 'E2E test pair';
    SET FOREIGN_KEY_CHECKS = 1;
    DROP TEMPORARY TABLE IF EXISTS e2e_ids;
END$$
DELIMITER ;

CALL e2e_cleanup();
DROP PROCEDURE IF EXISTS e2e_cleanup;
