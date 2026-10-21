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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const dto_1 = require("./dto");
const common_2 = require("./common");
const notifications_1 = require("./notifications");
const TVA = +(process.env.TVA_RATE ?? 0.1925);
let OrdersController = class OrdersController {
    constructor(orders, prods, users, ds, trace, notif) {
        this.orders = orders;
        this.prods = prods;
        this.users = users;
        this.ds = ds;
        this.trace = trace;
        this.notif = notif;
    }
    canSee(o, me) {
        return me.role === 'ADMIN' || [o.buyerId, o.sellerId, o.driverId].includes(me.sub) ||
            (me.role === 'DRIVER' && o.status === 'PAID' && !o.driverId);
    }
    async load(id, me) {
        const o = await this.orders.findOneBy({ id });
        if (!o || !this.canSee(o, me))
            throw new common_1.NotFoundException('Commande introuvable');
        return o;
    }
    list(me) {
        const order = { createdAt: 'DESC' };
        if (me.role === 'BUYER')
            return this.orders.find({ where: { buyerId: me.sub }, order });
        if (me.role === 'SELLER')
            return this.orders.find({ where: { sellerId: me.sub }, order });
        if (me.role === 'DRIVER')
            return this.orders.find({ where: [{ status: 'PAID', driverId: (0, typeorm_2.IsNull)() }, { driverId: me.sub }], order });
        return this.orders.find({ order, take: 100 });
    }
    async create(b, me) {
        const prods = await this.prods.findBy({ id: (0, typeorm_2.In)(b.items.map(i => i.productId)), active: true });
        if (prods.length !== new Set(b.items.map(i => i.productId)).size)
            throw new common_1.BadRequestException('Produit introuvable');
        if (new Set(prods.map(p => p.sellerId)).size !== 1)
            throw new common_1.BadRequestException('Une commande ne peut concerner qu\'un seul fournisseur');
        const items = b.items.map(i => {
            const p = prods.find(x => x.id === i.productId);
            if (p.stock < i.qty)
                throw new common_1.ConflictException(`Stock insuffisant : ${p.name}`);
            return { productId: p.id, name: p.name, qty: i.qty, unitPrice: p.price };
        });
        const listTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const buyer = await this.users.findOneByOrFail({ id: me.sub });
        const o = await this.orders.save({ buyerId: buyer.id, buyerCompany: buyer.company, sellerId: prods[0].sellerId,
            sellerCompany: prods[0].sellerCompany, items, total: b.offerTotal ?? listTotal, lastOfferBy: 'BUYER', deliveryAddress: b.deliveryAddress });
        await this.trace.add(o.id, 'CREATED', { items, listTotal, offer: o.total });
        await this.notif.send(o.sellerId, 'ORDER_NEW', 'Nouvelle commande', `${buyer.company} propose ${o.total} FCFA`, o.id);
        return o;
    }
    async one(id, me) {
        return { ...(await this.load(id, me)), events: await this.trace.events(id) };
    }
    async verify(id, me) { await this.load(id, me); return this.trace.verify(id); }
    async offer(id, b, me) {
        const o = await this.load(id, me);
        const party = me.sub === o.buyerId ? 'BUYER' : me.sub === o.sellerId ? 'SELLER' : null;
        if (!party || o.status !== 'NEGOTIATION')
            throw new common_1.ForbiddenException('Négociation impossible');
        await this.orders.update(id, { total: b.total, lastOfferBy: party });
        await this.trace.add(id, 'OFFER', { by: party, total: b.total, message: b.message });
        await this.notif.send(party === 'BUYER' ? o.sellerId : o.buyerId, 'OFFER', 'Nouvelle offre', `Offre de ${b.total} FCFA${b.message ? ' : ' + b.message : ''}`, id);
        return { ok: true };
    }
    async transition(id, b, me) {
        const done = await this.ds.transaction(async (m) => {
            const o = await m.findOne(entities_1.Order, { where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!o)
                throw new common_1.NotFoundException();
            const buyer = me.sub === o.buyerId, seller = me.sub === o.sellerId;
            const bad = (msg = 'Transition interdite') => { throw new common_1.ForbiddenException(msg); };
            const decrement = async (sign) => {
                for (const i of o.items) {
                    const r = await m.createQueryBuilder().update(entities_1.Product).set({ stock: () => `stock - ${sign * Number(i.qty)}` })
                        .where('id = :id' + (sign === 1 ? ' AND stock >= :q' : ''), { id: i.productId, q: i.qty }).execute();
                    if (!r.affected)
                        throw new common_1.ConflictException(`Stock insuffisant : ${i.name}`);
                }
            };
            const data = { by: me.sub, role: me.role };
            switch (b.status) {
                case 'VALIDATED':
                    if (o.status !== 'NEGOTIATION' || !(buyer || seller) || o.lastOfferBy === (buyer ? 'BUYER' : 'SELLER'))
                        bad('Seule l\'autre partie peut accepter la dernière offre');
                    await decrement(1);
                    data.total = o.total;
                    break;
                case 'PAID':
                    if (o.status !== 'VALIDATED' || !buyer)
                        bad();
                    if (!b.reference)
                        throw new common_1.BadRequestException('Référence de paiement requise');
                    o.paymentRef = b.reference;
                    o.invoiceNumber = `NX-${new Date().getFullYear()}-${o.id.slice(0, 8).toUpperCase()}`;
                    data.reference = b.reference;
                    break;
                case 'SHIPPED':
                    if (o.status !== 'PAID' || me.role !== 'DRIVER' || o.driverId)
                        bad();
                    o.driverId = me.sub;
                    break;
                case 'DELIVERED':
                    if (o.status !== 'SHIPPED' || o.driverId !== me.sub)
                        bad();
                    break;
                case 'CANCELLED':
                    if (!(buyer || seller) || !['NEGOTIATION', 'VALIDATED'].includes(o.status))
                        bad('Annulation impossible à ce stade');
                    if (o.status === 'VALIDATED')
                        await decrement(-1);
                    break;
            }
            o.status = b.status;
            await m.save(o);
            await this.trace.add(id, b.status, data, m);
            return o;
        });
        await this.notif.orderEvent(done, b.status, me.sub);
        return { ok: true };
    }
    async invoice(id, me) {
        const o = await this.load(id, me);
        if (!o.invoiceNumber)
            throw new common_1.BadRequestException('Facture disponible après paiement');
        const tva = Math.round(o.total * TVA);
        return { number: o.invoiceNumber, date: o.updatedAt, seller: o.sellerCompany, buyer: o.buyerCompany, lines: o.items,
            totalHT: o.total, tvaRate: TVA, tva, totalTTC: o.total + tva, paymentRef: o.paymentRef };
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_2.Roles)('BUYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.OrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "one", null);
__decorate([
    (0, common_1.Get)(':id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':id/offer'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.OfferDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "offer", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.TransitionDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "transition", null);
__decorate([
    (0, common_1.Get)(':id/invoice'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "invoice", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository,
        typeorm_2.Repository, typeorm_2.DataSource, common_2.TraceService, notifications_1.NotificationsService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map