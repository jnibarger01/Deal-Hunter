import logger from '../config/logger';
import config from '../config/env';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

class EmailService {
  async sendEmail({ to, subject, text }: EmailPayload): Promise<void> {
    // SMTP integration can be added behind this interface without changing auth flows.
    logger.info('Transactional email queued', {
      to,
      subject,
      from: config.smtp.from,
      preview: text,
    });
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
