import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../lib/prisma";

const months: { [key: string]: number } = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

// Parser CSV simples que respeita aspas e preserva campos vazios (inclusive finais)
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim().replace(/"/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/"/g, ""));
  return result;
}

// Função para construir o mapeamento coluna->data a partir das primeiras linhas do CSV
function buildColumnDateMap(lines: string[]): Map<number, string> {
  const columnToDate = new Map<number, string>();
  const maxScan = Math.min(20, lines.length);

  for (let i = 0; i < maxScan; i++) {
    const cells = parseCsvLine(lines[i]);

    let datesFoundInRow = 0;

    for (let col = 0; col < cells.length; col++) {
      const cell = cells[col];
      const match = cell.match(
        /(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*\d{2,4})?/
      );
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        if (
          Number.isFinite(day) &&
          Number.isFinite(month) &&
          day >= 1 &&
          day <= 31 &&
          month >= 1 &&
          month <= 12 &&
          !columnToDate.has(col)
        ) {
          const label = `${String(day).padStart(2, "0")}/${String(
            month
          ).padStart(2, "0")}`;
          columnToDate.set(col, label);
          datesFoundInRow++;
        }
      }
    }

    // Se a linha atual parece ser um cabeçalho de datas, podemos parar cedo
    if (columnToDate.size >= 5 || datesFoundInRow >= 3) {
      break;
    }
  }

  return columnToDate;
}

// Função para extrair dados de JSON do Google Sheets
function extractDataFromJson(jsonData: any): string[] {
  const lines: string[] = [];

  try {
    if (jsonData.table && jsonData.table.rows) {    

      for (const row of jsonData.table.rows) {
        if (row.c) {
          const rowData = row.c.map((cell: any) => cell?.v || "").join(",");
          if (rowData.trim()) {
            lines.push(rowData);
          }
        }
      }

    }
  } catch (error) {
    console.log("❌ Erro ao processar JSON:", error);
  }

  return lines;
}

interface WeatherData {
  date: Date;
  regiao: string;
  tendencia: string;
  min: number;
  max: number;
}

function getMinMaxValues(value: string): { min: number; max: number } {
  const cleanValue = value.trim().toLowerCase();

  // Detectar faixa numérica, como "2 a 10", "2-10" ou com sufixo "mm"
  const rangeMatch = cleanValue.match(/(\d+)\s*(?:-|a)\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min, max };
    }
  }

  // Detectar comparações tipo "<2 mm" ou ">100 mm"
  const lessMatch = cleanValue.match(/<(\s*)(\d+)/);
  if (lessMatch) {
    const max = parseInt(lessMatch[2], 10);
    if (Number.isFinite(max)) {
      return { min: 0, max };
    }
  }
  const greaterMatch = cleanValue.match(/>(\s*)(\d+)/);
  if (greaterMatch) {
    const base = parseInt(greaterMatch[2], 10);
    if (Number.isFinite(base)) {
      const min = base + 1;
      return { min, max: Math.max(min, 200) };
    }
  }

  switch (cleanValue) {
    case "sem chuva":
      return { min: 0, max: 2 };
    case "fraca":
      return { min: 2, max: 10 };
    case "fraca a moderada":
      return { min: 10, max: 30 };
    case "moderada":
      return { min: 30, max: 50 };
    case "moderada a forte":
      return { min: 50, max: 100 };
    case "forte":
      return { min: 101, max: 200 };
    default:
      console.log("Valor não reconhecido:", value);
      return { min: 0, max: 0 };
  }
}

