import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('api/contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async submitContactForm(@Body() dto: CreateContactDto) {
        return this.contactService.submitContactForm(dto);
    }
}
