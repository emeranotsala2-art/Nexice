import { Body, Controller, ConflictException, Delete, ForbiddenException, Get, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { BadgePayment, Notification, Order, Product, User } from './entities';
import { LoginDto, RegisterDto } from './dto';
import { Me, Public } from './common';
import { NotificationsService } from './notifications';

const activeBadge = (u: User) => (u.badge && u.badgeExpiresAt && u.badgeExpiresAt > new Date() ? u.badge : null);

@Controller('auth') export class AuthController {
  constructor(@InjectRepository(User) private users: Repository<User>, private jwt: JwtService, private notif: NotificationsService,
    @InjectDataSource() private ds: DataSource) {}
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('register')
  async register(@Body() b: RegisterDto) {
    const email = b.email.toLowerCase();
    if (await this.users.findOneBy({ email })) throw new ConflictException('Cet email est déjà utilisé');
    const u = await this.users.save({ email, role: b.role, company: b.company, phone: b.phone,
      passwordHash: await bcrypt.hash(b.password, 12) });
    await this.notif.toRole('ADMIN', 'SIGNUP', 'Nouvelle inscription', `${u.company} (${u.role}) attend validation`);
    return { id: u.id, status: u.status, message: 'Inscription reçue : un administrateur doit valider votre profil.' };
  }
  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('login')
  async login(@Body() b: LoginDto) {
    const u = await this.users.findOneBy({ email: b.email.toLowerCase() });
    if (!u || !(await bcrypt.compare(b.password, u.passwordHash))) throw new UnauthorizedException('Identifiants incorrects');
    if (u.status === 'PENDING') throw new ForbiddenException('Compte en attente de validation par un administrateur');
    if (u.status === 'REJECTED') throw new ForbiddenException('Inscription refusée');
    return { token: this.jwt.sign({ sub: u.id, role: u.role }), id: u.id, role: u.role, company: u.company, badge: activeBadge(u) };
  }
  @Get('me') async me(@Me() me: { sub: string }) {
    const u = await this.users.findOneByOrFail({ id: me.sub });
    return { id: u.id, email: u.email, role: u.role, company: u.company, badge: activeBadge(u), badgeExpiresAt: u.badgeExpiresAt };
  }
  /** Suppression de compte (exigée par Google Play) : données personnelles effacées, historique commercial anonymisé. */
  @Delete('me') async remove(@Me() me: { sub: string }) {
    const u = await this.users.findOneByOrFail({ id: me.sub });
    if (u.role === 'ADMIN') throw new ForbiddenException('Un compte administrateur ne peut pas être supprimé ici');
    const open = In(['NEGOTIATION', 'VALIDATED', 'PAID', 'SHIPPED']);
    if (await this.ds.getRepository(Order).count({ where: [{ buyerId: u.id, status: open }, { sellerId: u.id, status: open }, { driverId: u.id, status: open }] }))
      throw new ConflictException('Terminez ou annulez vos commandes en cours avant de supprimer votre compte');
    const gone = 'Compte supprimé';
    await this.ds.transaction(async m => {
      await m.update(Order, { buyerId: u.id }, { buyerCompany: gone });
      await m.update(Order, { sellerId: u.id }, { sellerCompany: gone });
      await m.update(Product, { sellerId: u.id }, { active: false, sellerCompany: gone });
      await m.update(BadgePayment, { userId: u.id }, { userEmail: 'supprimé' });
      await m.delete(Notification, { userId: u.id });
      await m.update(User, u.id, { email: `deleted-${u.id}@deleted.invalid`, company: gone, phone: null as any,
        passwordHash: '!', status: 'REJECTED', badge: null, badgeExpiresAt: null });
    });
    return { ok: true };
  }
}
