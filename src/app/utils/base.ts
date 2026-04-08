/**
 * Utilitário de resolução de base dos motoristas.
 *
 * O campo `base` pode conter variações como:
 *   "BRASILIA FLIX", "BRASILIA CATEDRAL", "BRASILIA VIP" → todas são BRASILIA → BSB
 *   "SANTA MARIA DA VITORIA" → SMV
 *
 * Estratégia:
 *   1. Normaliza o input (uppercase, remove acentos, remove sufixos de UF)
 *   2. Tenta match exato no mapa
 *   3. Tenta match por prefixo (entrada começa com algum nome canônico)
 *   4. Fallback: retorna null (BaseChip usa abreviação automática)
 */

/** Mapa: nome canônico da cidade (sem UF) → sigla */
const BASE_SIGLA_MAP: Record<string, string> = {
  "TAGUATINGA": "TAG",
  "BRASILIA": "BSB",
  "CRISTALINA": "CRT",
  "ITACARAMBI": "IRB",
  "JANUARIA": "JNU",
  "JAPONVAR": "JPOR",
  "JOAO PINHEIRO": "JPI",
  "LONTRA": "LONT",
  "LUZIANIA": "LZA",
  "MIRABELA": "MIB",
  "MONTES CLAROS": "MOCC",
  "PARACATU": "PTU",
  "PEDRAS DE MARIA DA CRUZ": "PEMC",
  "PIRAPORA": "PRR",
  "LIMEIRA": "LRA",
  "VALPARAISO DE GOIAS": "VPIO",
  "GOIANIA": "GYN",
  "SAO PAULO": "SAO",
  "OSASCO": "OCO",
  "CAMPINAS": "CPQ",
  "AMERICANA": "AMC",
  "ARARAS": "ARS",
  "RIBEIRAO PRETO": "RIB",
  "UBERABA": "URA",
  "UBERLANDIA": "UDI",
  "ARAGUARI": "ARA",
  "CALDAS NOVAS": "CLV",
  "TRINDADE": "TDA",
  "ANAPOLIS": "ANS",
  "SOBRADINHO": "SOBD",
  "PLANALTINA": "PLAA",
  "FORMOSA": "FRM",
  "ALVORADA DO NORTE": "AVN",
  "LUIS EDUARDO MAGALHAES": "MIOO",
  "BARREIRAS": "BES",
  "IBOTIRAMA": "IBM",
  "SEABRA": "SEB",
  "ITABERABA": "IEB",
  "FEIRA DE SANTANA": "FST",
  "SALVADOR": "SSA",
  "ESTANCIA": "EST",
  "ARACAJU": "AJU",
  "PROPRIA": "PPI",
  "SAO MIGUEL DOS CAMPOS": "SMM",
  "ARAPIRACA": "AIR",
  "MACEIO": "MCZ",
  "PALMARES": "PLS",
  "CABO DE SANTO AGOSTINHO": "CBO",
  "AGRESTINA": "AGE",
  "PANELAS": "PES",
  "CARUARU": "CAUA",
  "RECIFE": "REC",
  "GOIANA": "GOI",
  "JOAO PESSOA": "JPA",
  "CANGUARETAMA": "CGM",
  "GOIANINHA": "GOH",
  "NATAL": "NAT",
  "PATOS DE MINAS": "PMS",
  "FRANCISCO SA": "FCS",
  "SALINAS": "SLN",
  "CANDIDO SALES": "CDS",
  "VITORIA DA CONQUISTA": "VQT",
  "POCOES": "PCS",
  "JEQUIE": "JEQ",
  "JAGUAQUARA": "JGQ",
  "MILAGRES": "MLG",
  "SANTO ESTEVAO": "SEV",
  "BOM JESUS DA LAPA": "BJL",
  "MORRO DO CHAPEU": "MHU",
  "PIRITIBA": "PRI",
  "UTINGA": "UTG",
  "CAFARNAUM": "CFM",
  "CAPIM GROSSO": "CCG",
  "MIGUEL CALMON": "MGN",
  "JACOBINA": "JBN",
  "SENHOR DO BONFIM": "SBM",
  "JUAZEIRO": "JUO",
  "PETROLINA": "PNZ",
  "CABROBO": "COO",
  "SALGUEIRO": "SGI",
  "OURICURI": "OUI",
  "LAGOA GRANDE": "LAGD",
  "ARARIPINA": "ARRP",
  "CRATO": "CTO",
  "BREJO SANTO": "BJS",
  "BARBALHA": "BBH",
  "JUAZEIRO DO NORTE": "JDO",
  "ICO": "ICO",
  "LAVRAS DA MANGABEIRA": "LVM",
  "MISSAO VELHA": "MAH",
  "BARRO": "BARR",
  "AURORA": "AURO",
  "CAJAZEIRAS": "CZS",
  "PAU DOS FERROS": "PFR",
  "APODI": "APD",
  "MOSSORO": "MVF",
  "JARAGUA": "JRG",
  "RIALMA": "RMA",
  "URUACU": "URC",
  "CAMPINORTE": "CNO",
  "PORANGATU": "PGT",
  "GURUPI": "GUR",
  "ALIANCA DO TOCANTINS": "ANZ",
  "PARAISO DO TOCANTINS": "PIT",
  "PORTO NACIONAL": "PNL",
  "TAQUARALTO": "TQRT",
  "PALMAS": "PMA",
  "AGUAS LINDAS DE GOIAS": "ASLS",
  "CORRENTINA": "CRR",
  "SANTA MARIA DA VITORIA": "SMV",
  "SANTANA": "SNT",
  "SERRA DOURADA": "SDW",
  "TABOCAS DO BREJO VELHO": "TBV",
  "JABORANDI": "JBI",
  "CORIBE": "CYB",
  "COCOS": "COX",
  "FORMOSA DO RIO PRETO": "FRP",
  "RIACHAO DAS NEVES": "RIA",
  "CORRENTE": "COR",
  "GILBUES": "GLU",
  "REDENCAO DO GURGUEIA": "REDG",
  "BOM JESUS": "BOM",
  "CRISTINO CASTRO": "CYT",
  "ELISEU MARTINS": "ELS",
  "CANTO DO BURITI": "CII",
  "ITAUEIRA": "IUY",
  "FLORIANO": "FLOO",
  "AMARANTE": "ANT",
  "REGENERACAO": "RGE",
  "AGUA BRANCA": "ABA",
  "TERESINA": "THE",
  "ARACATI": "ACA",
  "FORTALEZA": "FOR",
  "CATALAO": "CTL",
  "BEZERROS": "BEZ",
  "GRAVATA": "GVT",
  "BERTOLINIA": "BTL",
  "JERUMENHA": "JNH",
  "JUNDIAI": "JUN",
  "SANTO ANDRE": "SAD",
  "SAO BERNARDO DO CAMPO": "SBE",
  "SAO CAETANO DO SUL": "SCN",
  "PATROCINIO": "PTC",
  "ALVORADA": "AVO",
  "PIRASSUNUNGA": "PAG",
  "LEME": "LME",
  "APARECIDA DE GOIANIA": "ACG",
  "BELO HORIZONTE": "BHZ",
  "CURVELO": "CUV",
  "SETE LAGOAS": "SLA",
  "TRES MARIAS": "TMS",
  "ALAGOINHAS": "ALA",
  "ALEM PARAIBA": "API",
  "ALEXANIA": "ALX",
  "APARECIDA": "ADA",
  "ARACI": "AAC",
  "BARRA MANSA": "BMA",
  "BETIM": "BET",
  "BRAGANCA PAULISTA": "BGP",
  "CACAPAVA": "CPV",
  "CACHOEIRA PAULISTA": "CHP",
  "CAICO": "CIC",
  "CAMACARI": "CAR",
  "CAMANDUCAIA": "CDU",
  "CAMBUI": "CBI",
  "CARATINGA": "CGA",
  "CORONEL FABRICIANO": "CRF",
  "CURRAIS NOVOS": "CSS",
  "ENTRE RIOS": "ETR",
  "ESPLANADA": "ESP",
  "ESTIVA": "ESV",
  "EUCLIDES DA CUNHA": "ECN",
  "EXTREMA": "EXM",
  "GOVERNADOR VALADARES": "GVS",
  "GUARATINGUETA": "GTA",
  "IBIPEBA": "IBB",
  "IGARAPAVA": "IGA",
  "IGARASSU": "ISS",
  "INHAPIM": "INP",
  "IPATINGA": "IIG",
  "IRECE": "IRE",
  "ITABORAI": "IOY",
  "ITAOBIM": "IOM",
  "ITATIM": "ITF",
  "ITUMBIARA": "ITM",
  "ITUVERAVA": "ITV",
  "JOAO MONLEVADE": "JML",
  "LAJE": "LAJ",
  "LAURO DE FREITAS": "LFS",
  "LEOPOLDINA": "LPD",
  "LORENA": "LNA",
  "MACAIBA": "MCI",
  "MACURURE": "MUX",
  "MAIRIPORA": "MARI",
  "MAMANGUAPE": "MME",
  "MANOEL VITORINO": "MNV",
  "MEDINA": "MDA",
  "MIRADOURO": "MDO",
  "MORRINHOS": "MOR",
  "MURIAE": "MRE",
  "MURICI": "MRI",
  "NITEROI": "NRI",
  "NOSSA SENHORA DO SOCORRO": "NRO",
  "NOVA FRIBURGO": "NOF",
  "NOVA IGUACU": "NIU",
  "OLIVEIRA": "OLV",
  "PADRE PARAISO": "PDP",
  "PARNAMIRIM": "PWM",
  "PERDOES": "PDS",
  "PLANALTO": "PLT",
  "POJUCA": "PJC",
  "POMBAL": "PBL",
  "POMBOS": "POB",
  "PONTO DOS VOLANTES": "POVS",
  "PORTO FERREIRA": "PTF",
  "POSSE": "PSX",
  "POUSO ALEGRE": "PSA",
  "RECIFE": "REC",
  "RESENDE": "RES",
  "RIO DE JANEIRO": "RIO",
  "SANTA BARBARA": "SNB",
  "SANTA CRUZ": "SNZ",
  "SAO GONCALO": "SGO",
  "SAO JOAQUIM DA BARRA": "SJB",
  "SAO JOSE DOS CAMPOS": "SJK",
  "SERRINHA": "SEH",
  "SOUSA": "SZA",
  "TANGARA": "TNG",
  "TAUBATE": "TAU",
  "TEODORO SAMPAIO": "TDS",
  "TEOFILO OTONI": "TOT",
  "TRES CORACOES": "TCS",
  "TUCANO": "TCN",
  "TUPACIGUARA": "TPC",
  "UNIAO DOS PALMARES": "UPS",
  "VITORIA DE SANTO ANTAO": "VSA",
  "CAMPO FORMOSO": "CFS",
  "PARNAIBA": "PHB",
  "PIRIPIRI": "PIP",
  "CAMPO MAIOR": "CRA",
  "ALTOS": "ATS",
  "PIRENOPOLIS": "PIRI",
  "BREJOES": "BRE",
  "CAMPANHA": "CAMP",
  "CAMPO LIMPO DE GOIAS": "CLPG",
  "GOIANESIA": "GOIA",
  "IBITIARA": "IBTA",
  "PARANAIBA": "PARN",
};

