import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product, User } from './entities';
import { ProductDto, ProductPatchDto } from './dto';
import { Me, Roles } from './common';

@Controller('products') export class CatalogController {
  constructor(@InjectRepository(Product) private prods: Repository<Product>, @InjectRepository(User) private users: Repository<User>) {}
  @Get() list(@Query('q') q = '', @Query('page') page = '1') {
    return this.prods.find({ where: { active: true, ...(q ? { name: ILike(`%${q.replace(/[%_]/g, '')}%`) } : {}) },
      order: { createdAt: 'DESC' }, take: 30, skip: (Math.max(1, +page) - 1) * 30 });
  }
  @Get('mine') @Roles('SELLER') mine(@Me() me: any) { return this.prods.find({ where: { sellerId: me.sub }, order: { createdAt: 'DESC' } }); }
  @Post() @Roles('SELLER') async add(@Body() b: ProductDto, @Me() me: any) {
    const u = await this.users.findOneByOrFail({ id: me.sub });
    return this.prods.save({ ...b, sellerId: u.id, sellerCompany: u.company });
  }
  @Patch(':id') @Roles('SELLER') async patch(@Param('id') id: string, @Body() b: ProductPatchDto, @Me() me: any) {
    const p = await this.prods.findOneBy({ id });
    if (!p) throw new NotFoundException();
    if (p.sellerId !== me.sub) throw new ForbiddenException();
    return this.prods.save({ ...p, ...b });
  }
}