async function extractApacData(): Promise<WeatherData[]> {
  try {

    // Primeiro, pegar a URL da planilha
    const pageUrl =
      "https://sites.google.com/view/tendenciadeprecipitacao/paginainicial";

    const response = await axios.get(pageUrl);
    const $ = cheerio.load(response.data);

    const sheetsUrl = $('[data-url*="docs.google.com/spreadsheets"]').attr(
      "data-url"
    );

    if (!sheetsUrl) {
      throw new Error("URL do Google Sheets não encontrada");
    }

    // Tentar diferentes variações da URL para CSV
    const baseUrl = sheetsUrl.replace("/pubhtml", "");

    const csvUrls = [
      `${baseUrl}/export?format=csv&gid=0`,
      `${baseUrl}/export?format=csv`,
      `${baseUrl}/gviz/tq?tqx=out:csv&gid=0`,
      `${baseUrl}/gviz/tq?tqx=out:csv`,
      sheetsUrl.replace("/pubhtml", "/export?format=csv&gid=0"),
      sheetsUrl.replace("/pubhtml", "/export?format=csv"),
      // URLs alternativas com diferentes parâmetros
      `${baseUrl}/edit#gid=0&output=csv`,
      `${baseUrl}&output=csv`,
      `${baseUrl}&exportFormat=csv`
    ];

    let csvData: string | null = null;
    let workingUrl: string | null = null;

    // Tentar cada URL de CSV
    for (const csvUrl of csvUrls) {
      try {

        const csvResponse = await axios.get(csvUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/csv,text/plain,application/csv,*/*",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            Referer: "https://docs.google.com/"
          },
          timeout: 30000,
          maxRedirects: 10,
          validateStatus: (status) => status < 500 // Aceitar status < 500
        });

        const responseText = csvResponse.data;

        // Verificar se a resposta parece ser um CSV válido (não HTML de erro)
        if (
          responseText &&
          typeof responseText === "string" &&
          responseText.length > 50 &&
          !responseText.includes("<!DOCTYPE html>") &&
          !responseText.includes("<html") &&
          !responseText.includes("Página não encontrada") &&
          !responseText.includes("não existe") &&
          (responseText.includes(",") || responseText.includes("\n"))
        ) {
          csvData = responseText;
          workingUrl = csvUrl;
          break;
        } else {
        }
      } catch (error: any) {
      }
    }

    // Se não conseguir via CSV, tentar extrair dados diretamente da página HTML usando XPath
    if (!csvData) {

      try {
        // Tentar extrair dados diretamente da página HTML do Google Sheets

        const htmlResponse = await axios.get(sheetsUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
          },
          timeout: 30000
        });

        // Tentar diferentes URLs de visualização pública
        const publicUrls = [
          sheetsUrl.replace("/pubhtml", "/pub?output=html"),
          sheetsUrl.replace("/pubhtml", "/pub?output=csv"),
          sheetsUrl.replace("/pubhtml", "/pub?output=tsv"),
          sheetsUrl.replace("/pubhtml", "/pub?output=xlsx"),
          sheetsUrl.replace("/pubhtml", "/pub?output=ods"),
          sheetsUrl.replace("/pubhtml", "/pub?output=pdf"),
          sheetsUrl.replace("/pubhtml", "/pub?output=json"),
          sheetsUrl.replace("/pubhtml", "/pub?output=json&gid=0"),
          sheetsUrl.replace("/pubhtml", "/pub?output=json&gid=1"),
          sheetsUrl.replace("/pubhtml", "/pub?output=json&gid=2")
        ];

        for (const publicUrl of publicUrls) {
          try {

            const publicResponse = await axios.get(publicUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Accept: "*/*",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
              },
              timeout: 15000
            });

            // Verificar se a resposta contém dados úteis
            if (
              publicResponse.data &&
              typeof publicResponse.data === "string"
            ) {
              const responseText = publicResponse.data;

              // Verificar se contém dados da tabela
              if (
                responseText.includes("Metropolitana") ||
                responseText.includes("Mata Norte") ||
                responseText.includes("Mata Sul") ||
                responseText.includes("Agreste") ||
                responseText.includes("Sertão")
              ) {
                // Se for JSON, tentar processar
                if (publicUrl.includes("output=json")) {
                  try {
                    const jsonData = JSON.parse(responseText);
                    // Extrair dados do JSON se possível
                    if (jsonData.table && jsonData.table.rows) {
                      const extractedData = extractDataFromJson(jsonData);
                      if (extractedData.length > 0) {
                        csvData = extractedData.join("\n");
                        break;
                      }
                    }
                  } catch (jsonError: any) {
                  }
                } else {
                  // Se for CSV, usar diretamente
                  if (publicUrl.includes("output=csv")) {
                    csvData = responseText;
                    break;
                  } else {
                    // Usar dados HTML/texto
                    htmlResponse.data = responseText;
                    break;
                  }
                }
              }
            }
          } catch (error: any) {
          }
        }

        const $html = cheerio.load(htmlResponse.data);

        // Imprimir informações sobre a página htmlResponse.data
        // Verificar se há elementos com ID específico
        const elementWithId0 = $html("#0");

        // Encontrar todas as tabelas
        const tables = $html("table");

        tables.each((tableIndex, table) => {

          const rows = $html(table).find("tr");

          // Array para armazenar todos os dados da tabela de forma estruturada
          const tabelaCompleta: string[][] = [];

          rows.each((rowIndex, row) => {
            const cells = $html(row).find("td, th");

            const linhaDados: string[] = [];

            cells.each((cellIndex, cell) => {
              const cellText = $html(cell).text().trim();
              const cellHtml = $html(cell).html()?.substring(0, 100) || "";
              linhaDados.push(cellText);
            });

            tabelaCompleta.push(linhaDados);
          });

        });

        // Extrair dados usando os XPaths específicos fornecidos
        const tableData: string[] = [];

        // XPath: //*[@id="0"]/div[1]/table/tbody/tr[4]/td[1] - "Mata Sul" (quarta linha de dados)
        const mataSulCell = $html(
          "#0 div:nth-child(1) table tbody tr:nth-child(4) td:nth-child(1)"
        );
        const mataSulText = mataSulCell.text().trim();

        if (
          mataSulText &&
          mataSulText.toLowerCase().includes("mata sul")
        ) {
          // Extrair dados das células td[2] até td[6] da linha 4 (Mata Sul)
          const rowData: string[] = [mataSulText];

          for (let i = 2; i <= 6; i++) {
            const cellSelector = `#0 div:nth-child(1) table tbody tr:nth-child(4) td:nth-child(${i})`;
            const cell = $html(cellSelector);
            const cellText = cell.text().trim();

            rowData.push(cellText);
          }

          if (rowData.length > 1) {
            tableData.push(rowData.join(","));
          }
        }

        if (tableData.length > 0) {
          csvData = tableData.join("\n");
        } else {
          // Fallback: tentar extrair dados da tabela de forma genérica
          $html("table tr").each((index, element) => {
            const row: string[] = [];
            $html(element)
              .find("td, th")
              .each((cellIndex, cell) => {
                const cellText = $html(cell).text().trim();
                if (cellText) {
                  row.push(cellText);
                }
              });
            if (row.length > 0) {
              tableData.push(row.join(","));
            }
          });

          if (tableData.length > 0) {
            csvData = tableData.join("\n");
              }
        }
      } catch (error) {
      }
    }

    // Se ainda não conseguiu extrair dados, falhar
    if (!csvData) {
      throw new Error(
        "Não foi possível extrair dados automaticamente do site. Verifique se a URL está acessível e se os dados estão disponíveis."
      );
    }

    if (!csvData) {
      throw new Error("Não foi possível obter os dados CSV");
    }

    // Processar o CSV
    const lines = csvData.split("\n").filter((line) => line.trim().length > 0);

    // Determinar largura máxima de colunas a partir das primeiras linhas
    const parsedSample = lines
      .slice(0, Math.min(20, lines.length))
      .map(parseCsvLine);
    const maxColumns = parsedSample.reduce(
      (max, arr) => Math.max(max, arr.length),
      0
    );

    // Mapear datas por coluna dinamicamente (a partir de cabeçalhos do CSV)
    const columnDateMap = buildColumnDateMap(lines);
    if (columnDateMap.size > 0) {
        }

    const data: WeatherData[] = [];
    const currentYear = new Date().getFullYear();

    // Processar cada linha do CSV
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const line = lines[i];
      const cells = parseCsvLine(line);
      while (cells.length < maxColumns) cells.push("");

      if (cells.length > 1) {
        // Verificar se é a linha da Mata Sul (primeira célula contém "mata sul")
        if (cells[0] && cells[0].toLowerCase().includes("mata sul")) {
          const sortedDateColumns = Array.from(columnDateMap.entries()).sort(
            (a, b) => a[0] - b[0]
          );
          for (const [colIndex, dateString] of sortedDateColumns) {
            if (colIndex <= 0) continue;
            const weatherData = cells[colIndex] ?? "";

            if (weatherData && containsWeatherData(weatherData)) {
              const [day, month] = dateString.split("/").map(Number);

              // Para datas de fevereiro (mês 2), usar o próximo ano se estamos em dezembro
              let year = currentYear;
              if (month === 2 && new Date().getMonth() >= 11) {
                year = currentYear + 1;
              }

              const date = new Date(year, month - 1, day);
              const { min, max } = getMinMaxValues(weatherData);

              data.push({
                date: date,
                regiao: "Mata Sul",
                tendencia: weatherData,
                min: min,
                max: max
              });

            } else {
            }
          }
        } else {
          // Processamento genérico para outras linhas
          const extractedFromRow = extractWeatherDataFromRow(
            cells,
            i,
            currentYear
          );
          data.push(...extractedFromRow);
        }
      }
    }

    // Se não encontrou dados estruturados, tentar busca mais ampla
    if (data.length === 0) {
      const allCells: string[] = [];
      for (const line of lines.slice(0, 50)) {
        const cells = parseCsvLine(line);
        while (cells.length < maxColumns) cells.push("");
        allCells.push(...cells.filter((cell) => cell.length > 0));
      }

      // Buscar padrões de data e dados meteorológicos
      for (let i = 0; i < allCells.length - 1; i++) {
        const cell = allCells[i];

        const dateMatch = cell.match(/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]);

          if (day <= 31 && month <= 12) {
            // Procurar dados meteorológicos nas próximas células
            for (let j = i + 1; j < Math.min(i + 10, allCells.length); j++) {
              const meteoCell = allCells[j];

              if (containsWeatherData(meteoCell)) {
                const date = new Date(currentYear, month - 1, day);
                const { min, max } = getMinMaxValues(meteoCell);

                data.push({
                  date: date,
                  regiao: "Mata Sul",
                  tendencia: meteoCell,
                  min: min,
                  max: max
                });

                break;
              }
            }
          }
        }
      }
    }

    return data;
  } catch (error) {
    throw error;
  }
}

