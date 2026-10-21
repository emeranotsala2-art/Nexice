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
exports.RemindersService = exports.NotificationsController = exports.NotificationsService = exports.NotificationsGateway = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const entities_1 = require("./entities");
const common_2 = require("./common");
const H = 3600_000;
const fcfa = (n) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
/** Temps réel : chaque utilisateur rejoint la salle user:<id> (JWT exigé). */
let NotificationsGateway = class NotificationsGateway {
    constructor(jwt) {
        this.jwt = jwt;
    }
    handleConnection(c) {
        try {
            c.join('user:' + this.jwt.verify(c.handshake.auth?.token).sub);
        }
        catch {
            c.disconnect(true);
        }
    }
    push(userId, n) { this.server?.to('user:' + userId).emit('notification', n); }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: 'notifications', cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' } }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], NotificationsGateway);
let NotificationsService = class NotificationsService {
    constructor(repo, users, gw) {
        this.repo = repo;
        this.users = users;
        this.gw = gw;
    }
    /** `key` : si fourni, une notification identique n'est jamais créée deux fois (rappels). */
    async send(userId, type, title, body, orderId, key) {
        if (!userId)
            return;
        if (key && (await this.repo.existsBy({ userId, key })))
            return;
        const n = await this.repo.save({ userId, type, title, body, orderId: orderId ?? null, key: key ?? null });
        this.gw.push(userId, n);
    }
    async toRole(role, type, title, body, key) {
        for (const u of await this.users.find({ where: { role, status: 'APPROVED' }, select: ['id'] }))
            await this.send(u.id, type, title, body, undefined, key && `${key}:${u.id}`);
    }
    /** Notifie les bonnes personnes après chaque changement d'état d'une commande. */
    async orderEvent(o, status, actorId) {
        const other = actorId === o.buyerId ? o.sellerId : o.buyerId;
        const both = (t, ti, b) => Promise.all([o.buyerId, o.sellerId].map(id => this.send(id, t, ti, b, o.id)));
        switch (status) {
            case 'VALIDATED': return this.send(other, 'ORDER', 'Commande validée', `Accord à ${fcfa(o.total)}. L'acheteur peut maintenant payer.`, o.id);
            case 'PAID':
                await this.send(o.sellerId, 'ORDER', 'Paiement reçu', `Réf. ${o.paymentRef} • facture ${o.invoiceNumber}`, o.id);
                return this.toRole('DRIVER', 'MISSION', 'Nouvelle mission', `${o.sellerCompany} → ${o.deliveryAddress}`);
            case 'SHIPPED': return both('ORDER', 'Livraison en cours', 'Suivez le livreur sur la carte.');
            case 'DELIVERED': return both('ORDER', 'Commande livrée', `Commande de ${fcfa(o.total)} livrée.`);
            case 'CANCELLED': return this.send(other, 'ORDER', 'Commande annulée', `${o.items.length} article(s) • ${fcfa(o.total)}`, o.id);
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, NotificationsGateway])
], NotificationsService);
let NotificationsController = class NotificationsController {
    constructor(repo) {
        this.repo = repo;
    }
    list(me) { return this.repo.find({ where: { userId: me.sub }, order: { createdAt: 'DESC' }, take: 50 }); }
    async unread(me) { return { count: await this.repo.countBy({ userId: me.sub, isRead: false }) }; }
    async readAll(me) { await this.repo.update({ userId: me.sub, isRead: false }, { isRead: true }); return { ok: true }; }
    async read(id, me) { await this.repo.update({ id, userId: me.sub }, { isRead: true }); return { ok: true }; }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unread", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "readAll", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "read", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsController);
/** Rappels automatiques, exécutés toutes les heures. Les clés évitent les doublons. */
let RemindersService = class RemindersService {
    constructor(orders, prods, users, n) {
        this.orders = orders;
        this.prods = prods;
        this.users = users;
        this.n = n;
        this.log = new common_1.Logger('Rappels');
    }
    async run() {
        try {
            await this.orderReminders();
            await this.badgeReminders();
            await this.stockReminders();
            await this.adminReminders();
        }
        catch (e) {
            this.log.error(e);
        }
    }
    ago(h) { return (0, typeorm_2.LessThan)(new Date(Date.now() - h * H)); }
    day(d) { return Math.floor((Date.now() - d.getTime()) / (24 * H)); }
    async orderReminders() {
        // Offre sans réponse depuis 24 h -> rappel à la partie qui doit répondre (puis chaque jour)
        for (const o of await this.orders.find({ where: { status: 'NEGOTIATION', updatedAt: this.ago(24) } }))
            await this.n.send(o.lastOfferBy === 'BUYER' ? o.sellerId : o.buyerId, 'REMINDER', 'Offre en attente de réponse', `${o.buyerCompany} ↔ ${o.sellerCompany} • ${fcfa(o.total)}`, o.id, `neg:${o.id}:${this.day(o.updatedAt)}`);
        // Commande validée mais non payée depuis 24 h -> rappel à l'acheteur
        for (const o of await this.orders.find({ where: { status: 'VALIDATED', updatedAt: this.ago(24) } }))
            await this.n.send(o.buyerId, 'REMINDER', 'Paiement en attente', `Commande de ${fcfa(o.total)} chez ${o.sellerCompany} à payer.`, o.id, `pay:${o.id}:${this.day(o.updatedAt)}`);
        // Commande payée sans livreur depuis 6 h -> alerte vendeur + livreurs
        for (const o of await this.orders.find({ where: { status: 'PAID', updatedAt: this.ago(6) } })) {
            if (o.driverId)
                continue;
            await this.n.send(o.sellerId, 'REMINDER', 'Aucun livreur pour l\'instant', `Commande ${o.invoiceNumber} toujours en attente de prise en charge.`, o.id, `drv:${o.id}`);
            await this.n.toRole('DRIVER', 'MISSION', 'Mission non attribuée', `${o.sellerCompany} → ${o.deliveryAddress}`, `drvm:${o.id}`);
        }
        // Livraison en cours depuis plus de 24 h
        for (const o of await this.orders.find({ where: { status: 'SHIPPED', updatedAt: this.ago(24) } }))
            await this.n.send(o.driverId, 'REMINDER', 'Livraison en cours depuis 24 h', 'Confirmez la livraison dès que possible.', o.id, `ship:${o.id}`);
    }
    async badgeReminders() {
        const soon = new Date(Date.now() + 7 * 24 * H);
        for (const u of await this.users.createQueryBuilder('u').where('u.badge IS NOT NULL AND u."badgeExpiresAt" BETWEEN now() AND :soon', { soon }).getMany())
            await this.n.send(u.id, 'REMINDER', 'Votre badge expire bientôt', `Expiration le ${u.badgeExpiresAt.toLocaleDateString('fr-FR')}. Renouvelez-le.`, undefined, `badge:${u.id}:${u.badgeExpiresAt.toISOString().slice(0, 10)}`);
    }
    async stockReminders() {
        for (const p of await this.prods.createQueryBuilder('p').where('p.active = true AND p.stock <= 5').getMany())
            await this.n.send(p.sellerId, 'REMINDER', 'Stock faible', `${p.name} : ${p.stock} ${p.unit} restant(s).`, undefined, `stock:${p.id}:${p.stock}`);
    }
    async adminReminders() {
        const n = await this.users.countBy({ status: 'PENDING', createdAt: this.ago(48) });
        if (n)
            await this.n.toRole('ADMIN', 'REMINDER', 'Profils en attente', `${n} inscription(s) attendent validation depuis plus de 48 h.`, `pend:${new Date().toISOString().slice(0, 10)}`);
    }
};
exports.RemindersService = RemindersService;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RemindersService.prototype, "run", null);
exports.RemindersService = RemindersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository,
        typeorm_2.Repository, NotificationsService])
], RemindersService);
//# sourceMappingURL=notifications.js.map