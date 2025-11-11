import { prisma } from '../lib/prisma';

interface RainfallData {
  totalRecords: number;
  average24h: number;
  max24h: number;
  stations: string[];
}

interface OccurrencesData {
  totalRecords: number;
  byType: Record<string, number>;
  byBairro: Record<string, number>;
  byDate: Record<string, number>;
}

interface Correlations {
  rainfallOccurrenceCorrelation: number;
  highRainfallDays: number;
  occurrenceSpikes: number;
}

interface AnalysisResult {
  analysis: {
    period: {
      start: string;
      end: string;
    };
    rainfallData: RainfallData;
    occurrencesData: OccurrencesData;
    correlations: Correlations;
  };
  insights: string[];
  recommendations: string[];
}

interface QuickStats {
  rainfall: {
    average24h: number;
    max24h: number;
    totalRecords: number;
  };
  occurrences: {
    total: number;
    topType: [string, number];
    topBairro: [string, number];
  };
  correlation: number;
}

export class AIService {
  async analyzeData(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<AnalysisResult> {
    console.log('Iniciando análise inteligente de dados...');

    const startDate = dataInicio
      ? new Date(dataInicio)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = dataFim ? new Date(dataFim) : new Date();

    const rainfallData = await this.getRainfallData(startDate, endDate);
    const occurrencesData = await this.getOccurrencesData(startDate, endDate);
    const correlations = await this.calculateCorrelations(
      startDate,
      endDate,
      rainfallData,
      occurrencesData,
    );
    const insights = this.generateInsights(
      rainfallData,
      occurrencesData,
      correlations,
    );
    const recommendations = this.generateRecommendations(
      rainfallData,
      occurrencesData,
      correlations,
    );

      return {
        analysis: {
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
          rainfallData,
          occurrencesData: {
            ...occurrencesData,
            totalCount: occurrencesData.totalRecords,
          },
          correlations,
        },
        insights,
        recommendations,
      };
  }

  async getQuickStats(): Promise<QuickStats> {
    console.log('Obtendo estatísticas rápidas...');

    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const rainfallData = await this.getRainfallData(startDate, endDate);
    const occurrencesData = await this.getOccurrencesData(startDate, endDate);
    const correlations = await this.calculateCorrelations(
      startDate,
      endDate,
      rainfallData,
      occurrencesData,
    );

    const topType = Object.entries(occurrencesData.byType).sort(
      ([, a], [, b]) => b - a,
    )[0] || ['N/A', 0];

    const topBairro = Object.entries(occurrencesData.byBairro).sort(
      ([, a], [, b]) => b - a,
    )[0] || ['N/A', 0];

    return {
      rainfall: {
        average24h: rainfallData.average24h,
        max24h: rainfallData.max24h,
        totalRecords: rainfallData.totalRecords,
      },
      occurrences: {
        total: occurrencesData.totalRecords,
        topType: topType as [string, number],
        topBairro: topBairro as [string, number],
      },
      correlation: correlations.rainfallOccurrenceCorrelation,
    };
  }

  private detectTimePeriod(question: string): { start: Date; end: Date } | null {
    const questionLower = question.toLowerCase().trim();
    const now = new Date();
    const endDate = new Date(now);

    if (
      questionLower.includes('últimos dias') ||
      questionLower.includes('ultimos dias') ||
      questionLower.includes('últimas dias') ||
      questionLower.includes('recentes')
    ) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      return { start: startDate, end: endDate };
    }

    if (
      questionLower.includes('última semana') ||
      questionLower.includes('ultima semana') ||
      questionLower.includes('semana passada')
    ) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      return { start: startDate, end: endDate };
    }

