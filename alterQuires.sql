ALTER TABLE `tblUsers`
ADD `user2faSecret` VARCHAR(64) NULL DEFAULT NULL
AFTER `userRefreshToken`,
    ADD `user2faQr` TEXT NULL DEFAULT NULL
AFTER `user2faSecret`;
INSERT INTO `tblOptions` (
        `optionId`,
        `optionKey`,
        `optionValue`,
        `optionCreatedAt`,
        `optionUpdatedAt`
    )
VALUES (
        NULL,
        'cashfreeLinkStatusMap',
        '{\"PAID\":\"1\",\"PARTIALLY_PAID\":\"4\",\"EXPIRED\":\"2\",\"CANCELLED\":\"5\"}',
        '2024-11-29 09:58:36',
        NULL
    );