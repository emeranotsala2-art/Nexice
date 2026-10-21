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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const data_source_1 = __importDefault(require("./data-source"));
const bcrypt = __importStar(require("bcryptjs"));
const entities_1 = require("./entities");
(async () => {
    const e = process.env;
    const ds = await data_source_1.default.initialize();
    await ds.runMigrations(); // le schéma vient des migrations, plus de synchronize
    const users = ds.getRepository(entities_1.User);
    const mk = async (email, role, company, pass) => (await users.findOneBy({ email })) ?? users.save({ email, role, company, status: 'APPROVED', passwordHash: await bcrypt.hash(pass, 12) });
    await mk(e.ADMIN_EMAIL, 'ADMIN', 'NeXice', e.ADMIN_PASSWORD);
    // Prix par défaut : à modifier par l'admin (PUT /api/admin/plans/:color)
    for (const [color, price] of [['GREEN', 10000], ['PURPLE', 25000], ['PINK', 50000]])
        if (!(await ds.getRepository(entities_1.BadgePlan).findOneBy({ color })))
            await ds.getRepository(entities_1.BadgePlan).save({ color, price });
    if (process.argv.includes('--demo')) {
        const s = await mk('vendeur@demo.cm', 'SELLER', 'Grossiste Demo SARL', 'Demo#12345');
        await mk('acheteur@demo.cm', 'BUYER', 'Boutique Demo', 'Demo#12345');
        await mk('livreur@demo.cm', 'DRIVER', 'Livreur Demo', 'Demo#12345');
        if (!(await ds.getRepository(entities_1.Product).count()))
            await ds.getRepository(entities_1.Product).save([['Sac de riz 50 kg', 'sac', 28000, 120], ['Huile végétale 20 L', 'bidon', 24500, 60], ['Sucre 50 kg', 'sac', 31000, 80]]
                .map(([name, unit, price, stock]) => ({ name, unit, price, stock, sellerId: s.id, sellerCompany: s.company })));
        console.log('Comptes démo : vendeur@demo.cm / acheteur@demo.cm / livreur@demo.cm  (mot de passe Demo#12345)');
    }
    console.log('Seed terminé. Admin :', e.ADMIN_EMAIL);
    process.exit(0);
})();
//# sourceMappingURL=seed.js.map