function containsWeatherData(text: string): boolean {
  if (!text) return false;

  const meteoValues = [
    "sem chuva",
    "fraca",
    "fraca a moderada",
    "moderada",
    "moderada a forte",
    "forte"
  ];

  const normalized = text.toLowerCase();
  const hasCategory = meteoValues.some((val) =>
    normalized.includes(val.toLowerCase())
  );

  // Também considerar faixas numéricas como "2 a 10" ou "2-10" e comparações "<2", ">100"
  const hasNumericRange = /(\d+)\s*(?:-|a)\s*(\d+)/.test(normalized);
  const hasComparison = /[<>]\s*\d+/.test(normalized);

  return hasCategory || hasNumericRange || hasComparison;
}

function extractWeatherDataFromRow(
  cells: string[],
  rowIndex: number,
  currentYear: number
): WeatherData[] {
  const data: WeatherData[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Procurar por datas no formato DD/MM
    const dateMatch = cell.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);

      if (day <= 31 && month <= 12) {
        // Procurar dados meteorológicos nas próximas células da mesma linha
        for (let j = i + 1; j < cells.length; j++) {
          const meteoCell = cells[j];

          if (!meteoCell || meteoCell.trim().length === 0) continue;

          if (containsWeatherData(meteoCell)) {
            // Para datas de agosto (mês 8), usar o ano atual
            // Para datas de fevereiro (mês 2), usar o próximo ano se estamos em dezembro/janeiro
            let year = currentYear;
            if (month === 2 && new Date().getMonth() >= 11) {
              year = currentYear + 1;
            }

            const date = new Date(year, month - 1, day);
            const { min, max } = getMinMaxValues(meteoCell);

            data.push({
              date: date,
              regiao: "Mata Sul",
              tendencia: meteoCell,
              min: min,
              max: max
            });

            break;
          }
        }
      }
    }
  }

  return data;
}

