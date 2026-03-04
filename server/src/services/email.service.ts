import logger from '../config/logger';
import config from '../config/env';
import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

class EmailService {
  private readonly transporter = config.smtp.host && config.smtp.port
    ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user && config.smtp.pass ? {
        user: config.smtp.user,
        pass: config.smtp.pass,
      } : undefined,
    })
    : null;

  async sendEmail({ to, subject, text }: EmailPayload): Promise<void> {
    if (config.isTest) {
      logger.info('Transactional email skipped in test mode', { to, subject });
      return;
    }

    if (!this.transporter) {
      logger.warn('SMTP transport not configured; skipping transactional email', { to, subject });
      return;
    }

    await this.transporter.sendMail({
      to,
      subject,
      text,
      from: config.smtp.from,
    });
    logger.info('Transactional email sent', { to, subject });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const url = `${config.auth.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendEmail({
      to,
      subject: 'Verify your Deal Hunter email',
      text: `Verify your email by opening this link: ${url}`,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${config.auth.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.sendEmail({
      to,
      subject: 'Reset your Deal Hunter password',
      text: `Reset your password using this link: ${url}`,
    });
  }
}

export default new EmailService();
