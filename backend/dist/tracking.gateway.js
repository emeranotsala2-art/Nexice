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
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const socket_io_1 = require("socket.io");
const entities_1 = require("./entities");
let TrackingGateway = class TrackingGateway {
    constructor(jwt, orders) {
        this.jwt = jwt;
        this.orders = orders;
    }
    handleConnection(c) {
        try {
            c.data.user = this.jwt.verify(c.handshake.auth?.token);
        }
        catch {
            c.disconnect(true);
        }
    }
    async join(c, d) {
        const u = c.data.user, o = await this.orders.findOneBy({ id: d?.orderId });
        if (!o || !(u.role === 'ADMIN' || [o.buyerId, o.sellerId, o.driverId].includes(u.sub)))
            return { ok: false };
        c.join(o.id);
        return { ok: true, lat: o.lastLat, lng: o.lastLng };
    }
    async position(c, d) {
        const o = await this.orders.findOneBy({ id: d?.orderId });
        if (!o || o.driverId !== c.data.user.sub || o.status !== 'SHIPPED' || !Number.isFinite(d.lat) || !Number.isFinite(d.lng))
            return { ok: false };
        await this.orders.update(o.id, { lastLat: d.lat, lastLng: d.lng });
        this.server.to(o.id).emit('position', { lat: d.lat, lng: d.lng, at: Date.now() });
        return { ok: true };
    }
};
exports.TrackingGateway = TrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TrackingGateway.prototype, "join", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('position'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TrackingGateway.prototype, "position", null);
exports.TrackingGateway = TrackingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: 'tracking', cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' } }),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __metadata("design:paramtypes", [jwt_1.JwtService, typeorm_2.Repository])
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map