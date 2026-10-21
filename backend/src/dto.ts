import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, MaxLength, ValidateNested, ArrayMinSize, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsEmail() email: string;
  @MinLength(8) @MaxLength(72) password: string;
  @IsIn(['BUYER', 'SELLER', 'DRIVER']) role: 'BUYER' | 'SELLER' | 'DRIVER';
  @IsString() @MinLength(2) @MaxLength(120) company: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}
export class LoginDto { @IsEmail() email: string; @IsString() password: string; }
export class ProductDto {
  @IsString() @MinLength(2) @MaxLength(150) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(20) unit?: string;
  @IsInt() @Min(1) price: number;
  @IsInt() @Min(0) stock: number;
}
export class ProductPatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) price?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() active?: boolean;
}
class ItemDto { @IsUUID() productId: string; @IsInt() @Min(1) @Max(100000) qty: number; }
export class OrderDto {
  @ValidateNested({ each: true }) @Type(() => ItemDto) @ArrayMinSize(1) items: ItemDto[];
  @IsOptional() @IsInt() @Min(1) offerTotal?: number;
  @IsString() @MinLength(3) deliveryAddress: string;
}
export class OfferDto { @IsInt() @Min(1) total: number; @IsOptional() @IsString() @MaxLength(300) message?: string; }
export class TransitionDto {
  @IsIn(['VALIDATED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']) status: string;
  @IsOptional() @IsString() @MaxLength(60) reference?: string;
}
export class BadgeRequestDto { @IsIn(['GREEN', 'PURPLE', 'PINK']) color: 'GREEN' | 'PURPLE' | 'PINK'; @IsString() @MinLength(4) @MaxLength(60) omReference: string; }
export class PlanDto { @IsInt() @Min(0) price: number; }
export class AskDto { @IsString() @MinLength(2) @MaxLength(1000) question: string; }
