import { useMutation } from '@tanstack/react-query';
import { sendReportEmail } from '../api/emailService';
import { useRecentRecipients } from './useRecentRecipients';
import type { EmailPayload } from '../domain/EmailPayload';

export function useSendReport() {
  const { addRecent } = useRecentRecipients();

  return useMutation({
    mutationFn: (payload: EmailPayload) => sendReportEmail(payload),
    onSuccess: (_data, payload) => {
      addRecent(payload.to);
    },
  });
}
