import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: {
  exit(code?: number): never;
};

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');
  
  try {
    await prisma.$connect();
    console.log('Conexão com banco de dados estabelecida');
  } catch (error) {
    console.error('Erro ao conectar com banco de dados:', error);
    throw error;
  }

  const hashedPassword = await bcrypt.hash('12345678', 10);

  const adminUser = await prisma.users.upsert({
    where: { email: 'jocyannovittor@hotmail.com' },
    update: {},
    create: {
      name: 'Jocyanno',
      email: 'jocyannovittor@hotmail.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  const regularUser = await prisma.users.upsert({
    where: { email: 'rodrigo@hotmail.com' },
    update: {},
    create: {
      name: 'Rodrigo',
      email: 'rodrigo@hotmail.com',
      password: hashedPassword,
      role: 'user',
    },
  });

  console.log('Usuários criados:');
  console.log(`Admin: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`User: ${regularUser.email} (ID: ${regularUser.id})`);

  const seguradoraData = [
    {
      dataHoraRegistro: new Date('2024-01-15T10:30:00Z'),
      tipoEvento: 'Alagamento',
      localizacao: 'Rua das Flores, 123 - Centro, São Paulo/SP',
      descricaoInicial: 'Cliente relatou alagamento na propriedade após chuvas intensas. Água atingiu aproximadamente 50cm de altura no pátio.',
      status: 'EM_ANALISE' as const,
      documentacaoRecebida: ['Fotos do alagamento', 'Relatório meteorológico', 'Comprovante de propriedade'],
      vistoriadorResponsavel: 'Carlos Silva',
      conclusaoVistoria: 'Sinistro confirmado. Danos materiais avaliados em R$ 15.000,00.',
      valorIndenizacao: 15000.00
    },
    {
      dataHoraRegistro: new Date('2024-01-20T14:15:00Z'),
      tipoEvento: 'Deslizamento',
      localizacao: 'Estrada Rural KM 5 - Zona Rural, Petrópolis/RJ',
      descricaoInicial: 'Deslizamento de terra atingiu parte da propriedade rural. Estruturas danificadas.',
      status: 'VISTORIA_AGENDADA' as const,
      documentacaoRecebida: ['Fotos aéreas', 'Relatório geológico'],
      vistoriadorResponsavel: 'Ana Costa',
      conclusaoVistoria: '',
      valorIndenizacao: undefined
    },
    {
      dataHoraRegistro: new Date('2024-01-25T09:45:00Z'),
      tipoEvento: 'Vendaval',
      localizacao: 'Av. Principal, 456 - Bairro Novo, Rio de Janeiro/RJ',
      descricaoInicial: 'Vendaval causou queda de árvore sobre a residência. Telhado parcialmente danificado.',
      status: 'SINISTRO_CONFIRMADO' as const,
      documentacaoRecebida: ['Fotos dos danos', 'Relatório meteorológico', 'Orçamento de reparos'],
      vistoriadorResponsavel: 'Roberto Santos',
      conclusaoVistoria: 'Sinistro confirmado. Danos estruturais avaliados em R$ 8.500,00.',
      valorIndenizacao: 8500.00
    },
    {
      dataHoraRegistro: new Date('2024-02-01T16:20:00Z'),
      tipoEvento: 'Alagamento',
      localizacao: 'Rua da Paz, 789 - Vila Nova, Belo Horizonte/MG',
      descricaoInicial: 'Alagamento no subsolo da residência. Equipamentos elétricos danificados.',
      status: 'INDENIZACAO_PAGA' as const,
      documentacaoRecebida: ['Fotos dos danos', 'Nota fiscal dos equipamentos', 'Relatório técnico'],
      vistoriadorResponsavel: 'Maria Oliveira',
      conclusaoVistoria: 'Sinistro confirmado e indenização paga. Valor: R$ 12.300,00.',
      valorIndenizacao: 12300.00
    },
    {
      dataHoraRegistro: new Date('2024-02-05T11:10:00Z'),
      tipoEvento: 'Deslizamento',
      localizacao: 'Rua das Montanhas, 321 - Alto da Serra, Santos/SP',
      descricaoInicial: 'Pequeno deslizamento na lateral da propriedade. Muro de contenção danificado.',
      status: 'SINISTRO_NAO_CONFIRMADO' as const,
      documentacaoRecebida: ['Fotos do local', 'Relatório de engenharia'],
      vistoriadorResponsavel: 'Pedro Lima',
      conclusaoVistoria: 'Após análise, danos não cobertos pela apólice. Sinistro não confirmado.',
      valorIndenizacao: undefined
    }
  ];

  console.log('Criando dados de exemplo para Seguradora...');

  for (const data of seguradoraData) {
    const seguradora = await prisma.seguradora.create({
      data: {
        dataHoraRegistro: data.dataHoraRegistro,
        tipoEvento: data.tipoEvento,
        localizacao: data.localizacao,
        descricaoInicial: data.descricaoInicial,
        status: data.status,
        documentacaoRecebida: JSON.stringify(data.documentacaoRecebida),
        vistoriadorResponsavel: data.vistoriadorResponsavel,
        conclusaoVistoria: data.conclusaoVistoria,
        valorIndenizacao: data.valorIndenizacao
      }
    });

    console.log(`Ocorrência #${seguradora.numeroOcorrencia} criada - ${data.tipoEvento} (${data.status})`);
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
