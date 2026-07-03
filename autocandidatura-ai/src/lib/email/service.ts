// Resend SDK — uncomment when ready
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

// Nodemailer — uncomment when ready
// import nodemailer from 'nodemailer';

import { sendEmail as sendGmail } from '@/lib/gmail/service';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'mock';

  try {
    switch (provider) {
      case 'mock': {
        console.log('[MOCK EMAIL SERVICE]', {
          to: params.to,
          subject: params.subject,
          htmlLength: params.html.length,
        });
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }

      case 'resend': {
        // Uncomment when Resend SDK is installed and API key is set
        // const { data, error } = await resend.emails.send({
        //   from: params.from || 'AutoCandidatura <onboarding@resend.dev>',
        //   to: params.to,
        //   subject: params.subject,
        //   html: params.html,
        //   attachments: params.attachments?.map((a) => ({
        //     filename: a.filename,
        //     content: a.content,
        //   })),
        // });
        // if (error) throw new Error(error.message);
        // return { success: true, messageId: data?.id };
        throw new Error(
          'Resend no configurado. Descomenta el código en src/lib/email/service.ts e instala resend'
        );
      }

      case 'smtp': {
        // Uncomment when nodemailer is installed and SMTP is configured
        // const transporter = nodemailer.createTransport({
        //   host: process.env.SMTP_HOST,
        //   port: Number(process.env.SMTP_PORT),
        //   secure: Number(process.env.SMTP_PORT) === 465,
        //   auth: {
        //     user: process.env.SMTP_USER,
        //     pass: process.env.SMTP_PASS,
        //   },
        // });
        // const info = await transporter.sendMail({
        //   from: params.from || process.env.SMTP_USER,
        //   to: params.to,
        //   subject: params.subject,
        //   html: params.html,
        //   attachments: params.attachments?.map((a) => ({
        //     filename: a.filename,
        //     content: a.content,
        //   })),
        // });
        // return { success: true, messageId: info.messageId };
        throw new Error(
          'SMTP no configurado. Descomenta el código en src/lib/email/service.ts e instala nodemailer'
        );
      }

      case 'gmail': {
        const sent = await sendGmail({
          to: params.to,
          subject: params.subject,
          message: params.html,
        });
        return {
          success: sent,
          messageId: sent ? `gmail-${Date.now()}` : undefined,
        };
      }

      default:
        throw new Error(`EMAIL_PROVIDER desconocido: ${provider}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido al enviar email';
    return { success: false, error: message };
  }
}
