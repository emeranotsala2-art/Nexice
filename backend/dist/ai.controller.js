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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const dto_1 = require("./dto");
const common_2 = require("./common");
const FREE_QUOTA = 5;
const SYSTEM = 'Tu es l\'assistant de NeXice, plateforme B2B pour grossistes, détaillants et fournisseurs en Afrique centrale. Réponds en français, de façon concise et pratique : négociation, gestion de stock, tarification, logistique.';
let AiController = class AiController {
    constructor(users) {
        this.users = users;
    }
    async ask(b, me) {
        const u = await this.users.findOneByOrFail({ id: me.sub });
        const certified = !!u.badge && !!u.badgeExpiresAt && u.badgeExpiresAt > new Date();
        if (!certified && u.aiUsed >= FREE_QUOTA)
            throw new common_1.ForbiddenException('Quota gratuit atteint : prenez un badge pour un accès illimité');
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key)
            throw new common_1.ServiceUnavailableException('Assistant non configuré (ANTHROPIC_API_KEY manquante)');
        const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
            headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: certified ? 1000 : 400,
                system: SYSTEM, messages: [{ role: 'user', content: b.question }] }) });
        if (!r.ok)
            throw new common_1.ServiceUnavailableException('Assistant momentanément indisponible');
        const d = await r.json();
        await this.users.increment({ id: u.id }, 'aiUsed', 1);
        return { answer: d.content?.map((c) => c.text ?? '').join('') ?? '', remaining: certified ? null : FREE_QUOTA - u.aiUsed - 1 };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('ask'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AskDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "ask", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AiController);
//# sourceMappingURL=ai.controller.js.map