import { useState } from 'react';
import { X, Mail, User } from 'lucide-react';
import { useEmailAccount } from '../hooks/useEmailAccount';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function EmailLoginModal({ onClose, onSaved }: Props) {
  const { saveAccount } = useEmailAccount();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    saveAccount({ name: trimmedName, email: trimmedEmail });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Configure seu e-mail</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Feito uma única vez — troque a qualquer momento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-gray-300"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="voce@empresa.com.br"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onClose}
            className="cursor-pointer flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim()}
            className="cursor-pointer flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            Salvar e continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
