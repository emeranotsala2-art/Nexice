import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ALL_ENTITIES } from './entities';
import { AuthGuard, Public, TraceService } from './common';
import { AuthController } from './auth.controller';
import { CatalogController } from './catalog.controller';
import { OrdersController } from './orders.controller';
import { AdminController } from './admin.controller';
import { AiController } from './ai.controller';
import { LegalController } from './legal.controller';
import { TrackingGateway } from './tracking.gateway';
import { NotificationsController, NotificationsGateway, NotificationsService, RemindersService } from './notifications';

@Controller('health') class HealthController { @Public() @Get() ok() { return { status: 'ok' }; } }

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({
      type: 'mysql', host: c.get('DB_HOST'), port: +c.get('DB_PORT'), username: c.get('DB_USER'),
      password: c.get('DB_PASS'), database: c.get('DB_NAME'), entities: ALL_ENTITIES, migrations: [__dirname + '/migrations/*{.ts,.js}'], migrationsTableName: 'migrations',
      migrationsRun: c.get('DB_MIGRATIONS_RUN') === 'true', synchronize: c.get('DB_SYNC') === 'true' }) }),
    TypeOrmModule.forFeature(ALL_ENTITIES),
    JwtModule.registerAsync({ global: true, inject: [ConfigService], useFactory: (c: ConfigService) => {
      const secret = c.get<string>('JWT_SECRET');
      if (!secret || secret.length < 16) throw new Error('JWT_SECRET manquant ou trop court (16 caractères minimum)');
      return { secret, signOptions: { expiresIn: '12h' } }; } }),
  ],
  controllers: [HealthController, AuthController, CatalogController, OrdersController, AdminController, AiController, NotificationsController, LegalController],
  providers: [TraceService, TrackingGateway, NotificationsGateway, NotificationsService, RemindersService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
