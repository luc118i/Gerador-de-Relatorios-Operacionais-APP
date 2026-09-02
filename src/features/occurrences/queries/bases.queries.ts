import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  baseResponsaveisApi,
  type BaseResponsavel,
} from "../../../api/baseResponsaveis.api";

// Mesma chave da tela "Base e Responsáveis" — o cache é compartilhado, então
// cadastrar/editar/remover base por lá reflete na hora no seletor de base do
// motorista, sem refetch extra.
export const basesRegistryKey = ["base-responsaveis"] as const;

export type BaseOption = {
  /** Sigla oficial da base (ex.: "MOCC"). Exibida como etiqueta na lista. */
  sigla: string;
  /** Cidade/visibilidade da base (ex.: "Montes Claros"). */
  cidade: string;
  /**
   * Valor efetivamente persistido em `driver.base`. Usa a cidade quando ela
   * existe (consistente com os dados atuais e com resolveBaseSigla /
   * getBaseBannerImage, que são indexados por nome de cidade); cai na sigla
   * só quando a base foi cadastrada sem cidade.
   */
  value: string;
  /** Texto principal exibido no item e no gatilho. */
  label: string;
};

/**
 * Converte o cadastro oficial de bases (base-responsaveis) na lista de opções
 * do seletor. Ordena por cidade e remove duplicatas por valor persistido.
 */
export function baseOptionsFromRegistry(
  list: BaseResponsavel[] | undefined,
): BaseOption[] {
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const options: BaseOption[] = [];

  for (const b of list) {
    const sigla = (b.sigla ?? "").trim();
    if (!sigla) continue;

    const cidade = (b.visibilidade ?? "").trim();
    const value = cidade || sigla;
    const dedupeKey = value.toUpperCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    options.push({ sigla, cidade, value, label: cidade || sigla });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/** `true` se `base` corresponde (case-insensitive) a alguma base cadastrada. */
export function isRegisteredBase(
  base: string | null | undefined,
  options: BaseOption[],
): boolean {
  const v = (base ?? "").trim().toUpperCase();
  if (!v) return true; // base é opcional — vazio é válido
  return options.some((o) => o.value.toUpperCase() === v);
}

export function useBasesRegistry() {
  const query = useQuery({
    queryKey: basesRegistryKey,
    queryFn: baseResponsaveisApi.list,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const options = useMemo(
    () => baseOptionsFromRegistry(query.data),
    [query.data],
  );

  return { ...query, options };
}
