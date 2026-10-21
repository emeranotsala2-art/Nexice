import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Order, Product, User } from './entities';
import { OfferDto, OrderDto, TransitionDto } from './dto';
import { Me, Roles, TraceService } from './common';
import { NotificationsService } from './notifications';

type Me_ = { sub: string; role: string };
const TVA = +(process.env.TVA_RATE ?? 0.1925);

@Controller('orders') export class OrdersController {
  constructor(@InjectRepository(Order) private orders: Repository<Order>, @InjectRepository(Product) private prods: Repository<Product>,
    @InjectRepository(User) private users: Repository<User>, @InjectDataSource() private ds: DataSource, private trace: TraceService, private notif: NotificationsService) {}

  private canSee(o: Order, me: Me_) {
    return me.role === 'ADMIN' || [o.buyerId, o.sellerId, o.driverId].includes(me.sub) ||
      (me.role === 'DRIVER' && o.status === 'PAID' && !o.driverId);
  }
  private async load(id: string, me: Me_) {
    const o = await this.orders.findOneBy({ id });
    if (!o || !this.canSee(o, me)) throw new NotFoundException('Commande introuvable');
    return o;
  }

  @Get() list(@Me() me: Me_) {
    const order = { createdAt: 'DESC' as const };
    if (me.role === 'BUYER') return this.orders.find({ where: { buyerId: me.sub }, order });
    if (me.role === 'SELLER') return this.orders.find({ where: { sellerId: me.sub }, order });
    if (me.role === 'DRIVER') return this.orders.find({ where: [{ status: 'PAID', driverId: IsNull() }, { driverId: me.sub }], order });
    return this.orders.find({ order, take: 100 });
  }

  @Post() @Roles('BUYER') async create(@Body() b: OrderDto, @Me() me: Me_) {
    const prods = await this.prods.findBy({ id: In(b.items.map(i => i.productId)), active: true });
    if (prods.length !== new Set(b.items.map(i => i.productId)).size) throw new BadRequestException('Produit introuvable');
    if (new Set(prods.map(p => p.sellerId)).size !== 1) throw new BadRequestException('Une commande ne peut concerner qu\'un seul fournisseur');
    const items = b.items.map(i => { const p = prods.find(x => x.id === i.productId)!;
      if (p.stock < i.qty) throw new ConflictException(`Stock insuffisant : ${p.name}`);
      return { productId: p.id, name: p.name, qty: i.qty, unitPrice: p.price }; });
    const listTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const buyer = await this.users.findOneByOrFail({ id: me.sub });
    const o = await this.orders.save({ buyerId: buyer.id, buyerCompany: buyer.company, sellerId: prods[0].sellerId,
      sellerCompany: prods[0].sellerCompany, items, total: b.offerTotal ?? listTotal, lastOfferBy: 'BUYER', deliveryAddress: b.deliveryAddress });
    await this.trace.add(o.id, 'CREATED', { items, listTotal, offer: o.total });
    await this.notif.send(o.sellerId, 'ORDER_NEW', 'Nouvelle commande', `${buyer.company} propose ${o.total} FCFA`, o.id);
    return o;
  }

  @Get(':id') async one(@Param('id') id: string, @Me() me: Me_) {
    return { ...(await this.load(id, me)), events: await this.trace.events(id) };
  }
  @Get(':id/verify') async verify(@Param('id') id: string, @Me() me: Me_) { await this.load(id, me); return this.trace.verify(id); }

  @Post(':id/offer') async offer(@Param('id') id: string, @Body() b: OfferDto, @Me() me: Me_) {
    const o = await this.load(id, me);
    const party = me.sub === o.buyerId ? 'BUYER' : me.sub === o.sellerId ? 'SELLER' : null;
    if (!party || o.status !== 'NEGOTIATION') throw new ForbiddenException('Négociation impossible');
    await this.orders.update(id, { total: b.total, lastOfferBy: party });
    await this.trace.add(id, 'OFFER', { by: party, total: b.total, message: b.message });
    await this.notif.send(party === 'BUYER' ? o.sellerId : o.buyerId, 'OFFER', 'Nouvelle offre', `Offre de ${b.total} FCFA${b.message ? ' : ' + b.message : ''}`, id);
    return { ok: true };
  }

  @Patch(':id/status') async transition(@Param('id') id: string, @Body() b: TransitionDto, @Me() me: Me_) {
    const done = await this.ds.transaction(async m => {
      const o = await m.findOne(Order, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!o) throw new NotFoundException();
      const buyer = me.sub === o.buyerId, seller = me.sub === o.sellerId;
      const bad = (msg = 'Transition interdite') => { throw new ForbiddenException(msg); };
      const decrement = async (sign: 1 | -1) => { for (const i of o.items) {
        const r = await m.createQueryBuilder().update(Product).set({ stock: () => `stock - ${sign * Number(i.qty)}` })
          .where('id = :id' + (sign === 1 ? ' AND stock >= :q' : ''), { id: i.productId, q: i.qty }).execute();
        if (!r.affected) throw new ConflictException(`Stock insuffisant : ${i.name}`); } };
      const data: any = { by: me.sub, role: me.role };
      switch (b.status) {
        case 'VALIDATED':
          if (o.status !== 'NEGOTIATION' || !(buyer || seller) || o.lastOfferBy === (buyer ? 'BUYER' : 'SELLER')) bad('Seule l\'autre partie peut accepter la dernière offre');
          await decrement(1); data.total = o.total; break;
        case 'PAID':
          if (o.status !== 'VALIDATED' || !buyer) bad();
          if (!b.reference) throw new BadRequestException('Référence de paiement requise');
          o.paymentRef = b.reference; o.invoiceNumber = `NX-${new Date().getFullYear()}-${o.id.slice(0, 8).toUpperCase()}`;
          data.reference = b.reference; break;
        case 'SHIPPED':
          if (o.status !== 'PAID' || me.role !== 'DRIVER' || o.driverId) bad(); o.driverId = me.sub; break;
        case 'DELIVERED':
          if (o.status !== 'SHIPPED' || o.driverId !== me.sub) bad(); break;
        case 'CANCELLED':
          if (!(buyer || seller) || !['NEGOTIATION', 'VALIDATED'].includes(o.status)) bad('Annulation impossible à ce stade');
          if (o.status === 'VALIDATED') await decrement(-1); break;
      }
      o.status = b.status as any;
      await m.save(o);
      await this.trace.add(id, b.status, data, m);
      return o;
    });
    await this.notif.orderEvent(done, b.status, me.sub);
    return { ok: true };
  }

  @Get(':id/invoice') async invoice(@Param('id') id: string, @Me() me: Me_) {
    const o = await this.load(id, me);
    if (!o.invoiceNumber) throw new BadRequestException('Facture disponible après paiement');
    const tva = Math.round(o.total * TVA);
    return { number: o.invoiceNumber, date: o.updatedAt, seller: o.sellerCompany, buyer: o.buyerCompany, lines: o.items,
      totalHT: o.total, tvaRate: TVA, tva, totalTTC: o.total + tva, paymentRef: o.paymentRef };
  }
}
