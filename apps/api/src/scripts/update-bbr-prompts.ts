import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function updateBBRPrompts() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    console.log('📝 Updating BBR prompts with optimized content...\n');
    
    // BBR Prompts with improved content
    const bbrPrompts = [
      {
        code: 'bbr_intro',
        name: 'BBR - Introdução',
        content: `Você é um especialista em análises comparativas e está escrevendo para o site de afiliados em português brasileiro.

Escreva uma introdução cativante para um artigo sobre "{title}".

INSTRUÇÕES IMPORTANTES:
- Escreva 2-3 parágrafos envolventes
- Mencione que você testou e comparou múltiplas opções do mercado
- Crie urgência e necessidade de leitura
- Use estatísticas ou dados relevantes quando possível
- Inclua uma promessa clara do que o leitor aprenderá
- Use tom amigável mas autoritativo
- Mencione brevemente os critérios de avaliação usados
- NÃO mencione nomes específicos de produtos ainda
- Termine com uma transição para a lista de produtos

FORMATO:
- Parágrafo 1: Hook + contexto do problema
- Parágrafo 2: Sua experiência/autoridade + promessa
- Parágrafo 3: O que esperar do artigo

Escreva em português brasileiro natural e envolvente.`,
        variables: ['title'],
        category: 'bbr',
        order: 1,
        isActive: true,
        isSystem: true,
        metadata: {
          description: 'Gera introdução cativante para artigos BBR',
          tips: 'Use título descritivo como "Os 7 Melhores Notebooks para Programação em 2024"'
        }
      },
      {
        code: 'bbr_product',
        name: 'BBR - Review do Produto',
        content: `Você é um especialista em análises comparativas escrevendo uma review detalhada.

CONTEXTO DO ARTIGO:
{previous_context}

PRODUTO ATUAL: {product_name}
POSIÇÃO: {position} de {total} produtos analisados

Escreva uma análise COMPARATIVA completa deste produto considerando:

ESTRUTURA OBRIGATÓRIA:
1. TÍTULO: Use H2 com formato "{position}. {product_name} - [Destaque Principal]"

2. DESCRIÇÃO INICIAL (2-3 parágrafos):
   - Apresente o produto e seu diferencial principal
   - Compare com os produtos anteriores da lista
   - Explique para quem este produto é ideal
   - Mencione faixa de preço sem valores específicos

3. CARACTERÍSTICAS PRINCIPAIS (lista com 5-7 items):
   - Especificações técnicas relevantes
   - Diferenciais únicos
   - Comparações diretas com concorrentes

4. PRÓS (exatamente 4 pontos fortes):
   ✅ [Vantagem competitiva específica]
   ✅ [Benefício único comparado aos outros]
   ✅ [Ponto forte técnico ou prático]
   ✅ [Valor agregado ou economia]

5. CONTRAS (exatamente 2 limitações honestas):
   ❌ [Limitação em relação a outros da lista]
   ❌ [Ponto que pode não atender todos]

6. ANÁLISE COMPARATIVA (2 parágrafos):
   - Compare diretamente com produtos anteriores/posteriores
   - Cenários onde este é a melhor escolha
   - Relação custo-benefício comparada

7. VEREDICTO (1 parágrafo):
   - Resumo da posição na lista
   - Para quem é mais recomendado
   - Call-to-action contextualizado

USE:
- Português brasileiro natural
- Tom profissional mas acessível
- Dados técnicos quando relevantes
- Comparações específicas com outros da lista
- Emojis apenas em prós/contras

EVITE:
- Preços específicos (use "faixa premium", "opção econômica")
- Informações datadas
- Superlativos exagerados
- Repetir informações já mencionadas`,
        variables: ['previous_context', 'position', 'total', 'product_name'],
        category: 'bbr',
        order: 2,
        isActive: true,
        isSystem: true,
        metadata: {
          description: 'Gera review comparativa detalhada para cada produto',
          tips: 'O contexto anterior ajuda a manter coerência entre produtos'
        }
      },
      {
        code: 'bbr_conclusion',
        name: 'BBR - Conclusão',
        content: `Você está finalizando um artigo comparativo sobre "{title}".

CONTEXTO DA INTRODUÇÃO:
{introduction}

PRODUTOS ANALISADOS:
{product_names}

Escreva uma conclusão profissional e decisiva com:

ESTRUTURA OBRIGATÓRIA:

1. RESUMO COMPARATIVO (1 parágrafo):
   - Recapitule brevemente os produtos analisados
   - Destaque as principais diferenças encontradas
   - Reforce sua autoridade no assunto

2. RECOMENDAÇÕES FINAIS (1-2 parágrafos):
   - MELHOR GERAL: Qual produto venceu e por quê
   - MELHOR CUSTO-BENEFÍCIO: Opção com melhor relação preço/qualidade
   - MELHOR PREMIUM: Opção top de linha
   - MELHOR PARA INICIANTES: Opção mais simples/acessível
   - Cenários específicos para cada escolha

3. TABELA COMPARATIVA RÁPIDA:
   | Produto | Melhor Para | Ponto Forte |
   |---------|------------|-------------|
   [Preencha com os 3-4 principais produtos]

4. CONSIDERAÇÕES FINAIS (1 parágrafo):
   - Lembre de verificar disponibilidade e promoções
   - Sugira revisitar o artigo para atualizações
   - Incentive comentários e perguntas

5. CHAMADA PARA AÇÃO (1 parágrafo):
   - Agradeça a leitura
   - Convide para compartilhar a experiência
   - Mencione outros artigos relacionados
   - Call-to-action final

IMPORTANTE:
- Seja decisivo nas recomendações
- Use português brasileiro natural
- Mantenha tom autoritativo mas amigável
- Não use preços específicos
- Reforce os critérios de avaliação usados`,
        variables: ['title', 'product_names', 'introduction'],
        category: 'bbr',
        order: 3,
        isActive: true,
        isSystem: true,
        metadata: {
          description: 'Gera conclusão decisiva com recomendações claras',
          tips: 'Lista product_names separados por vírgula'
        }
      }
    ];

    // Update each prompt
    for (const promptData of bbrPrompts) {
      const existing = await Prompt.findOne({ code: promptData.code });
      
      if (existing) {
        Object.assign(existing, promptData);
        existing.updatedAt = new Date();
        await existing.save();
        console.log(`✅ Updated: ${promptData.name}`);
      } else {
        await Prompt.create(promptData);
        console.log(`✅ Created: ${promptData.name}`);
      }
    }

    // Also ensure content_section prompt exists for extra sections
    const contentSectionPrompt = {
      code: 'content_section',
      name: 'Seção de Conteúdo Extra',
      content: `Você está escrevendo uma seção adicional para um artigo de review.

CONTEXTO ANTERIOR:
{previous_context}

SEÇÃO {position} de {total}
TÍTULO DA SEÇÃO: {section_title}
DESCRIÇÃO: {section_description}

Escreva uma seção completa e informativa que:

ESTRUTURA:
1. Use H2 para o título: ## {section_title}

2. INTRODUÇÃO DA SEÇÃO (1 parágrafo):
   - Conecte com o contexto anterior
   - Explique a importância desta informação
   - Antecipe o que será coberto

3. CONTEÚDO PRINCIPAL (3-4 parágrafos):
   - Desenvolva o tópico em profundidade
   - Use subtítulos H3 se necessário
   - Inclua listas ou tabelas quando apropriado
   - Adicione dicas práticas e exemplos

4. INFORMAÇÕES ÚTEIS:
   - Dados técnicos relevantes
   - Comparações quando aplicável
   - Dicas de especialista
   - Erros comuns a evitar

5. CONCLUSÃO DA SEÇÃO (1 parágrafo):
   - Resuma os pontos principais
   - Conecte com o tema geral do artigo
   - Transição para próxima seção (se houver)

USE:
- Português brasileiro claro e objetivo
- Tom educacional mas envolvente
- Exemplos práticos quando possível
- Formatação clara com bullets/números

EVITE:
- Repetir informações já mencionadas
- Fugir do escopo da seção
- Informações desatualizadas
- Tom promocional excessivo`,
      variables: ['previous_context', 'position', 'total', 'section_title', 'section_description'],
      category: 'informational',
      order: 2,
      isActive: true,
      isSystem: true,
      metadata: {
        description: 'Gera seções extras de conteúdo (guias, dicas, comparações)',
        tips: 'Use para adicionar valor com guias de compra, dicas de uso, etc.'
      }
    };

    // Check and update content_section
    const existingContentSection = await Prompt.findOne({ code: 'content_section' });
    if (existingContentSection) {
      Object.assign(existingContentSection, contentSectionPrompt);
      existingContentSection.updatedAt = new Date();
      await existingContentSection.save();
      console.log(`✅ Updated: ${contentSectionPrompt.name}`);
    } else {
      await Prompt.create(contentSectionPrompt);
      console.log(`✅ Created: ${contentSectionPrompt.name}`);
    }

    console.log('\n📊 Summary:');
    const bbrCount = await Prompt.countDocuments({ category: 'bbr' });
    console.log(`   BBR prompts: ${bbrCount}`);
    
    console.log('\n✨ BBR prompts updated successfully!');
    console.log('   The prompts are now optimized for high-quality content generation.');
    console.log('   Test them in the Review Generator to create engaging affiliate content.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

updateBBRPrompts();