import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const port = Number(this.config.get('SMTP_PORT') ?? 587);
    const secure =
      this.config.get('SMTP_SECURE') === 'true' || port === 465;

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
      port,
      secure,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') ?? 'TutorConnect <noreply@tutorconnect.in>';

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Your TutorConnect verification code',
        text: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>TutorConnect India</h2>
            <p>Your verification code is:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:4px">${otp}</p>
            <p style="color:#666">This code expires in 5 minutes. Do not share it with anyone.</p>
          </div>
        `,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}`, error);
      throw error;
    }
  }

  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM') ??
      'TutorConnect <noreply@tutorconnect.in>';
    try {
      await this.transporter.sendMail({ from, to, subject, text, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  /** Public send used by NotificationsService retry path. */
  async sendRaw(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    await this.send(to, subject, text, html);
  }

  async sendRequirementMatchAlert(
    email: string,
    data: {
      tutorName: string;
      subject: string;
      budgetMin: number;
      budgetMax: number;
      mode: string;
    },
  ): Promise<void> {
    await this.send(
      email,
      'New TutorConnect opportunity',
      `Hi ${data.tutorName}, ${data.subject} matches your profile. Budget ₹${data.budgetMin}–${data.budgetMax}/mo (${data.mode}). Log in to view and apply.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>New opportunity</h2>
        <p>Hi ${data.tutorName},</p>
        <p>There is ${data.subject} that matches your profile.</p>
        <p><strong>Budget:</strong> ₹${data.budgetMin}–₹${data.budgetMax}/month<br/>
        <strong>Mode:</strong> ${data.mode}</p>
        <p>Log in to TutorConnect to view and apply.</p>
      </div>`,
    );
  }

  async sendApplicationReceived(
    email: string,
    data: { studentName: string; tutorName: string },
  ): Promise<void> {
    await this.send(
      email,
      'New tutor application',
      `Hi ${data.studentName}, ${data.tutorName} applied to your requirement. Review it in your inbox.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>New application</h2>
        <p>Hi ${data.studentName},</p>
        <p><strong>${data.tutorName}</strong> applied to your requirement.</p>
        <p>Open your applications inbox to shortlist or reject.</p>
      </div>`,
    );
  }

  async sendShortlisted(
    email: string,
    data: { tutorName: string },
  ): Promise<void> {
    await this.send(
      email,
      'You were shortlisted',
      `Hi ${data.tutorName}, a student shortlisted you on TutorConnect.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Shortlisted</h2>
        <p>Hi ${data.tutorName},</p>
        <p>A student shortlisted you. Log in to book a demo class or generate an agreement.</p>
      </div>`,
    );
  }

  async sendDemoScheduled(
    email: string,
    data: { name: string; when: string; mode: string },
  ): Promise<void> {
    await this.send(
      email,
      'Demo class scheduled',
      `Hi ${data.name}, a demo class is scheduled at ${data.when} (${data.mode}). Join details are in the app.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Demo scheduled</h2>
        <p>Hi ${data.name},</p>
        <p>Your demo is scheduled for <strong>${data.when}</strong> (${data.mode}).</p>
        <p>Open TutorConnect for platform join details. Contact details stay hidden until agreement.</p>
      </div>`,
    );
  }

  async sendDemoCompleted(
    email: string,
    data: { name: string },
  ): Promise<void> {
    await this.send(
      email,
      'Demo class completed',
      `Hi ${data.name}, a demo class was marked completed.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Demo completed</h2>
        <p>Hi ${data.name},</p>
        <p>A demo class was marked completed. Next step: sign the tuition agreement if you wish to proceed.</p>
      </div>`,
    );
  }

  async sendDemoReminder(
    email: string,
    data: { name: string; when: string; mode: string },
  ): Promise<void> {
    await this.send(
      email,
      'Demo class reminder — starts in about 1 hour',
      `Hi ${data.name}, reminder: your demo is at ${data.when} (${data.mode}). Open TutorConnect for join details.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Demo reminder</h2>
        <p>Hi ${data.name},</p>
        <p>Your demo starts in about <strong>1 hour</strong> — <strong>${data.when}</strong> (${data.mode}).</p>
        <p>Open TutorConnect for platform join details.</p>
      </div>`,
    );
  }

  async sendDemoCancelled(
    email: string,
    data: { name: string; status: string },
  ): Promise<void> {
    const label =
      data.status === 'NO_SHOW' ? 'marked as no-show' : 'cancelled';
    await this.send(
      email,
      `Demo class ${label}`,
      `Hi ${data.name}, a demo class was ${label}.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Demo ${label}</h2>
        <p>Hi ${data.name},</p>
        <p>A demo class was <strong>${label}</strong>. The slot is available again.</p>
      </div>`,
    );
  }

  async sendAgreementSigned(
    email: string,
    data: { name: string; signerRole: string },
  ): Promise<void> {
    await this.send(
      email,
      'Agreement signed — awaiting other party',
      `Hi ${data.name}, the ${data.signerRole.toLowerCase()} signed the TutorConnect agreement. Please review and sign.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Agreement signed</h2>
        <p>Hi ${data.name},</p>
        <p>The <strong>${data.signerRole.toLowerCase()}</strong> has signed. Open your agreements page to review and sign.</p>
      </div>`,
    );
  }

  async sendSlotReleased(
    email: string,
    data: { name: string },
  ): Promise<void> {
    await this.send(
      email,
      'Schedule slot released',
      `Hi ${data.name}, a student released an occupied slot. It is available again.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Slot released</h2>
        <p>Hi ${data.name},</p>
        <p>A student released an occupied slot. Check your calendar — it is available again.</p>
      </div>`,
    );
  }

  async sendAgreementActive(
    email: string,
    data: { name: string },
  ): Promise<void> {
    await this.send(
      email,
      'Agreement activated — you are matched',
      `Hi ${data.name}, your TutorConnect agreement is active. You are matched. Schedule slots are now occupied.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Matched — agreement active</h2>
        <p>Hi ${data.name},</p>
        <p>Both parties have signed. You are <strong>matched</strong>. Schedule slots are OCCUPIED. Download the PDF from your agreements page.</p>
      </div>`,
    );
  }

  async sendSessionReminder(
    email: string,
    data: { name: string; when: string; mode?: string },
  ): Promise<void> {
    await this.send(
      email,
      'Session reminder — starts in about 1 hour',
      `Hi ${data.name}, reminder: your tuition session is at ${data.when}${data.mode ? ` (${data.mode})` : ''}.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Session reminder</h2>
        <p>Hi ${data.name},</p>
        <p>Your session starts in about <strong>1 hour</strong> — <strong>${data.when}</strong>${
          data.mode ? ` (${data.mode})` : ''
        }.</p>
      </div>`,
    );
  }

  async sendPaymentDue(
    email: string,
    data: {
      name: string;
      grossAmount: number;
      commissionGross: number;
      registrationGross: number;
      dueAt?: string;
    },
  ): Promise<void> {
    const due = data.dueAt ? ` Due by ${data.dueAt}.` : '';
    const lines = [
      `Commission (incl. GST): ₹${data.commissionGross}`,
      data.registrationGross
        ? `Registration fee (incl. GST): ₹${data.registrationGross}`
        : null,
      `Total due: ₹${data.grossAmount}`,
    ]
      .filter(Boolean)
      .join('\n');
    await this.send(
      email,
      'TutorConnect payment due',
      `Hi ${data.name},\n\nA platform fee is due.${due}\n\n${lines}\n\nPay from your commissions page.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Payment due</h2>
        <p>Hi ${data.name},</p>
        <p>A platform fee is due.${due}</p>
        <ul>
          <li>Commission (incl. GST): ₹${data.commissionGross}</li>
          ${
            data.registrationGross
              ? `<li>Registration fee (incl. GST): ₹${data.registrationGross}</li>`
              : ''
          }
          <li><strong>Total due: ₹${data.grossAmount}</strong></li>
        </ul>
        <p>Pay from your commissions page in TutorConnect.</p>
      </div>`,
    );
  }

  async sendPaymentReceipt(
    email: string,
    data: {
      name: string;
      type: string;
      grossAmount: number;
      taxableAmount: number;
      gstAmount: number;
      paymentId: string;
    },
  ): Promise<void> {
    await this.send(
      email,
      'TutorConnect payment receipt',
      `Hi ${data.name},\n\nPayment received for ${data.type}.\nGross (incl. GST): ₹${data.grossAmount}\nTaxable: ₹${data.taxableAmount}\nGST: ₹${data.gstAmount}\nRef: ${data.paymentId}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Payment receipt</h2>
        <p>Hi ${data.name},</p>
        <p>We received your <strong>${data.type}</strong> payment.</p>
        <ul>
          <li>Gross (incl. GST): ₹${data.grossAmount}</li>
          <li>Taxable value: ₹${data.taxableAmount}</li>
          <li>GST (18% incl.): ₹${data.gstAmount}</li>
          <li>Reference: ${data.paymentId}</li>
        </ul>
      </div>`,
    );
  }

  async sendCommissionOverdue(
    email: string,
    data: { name: string; grossAmount: number },
  ): Promise<void> {
    await this.send(
      email,
      'TutorConnect commission overdue',
      `Hi ${data.name}, your commission payment of ₹${data.grossAmount} is overdue. Please pay to avoid account restrictions.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Payment overdue</h2>
        <p>Hi ${data.name},</p>
        <p>Your commission of <strong>₹${data.grossAmount}</strong> is overdue. Please pay from the commissions page.</p>
      </div>`,
    );
  }
}
