import { PartialType } from '@nestjs/mapped-types';
import { CreateProductVariantDto } from './create-variant.dto';

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) { }
