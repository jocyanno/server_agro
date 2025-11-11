import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { CemadenData } from '../types/cemaden-data.type';
import * as XLSX from 'xlsx';
import { parseCemadenDate } from '../utils/parse-date';
import { ChuvasAcumuladas } from '../types/chuvas-acumuladas.type';

export class CemadenService {
  async importData(
    files: AsyncIterableIterator<MultipartFile>,
  ): Promise<string> {
    const dataToInsert: any[] = [];
    for await (const part of files) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();

        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: CemadenData[] = XLSX.utils.sheet_to_json(worksheet);

        for (const row of data) {
          const valorMedidaStr = row['valorMedida'] as string;
          const valorMedida = parseFloat(valorMedidaStr);

          // Validação: valores de chuva devem estar entre 0 e 1000mm
          // Valores muito altos (como timestamps) são considerados inválidos
          if (isNaN(valorMedida) || valorMedida < 0 || valorMedida > 1000) {
            console.warn(
              `Valor de chuva inválido ignorado: ${valorMedidaStr} para estação ${row['codEstacao']}`,
            );
            continue; // Pula este registro
          }

          dataToInsert.push({
            uf: row['uf'] as string,
            codEstacao: row['codEstacao'] as string,
            nomeEstacao: row['nomeEstacao'] as string,
            dataHora: parseCemadenDate(row['datahora'] as string),
            lat: row['latitude'] as string,
            lon: row['longitude'] as string,
            valorMedida: valorMedida,
          });
        }
      }
    }

    await (prisma as any).dadosCemaden.createMany({
      data: dataToInsert.map((item) => ({
        uf: item.uf,
        codEstacao: item.codEstacao,
        nomeEstacao: item.nomeEstacao,
        data: item.dataHora,
        lat: String(item.lat),
        lon: String(item.lon),
        valorMedida: item.valorMedida,
      })),
      skipDuplicates: true,
    });

    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_chuvas_acumuladas;',
    );

    return `Importação concluída com sucesso. Total de registros importados: ${dataToInsert.length}`;
  }

  async getChuvasAcumuladas(
    codEstacao: string,
    dataInicio?: string,
    dataFim?: string,
  ): Promise<ChuvasAcumuladas[]> {
    try {
      console.log(`📊 Buscando chuvas acumuladas para estação ${codEstacao}`);
      console.log(
        `📅 Período: ${dataInicio || 'início dos dados'} até ${
          dataFim || 'agora'
        }`,
      );

      // Primeiro, vamos definir as datas de forma mais robusta
      let startDateValue: string;
      let endDateValue: string;

      if (dataInicio) {
        startDateValue = `'${dataInicio}'::timestamp`;
      } else {
        // Buscar toda a base histórica disponível - data mínima
        console.log('🔍 Buscando data mínima disponível na base...');
        const minDateResult = await prisma.$queryRawUnsafe<
          { min_data: Date }[]
        >(
          `SELECT MIN(data) as min_data FROM dados_cemaden WHERE cod_estacao = $1`,
          codEstacao,
        );
        const minDate = minDateResult[0]?.min_data;
        if (minDate) {
          startDateValue = `'${minDate.toISOString()}'::timestamp`;
          console.log(
            `📅 Data mais antiga encontrada: ${minDate.toLocaleDateString(
              'pt-BR',
            )}`,
          );
        } else {
          console.warn('⚠️ Nenhum dado encontrado para esta estação');
          // Se não há dados, usar data padrão (1 ano atrás)
          const defaultStart = new Date();
          defaultStart.setFullYear(defaultStart.getFullYear() - 1);
          startDateValue = `'${defaultStart.toISOString()}'::timestamp`;
        }
      }

      if (dataFim) {
        endDateValue = `'${dataFim}'::timestamp`;
      } else {
        endDateValue = `now()`;
      }

      // Limitar o período quando não há filtros para evitar timeout
      // Se não há dataInicio, limitar para os últimos 90 dias
      let limitDate = startDateValue;
      if (!dataInicio) {
        const limitDateObj = new Date();
        limitDateObj.setDate(limitDateObj.getDate() - 90);
        limitDate = `'${limitDateObj.toISOString()}'::timestamp`;
        console.log(`⚠️ Sem filtro de data, limitando busca para últimos 90 dias`);
      }

      const query = `
        WITH daily_data AS (
          SELECT 
            cod_estacao,
            date_trunc('day', data) AS data_dia,
            SUM(valor_medida) AS mm_dia
          FROM dados_cemaden
          WHERE cod_estacao = $1
            AND data >= ${limitDate}
            AND data <= ${endDateValue}
            AND valor_medida >= 0 
            AND valor_medida <= 1000
          GROUP BY cod_estacao, date_trunc('day', data)
        ),
        date_series AS (
          SELECT generate_series(
            ${limitDate},
            ${endDateValue},
            '1 day'::interval
          ) AS snapshot_date
        )
        SELECT
          $2 AS cod_estacao,
          ds.snapshot_date AT TIME ZONE 'UTC' AS snapshot_at,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '24 hours' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_24h,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '3 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_3d,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '7 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_7d,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '15 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_15d,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '30 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_30d,
          COALESCE(SUM(dd.mm_dia) FILTER (WHERE dd.data_dia > ds.snapshot_date - INTERVAL '45 days' AND dd.data_dia <= ds.snapshot_date), 0) AS chuva_45d
        FROM date_series ds
        LEFT JOIN daily_data dd ON dd.cod_estacao = $3
        GROUP BY ds.snapshot_date
        ORDER BY ds.snapshot_date DESC
        LIMIT 100
      `;

      const rows = await prisma.$queryRawUnsafe<ChuvasAcumuladas[]>(
        query,
        codEstacao,
        codEstacao,
        codEstacao,
      );

      console.log(`✅ ${rows.length} registros de chuva acumulada encontrados`);

      if (rows.length > 0) {
        const primeiroRegistro = rows[rows.length - 1].snapshot_at;
        const ultimoRegistro = rows[0].snapshot_at;
        const periodoTotal = Math.round(
          (new Date(ultimoRegistro).getTime() -
            new Date(primeiroRegistro).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        console.log(
          `📊 Período total da base: ${new Date(
            primeiroRegistro,
          ).toLocaleDateString('pt-BR')} até ${new Date(
            ultimoRegistro,
          ).toLocaleDateString('pt-BR')} (${periodoTotal} dias)`,
        );
      }

      return rows;
    } catch (error) {
      console.error('❌ Erro ao buscar chuvas acumuladas:', error);
      throw error;
    }
  }

  async cleanCorruptedData(): Promise<string> {
    // Remove registros com valores de chuva inválidos (muito altos, negativos ou NaN)
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM dados_cemaden 
      WHERE valor_medida < 0 
         OR valor_medida > 1000 
         OR valor_medida IS NULL
    `);

    // Atualiza a view materializada
    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_chuvas_acumuladas;',
    );

    return `Limpeza concluída. ${result} registros corrompidos removidos.`;
  }

  async getStationsWithData(): Promise<any[]> {
    try {
      // Importar config para obter estações configuradas
      const { config } = await import('../config/env');
      const configuredStations = config.cemaden.stations.map(s => s.codestacao);
      
      // Criar placeholders para os parâmetros ($1, $2, etc.)
      const placeholders = configuredStations.map((_, index) => `$${index + 1}`).join(', ');

      // Busca estações únicas com seus dados mais recentes da tabela dados_cemaden_stations
      // Faz JOIN com a tabela estacoes para obter o nome
      const stations = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT DISTINCT ON (d.codestacao)
          d.codestacao as codigo,
          COALESCE(e.nome, 'Estação sem nome') as nome,
          d.datahora,
          d.acc1hr,
          d.acc3hr,
          d.acc6hr,
          d.acc12hr,
          d.acc24hr,
          d.acc48hr,
          d.acc72hr,
          d.acc96hr,
          d.acc120hr,
          d.codibge,
          d.id_estacao
        FROM dados_cemaden_stations d
        LEFT JOIN estacoes e ON d.codestacao = e.codestacao
        WHERE d.codestacao IN (${placeholders})
        ORDER BY d.codestacao, d.datahora DESC
      `,
        ...configuredStations
      );

      // Formata os dados no formato esperado pelo frontend
      const formattedStations = stations.map((station) => ({
        station: {
          codigo: station.codigo,
          nome: station.nome || 'Estação sem nome',
          tipo: 1, // Tipo padrão para CEMADEN
        },
        data: station.datahora
          ? {
              datahora: new Date(station.datahora).toISOString(),
              precipitacao: {
                acc1hr: station.acc1hr,
                acc3hr: station.acc3hr,
                acc6hr: station.acc6hr,
                acc12hr: station.acc12hr,
                acc24hr: station.acc24hr,
                acc48hr: station.acc48hr,
                acc72hr: station.acc72hr,
                acc96hr: station.acc96hr,
                acc120hr: station.acc120hr,
              },
              codibge: station.codibge || 0,
              id_estacao: station.id_estacao || 0,
            }
          : null,
      }));

      return formattedStations;
    } catch (error) {
      console.error('❌ Erro ao buscar estações com dados:', error);
      throw error;
    }
  }
}

export const cemadenService = new CemadenService();
