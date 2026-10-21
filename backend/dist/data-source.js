"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const entities_1 = require("./entities");
/** Source de données partagée par la CLI TypeORM, le seed et les scripts de migration. */
exports.default = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: +(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? '',
    database: process.env.DB_NAME ?? 'nexice',
    entities: [entities_1.User, entities_1.Product, entities_1.Order, entities_1.OrderEvent, entities_1.BadgePayment, entities_1.BadgePlan, entities_1.Notification],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'migrations',
    synchronize: false,
});
//# sourceMappingURL=data-source.js.map