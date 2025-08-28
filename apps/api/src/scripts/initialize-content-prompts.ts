import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import database from '../database';
import dotenv from 'dotenv';

dotenv.config();

const contentGenerationPrompts = [
  // BBR Prompts (Best Buy Review - Comparação)
  {
    code: 'bbr_intro',
    name: 'BBR - Introdução',
    content: `Você é um especialista em análises comparativas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução empolgante para um artigo comparativo sobre os {product_count} MELHORES produtos de uma categoria.
A introdução deve:
- Ter 2-3 parágrafos
- Enfatizar que você testou e comparou múltiplas opções
- Mencionar que apresentará os {product_count} melhores produtos selecionados
- Destacar que ajudará o leitor a escolher a melhor opção
- Ser amigável e profissional
- Usar português do Brasil
NÃO mencione nomes específicos de produtos ainda.`,
    variables: ['product_count'],
    category: 'bbr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introdução para reviews comparativos (BBR)',
      tips: 'Enfatize a comparação e processo de seleção'
    }
  },
  {
    code: 'bbr_product',
    name: 'BBR - Review do Produto',
    content: `Você é um especialista em análises comparativas.
Contexto: {introduction}

Você está analisando o produto {position} de {total} na comparação.
Nome do produto: {product_name}

Escreva uma análise COMPARATIVA em português (pt-BR) que inclua:
1. Parágrafo de abertura posicionando o produto entre as opções (2-3 frases)
2. Exatamente 4 prós (vantagens competitivas específicas)
3. Exatamente 2 contras (limitações honestas em relação às alternativas)
4. Parágrafo comparativo destacando quando este produto é a melhor escolha
5. Call-to-action contextualizado

Formate sua resposta como:
DESCRIPTION: [parágrafo de abertura]
PROS:
- [vantagem 1]
- [vantagem 2]
- [vantagem 3]
- [vantagem 4]
CONS:
- [limitação 1]
- [limitação 2]
ANALYSIS: [análise comparativa e recomendação]`,
    variables: ['introduction', 'position', 'total', 'product_name'],
    category: 'bbr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Review de produto para contexto comparativo',
      tips: 'Foque nas vantagens comparativas'
    }
  },
  {
    code: 'bbr_conclusion',
    name: 'BBR - Conclusão',
    content: `Você comparou {product_count} produtos: {product_names}.
Contexto da introdução: {introduction}

Escreva uma conclusão em português (pt-BR) que:
- Resume as comparações destacando o MELHOR produto (1 parágrafo)
- Mencione alternativas para diferentes necessidades/orçamentos
- Dê uma recomendação final clara sobre qual escolher
- Agradeça o leitor pela confiança
- Tenha 2-3 parágrafos no total
- Mantenha tom profissional e decisivo`,
    variables: ['product_count', 'product_names', 'introduction'],
    category: 'bbr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusão enfatizando a melhor escolha',
      tips: 'Seja decisivo sobre o vencedor'
    }
  },

  // SPR Prompts (Single Product Review - Análise Única)
  {
    code: 'spr_intro',
    name: 'SPR - Introdução',
    content: `Você é um especialista em análises detalhadas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução cativante para uma análise COMPLETA e APROFUNDADA de UM único produto.
A introdução deve:
- Ter 2-3 parágrafos
- Criar expectativa sobre a análise detalhada que virá
- Mencionar que fará uma análise completa com prós, contras e experiência real
- Indicar que ajudará o leitor a tomar uma decisão informada
- Ser envolvente e detalhista
- Usar português do Brasil
NÃO mencione o nome específico do produto ainda.`,
    variables: [],
    category: 'spr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introdução para análise de produto único',
      tips: 'Foque na profundidade e detalhamento'
    }
  },
  {
    code: 'spr_product',
    name: 'SPR - Análise do Produto',
    content: `Você é um especialista em análises detalhadas de produtos.
Nome do produto: {product_name}

Escreva uma análise COMPLETA e APROFUNDADA em português (pt-BR) que inclua:
1. Parágrafo detalhado sobre o produto e seu posicionamento (3-4 frases)
2. Exatamente 6 prós (benefícios detalhados e específicos)
3. Exatamente 3 contras (limitações honestas mas equilibradas)
4. Análise aprofundada da experiência de uso (4-5 frases)
5. Recomendação final clara e persuasiva

Formate sua resposta como:
DESCRIPTION: [descrição detalhada]
PROS:
- [benefício 1]
- [benefício 2]
- [benefício 3]
- [benefício 4]
- [benefício 5]
- [benefício 6]
CONS:
- [limitação 1]
- [limitação 2]
- [limitação 3]
ANALYSIS: [análise profunda e experiência de uso]`,
    variables: ['product_name'],
    category: 'spr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Análise profunda para produto único',
      tips: 'Forneça análise compreensiva com 6 prós e 3 contras'
    }
  },
  {
    code: 'spr_conclusion',
    name: 'SPR - Conclusão',
    content: `Você analisou profundamente o produto: {product_names}.
Contexto da introdução: {introduction}

Escreva uma conclusão em português (pt-BR) que:
- Resume os pontos principais da análise detalhada (1 parágrafo)
- Destaque para quem este produto é ideal
- Mencione se vale o investimento
- Dê um veredito final claro (recomenda ou não)
- Agradeça o leitor pelo tempo dedicado
- Tenha 2-3 parágrafos no total
- Seja decisivo e esclarecedor`,
    variables: ['product_names', 'introduction'],
    category: 'spr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusão com veredito claro',
      tips: 'Seja definitivo sobre a recomendação'
    }
  },

  // Informational Prompts (Conteúdo Informacional)
  {
    code: 'content_intro',
    name: 'Informacional - Introdução',
    content: `Você é um escritor especialista criando artigos educacionais em português (pt-BR).
Escreva uma introdução envolvente para um artigo intitulado "{title}".
O artigo cobrirá os seguintes tópicos: {outline_topics}

A introdução deve:
- Ter 2-3 parágrafos
- Capturar a atenção do leitor
- Fazer uma breve visão geral do que será coberto
- Ser informativa e profissional
- Usar português do Brasil
- NÃO ter foco em vendas, mas sim educacional

Escreva em tom amigável e profissional adequado para um post de blog informativo.`,
    variables: ['title', 'outline_topics'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introdução para conteúdo informacional',
      tips: 'Foque na educação, não em vendas'
    }
  },
  {
    code: 'content_section',
    name: 'Informacional - Seção',
    content: `Você está escrevendo a seção {position} de {total} para um artigo educacional em português (pt-BR).

Contexto do artigo: {introduction}
Título da seção: {section_title}
Descrição da seção: {section_description}

Escreva uma seção abrangente que:
- Comece com o título da seção como H2
- Forneça informações detalhadas e educacionais
- Tenha 3-4 parágrafos
- Use bullet points quando apropriado
- Mantenha tom profissional e informativo
- NÃO tenha foco em vendas
- Use português do Brasil

Foque em fornecer valor e educação ao leitor.`,
    variables: ['introduction', 'position', 'total', 'section_title', 'section_description'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Seção para conteúdo informacional',
      tips: 'Foco educacional com informações detalhadas'
    }
  },
  {
    code: 'content_conclusion',
    name: 'Informacional - Conclusão',
    content: `Você está concluindo um artigo educacional intitulado "{title}" em português (pt-BR).

Contexto da introdução: {introduction}
Tópicos cobertos: {outline_topics}

Escreva uma conclusão que:
- Resuma os pontos principais (1-2 parágrafos)
- Forneça considerações finais ou recomendações
- Agradeça o leitor
- Encoraje engajamento (comentários, perguntas)
- Tenha 2-3 parágrafos no total
- Mantenha o tom educacional e profissional
- Use português do Brasil`,
    variables: ['title', 'introduction', 'outline_topics'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusão para conteúdo informacional',
      tips: 'Finalize o conteúdo educacional com chamada para engajamento'
    }
  }
];

