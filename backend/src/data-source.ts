import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User, Product, Order, OrderEvent, BadgePayment, BadgePlan, Notification } from './entities'; 


/** Source de données partagée par la CLI TypeORM, le seed et les scripts de migration. */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME ?? 'nexice',

  entities:[ User, Product, Order, OrderEvent, BadgePayment, BadgePlan, Notification],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
