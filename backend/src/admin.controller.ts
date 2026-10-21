import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadgePayment, BadgePlan, Order, User } from './entities';
import { BadgeRequestDto, PlanDto } from './dto';
import { Me, Roles } from './common';
import { NotificationsService } from './notifications';

@Controller() export class AdminController {
  constructor(@InjectRepository(User) private users: Repository<User>, @InjectRepository(BadgePayment) private pays: Repository<BadgePayment>,
    @InjectRepository(BadgePlan) private plans: Repository<BadgePlan>, @InjectRepository(Order) private orders: Repository<Order>, private notif: NotificationsService) {}

  @Get('admin/stats') @Roles('ADMIN') async stats() {
    return { users: await this.users.count(), pending: await this.users.countBy({ status: 'PENDING' }),
      orders: await this.orders.count(), pendingBadges: await this.pays.countBy({ status: 'PENDING' }) };
  }
  @Get('admin/users') @Roles('ADMIN') pending() {
    return this.users.find({ where: { status: 'PENDING' }, select: ['id', 'email', 'role', 'company', 'phone', 'createdAt'] });
  }
  @Patch('admin/users/:id/:decision') @Roles('ADMIN') async decide(@Param('id') id: string, @Param('decision') d: string) {
    if (!['approve', 'reject'].includes(d)) throw new BadRequestException();
    const res = await this.users.update(id, { status: d === 'approve' ? 'APPROVED' : 'REJECTED' });
    if (!res.affected) throw new NotFoundException(); return { ok: true };
  }

  @Get('badges/plans') plansList() { return this.plans.find({ order: { price: 'ASC' } }); }
  @Put('admin/plans/:color') @Roles('ADMIN') async setPlan(@Param('color') color: string, @Body() b: PlanDto) {
    if (!['GREEN', 'PURPLE', 'PINK'].includes(color)) throw new BadRequestException();
    return this.plans.save({ color: color as any, price: b.price });
  }
  @Post('badges/request') async request(@Body() b: BadgeRequestDto, @Me() me: any) {
    const u = await this.users.findOneByOrFail({ id: me.sub });
    const plan = await this.plans.findOneByOrFail({ color: b.color });
    const p = await this.pays.save({ userId: u.id, userEmail: u.email, color: b.color, amount: plan.price, omReference: b.omReference });
    await this.notif.toRole('ADMIN', 'BADGE_REQUEST', 'Paiement de badge à vérifier', `${u.email} • réf. ${b.omReference}`);
    return p;
  }
  @Get('admin/badges') @Roles('ADMIN') pendingBadges() { return this.pays.find({ where: { status: 'PENDING' }, order: { createdAt: 'ASC' } }); }
  @Patch('admin/badges/:id/:decision') @Roles('ADMIN') async badge(@Param('id') id: string, @Param('decision') d: string) {
    const p = await this.pays.findOneBy({ id });
    if (!p || p.status !== 'PENDING' || !['confirm', 'reject'].includes(d)) throw new BadRequestException();
    await this.pays.update(id, { status: d === 'confirm' ? 'CONFIRMED' : 'REJECTED' });
    if (d === 'confirm') await this.users.update(p.userId, { badge: p.color, badgeExpiresAt: new Date(Date.now() + 365 * 864e5) });
    await this.notif.send(p.userId, 'BADGE', d === 'confirm' ? 'Badge activé' : 'Paiement de badge refusé',
      d === 'confirm' ? 'Votre badge est actif pour 1 an.' : 'Vérifiez la référence Orange Money et réessayez.');
    return { ok: true };
  }
}
