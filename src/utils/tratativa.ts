import type { TipoMedida } from "../app/components/RizerRegisterModal";

// Mapeia a tratativa já escolhida na criação da ocorrência para a opção
// correspondente do modal de envio ao RIZER, evitando perguntar de novo o que
// o analista já definiu. VALE não tem equivalente no RIZER (é desconto em
// folha, não medida disciplinar) — cai em "nenhum" (apenas registrar).
export function tratativaToTipoMedida(tratativa: string | null | undefined): TipoMedida | null {
  switch (tratativa) {
    case "SUSPEICAO": return "suspensao";
    case "ADVERTENCIA": return "advertencia";
    case "VALE": return "nenhum";
    case "REGISTRO": return "nenhum";
    default: return null;
  }
}
