import { useState } from 'react';
import { X, Paperclip, Send, Loader2, Check } from 'lucide-react';
import { useEmailComposer } from '../hooks/useEmailComposer';
import { useRecentRecipients } from '../hooks/useRecentRecipients';
import { useSendReport } from '../hooks/useSendReport';
import { useEmailAccount } from '../hooks/useEmailAccount';

interface Props {
  pdfBlob: Blob;
  pdfFileName: string;
  defaultSubject?: string;
  onClose: () => void;
}

export function EmailComposerModal({ pdfBlob, pdfFileName, defaultSubject = '', onClose }: Props) {
  const { account } = useEmailAccount();
  const { to, subject, setSubject, body, setBody, addRecipient, removeRecipient, reset } =
    useEmailComposer(defaultSubject);
  const { getRecent } = useRecentRecipients();
  const { mutate: send, isPending, isSuccess, isError, error } = useSendReport();
  const [inputValue, setInputValue] = useState('');

  const suggestions = getRecent().filter(
    (r) => r.includes(inputValue) && !to.includes(r) && inputValue.length > 0,
  );

  function commitInput() {
    const value = inputValue.trim().replace(/,$/, '');
    if (value) {
      addRecipient(value);
      setInputValue('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput();
    }
    if (e.key === 'Backspace' && !inputValue && to.length > 0) {
      removeRecipient(to[to.length - 1]!);
    }
  }

  function handleSend() {
    if (!account || to.length === 0) return;
    commitInput();
    send({ from: account, to, subject, body, pdfBlob, pdfFileName });
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-base font-semibold text-gray-800 mb-1">Relatório enviado!</p>
          <p className="text-sm text-gray-400 mb-6">
            Enviado para {to.length} destinatário{to.length !== 1 ? 's' : ''}.
          </p>
          <button
            onClick={() => { reset(); onClose(); }}
            className="cursor-pointer w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Enviar relatório por e-mail</h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Remetente */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-14 text-right shrink-0 text-gray-400">De:</span>
            <span className="font-medium text-gray-700">
              {account?.name} &lt;{account?.email}&gt;
            </span>
          </div>

          {/* Destinatários */}
          <div className="flex items-start gap-2">
            <span className="w-14 text-right shrink-0 text-xs text-gray-400 pt-2">Para:</span>
            <div className="flex-1 relative">
              <div className="min-h-[38px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-gray-200 rounded-xl focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 transition-colors">
                {to.map((addr) => (
                  <span
                    key={addr}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5"
                  >
                    {addr}
                    <button
                      onClick={() => removeRecipient(addr)}
                      className="cursor-pointer text-blue-400 hover:text-blue-700 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={commitInput}
                  placeholder={to.length === 0 ? 'E-mail, Enter para adicionar' : ''}
                  className="flex-1 min-w-[140px] text-xs outline-none placeholder:text-gray-300 bg-transparent"
                />
              </div>

              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 max-h-32 overflow-y-auto">
                  {suggestions.map((s) => (
                    <li
                      key={s}
                      onClick={() => { addRecipient(s); setInputValue(''); }}
                      className="cursor-pointer px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Assunto */}
          <div className="flex items-center gap-2">
            <span className="w-14 text-right shrink-0 text-xs text-gray-400">Assunto:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
            />
          </div>

          {/* Mensagem */}
          <div className="flex items-start gap-2">
            <span className="w-14 text-right shrink-0 text-xs text-gray-400 pt-2">Mensagem:</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors resize-none"
            />
          </div>

          {/* Anexo */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{pdfFileName}</span>
            <span className="text-gray-300 shrink-0">— anexado automaticamente</span>
          </div>

          {/* Erro */}
          {isError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              Falha ao enviar: {(error as Error)?.message ?? 'erro desconhecido'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={isPending || to.length === 0}
            className="cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isPending ? 'Enviando…' : 'Enviar relatório'}
          </button>
        </div>
      </div>
    </div>
  );
}
