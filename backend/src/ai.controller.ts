import { Body, Controller, ForbiddenException, Post, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities';
import { AskDto } from './dto';
import { Me } from './common';

const FREE_QUOTA = 5;
const SYSTEM = 'Tu es l\'assistant de NeXice, plateforme B2B pour grossistes, détaillants et fournisseurs en Afrique centrale. Réponds en français, de façon concise et pratique : négociation, gestion de stock, tarification, logistique.';

@Controller('ai') export class AiController {
  constructor(@InjectRepository(User) private users: Repository<User>) {}
  @Post('ask') async ask(@Body() b: AskDto, @Me() me: any) {
    const u = await this.users.findOneByOrFail({ id: me.sub });
    const certified = !!u.badge && !!u.badgeExpiresAt && u.badgeExpiresAt > new Date();
    if (!certified && u.aiUsed >= FREE_QUOTA) throw new ForbiddenException('Quota gratuit atteint : prenez un badge pour un accès illimité');
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ServiceUnavailableException('Assistant non configuré (ANTHROPIC_API_KEY manquante)');
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: certified ? 1000 : 400,
        system: SYSTEM, messages: [{ role: 'user', content: b.question }] }) });
    if (!r.ok) throw new ServiceUnavailableException('Assistant momentanément indisponible');
    const d: any = await r.json();
    await this.users.increment({ id: u.id }, 'aiUsed', 1);
    return { answer: d.content?.map((c: any) => c.text ?? '').join('') ?? '', remaining: certified ? null : FREE_QUOTA - u.aiUsed - 1 };
  }
}
