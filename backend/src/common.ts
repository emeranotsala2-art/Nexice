import { SetMetadata, Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Role, OrderEvent } from './entities';

export const Roles = (...r: Role[]) => SetMetadata('roles', r);
export const Public = () => SetMetadata('public', true);
export const Me = createParamDecorator((_d, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as { sub: string; role: Role });

@Injectable() export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private ref: Reflector) {}
  canActivate(c: ExecutionContext) {
    if (this.ref.get<boolean>('public', c.getHandler())) return true;
    const req = c.switchToHttp().getRequest();
    try { req.user = this.jwt.verify((req.headers.authorization || '').replace('Bearer ', '')); }
    catch { throw new UnauthorizedException('Session expirée'); }
    const roles = this.ref.get<Role[]>('roles', c.getHandler());
    if (roles && !roles.includes(req.user.role)) throw new ForbiddenException('Action non autorisée pour votre rôle');
    return true;
  }
}

// JSON canonique (clés triées) : PostgreSQL (jsonb) réordonne les clés, le hash ne doit pas en dépendre.
export const canonical = (v: any): string =>
  Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',')}}`
  : JSON.stringify(v) ?? 'null';

export const chainHash = (prev: string, orderId: string, type: string, data: any) =>
  createHash('sha256').update(prev + orderId + type + canonical(data ?? {})).digest('hex');

@Injectable() export class TraceService {
  constructor(@InjectRepository(OrderEvent) private ev: Repository<OrderEvent>) {}
  async add(orderId: string, type: string, data?: any, m?: EntityManager) {
    const repo = m ? m.getRepository(OrderEvent) : this.ev;
    const last = await repo.findOne({ where: { orderId }, order: { id: 'DESC' } });
    const prevHash = last?.hash ?? 'GENESIS';
    return repo.save({ orderId, type, data: data ?? null, prevHash, hash: chainHash(prevHash, orderId, type, data) });
  }
  async events(orderId: string) { return this.ev.find({ where: { orderId }, order: { id: 'ASC' } }); }
  async verify(orderId: string) {
    let prev = 'GENESIS';
    for (const e of await this.events(orderId)) {
      if (e.prevHash !== prev || e.hash !== chainHash(prev, orderId, e.type, e.data)) return { valid: false, brokenAt: e.id };
      prev = e.hash;
    }
    return { valid: true };
  }
}
