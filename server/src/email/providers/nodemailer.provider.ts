import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { EmailProvider } from './email.provider';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(NodemailerProvider.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(
    to: string, 
    subject: string, 
    html: string,
    attachments?: import('./email.provider').EmailAttachment[]
  ): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Aian System" <no-reply@example.com>',
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(
        `Email sent successfully to ${to}. Message ID: ${info.messageId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to send email.');
    }
  }
}
