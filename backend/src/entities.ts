import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
export type Role = 'BUYER' | 'SELLER' | 'DRIVER' | 'ADMIN';
export type BadgeColor = 'GREEN' | 'PURPLE' | 'PINK';
export type OrderStatus = 'NEGOTIATION' | 'VALIDATED' | 'PAID' | 'SHIPPED' | 'DELIVERED' |
'CANCELLED';
@Entity() export class User {
@PrimaryGeneratedColumn('uuid') id: string;
@Column({ unique: true }) email: string;
@Column() passwordHash: string;
@Column() role: Role;
@Column({ nullable: true }) company: string;
@Column({ nullable: true }) phone: string;
@Column({ default: 'PENDING' }) status: 'PENDING' | 'APPROVED' | 'REJECTED';
@Column({ type: 'varchar', nullable: true }) badge: BadgeColor | null;
@Column({ type: 'timestamp', nullable: true }) badgeExpiresAt: Date | null;
@Column({ default: 0 }) aiUsed: number;
@CreateDateColumn() createdAt: Date;
} @
Entity() export class Product {
@PrimaryGeneratedColumn('uuid') id: string;
@Index() @Column('uuid') sellerId: string;
@Column() sellerCompany: string;
@Column() name: string;
@Column({ nullable: true }) description: string;
@Column({ default: 'unité' }) unit: string;
@Column('int') price: number;
@Column('int', { default: 0 }) stock: number;
@Column({ default: true }) active: boolean;
@CreateDateColumn() createdAt: Date;
} @
Entity() export class Order {
@PrimaryGeneratedColumn('uuid') id: string;
@Index() @Column('uuid') buyerId: string;
@Column() buyerCompany: string;
@Index() @Column('uuid') sellerId: string;
@Column() sellerCompany: string;
@Column({ type: 'uuid', nullable: true }) driverId: string | null;
@Column({ default: 'NEGOTIATION' }) status: OrderStatus;
@Column('json') items: { productId: string; name: string; qty: number; unitPrice: number }[];
@Column('int') total: number;@Column() lastOfferBy: 'BUYER' | 'SELLER';
@Column({ nullable: true }) deliveryAddress: string;
@Column({ type: 'varchar', nullable: true }) invoiceNumber: string | null;
@Column({ type: 'varchar', nullable: true }) paymentRef: string | null;
@Column({ type: 'double precision', nullable: true }) lastLat: number | null;
@Column({ type: 'double precision', nullable: true }) lastLng: number | null;
@CreateDateColumn() createdAt: Date;
@UpdateDateColumn() updatedAt: Date;
} @
Entity() export class OrderEvent {
@PrimaryGeneratedColumn('increment') id: number;
@Index() @Column('uuid') orderId: string;
@Column() type: string;
@Column('json', { nullable: true }) data: any;
@Column() prevHash: string;
@Column() hash: string;
@CreateDateColumn() at: Date;
} @
Entity() export class BadgePayment {
@PrimaryGeneratedColumn('uuid') id: string;
@Index() @Column('uuid') userId: string;
@Column() userEmail: string;
@Column() color: BadgeColor;
@Column('int') amount: number;
@Column() omReference: string;
@Column({ default: 'PENDING' }) status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
@CreateDateColumn() createdAt: Date;
} @
Entity() export class BadgePlan {
@PrimaryColumn() color: BadgeColor;
@Column('int') price: number;
} @
Entity() export class Notification {
@PrimaryGeneratedColumn('uuid') id: string;
@Index() @Column('uuid') userId: string;
@Column() type: string;
@Column() title: string;
@Column() body: string;
@Column({ type: 'uuid', nullable: true }) orderId: string | null;
@Index() @Column({ type: 'varchar', nullable: true }) key: string | null;
@Column({ default: false }) isRead: boolean;
@CreateDateColumn() createdAt: Date;}
export const ALL_ENTITIES = [User, Product, Order, OrderEvent, BadgePayment, BadgePlan,
Notification];