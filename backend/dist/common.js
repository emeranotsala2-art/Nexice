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
exports.TraceService = exports.chainHash = exports.canonical = exports.AuthGuard = exports.Me = exports.Public = exports.Roles = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const entities_1 = require("./entities");
const Roles = (...r) => (0, common_1.SetMetadata)('roles', r);
exports.Roles = Roles;
const Public = () => (0, common_1.SetMetadata)('public', true);
exports.Public = Public;
exports.Me = (0, common_1.createParamDecorator)((_d, ctx) => ctx.switchToHttp().getRequest().user);
let AuthGuard = class AuthGuard {
    constructor(jwt, ref) {
        this.jwt = jwt;
        this.ref = ref;
    }
    canActivate(c) {
        if (this.ref.get('public', c.getHandler()))
            return true;
        const req = c.switchToHttp().getRequest();
        try {
            req.user = this.jwt.verify((req.headers.authorization || '').replace('Bearer ', ''));
        }
        catch {
            throw new common_1.UnauthorizedException('Session expirée');
        }
        const roles = this.ref.get('roles', c.getHandler());
        if (roles && !roles.includes(req.user.role))
            throw new common_1.ForbiddenException('Action non autorisée pour votre rôle');
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, core_1.Reflector])
], AuthGuard);
// JSON canonique (clés triées) : PostgreSQL (jsonb) réordonne les clés, le hash ne doit pas en dépendre.
const canonical = (v) => Array.isArray(v) ? `[${v.map(exports.canonical).join(',')}]`
    : v && typeof v === 'object' ? `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + (0, exports.canonical)(v[k])).join(',')}}`
        : JSON.stringify(v) ?? 'null';
exports.canonical = canonical;
const chainHash = (prev, orderId, type, data) => (0, crypto_1.createHash)('sha256').update(prev + orderId + type + (0, exports.canonical)(data ?? {})).digest('hex');
exports.chainHash = chainHash;
let TraceService = class TraceService {
    constructor(ev) {
        this.ev = ev;
    }
    async add(orderId, type, data, m) {
        const repo = m ? m.getRepository(entities_1.OrderEvent) : this.ev;
        const last = await repo.findOne({ where: { orderId }, order: { id: 'DESC' } });
        const prevHash = last?.hash ?? 'GENESIS';
        return repo.save({ orderId, type, data: data ?? null, prevHash, hash: (0, exports.chainHash)(prevHash, orderId, type, data) });
    }
    async events(orderId) { return this.ev.find({ where: { orderId }, order: { id: 'ASC' } }); }
    async verify(orderId) {
        let prev = 'GENESIS';
        for (const e of await this.events(orderId)) {
            if (e.prevHash !== prev || e.hash !== (0, exports.chainHash)(prev, orderId, e.type, e.data))
                return { valid: false, brokenAt: e.id };
            prev = e.hash;
        }
        return { valid: true };
    }
};
exports.TraceService = TraceService;
exports.TraceService = TraceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.OrderEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TraceService);
//# sourceMappingURL=common.js.map