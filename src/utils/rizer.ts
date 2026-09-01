// Base do RIZER para deep-links "abrir no RIZER". Valor fixo (o domínio da
// Viação Catedral é estável e a automação no backend usa o mesmo host via
// RIZER_DISCIPLINARY_URL). `VITE_RIZER_BASE_URL` é um override opcional caso
// o domínio mude — não precisa ser configurado.
export const RIZER_BASE_URL = (
  (import.meta.env.VITE_RIZER_BASE_URL as string | undefined) ||
  "https://viacaocatedralocorrencias.rizerapps.com"
).replace(/\/$/, "");

/** URL de edição de uma ocorrência disciplinar no RIZER (onde o gestor
 *  preenche a devolutiva / providência). */
export function rizerDisciplinarEditUrl(rizerId: string): string {
  return `${RIZER_BASE_URL}/ocorrencias_disciplinares/${rizerId}/edit`;
}