async function initializeContentPrompts() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await database.connectDatabase();
    
    console.log('🧹 Removendo prompts antigos das categorias não utilizadas...');
    await Prompt.deleteMany({ 
      category: { $nin: ['bbr', 'spr', 'informational'] }
    });
    
    console.log('📝 Inicializando prompts do gerador de conteúdo...');
    
    let created = 0;
    let updated = 0;
    
    for (const promptData of contentGenerationPrompts) {
      try {
        const existing = await Prompt.findOne({ code: promptData.code });
        
        if (existing) {
          // Atualiza prompt existente
          Object.assign(existing, promptData);
          existing.updatedAt = new Date();
          await existing.save();
          console.log(`✅ Atualizado: ${promptData.code} - ${promptData.name}`);
          updated++;
        } else {
          // Cria novo prompt
          await Prompt.create(promptData);
          console.log(`✅ Criado: ${promptData.code} - ${promptData.name}`);
          created++;
        }
      } catch (error: any) {
        console.error(`❌ Erro com ${promptData.code}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumo:');
    console.log(`   Criados: ${created} prompts`);
    console.log(`   Atualizados: ${updated} prompts`);
    
    // Mostra prompts por categoria
    const bbrCount = await Prompt.countDocuments({ category: 'bbr' });
    const sprCount = await Prompt.countDocuments({ category: 'spr' });
    const infoCount = await Prompt.countDocuments({ category: 'informational' });
    
    console.log('\n📈 Prompts por categoria:');
    console.log(`   BBR (Melhores): ${bbrCount} prompts`);
    console.log(`   SPR (Único): ${sprCount} prompts`);
    console.log(`   Informacional: ${infoCount} prompts`);
    
    console.log('\n✨ Inicialização de prompts completa!');
    console.log('📌 Acesse /admin/prompt-library para gerenciar os prompts');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar prompts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com banco de dados fechada');
  }
}

// Execute se chamado diretamente
if (require.main === module) {
  initializeContentPrompts();
}

export { initializeContentPrompts };