    if (
      questionLower.includes('último mês') ||
      questionLower.includes('ultimo mes') ||
      questionLower.includes('últimos 30 dias') ||
      questionLower.includes('ultimos 30 dias')
    ) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      return { start: startDate, end: endDate };
    }

    if (
      questionLower.includes('últimos 3 dias') ||
      questionLower.includes('ultimos 3 dias')
    ) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 3);
      return { start: startDate, end: endDate };
    }

    if (
      questionLower.includes('hoje') ||
      questionLower.includes('dia de hoje')
    ) {
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      return { start: startDate, end: endDate };
    }

    if (
      questionLower.includes('ontem') ||
      questionLower.includes('dia anterior')
    ) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(startDate);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { start: startDate, end: yesterdayEnd };
    }

    return null;
  }

  async processQuestion(
    question: string,
    period?: { start: string; end: string },
  ): Promise<string> {
    console.log('Processando pergunta:', question);

    const questionLower = question.toLowerCase().trim();
    const detectedPeriod = this.detectTimePeriod(question);

    let startDate: Date;
    let endDate: Date;

    if (detectedPeriod) {
      startDate = detectedPeriod.start;
      endDate = detectedPeriod.end;
      console.log(
        `Período detectado da pergunta: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`,
      );
    } else {
      startDate = period?.start
        ? new Date(period.start)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      endDate = period?.end ? new Date(period.end) : new Date();
    }

    const rainfallData = await this.getRainfallData(startDate, endDate);
    const occurrencesData = await this.getOccurrencesData(startDate, endDate);
    const correlations = await this.calculateCorrelations(
      startDate,
      endDate,
      rainfallData,
      occurrencesData,
    );
    if (
      questionLower.includes('recomendação') ||
      questionLower.includes('sugestão') ||
      questionLower.includes('devo fazer') ||
      questionLower.includes('o que fazer')
    ) {
      const recommendations = this.generateRecommendations(
        rainfallData,
        occurrencesData,
        correlations,
      );
      return this.formatRecommendations(recommendations);
    }

    if (
      questionLower.includes('insight') ||
      questionLower.includes('análise') ||
      questionLower.includes('padrão') ||
      questionLower.includes('conclusão')
    ) {
      const insights = this.generateInsights(
        rainfallData,
        occurrencesData,
        correlations,
      );
      return this.formatInsights(insights);
    }

    if (
      questionLower.includes('correlação') ||
      questionLower.includes('relação') ||
      questionLower.includes('relaciona') ||
      questionLower.includes('associação')
    ) {
      return this.answerCorrelationQuestion(
        questionLower,
        correlations,
        rainfallData,
        occurrencesData,
      );
    }

    if (
      questionLower.includes('precipitação') ||
      questionLower.includes('chuva') ||
      questionLower.includes('choveu') ||
      questionLower.includes('pluviométrico')
    ) {
      return this.answerRainfallQuestion(
        questionLower,
        rainfallData,
        startDate,
        endDate,
      );
    }

    if (
      questionLower.includes('deslizamento') ||
      questionLower.includes('ocorrência') ||
      questionLower.includes('acidente') ||
      questionLower.includes('evento')
    ) {
      return this.answerOccurrenceQuestion(
        questionLower,
        occurrencesData,
        startDate,
        endDate,
      );
    }

    if (
      questionLower.includes('estatística') ||
      questionLower.includes('resumo') ||
      questionLower.includes('dados') ||
      questionLower.includes('geral')
    ) {
      return this.answerSummaryQuestion(
        rainfallData,
        occurrencesData,
        correlations,
        startDate,
        endDate,
      );
    }

    return this.generateGeneralAnswer(
      rainfallData,
      occurrencesData,
      correlations,
      startDate,
      endDate,
    );
  }

  private async getRainfallData(
    startDate: Date,
    endDate: Date,
  ): Promise<RainfallData> {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{
        total_records: bigint;
        avg_24h: number;
        max_24h: number;
        stations: string[];
      }>>(`
        SELECT 
          COUNT(*)::bigint as total_records,
          COALESCE(AVG(valor_medida), 0) as avg_24h,
          COALESCE(MAX(valor_medida), 0) as max_24h,
          ARRAY_AGG(DISTINCT cod_estacao) FILTER (WHERE cod_estacao IS NOT NULL) as stations
        FROM dados_cemaden
        WHERE data >= $1::timestamp AND data <= $2::timestamp
      `, startDate.toISOString(), endDate.toISOString());

      const data = result[0] || {
        total_records: BigInt(0),
        avg_24h: 0,
        max_24h: 0,
        stations: [],
      };

      return {
        totalRecords: Number(data.total_records),
        average24h: Number(data.avg_24h) || 0,
        max24h: Number(data.max_24h) || 0,
        stations: (data.stations || []).filter(Boolean),
      };
    } catch (error) {
      console.error('Erro ao buscar dados de chuva:', error);
      return {
        totalRecords: 0,
        average24h: 0,
        max24h: 0,
        stations: [],
      };
    }
  }

  private async getOccurrencesData(
    startDate: Date,
    endDate: Date,
  ): Promise<OccurrencesData> {
    try {
      const ocorrencias = await (prisma as any).ocorrenciaAgricola.findMany({
        where: {
          dataInicioEvento: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const seguradoras = await prisma.seguradora.findMany({
        where: {
          dataHoraRegistro: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalRecords = ocorrencias.length + seguradoras.length;

      const byType: Record<string, number> = {};
      ocorrencias.forEach((oc: any) => {
        const tipo = oc.eventoClimatico || 'Não especificado';
        byType[tipo] = (byType[tipo] || 0) + 1;
      });
      seguradoras.forEach((seg: any) => {
        const tipo = seg.tipoEvento || 'Deslizamento';
        byType[tipo] = (byType[tipo] || 0) + 1;
      });

      const byBairro: Record<string, number> = {};
      seguradoras.forEach((seg: any) => {
        const localizacao = seg.localizacao || 'Não informado';
        byBairro[localizacao] = (byBairro[localizacao] || 0) + 1;
      });
      ocorrencias.forEach((oc: any) => {
        if (oc.codigoPropriedade) {
          const localizacao = `Propriedade ${oc.codigoPropriedade}`;
          byBairro[localizacao] = (byBairro[localizacao] || 0) + 1;
        }
      });

      const byDate: Record<string, number> = {};
      [...ocorrencias, ...seguradoras].forEach((item: any) => {
        const date = new Date(
          item.dataInicioEvento || item.dataHoraRegistro,
        )
          .toISOString()
          .split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      });

      return {
        totalRecords,
        byType,
        byBairro,
        byDate,
      };
    } catch (error) {
      console.error('Erro ao buscar dados de ocorrências:', error);
      return {
        totalRecords: 0,
        byType: {},
        byBairro: {},
        byDate: {},
      };
    }
  }

  private async calculateCorrelations(
    startDate: Date,
    endDate: Date,
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
  ): Promise<Correlations> {
    try {
      const dailyRainfall = await prisma.$queryRawUnsafe<Array<{
        date: Date;
        total_rainfall: number;
      }>>(`
        SELECT 
          date_trunc('day', data)::date as date,
          SUM(valor_medida) as total_rainfall
        FROM dados_cemaden
        WHERE data >= $1::timestamp AND data <= $2::timestamp
        GROUP BY date_trunc('day', data)
        ORDER BY date
      `, startDate.toISOString(), endDate.toISOString());

      const rainfallByDate: Record<string, number> = {};
      dailyRainfall.forEach((row) => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        rainfallByDate[dateStr] = Number(row.total_rainfall) || 0;
      });

      let correlation = 0;
      let highRainfallDays = 0;
      let occurrenceSpikes = 0;

      if (Object.keys(rainfallByDate).length > 0 && occurrencesData.byDate) {
        const dates = new Set([
          ...Object.keys(rainfallByDate),
          ...Object.keys(occurrencesData.byDate),
        ]);

        const rainfallValues: number[] = [];
        const occurrenceValues: number[] = [];

        dates.forEach((date) => {
          const rain = rainfallByDate[date] || 0;
          const occ = occurrencesData.byDate[date] || 0;

          rainfallValues.push(rain);
          occurrenceValues.push(occ);

          if (rain > 50) {
            highRainfallDays++;
          }
          if (occ > 2) {
            occurrenceSpikes++;
          }
        });

        if (rainfallValues.length > 1) {
          correlation = this.calculatePearsonCorrelation(
            rainfallValues,
            occurrenceValues,
          );
        }
      }

      return {
        rainfallOccurrenceCorrelation: correlation,
        highRainfallDays,
        occurrenceSpikes,
      };
    } catch (error) {
      console.error('Erro ao calcular correlações:', error);
      return {
        rainfallOccurrenceCorrelation: 0,
        highRainfallDays: 0,
        occurrenceSpikes: 0,
      };
    }
  }

  private calculatePearsonCorrelation(
    x: number[],
    y: number[],
  ): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    if (denominator === 0) return 0;

    return Math.max(-1, Math.min(1, numerator / denominator));
  }

  private generateInsights(
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
    correlations: Correlations,
  ): string[] {
    const insights: string[] = [];

    if (correlations.rainfallOccurrenceCorrelation > 0.5) {
      insights.push(
        `Forte correlação positiva (${(correlations.rainfallOccurrenceCorrelation * 100).toFixed(1)}%) entre precipitação e ocorrências de deslizamentos, indicando que períodos de chuva intensa estão associados a mais eventos.`,
      );
    } else if (correlations.rainfallOccurrenceCorrelation > 0.3) {
      insights.push(
        `Correlação moderada (${(correlations.rainfallOccurrenceCorrelation * 100).toFixed(1)}%) entre chuva e deslizamentos, sugerindo influência parcial dos eventos climáticos.`,
      );
    } else {
      insights.push(
        `Correlação fraca (${(correlations.rainfallOccurrenceCorrelation * 100).toFixed(1)}%) entre precipitação e deslizamentos, indicando que outros fatores podem ser mais relevantes.`,
      );
    }

    if (rainfallData.max24h > 100) {
      insights.push(
        `Registrado pico de precipitação de ${rainfallData.max24h.toFixed(1)}mm em 24h, valor considerado muito alto e potencialmente perigoso.`,
      );
    }

    if (occurrencesData.totalRecords > 0) {
      const topType = Object.entries(occurrencesData.byType).sort(
        ([, a], [, b]) => b - a,
      )[0];
      if (topType) {
        insights.push(
          `O tipo de evento mais comum foi "${topType[0]}" com ${topType[1]} ocorrências registradas.`,
        );
      }
    }

    if (correlations.highRainfallDays > 10) {
      insights.push(
        `Foram identificados ${correlations.highRainfallDays} dias com precipitação acima de 50mm, indicando período de alta atividade pluviométrica.`,
      );
    }

    return insights;
  }

  private generateRecommendations(
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
    correlations: Correlations,
  ): string[] {
    const recommendations: string[] = [];

    if (correlations.rainfallOccurrenceCorrelation > 0.5) {
      recommendations.push(
        'Implementar sistema de alerta precoce baseado em previsões meteorológicas para áreas de risco.',
      );
      recommendations.push(
        'Intensificar monitoramento durante períodos de chuva intensa prevista.',
      );
    }

    if (rainfallData.average24h > 30) {
      recommendations.push(
        'Considerar medidas preventivas em áreas vulneráveis devido à alta média de precipitação.',
      );
    }

    if (occurrencesData.totalRecords > 20) {
      recommendations.push(
        'Realizar análise detalhada dos locais com maior concentração de ocorrências para identificar padrões geográficos.',
      );
    }

    if (correlations.occurrenceSpikes > 5) {
      recommendations.push(
        'Investigar os dias com picos de ocorrências para identificar fatores comuns além da precipitação.',
      );
    }

    return recommendations;
  }

  private answerRainfallQuestion(
    question: string,
    rainfallData: RainfallData,
    startDate: Date,
    endDate: Date,
  ): string {
    const questionLower = question.toLowerCase();
    const periodDescription = this.getPeriodDescription(startDate, endDate);

    if (questionLower.includes('média') || questionLower.includes('médio')) {
      if (rainfallData.totalRecords === 0) {
        return `Não há dados de precipitação disponíveis ${periodDescription}.`;
      }
      return `A precipitação média ${periodDescription} foi de ${rainfallData.average24h.toFixed(1)}mm em 24 horas. Foram analisados ${rainfallData.totalRecords} registros de ${rainfallData.stations.length} estações meteorológicas.`;
    }

    if (questionLower.includes('máximo') || questionLower.includes('máxima') || questionLower.includes('pico')) {
      if (rainfallData.totalRecords === 0) {
        return `Não há dados de precipitação disponíveis ${periodDescription}.`;
      }
      return `O pico de precipitação registrado ${periodDescription} foi de ${rainfallData.max24h.toFixed(1)}mm em 24 horas. Este valor ${rainfallData.max24h > 100 ? 'é considerado muito alto e potencialmente perigoso' : rainfallData.max24h > 50 ? 'indica chuva intensa' : 'está dentro da faixa normal'}.`;
    }

    if (questionLower.includes('quantos') || questionLower.includes('quantidade')) {
      if (rainfallData.totalRecords === 0) {
        return `Não há dados de precipitação disponíveis ${periodDescription}.`;
      }
      return `Foram registrados ${rainfallData.totalRecords} registros de precipitação ${periodDescription}, coletados de ${rainfallData.stations.length} estações meteorológicas diferentes.`;
    }

    if (rainfallData.totalRecords === 0) {
      return `Não há dados de precipitação disponíveis ${periodDescription}.`;
    }

    return `${periodDescription.charAt(0).toUpperCase() + periodDescription.slice(1)}, a precipitação média foi de ${rainfallData.average24h.toFixed(1)}mm, com um pico máximo de ${rainfallData.max24h.toFixed(1)}mm. Foram analisados ${rainfallData.totalRecords} registros de ${rainfallData.stations.length} estações.`;
  }

  private getPeriodDescription(startDate: Date, endDate: Date): string {
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'hoje';
    } else if (diffDays <= 3) {
      return `nos últimos ${diffDays} dias`;
    } else if (diffDays <= 7) {
      return 'na última semana';
    } else if (diffDays <= 30) {
      return `nos últimos ${diffDays} dias`;
    } else {
      return `no período de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
    }
  }

  private answerOccurrenceQuestion(
    question: string,
    occurrencesData: OccurrencesData,
    startDate: Date,
    endDate: Date,
  ): string {
    const questionLower = question.toLowerCase();
    const periodDescription = this.getPeriodDescription(startDate, endDate);

    if (questionLower.includes('quantos') || questionLower.includes('quantidade') || questionLower.includes('total')) {
      if (occurrencesData.totalRecords === 0) {
        return `Não foram registradas ocorrências ${periodDescription}.`;
      }
      return `Foram registradas ${occurrencesData.totalRecords} ocorrências ${periodDescription}.`;
    }

    if (questionLower.includes('tipo') || questionLower.includes('tipos')) {
      if (occurrencesData.totalRecords === 0) {
        return `Não foram registradas ocorrências ${periodDescription}.`;
      }
      const types = Object.entries(occurrencesData.byType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => `• ${type}: ${count} ocorrências`)
        .join('\n');

      return `Os tipos de ocorrências mais comuns ${periodDescription} foram:\n${types}`;
    }

    if (questionLower.includes('bairro') || questionLower.includes('local') || questionLower.includes('onde')) {
      if (occurrencesData.totalRecords === 0) {
        return `Não foram registradas ocorrências ${periodDescription}.`;
      }
      const locations = Object.entries(occurrencesData.byBairro)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([location, count]) => `• ${location}: ${count} ocorrências`)
        .join('\n');

      return `As localizações com mais ocorrências ${periodDescription} foram:\n${locations}`;
    }

    if (occurrencesData.totalRecords === 0) {
      return `Não foram registradas ocorrências ${periodDescription}.`;
    }

    return `Foram registradas ${occurrencesData.totalRecords} ocorrências ${periodDescription}. ${Object.keys(occurrencesData.byType).length > 0 ? `Os tipos mais comuns foram: ${Object.entries(occurrencesData.byType).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type]) => type).join(', ')}.` : ''}`;
  }

  private answerCorrelationQuestion(
    question: string,
    correlations: Correlations,
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
  ): string {
    const corrPercent = (correlations.rainfallOccurrenceCorrelation * 100).toFixed(1);
    const strength = Math.abs(correlations.rainfallOccurrenceCorrelation);

    let strengthDesc = '';
    if (strength > 0.7) {
      strengthDesc = 'forte';
    } else if (strength > 0.4) {
      strengthDesc = 'moderada';
    } else if (strength > 0.2) {
      strengthDesc = 'fraca';
    } else {
      strengthDesc = 'muito fraca ou inexistente';
    }

    const direction = correlations.rainfallOccurrenceCorrelation > 0 ? 'positiva' : 'negativa';

    return `A correlação entre precipitação e ocorrências de deslizamentos é ${strengthDesc} e ${direction} (${corrPercent}%). ${correlations.rainfallOccurrenceCorrelation > 0.5 ? 'Isso indica que períodos de chuva intensa estão fortemente associados a mais eventos de deslizamento.' : correlations.rainfallOccurrenceCorrelation > 0.3 ? 'Há uma relação moderada entre esses fatores.' : 'A relação entre chuva e deslizamentos é fraca, sugerindo que outros fatores podem ser mais relevantes.'} Foram identificados ${correlations.highRainfallDays} dias com precipitação acima de 50mm e ${correlations.occurrenceSpikes} dias com picos de ocorrências.`;
  }

  private answerSummaryQuestion(
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
    correlations: Correlations,
    startDate: Date,
    endDate: Date,
  ): string {
    return `**Resumo da Análise**\n\n**Período:** ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}\n\n**Precipitação:**\n• Total de registros: ${rainfallData.totalRecords}\n• Média em 24h: ${rainfallData.average24h.toFixed(1)}mm\n• Pico máximo: ${rainfallData.max24h.toFixed(1)}mm\n• Estações analisadas: ${rainfallData.stations.length}\n\n**Ocorrências:**\n• Total: ${occurrencesData.totalRecords}\n• Tipos mais comuns: ${Object.entries(occurrencesData.byType).sort(([, a], [, b]) => b - a).slice(0, 3).map(([type]) => type).join(', ') || 'Nenhuma'}\n\n**Correlação:**\n• Chuva-Deslizamentos: ${(correlations.rainfallOccurrenceCorrelation * 100).toFixed(1)}%\n• Dias com chuva intensa (>50mm): ${correlations.highRainfallDays}\n• Picos de ocorrências: ${correlations.occurrenceSpikes}`;
  }

  private formatRecommendations(recommendations: string[]): string {
    if (recommendations.length === 0) {
      return 'Com base nos dados analisados, não há recomendações específicas no momento. Continue monitorando os dados regularmente.';
    }

    return `**Recomendações:**\n\n${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n\n')}`;
  }

  private formatInsights(insights: string[]): string {
    if (insights.length === 0) {
      return 'Não foram identificados insights específicos nos dados analisados.';
    }

    return `**Insights da Análise:**\n\n${insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n\n')}`;
  }

  private generateGeneralAnswer(
    rainfallData: RainfallData,
    occurrencesData: OccurrencesData,
    correlations: Correlations,
    startDate: Date,
    endDate: Date,
  ): string {
    return `Olá! Analisei os dados meteorológicos e de ocorrências para o período de ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}.\n\n**Principais informações:**\n\n• Foram registrados ${rainfallData.totalRecords} dados de precipitação\n• A precipitação média foi de ${rainfallData.average24h.toFixed(1)}mm\n• Foram registradas ${occurrencesData.totalRecords} ocorrências\n• A correlação entre chuva e deslizamentos é de ${(correlations.rainfallOccurrenceCorrelation * 100).toFixed(1)}%\n\nPosso ajudá-lo com perguntas mais específicas sobre:\n• Dados de precipitação\n• Ocorrências e deslizamentos\n• Correlações e padrões\n• Estatísticas e análises\n• Recomendações baseadas nos dados\n\nO que você gostaria de saber?`;
  }
}

