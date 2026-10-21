import { OnGatewayConnection, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Order } from './entities';

@WebSocketGateway({ namespace: 'tracking', cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' } })
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private jwt: JwtService, @InjectRepository(Order) private orders: Repository<Order>) {}
  handleConnection(c: Socket) {
    try { c.data.user = this.jwt.verify(c.handshake.auth?.token); } catch { c.disconnect(true); }
  }
  @SubscribeMessage('join') async join(@ConnectedSocket() c: Socket, @MessageBody() d: { orderId: string }) {
    const u = c.data.user, o = await this.orders.findOneBy({ id: d?.orderId });
    if (!o || !(u.role === 'ADMIN' || [o.buyerId, o.sellerId, o.driverId].includes(u.sub))) return { ok: false };
    c.join(o.id);
    return { ok: true, lat: o.lastLat, lng: o.lastLng };
  }
  @SubscribeMessage('position') async position(@ConnectedSocket() c: Socket, @MessageBody() d: { orderId: string; lat: number; lng: number }) {
    const o = await this.orders.findOneBy({ id: d?.orderId });
    if (!o || o.driverId !== c.data.user.sub || o.status !== 'SHIPPED' || !Number.isFinite(d.lat) || !Number.isFinite(d.lng)) return { ok: false };
    await this.orders.update(o.id, { lastLat: d.lat, lastLng: d.lng });
    this.server.to(o.id).emit('position', { lat: d.lat, lng: d.lng, at: Date.now() });
    return { ok: true };
  }
}
