"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1791888204609 = void 0;
class InitialSchema1791888204609 {
    constructor() {
        this.name = 'InitialSchema1791888204609';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`role\` varchar(255) NOT NULL, \`company\` varchar(255) NULL, \`phone\` varchar(255) NULL, \`status\` varchar(255) NOT NULL DEFAULT 'PENDING', \`badge\` varchar(255) NULL, \`badgeExpiresAt\` timestamp NULL, \`aiUsed\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`product\` (\`id\` varchar(36) NOT NULL, \`sellerId\` varchar(255) NOT NULL, \`sellerCompany\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`unit\` varchar(255) NOT NULL DEFAULT 'unité', \`price\` int NOT NULL, \`stock\` int NOT NULL DEFAULT '0', \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_d5cac481d22dacaf4d53f900a3\` (\`sellerId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order\` (\`id\` varchar(36) NOT NULL, \`buyerId\` varchar(255) NOT NULL, \`buyerCompany\` varchar(255) NOT NULL, \`sellerId\` varchar(255) NOT NULL, \`sellerCompany\` varchar(255) NOT NULL, \`driverId\` varchar(255) NULL, \`status\` varchar(255) NOT NULL DEFAULT 'NEGOTIATION', \`items\` json NOT NULL, \`total\` int NOT NULL, \`lastOfferBy\` varchar(255) NOT NULL, \`deliveryAddress\` varchar(255) NULL, \`invoiceNumber\` varchar(255) NULL, \`paymentRef\` varchar(255) NULL, \`lastLat\` double NULL, \`lastLng\` double NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_20981b2b68bf03393c44dd1b9d\` (\`buyerId\`), INDEX \`IDX_8a583acc24e13bcf84b1b9d0d2\` (\`sellerId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order_event\` (\`id\` int NOT NULL AUTO_INCREMENT, \`orderId\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`data\` json NULL, \`prevHash\` varchar(255) NOT NULL, \`hash\` varchar(255) NOT NULL, \`at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c7692d881f326d48552256e4f5\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`badge_payment\` (\`id\` varchar(36) NOT NULL, \`userId\` varchar(255) NOT NULL, \`userEmail\` varchar(255) NOT NULL, \`color\` varchar(255) NOT NULL, \`amount\` int NOT NULL, \`omReference\` varchar(255) NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'PENDING', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_b7c5d135cb29613442b6c461c7\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`badge_plan\` (\`color\` varchar(255) NOT NULL, \`price\` int NOT NULL, PRIMARY KEY (\`color\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notification\` (\`id\` varchar(36) NOT NULL, \`userId\` varchar(255) NOT NULL, \`type\` varchar(255) NOT NULL, \`title\` varchar(255) NOT NULL, \`body\` varchar(255) NOT NULL, \`orderId\` varchar(255) NULL, \`key\` varchar(255) NULL, \`isRead\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_1ced25315eb974b73391fb1c81\` (\`userId\`), INDEX \`IDX_f98ad0a58b7e3201a5e7a0fa1c\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX \`IDX_f98ad0a58b7e3201a5e7a0fa1c\` ON \`notification\``);
        await queryRunner.query(`DROP INDEX \`IDX_1ced25315eb974b73391fb1c81\` ON \`notification\``);
        await queryRunner.query(`DROP TABLE \`notification\``);
        await queryRunner.query(`DROP TABLE \`badge_plan\``);
        await queryRunner.query(`DROP INDEX \`IDX_b7c5d135cb29613442b6c461c7\` ON \`badge_payment\``);
        await queryRunner.query(`DROP TABLE \`badge_payment\``);
        await queryRunner.query(`DROP INDEX \`IDX_c7692d881f326d48552256e4f5\` ON \`order_event\``);
        await queryRunner.query(`DROP TABLE \`order_event\``);
        await queryRunner.query(`DROP INDEX \`IDX_8a583acc24e13bcf84b1b9d0d2\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_20981b2b68bf03393c44dd1b9d\` ON \`order\``);
        await queryRunner.query(`DROP TABLE \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_d5cac481d22dacaf4d53f900a3\` ON \`product\``);
        await queryRunner.query(`DROP TABLE \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
    }
}
exports.InitialSchema1791888204609 = InitialSchema1791888204609;
//# sourceMappingURL=1791888204609-InitialSchema.js.map