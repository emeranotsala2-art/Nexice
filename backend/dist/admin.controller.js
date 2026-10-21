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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const dto_1 = require("./dto");
const common_2 = require("./common");
const notifications_1 = require("./notifications");
let AdminController = class AdminController {
    constructor(users, pays, plans, orders, notif) {
        this.users = users;
        this.pays = pays;
        this.plans = plans;
        this.orders = orders;
        this.notif = notif;
    }
    async stats() {
        return { users: await this.users.count(), pending: await this.users.countBy({ status: 'PENDING' }),
            orders: await this.orders.count(), pendingBadges: await this.pays.countBy({ status: 'PENDING' }) };
    }
    pending() {
        return this.users.find({ where: { status: 'PENDING' }, select: ['id', 'email', 'role', 'company', 'phone', 'createdAt'] });
    }
    async decide(id, d) {
        if (!['approve', 'reject'].includes(d))
            throw new common_1.BadRequestException();
        const res = await this.users.update(id, { status: d === 'approve' ? 'APPROVED' : 'REJECTED' });
        if (!res.affected)
            throw new common_1.NotFoundException();
        return { ok: true };
    }
    plansList() { return this.plans.find({ order: { price: 'ASC' } }); }
    async setPlan(color, b) {
        if (!['GREEN', 'PURPLE', 'PINK'].includes(color))
            throw new common_1.BadRequestException();
        return this.plans.save({ color: color, price: b.price });
    }
    async request(b, me) {
        const u = await this.users.findOneByOrFail({ id: me.sub });
        const plan = await this.plans.findOneByOrFail({ color: b.color });
        const p = await this.pays.save({ userId: u.id, userEmail: u.email, color: b.color, amount: plan.price, omReference: b.omReference });
        await this.notif.toRole('ADMIN', 'BADGE_REQUEST', 'Paiement de badge à vérifier', `${u.email} • réf. ${b.omReference}`);
        return p;
    }
    pendingBadges() { return this.pays.find({ where: { status: 'PENDING' }, order: { createdAt: 'ASC' } }); }
    async badge(id, d) {
        const p = await this.pays.findOneBy({ id });
        if (!p || p.status !== 'PENDING' || !['confirm', 'reject'].includes(d))
            throw new common_1.BadRequestException();
        await this.pays.update(id, { status: d === 'confirm' ? 'CONFIRMED' : 'REJECTED' });
        if (d === 'confirm')
            await this.users.update(p.userId, { badge: p.color, badgeExpiresAt: new Date(Date.now() + 365 * 864e5) });
        await this.notif.send(p.userId, 'BADGE', d === 'confirm' ? 'Badge activé' : 'Paiement de badge refusé', d === 'confirm' ? 'Votre badge est actif pour 1 an.' : 'Vérifiez la référence Orange Money et réessayez.');
        return { ok: true };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('admin/stats'),
    (0, common_2.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('admin/users'),
    (0, common_2.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "pending", null);
__decorate([
    (0, common_1.Patch)('admin/users/:id/:decision'),
    (0, common_2.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('decision')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "decide", null);
__decorate([
    (0, common_1.Get)('badges/plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "plansList", null);
__decorate([
    (0, common_1.Put)('admin/plans/:color'),
    (0, common_2.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('color')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.PlanDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setPlan", null);
__decorate([
    (0, common_1.Post)('badges/request'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.BadgeRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "request", null);
__decorate([
    (0, common_1.Get)('admin/badges'),
    (0, common_2.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "pendingBadges", null);
__decorate([
    (0, common_1.Patch)('admin/badges/:id/:decision'),
    (0, common_2.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('decision')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "badge", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.BadgePayment)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.BadgePlan)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository,
        typeorm_2.Repository, typeorm_2.Repository, notifications_1.NotificationsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map