import { useState } from 'react';
import { EMAIL_ACCOUNT_KEY } from '../domain/EmailAccount';
import type { EmailAccount } from '../domain/EmailAccount';

export function useEmailAccount() {
  const [account, setAccount] = useState<EmailAccount | null>(() => {
    const stored = localStorage.getItem(EMAIL_ACCOUNT_KEY);
    return stored ? (JSON.parse(stored) as EmailAccount) : null;
  });

  function saveAccount(data: EmailAccount) {
    localStorage.setItem(EMAIL_ACCOUNT_KEY, JSON.stringify(data));
    setAccount(data);
  }

  function removeAccount() {
    localStorage.removeItem(EMAIL_ACCOUNT_KEY);
    setAccount(null);
  }

  return { account, saveAccount, removeAccount };
}
