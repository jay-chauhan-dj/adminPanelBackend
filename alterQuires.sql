ALTER TABLE `tblUsers`
ADD `user2faSecret` VARCHAR(64) NULL DEFAULT NULL
AFTER `userRefreshToken`,
    ADD `user2faQr` TEXT NULL DEFAULT NULL
AFTER `user2faSecret`;