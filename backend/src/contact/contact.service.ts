import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
    constructor(private emailService: EmailService) { }

    async submitContactForm(dto: CreateContactDto) {
        // Send email to admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@rachelfoods.com';

        const adminMessage = `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${dto.name} (${dto.email})</p>
            ${dto.phone ? `<p><strong>Phone:</strong> ${dto.phone}</p>` : ''}
            <p><strong>Subject:</strong> ${dto.subject}</p>
            <p><strong>Message:</strong></p>
            <p>${dto.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>Sent via RachelFoods Contact Form</small></p>
        `;

        await this.emailService.sendAdminAlertEmail(
            adminEmail,
            `Contact Form: ${dto.subject}`,
            adminMessage,
            { name: dto.name, email: dto.email, phone: dto.phone }
        );

        // Send confirmation email to user using admin alert method
        const confirmMessage = `
            <h2>Thank you for contacting us!</h2>
            <p>Hi ${dto.name},</p>
            <p>We've received your message and will get back to you as soon as possible.</p>
            <p><strong>Your message:</strong></p>
            <p>${dto.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p>Best regards,<br>RachelFoods Team</p>
        `;

        await this.emailService.sendAdminAlertEmail(
            dto.email,
            'We received your message - RachelFoods',
            confirmMessage
        );
    };
}
}
