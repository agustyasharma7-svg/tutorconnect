export const EMAIL_QUEUE = 'email';

export type EmailJobData = {
  notificationId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};
