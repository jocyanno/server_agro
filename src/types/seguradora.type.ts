export type StatusOcorrencia = 
  | 'EM_ANALISE'
  | 'VISTORIA_AGENDADA'
  | 'VISTORIA_REALIZADA'
  | 'SINISTRO_CONFIRMADO'
  | 'SINISTRO_NAO_CONFIRMADO'
  | 'INDENIZACAO_PAGA'
  | 'ARQUIVADO';

export interface SeguradoraData {
  id?: string;
  numeroOcorrencia?: number;
  dataHoraRegistro: Date;
  tipoEvento: string;
  localizacao: string;
  descricaoInicial: string;
  status?: StatusOcorrencia;
  documentacaoRecebida?: string[];
  vistoriadorResponsavel?: string;
  conclusaoVistoria?: string;
  valorIndenizacao?: number;
}

export interface CreateSeguradoraData {
  dataHoraRegistro: Date;
  tipoEvento: string;
  localizacao: string;
  descricaoInicial: string;
  status?: StatusOcorrencia;
  documentacaoRecebida?: string[];
  vistoriadorResponsavel?: string;
  conclusaoVistoria?: string;
  valorIndenizacao?: number;
}

export interface UpdateSeguradoraData {
  dataHoraRegistro?: Date;
  tipoEvento?: string;
  localizacao?: string;
  descricaoInicial?: string;
  status?: StatusOcorrencia;
  documentacaoRecebida?: string[];
  vistoriadorResponsavel?: string;
  conclusaoVistoria?: string;
  valorIndenizacao?: number;
}

export interface SeguradoraFilters {
  numeroOcorrencia?: number;
  tipoEvento?: string;
  status?: StatusOcorrencia;
  vistoriadorResponsavel?: string;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  limit?: number;
}
