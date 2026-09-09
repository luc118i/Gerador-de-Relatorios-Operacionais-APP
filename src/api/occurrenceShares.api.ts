import { request } from "./http";

export type ShareSections = {
  resumo?: boolean;
  viagem?: boolean;
  veiculo?: boolean;
  relato?: boolean;
  tratativa?: boolean;
  timeline?: boolean;
  evidencias?: boolean;
};

export type OccurrenceShare = {
  token: string;
  occurrence_id: string;
  active: boolean;
  sections: ShareSections;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
};

export type PublicOccurrence = {
  code: string;
  titulo: string;
  tipo: string | null;
  status: { code: string; label: string };
  prioridade: { code: string; label: string };
  eventDate: string | null;
  hora: string;
  geradoEm: string;
  relatorioUrl: string | null;
  resumo?: { local: string | null; situacao: string | null; operadorCco: string | null };
  viagem?: {
    linha: string | null;
    sentido: string | null;
    motoristas: { nome: string; matricula: string | null }[] | null;
  };
  veiculo?: { prefixo: string | null; km: number | null };
  relato?: {
    relatoHtml: string | null;
    devolutivaHtml: string | null;
    devolutivaStatus: string | null;
  };
  tratativa?: {
    responsavel: string | null;
    tipo: string | null;
    suspensao: { dias: number; dataInicio: string } | null;
    encerrada: boolean;
  };
  timeline?: {
    at: string;
    action: string;
    fromValue: string | null;
    toValue: string | null;
    note: string | null;
  }[];
  evidencias?: { kind: "image" | "pdf" | "link"; url: string; caption: string }[];
};

export const occurrenceSharesApi = {
  getShare(occurrenceId: string) {
    return request<{ data: OccurrenceShare | null }>({
      method: "GET",
      path: `/occurrences/${occurrenceId}/share`,
    }).then((r) => r.data);
  },

  rotateShare(occurrenceId: string, opts?: { createdBy?: string; sections?: ShareSections }) {
    return request<{ data: OccurrenceShare }>({
      method: "POST",
      path: `/occurrences/${occurrenceId}/share`,
      body: {
        ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
        ...(opts?.sections ? { sections: opts.sections } : {}),
      },
    }).then((r) => r.data);
  },

  patchShare(token: string, patch: { active?: boolean; sections?: ShareSections }) {
    return request<{ data: OccurrenceShare }>({
      method: "PATCH",
      path: `/shares/${token}`,
      body: patch,
    }).then((r) => r.data);
  },

  getPublic(token: string) {
    return request<{ data: PublicOccurrence }>({
      method: "GET",
      path: `/public/occurrences/${token}`,
    }).then((r) => r.data);
  },
};
