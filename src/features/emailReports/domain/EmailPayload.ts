import type { EmailAccount } from './EmailAccount';

export interface EmailPayload {
  from: EmailAccount;
  to: string[];
  subject: string;
  body: string;
  pdfBlob: Blob;
  pdfFileName: string;
}
