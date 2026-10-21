"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const entities_1 = require("./entities");
const dto_1 = require("./dto");
const common_2 = require("./common");
const notifications_1 = require("./notifications");
const activeBadge = (u) => (u.badge && u.badgeExpiresAt && u.badgeExpiresAt > new Date() ? u.badge : null);
let AuthController = class AuthController {
    constructor(users, jwt, notif, ds) {
        this.users = users;
        this.jwt = jwt;
        this.notif = notif;
        this.ds = ds;
    }
    async register(b) {
        const email = b.email.toLowerCase();
        if (await this.users.findOneBy({ email }))
            throw new common_1.ConflictException('Cet email est déjà utilisé');
        const u = await this.users.save({ email, role: b.role, company: b.company, phone: b.phone,
            passwordHash: await bcrypt.hash(b.password, 12) });
        await this.notif.toRole('ADMIN', 'SIGNUP', 'Nouvelle inscription', `${u.company} (${u.role}) attend validation`);
        return { id: u.id, status: u.status, message: 'Inscription reçue : un administrateur doit valider votre profil.' };
    }
    async login(b) {
        const u = await this.users.findOneBy({ email: b.email.toLowerCase() });
        if (!u || !(await bcrypt.compare(b.password, u.passwordHash)))
            throw new common_1.UnauthorizedException('Identifiants incorrects');
        if (u.status === 'PENDING')
            throw new common_1.ForbiddenException('Compte en attente de validation par un administrateur');
        if (u.status === 'REJECTED')
            throw new common_1.ForbiddenException('Inscription refusée');
        return { token: this.jwt.sign({ sub: u.id, role: u.role }), id: u.id, role: u.role, company: u.company, badge: activeBadge(u) };
    }
    async me(me) {
        const u = await this.users.findOneByOrFail({ id: me.sub });
        return { id: u.id, email: u.email, role: u.role, company: u.company, badge: activeBadge(u), badgeExpiresAt: u.badgeExpiresAt };
    }
    /** Suppression de compte (exigée par Google Play) : données personnelles effacées, historique commercial anonymisé. */
    async remove(me) {
        const u = await this.users.findOneByOrFail({ id: me.sub });
        if (u.role === 'ADMIN')
            throw new common_1.ForbiddenException('Un compte administrateur ne peut pas être supprimé ici');
        const open = (0, typeorm_2.In)(['NEGOTIATION', 'VALIDATED', 'PAID', 'SHIPPED']);
        if (await this.ds.getRepository(entities_1.Order).count({ where: [{ buyerId: u.id, status: open }, { sellerId: u.id, status: open }, { driverId: u.id, status: open }] }))
            throw new common_1.ConflictException('Terminez ou annulez vos commandes en cours avant de supprimer votre compte');
        const gone = 'Compte supprimé';
        await this.ds.transaction(async (m) => {
            await m.update(entities_1.Order, { buyerId: u.id }, { buyerCompany: gone });
            await m.update(entities_1.Order, { sellerId: u.id }, { sellerCompany: gone });
            await m.update(entities_1.Product, { sellerId: u.id }, { active: false, sellerCompany: gone });
            await m.update(entities_1.BadgePayment, { userId: u.id }, { userEmail: 'supprimé' });
            await m.delete(entities_1.Notification, { userId: u.id });
            await m.update(entities_1.User, u.id, { email: `deleted-${u.id}@deleted.invalid`, company: gone, phone: null,
                passwordHash: '!', status: 'REJECTED', badge: null, badgeExpiresAt: null });
        });
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_2.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_2.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Delete)('me'),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "remove", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository, jwt_1.JwtService, notifications_1.NotificationsService,
        typeorm_2.DataSource])
], AuthController);
//# sourceMappingURL=auth.controller.js.map