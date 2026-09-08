type Props = { className?: string };

/** Ícone da Central de Ocorrências — quadro de 3 colunas com itens avançando
 *  até o "concluído" (check). Traço no estilo dos ícones lucide usados no app. */
export function CentralOcorrenciasIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M9 4v17M15 4v17M3 9h18" />
      <path d="M5 6.6h2.2M10.9 6.6h2.2M16.8 6.6h2.2" />
      <rect x="4.7" y="12" width="2.6" height="5.4" rx="0.8" />
      <rect x="10.7" y="12" width="2.6" height="3.4" rx="0.8" />
      <path d="M16.4 13.7l1.2 1.2 2.1-2.6" />
    </svg>
  );
}
