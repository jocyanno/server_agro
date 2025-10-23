export enum StatusInicialAgro {
  EM_ANALISE = 'EM_ANALISE',
  VISTORIA_AGENDADA = 'VISTORIA_AGENDADA',
  VISTORIA_REALIZADA = 'VISTORIA_REALIZADA',
}

export enum StatusFinalAgro {
  SINISTRO_CONFIRMADO = 'SINISTRO_CONFIRMADO',
  NAO_COBERTO = 'NAO_COBERTO',
  INDENIZACAO_PAGA = 'INDENIZACAO_PAGA',
  ARQUIVADO = 'ARQUIVADO',
}

export enum EventoClimatico {
  EXCESSO_CHUVA = 'EXCESSO_CHUVA',
  SECA = 'SECA',
  GRANIZO = 'GRANIZO',
  GEADA = 'GEADA',
  VENDAVAL = 'VENDAVAL',
  INCENDIO = 'INCENDIO',
  PRAGA = 'PRAGA',
  DOENCA = 'DOENCA',
}

export interface OcorrenciaAgricolaData {
  id?: string;
  numeroOcorrencia?: number;
  produtor: string;
  codigoPropriedade: string;
  culturaAfetada: string;
  areaPlantada: number;
  eventoClimatico: EventoClimatico;
  dataInicioEvento: Date;
  dataFimEvento?: Date;
  descricaoDano: string;
  percentualPerda: number;
  statusInicial: StatusInicialAgro;
  statusFinal?: StatusFinalAgro;
  valorEstimadoPerda: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOcorrenciaAgricolaData {
  produtor: string;
  codigoPropriedade: string;
  culturaAfetada: string;
  areaPlantada: number;
  eventoClimatico: EventoClimatico;
  dataInicioEvento: Date;
  dataFimEvento?: Date;
  descricaoDano: string;
  percentualPerda: number;
  statusInicial?: StatusInicialAgro;
  statusFinal?: StatusFinalAgro;
  valorEstimadoPerda: number;
}

export interface UpdateOcorrenciaAgricolaData {
  produtor?: string;
  codigoPropriedade?: string;
  culturaAfetada?: string;
  areaPlantada?: number;
  eventoClimatico?: EventoClimatico;
  dataInicioEvento?: Date;
  dataFimEvento?: Date;
  descricaoDano?: string;
  percentualPerda?: number;
  statusInicial?: StatusInicialAgro;
  statusFinal?: StatusFinalAgro;
  valorEstimadoPerda?: number;
}

export interface OcorrenciaAgricolaFilters {
  numeroOcorrencia?: number;
  produtor?: string;
  culturaAfetada?: string;
  eventoClimatico?: EventoClimatico;
  statusInicial?: StatusInicialAgro;
  statusFinal?: StatusFinalAgro;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  limit?: number;
}

export interface OcorrenciaAgricolaStats {
  total: number;
  porStatusInicial: Record<string, number>;
  porStatusFinal: Record<string, number>;
  porEventoClimatico: Record<string, number>;
  valorTotalPerdas: number;
  areaAfetadaTotal: number;
}