// Palavras que indicam variação/sufixo de base — ignoradas na normalização
const NOISE_WORDS = new Set([
  "FLIX", "CATEDRAL", "VIP", "EXPRESSO", "EXECUTIVO", "PREMIUM",
  "PLUS", "LEITO", "SEMILEITO", "CONVENCIONAL", "ECONOMICO",
  "GARAGEM", "RODOVIARIA", "POSTO", "CHURRASCARIA", "RESTAURANTE",
]);

/**
 * Remove acentos e normaliza para uppercase.
 * "Brasília" → "BRASILIA"
 */
function normalize(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Remove o sufixo de UF (" - DF", " - BA", etc.) e palavras de ruído.
 * "BRASILIA - DF" → "BRASILIA"
 * "BRASILIA FLIX" → "BRASILIA"
 * "SALVADOR BA" → "SALVADOR"
 */
function stripNoise(normalized: string): string {
  // Remove " - UF" (ex: " - DF", " - BA")
  let s = normalized.replace(/\s*-\s*[A-Z]{2}$/, "").trim();

  // Remove palavras de ruído do final
  const words = s.split(/\s+/);
  while (words.length > 0 && NOISE_WORDS.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(" ").trim();
}

/**
 * Resolve a sigla a partir do nome da base.
 * Retorna a sigla (ex: "BSB") ou null se não encontrada.
 */
export function resolveBaseSigla(rawBase: string): string | null {
  if (!rawBase) return null;

  const norm = normalize(rawBase);
  const stripped = stripNoise(norm);

  // 1. Match exato após strip
  if (BASE_SIGLA_MAP[stripped]) return BASE_SIGLA_MAP[stripped];

  // 2. Match exato sem strip (caso a string já seja uma sigla/código)
  if (BASE_SIGLA_MAP[norm]) return BASE_SIGLA_MAP[norm];

  // 3. Match por prefixo: entrada começa com alguma chave do mapa
  //    Ordena por tamanho desc para priorizar matches mais específicos
  const keys = Object.keys(BASE_SIGLA_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (stripped.startsWith(key) || norm.startsWith(key)) {
      return BASE_SIGLA_MAP[key];
    }
  }

  return null;
}

/**
 * Retorna a chave canônica para fins de hashing de cor (consistente mesmo com variações).
 * "BRASILIA FLIX" → "BRASILIA" → mesma cor que "BRASILIA CATEDRAL"
 */
export function getBaseCanonicalKey(rawBase: string): string {
  if (!rawBase) return "";
  const norm = normalize(rawBase);
  const stripped = stripNoise(norm);

  const keys = Object.keys(BASE_SIGLA_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (stripped.startsWith(key) || norm.startsWith(key)) return key;
  }

  return stripped || norm;
}
