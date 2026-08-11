// Fotos de banner por base do motorista (perfil disciplinar). Curadoria
// manual — só as bases com mais motoristas/ocorrências têm foto real (ver
// ranking em getDashboardSummary); o resto cai no gradiente padrão.
//
// Fonte: Wikimedia Commons (licença livre — ver a página de cada arquivo
// pra atribuição se for reusar em outro lugar). URLs de thumbnail (1920px,
// pra ficar nítido em telas retina) obtidas via API do Commons
// (imageinfo?iiurlwidth=1920), não construídas à mão: o servidor só aceita
// um conjunto fixo de larguras pré-geradas por arquivo — pedir uma largura
// fora desse conjunto retorna 400. Fotos de origem em baixa resolução
// (ex.: menor que 1920px de largura) voltam no tamanho original mesmo.

// `base` no banco vem sujo: espaços sobrando, acentos inconsistentes,
// maiúscula/minúscula misturada, e às vezes sub-bases ("MACEIO CATEDRAL",
// "MONTES CLAROS CARVALHO") que na prática são a mesma cidade.
function normalizeBaseKey(base: string): string {
  const stripped = base
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos

  // Sub-bases/variações conhecidas que devem cair na cidade principal.
  const ALIASES: Record<string, string> = {
    "MACEIO CATEDRAL": "MACEIO",
    "SALVADOR FLIX": "SALVADOR",
    "MONTES CLAROS CARVALHO": "MONTES CLAROS",
  };
  if (ALIASES[stripped]) return ALIASES[stripped];

  return stripped;
}

const BASE_IMAGES: Record<string, string> = {
  // Vista aérea do Farol da Barra — a foto anterior (mesmo farol) era quase
  // quadrada e só 1080px de largura; essa é panorâmica e 4686px de origem.
  SALVADOR:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Forte_de_Santo_Ant%C3%B4nio--Farol_da_Barra_Salvador_Bahia_Vista_A%C3%A9rea_2021-0149.jpg/1920px-Forte_de_Santo_Ant%C3%B4nio--Farol_da_Barra_Salvador_Bahia_Vista_A%C3%A9rea_2021-0149.jpg",
  BRASILIA:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/O_Senado_e_o_C%C3%A9u_de_Bras%C3%ADlia.jpg/1920px-O_Senado_e_o_C%C3%A9u_de_Bras%C3%ADlia.jpg",
  GOIANIA:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Goi%C3%A2nia2006.jpg/1920px-Goi%C3%A2nia2006.jpg",
  // Panorâmica diurna do skyline, 13872px de origem. Já tentei uma
  // panorâmica noturna antes — combinada com o overlay escuro do banner
  // (necessário pra legibilidade do texto), a foto sumia quase toda em
  // preto. Evitar fotos noturnas aqui por causa disso.
  "SAO PAULO":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Panoramic_view_of_S%C3%A3o_Paulo_City.jpg/1920px-Panoramic_view_of_S%C3%A3o_Paulo_City.jpg",
  NATAL:
    "https://upload.wikimedia.org/wikipedia/commons/6/63/Ponte_Newton_Navarro_-_Natal%2C_Brazil.jpg",
  "FEIRA DE SANTANA":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Urban_landscapes_of_Feira_de_Santana_01.jpg/1920px-Urban_landscapes_of_Feira_de_Santana_01.jpg",
  JUAZEIRO:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Porto_fluvial_de_Juazeiro_-_Bahia_%28Rio_S%C3%A3o_Francisco%29.jpg/1920px-Porto_fluvial_de_Juazeiro_-_Bahia_%28Rio_S%C3%A3o_Francisco%29.jpg",
  RECIFE:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Skyline_do_Bairro_Boa_Viagem_Recife_Pernambuco_Brasil.jpg/1920px-Skyline_do_Bairro_Boa_Viagem_Recife_Pernambuco_Brasil.jpg",
  "BELO HORIZONTE":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2014_-_Belo_Horionte_MG.jpg/1920px-2014_-_Belo_Horionte_MG.jpg",
  MACEIO:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Praia_de_Paju%C3%A7ara_-_Macei%C3%B3_-_Alagoas_%2813125463894%29.jpg/1920px-Praia_de_Paju%C3%A7ara_-_Macei%C3%B3_-_Alagoas_%2813125463894%29.jpg",
};

// "MONTES CLAROS" (a 4ª base com mais ocorrências) ainda não tem foto boa
// encontrada no Commons — cai no gradiente padrão por enquanto. Não vale a
// pena usar foto de outra cidade só pra preencher.

export function getBaseBannerImage(base: string | null | undefined): string | null {
  if (!base) return null;
  return BASE_IMAGES[normalizeBaseKey(base)] ?? null;
}
