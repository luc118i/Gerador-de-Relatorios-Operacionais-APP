import { useState } from 'react';

export function useEmailComposer(defaultSubject = '') {
  const [to, setTo] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(
    'Segue em anexo o relatório operacional do período.\nQualquer dúvida, estamos à disposição.',
  );

  function addRecipient(email: string) {
    if (!email || to.includes(email)) return;
    setTo((prev) => [...prev, email]);
  }

  function removeRecipient(email: string) {
    setTo((prev) => prev.filter((e) => e !== email));
  }

  function reset() {
    setTo([]);
    setSubject(defaultSubject);
  }

  return { to, subject, setSubject, body, setBody, addRecipient, removeRecipient, reset };
}
