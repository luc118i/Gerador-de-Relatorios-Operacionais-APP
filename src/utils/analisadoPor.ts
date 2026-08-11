/** Normaliza (minúsculas, sem acento) pra comparar nomes sem depender de grafia exata. */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Decide qual `analisadoPorUserId` salvar junto do `analisadoPor` (texto
 * livre) que está prestes a ser gravado.
 *
 * - Se o texto do campo "Quem apurou" bate com o nome atual (ou qualquer
 *   nome anterior — ver `profileNameAliases` no AuthContext) de quem está
 *   logado, anexa o ID de quem está logado (é razoável assumir que é a
 *   mesma pessoa se atribuindo a ocorrência). Usar os aliases, e não só o
 *   nome atual, evita que duas ocorrências do mesmo usuário caiam em
 *   buckets diferentes no Pódio de Apuração quando o campo foi
 *   pré-preenchido antes do `profileName` carregar (race de login) ou
 *   segurava uma grafia antiga.
 * - Se o texto foi editado pra outro nome (ex. reatribuindo pra um colega,
 *   ou preservando quem gerou a ocorrência via GAS), NÃO assume que é quem
 *   está logado — mas também não apaga um vínculo que já existia pra essa
 *   ocorrência (`existingUserId`), já que quem está logado não tem como
 *   saber a quem esse outro nome pertence. Só um rename explícito do dono
 *   original (ver `renameAnalisadoPorHistory`) deve trocar esse vínculo.
 *
 * Ver ApuracaoPodium/home.tsx, que priorizam esse ID (estável a rename de
 * perfil) sobre o nome-texto pra ranking/filtro por autor.
 */
export function resolveAnalisadoPorUserId(
  analisadoPorText: string,
  profileNameAliases: Set<string>,
  userId: string | null | undefined,
  existingUserId?: string | null,
): string | null {
  const text = analisadoPorText.trim();
  const matchesLoggedInUser = !!userId && !!text && profileNameAliases.has(normalizeName(text));
  return matchesLoggedInUser ? userId! : existingUserId ?? null;
}