async function saveDataToDatabase(data: WeatherData[]): Promise<void> {
  try {
    if (data.length === 0) {
      return;
    }

    const dates = data.map((item) => item.date);

    const existingRecords = await prisma.dadosApac.findMany({
      where: {
        data: {
          in: dates
        }
      }
    });

    const existingDates = new Set(
      existingRecords.map((record) => record.data.toISOString())
    );

    const recordsToInsert = data.filter(
      (item) => !existingDates.has(item.date.toISOString())
    );

    const recordsToUpdate = data.filter((item) =>
      existingDates.has(item.date.toISOString())
    );

    let insertedCount = 0;
    let updatedCount = 0;

    if (recordsToInsert.length > 0) {
      const insertResult = await prisma.dadosApac.createMany({
        data: recordsToInsert.map((item) => ({
          data: item.date,
          regiao: item.regiao,
          tendencia: item.tendencia,
          min: item.min,
          max: item.max
        })),
        skipDuplicates: true
      });
      insertedCount = insertResult.count;
    }

    if (recordsToUpdate.length > 0) {
      for (const item of recordsToUpdate) {
        await prisma.dadosApac.updateMany({
          where: {
            data: item.date
          },
          data: {
            regiao: item.regiao,
            tendencia: item.tendencia,
            min: item.min,
            max: item.max
          }
        });
        updatedCount++;
      }
    }
  } catch (error) {
    throw error;
  }
}

async function runAutomation(): Promise<void> {
  try {

    const data = await extractApacData();

    if (data.length === 0) {
      return;
    }

    await saveDataToDatabase(data);
    console.log(data);    
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runAutomation();
}

export { runAutomation, extractApacData, saveDataToDatabase };
