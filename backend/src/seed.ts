import 'dotenv/config';
import dataSource from './data-source';
import * as bcrypt from 'bcryptjs';
import { BadgePlan, Product, User } from './entities';

(async () => {
  const e = process.env;
  const ds = await dataSource.initialize();
  await ds.runMigrations(); // le schéma vient des migrations, plus de synchronize
  const users = ds.getRepository(User);
  const mk = async (email: string, role: any, company: string, pass: string) =>
    (await users.findOneBy({ email })) ?? users.save({ email, role, company, status: 'APPROVED', passwordHash: await bcrypt.hash(pass, 12) });
  await mk(e.ADMIN_EMAIL!, 'ADMIN', 'NeXice', e.ADMIN_PASSWORD!);
  // Prix par défaut : à modifier par l'admin (PUT /api/admin/plans/:color)
  for (const [color, price] of [['GREEN', 10000], ['PURPLE', 25000], ['PINK', 50000]] as const)
    if (!(await ds.getRepository(BadgePlan).findOneBy({ color }))) await ds.getRepository(BadgePlan).save({ color, price });
  if (process.argv.includes('--demo')) {
    const s = await mk('vendeur@demo.cm', 'SELLER', 'Grossiste Demo SARL', 'Demo#12345');
    await mk('acheteur@demo.cm', 'BUYER', 'Boutique Demo', 'Demo#12345');
    await mk('livreur@demo.cm', 'DRIVER', 'Livreur Demo', 'Demo#12345');
    if (!(await ds.getRepository(Product).count()))
      await ds.getRepository(Product).save([['Sac de riz 50 kg', 'sac', 28000, 120], ['Huile végétale 20 L', 'bidon', 24500, 60], ['Sucre 50 kg', 'sac', 31000, 80]]
        .map(([name, unit, price, stock]) => ({ name, unit, price, stock, sellerId: s.id, sellerCompany: s.company } as any)));
    console.log('Comptes démo : vendeur@demo.cm / acheteur@demo.cm / livreur@demo.cm  (mot de passe Demo#12345)');
  }
  console.log('Seed terminé. Admin :', e.ADMIN_EMAIL); process.exit(0);
})();
