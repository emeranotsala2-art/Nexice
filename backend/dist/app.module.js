"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const entities_1 = require("./entities");
const common_2 = require("./common");
const auth_controller_1 = require("./auth.controller");
const catalog_controller_1 = require("./catalog.controller");
const orders_controller_1 = require("./orders.controller");
const admin_controller_1 = require("./admin.controller");
const ai_controller_1 = require("./ai.controller");
const legal_controller_1 = require("./legal.controller");
const tracking_gateway_1 = require("./tracking.gateway");
const notifications_1 = require("./notifications");
let HealthController = class HealthController {
    ok() { return { status: 'ok' }; }
};
__decorate([
    (0, common_2.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "ok", null);
HealthController = __decorate([
    (0, common_1.Controller)('health')
], HealthController);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            typeorm_1.TypeOrmModule.forRootAsync({ inject: [config_1.ConfigService], useFactory: (c) => ({
                    type: 'mysql', host: c.get('DB_HOST'), port: +c.get('DB_PORT'), username: c.get('DB_USER'),
                    password: c.get('DB_PASS'), database: c.get('DB_NAME'), entities: entities_1.ALL_ENTITIES, migrations: [__dirname + '/migrations/*{.ts,.js}'], migrationsTableName: 'migrations',
                    migrationsRun: c.get('DB_MIGRATIONS_RUN') === 'true', synchronize: c.get('DB_SYNC') === 'true'
                }) }),
            typeorm_1.TypeOrmModule.forFeature(entities_1.ALL_ENTITIES),
            jwt_1.JwtModule.registerAsync({ global: true, inject: [config_1.ConfigService], useFactory: (c) => {
                    const secret = c.get('JWT_SECRET');
                    if (!secret || secret.length < 16)
                        throw new Error('JWT_SECRET manquant ou trop court (16 caractères minimum)');
                    return { secret, signOptions: { expiresIn: '12h' } };
                } }),
        ],
        controllers: [HealthController, auth_controller_1.AuthController, catalog_controller_1.CatalogController, orders_controller_1.OrdersController, admin_controller_1.AdminController, ai_controller_1.AiController, notifications_1.NotificationsController, legal_controller_1.LegalController],
        providers: [common_2.TraceService, tracking_gateway_1.TrackingGateway, notifications_1.NotificationsGateway, notifications_1.NotificationsService, notifications_1.RemindersService, { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }, { provide: core_1.APP_GUARD, useClass: common_2.AuthGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map