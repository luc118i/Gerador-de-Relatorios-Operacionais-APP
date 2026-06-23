import { supabase } from '../../../lib/supabase';
import type { EmailPayload } from '../domain/EmailPayload';

export async function sendReportEmail(payload: EmailPayload): Promise<void> {
  const form = new FormData();
  form.append('from', payload.from.email);
  form.append('fromName', payload.from.name);
  payload.to.forEach((addr) => form.append('to', addr));
  form.append('subject', payload.subject);
  form.append('body', payload.body);
  form.append('pdf', payload.pdfBlob, payload.pdfFileName);

  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: form,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}
