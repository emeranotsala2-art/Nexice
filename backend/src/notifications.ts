import { Controller, Get, Injectable, Logger, Param, Patch } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { LessThan, Repository } from 'typeorm';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification, Order, Product, Role, User } from './entities';
import { Me } from './common';

const H = 3600_000;
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

/** Temps réel : chaque utilisateur rejoint la salle user:<id> (JWT exigé). */
@WebSocketGateway({ namespace: 'notifications', cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private jwt: JwtService) {}
  handleConnection(c: Socket) {
    try { c.join('user:' + this.jwt.verify(c.handshake.auth?.token).sub); } catch { c.disconnect(true); }
  }
  push(userId: string, n: Notification) { this.server?.to('user:' + userId).emit('notification', n); }
}

@Injectable() export class NotificationsService {
  constructor(@InjectRepository(Notification) private repo: Repository<Notification>,
    @InjectRepository(User) private users: Repository<User>, private gw: NotificationsGateway) {}

  /** `key` : si fourni, une notification identique n'est jamais créée deux fois (rappels). */
  async send(userId: string, type: string, title: string, body: string, orderId?: string, key?: string) {
    if (!userId) return;
    if (key && (await this.repo.existsBy({ userId, key }))) return;
    const n = await this.repo.save({ userId, type, title, body, orderId: orderId ?? null, key: key ?? null });
    this.gw.push(userId, n);
  }
  async toRole(role: Role, type: string, title: string, body: string, key?: string) {
    for (const u of await this.users.find({ where: { role, status: 'APPROVED' }, select: ['id'] }))
      await this.send(u.id, type, title, body, undefined, key && `${key}:${u.id}`);
  }
  /** Notifie les bonnes personnes après chaque changement d'état d'une commande. */
  async orderEvent(o: Order, status: string, actorId: string) {
    const other = actorId === o.buyerId ? o.sellerId : o.buyerId;
    const both = (t: string, ti: string, b: string) => Promise.all([o.buyerId, o.sellerId].map(id => this.send(id, t, ti, b, o.id)));
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
}

@Controller('notifications') export class NotificationsController {
  constructor(@InjectRepository(Notification) private repo: Repository<Notification>) {}
  @Get() list(@Me() me: any) { return this.repo.find({ where: { userId: me.sub }, order: { createdAt: 'DESC' }, take: 50 }); }
  @Get('unread-count') async unread(@Me() me: any) { return { count: await this.repo.countBy({ userId: me.sub, isRead: false }) }; }
  @Patch('read-all') async readAll(@Me() me: any) { await this.repo.update({ userId: me.sub, isRead: false }, { isRead: true }); return { ok: true }; }
  @Patch(':id/read') async read(@Param('id') id: string, @Me() me: any) { await this.repo.update({ id, userId: me.sub }, { isRead: true }); return { ok: true }; }
}

/** Rappels automatiques, exécutés toutes les heures. Les clés évitent les doublons. */
@Injectable() export class RemindersService {
  private log = new Logger('Rappels');
  constructor(@InjectRepository(Order) private orders: Repository<Order>, @InjectRepository(Product) private prods: Repository<Product>,
    @InjectRepository(User) private users: Repository<User>, private n: NotificationsService) {}

  @Cron('0 * * * *') async run() {
    try { await this.orderReminders(); await this.badgeReminders(); await this.stockReminders(); await this.adminReminders(); }
    catch (e) { this.log.error(e); }
  }
  private ago(h: number) { return LessThan(new Date(Date.now() - h * H)); }
  private day(d: Date) { return Math.floor((Date.now() - d.getTime()) / (24 * H)); }

  async orderReminders() {
    // Offre sans réponse depuis 24 h -> rappel à la partie qui doit répondre (puis chaque jour)
    for (const o of await this.orders.find({ where: { status: 'NEGOTIATION', updatedAt: this.ago(24) } }))
      await this.n.send(o.lastOfferBy === 'BUYER' ? o.sellerId : o.buyerId, 'REMINDER', 'Offre en attente de réponse',
        `${o.buyerCompany} ↔ ${o.sellerCompany} • ${fcfa(o.total)}`, o.id, `neg:${o.id}:${this.day(o.updatedAt)}`);
    // Commande validée mais non payée depuis 24 h -> rappel à l'acheteur
    for (const o of await this.orders.find({ where: { status: 'VALIDATED', updatedAt: this.ago(24) } }))
      await this.n.send(o.buyerId, 'REMINDER', 'Paiement en attente', `Commande de ${fcfa(o.total)} chez ${o.sellerCompany} à payer.`, o.id, `pay:${o.id}:${this.day(o.updatedAt)}`);
    // Commande payée sans livreur depuis 6 h -> alerte vendeur + livreurs
    for (const o of await this.orders.find({ where: { status: 'PAID', updatedAt: this.ago(6) } })) {
      if (o.driverId) continue;
      await this.n.send(o.sellerId, 'REMINDER', 'Aucun livreur pour l\'instant', `Commande ${o.invoiceNumber} toujours en attente de prise en charge.`, o.id, `drv:${o.id}`);
      await this.n.toRole('DRIVER', 'MISSION', 'Mission non attribuée', `${o.sellerCompany} → ${o.deliveryAddress}`, `drvm:${o.id}`);
    }
    // Livraison en cours depuis plus de 24 h
    for (const o of await this.orders.find({ where: { status: 'SHIPPED', updatedAt: this.ago(24) } }))
      await this.n.send(o.driverId!, 'REMINDER', 'Livraison en cours depuis 24 h', 'Confirmez la livraison dès que possible.', o.id, `ship:${o.id}`);
  }
  async badgeReminders() {
    const soon = new Date(Date.now() + 7 * 24 * H);
    for (const u of await this.users.createQueryBuilder('u').where('u.badge IS NOT NULL AND u."badgeExpiresAt" BETWEEN now() AND :soon', { soon }).getMany())
      await this.n.send(u.id, 'REMINDER', 'Votre badge expire bientôt', `Expiration le ${u.badgeExpiresAt!.toLocaleDateString('fr-FR')}. Renouvelez-le.`, undefined, `badge:${u.id}:${u.badgeExpiresAt!.toISOString().slice(0, 10)}`);
  }
  async stockReminders() {
    for (const p of await this.prods.createQueryBuilder('p').where('p.active = true AND p.stock <= 5').getMany())
      await this.n.send(p.sellerId, 'REMINDER', 'Stock faible', `${p.name} : ${p.stock} ${p.unit} restant(s).`, undefined, `stock:${p.id}:${p.stock}`);
  }
  async adminReminders() {
    const n = await this.users.countBy({ status: 'PENDING', createdAt: this.ago(48) });
    if (n) await this.n.toRole('ADMIN', 'REMINDER', 'Profils en attente', `${n} inscription(s) attendent validation depuis plus de 48 h.`, `pend:${new Date().toISOString().slice(0, 10)}`);
  }
}
