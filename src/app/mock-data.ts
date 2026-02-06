import { Viagem, Ocorrencia } from './types';

export const VIAGENS_MOCK: Viagem[] = [
  {
    id: '1',
    linha: '1001',
    prefixo: 'SSA-1234',
    horario: '06:00',
    origem: 'Salvador',
    destino: 'Feira de Santana',
    motorista1: {
      matricula: '5348',
      nome: 'MANOEL MACEDO JUNIOR',
      base: 'SSA'
    },
    motorista2: {
      matricula: '6721',
      nome: 'CARLOS ALBERTO SANTOS',
      base: 'SSA'
    }
  },
  {
    id: '2',
    linha: '2045',
    prefixo: 'MOCC-5678',
    horario: '08:30',
    origem: 'Mogi das Cruzes',
    destino: 'São Paulo',
    motorista1: {
      matricula: '4521',
      nome: 'JOSE SILVA OLIVEIRA',
      base: 'MOCC'
    }
  },
  {
    id: '3',
    linha: '3012',
    prefixo: 'SSA-9012',
    horario: '10:15',
    origem: 'Aracaju',
    destino: 'Salvador',
    motorista1: {
      matricula: '7823',
      nome: 'ANTONIO PEREIRA LIMA',
      base: 'SSA'
    }
  },
  {
    id: '4',
    linha: '1505',
    prefixo: 'MOCC-3456',
    horario: '14:00',
    origem: 'Campinas',
    destino: 'Mogi das Cruzes',
    motorista1: {
      matricula: '2134',
      nome: 'FERNANDO COSTA RODRIGUES',
      base: 'MOCC'
    },
    motorista2: {
      matricula: '8965',
      nome: 'RICARDO SOUZA MENDES',
      base: 'MOCC'
    }
  }
];

export const OCORRENCIAS_MOCK: Ocorrencia[] = [
  {
    id: '1',
    viagem: VIAGENS_MOCK[0],
    motorista1: VIAGENS_MOCK[0].motorista1,
    motorista2: VIAGENS_MOCK[0].motorista2,
    dataEvento: '2026-02-04',
    horarioInicial: '07:30',
    horarioFinal: '08:15',
    localParada: 'KM 45 BR-324',
    evidencias: [],
    createdAt: '2026-02-04T07:30:00'
  },
  {
    id: '2',
    viagem: VIAGENS_MOCK[1],
    motorista1: VIAGENS_MOCK[1].motorista1,
    dataEvento: '2026-02-04',
    horarioInicial: '09:00',
    horarioFinal: '09:45',
    localParada: 'Posto Graal - Rodovia Ayrton Senna',
    evidencias: [],
    createdAt: '2026-02-04T09:00:00'
  }
];
