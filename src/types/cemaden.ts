export interface CemadenAuthResponse {
  token: string;
}

export interface CemadenDataRecord {
  acc120hr: number;
  acc12hr: number;
  acc1hr: number;
  acc24hr: number;
  acc3hr: number;
  acc48hr: number;
  acc6hr: number;
  acc72hr: number;
  acc96hr: number;
  codestacao: string;
  codibge: number;
  datahora: string;
  id_estacao: number;
}

export interface EstacaoRecord {
  codestacao: string;
  id_tipoestacao: number;
  nome: string;
}

export interface CemadenLoginCredentials {
  email: string;
  password: string;
}
