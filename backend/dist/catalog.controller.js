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
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const dto_1 = require("./dto");
const common_2 = require("./common");
let CatalogController = class CatalogController {
    constructor(prods, users) {
        this.prods = prods;
        this.users = users;
    }
    list(q = '', page = '1') {
        return this.prods.find({ where: { active: true, ...(q ? { name: (0, typeorm_2.ILike)(`%${q.replace(/[%_]/g, '')}%`) } : {}) },
            order: { createdAt: 'DESC' }, take: 30, skip: (Math.max(1, +page) - 1) * 30 });
    }
    mine(me) { return this.prods.find({ where: { sellerId: me.sub }, order: { createdAt: 'DESC' } }); }
    async add(b, me) {
        const u = await this.users.findOneByOrFail({ id: me.sub });
        return this.prods.save({ ...b, sellerId: u.id, sellerCompany: u.company });
    }
    async patch(id, b, me) {
        const p = await this.prods.findOneBy({ id });
        if (!p)
            throw new common_1.NotFoundException();
        if (p.sellerId !== me.sub)
            throw new common_1.ForbiddenException();
        return this.prods.save({ ...p, ...b });
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, common_2.Roles)('SELLER'),
    __param(0, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_2.Roles)('SELLER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ProductDto, Object]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "add", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_2.Roles)('SELLER'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_2.Me)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ProductPatchDto, Object]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "patch", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('products'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map