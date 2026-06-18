CREATE TABLE `Reservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `managerId` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `computerId` INTEGER NOT NULL,

    INDEX `Reservation_managerId_startAt_idx`(`managerId`, `startAt`),
    INDEX `Reservation_clientId_startAt_idx`(`clientId`, `startAt`),
    INDEX `Reservation_computerId_startAt_idx`(`computerId`, `startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Manager`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_computerId_fkey` FOREIGN KEY (`computerId`) REFERENCES `Computer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
