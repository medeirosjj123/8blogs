#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
  process.exit(1);
}

// Define Prompt schema
const promptSchema = new mongoose.Schema({
  code: String,
  name: String,
  content: String,
  variables: [String],
  category: String,
  order: Number,
  isActive: Boolean,
  isSystem: Boolean,
  metadata: {
    description: String,
    example: String,
    tips: String
  },
  lastUpdatedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const Prompt = mongoose.model('Prompt', promptSchema);

// Updated prompt templates with title-based introduction and context preservation
const updatedPrompts = {
  // BBR Introduction - Now uses title instead of product_count
  'bbr_intro': {
    content: `Você é um especialista em análises comparativas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução empolgante para um artigo com o título: "{title}"

A introdução deve:
- Ter 2-3 parágrafos
- Ser baseada especificamente no título fornecido
- Enfatizar que você testou e comparou múltiplas opções
- Destacar que ajudará o leitor a escolher a melhor opção
- Criar expectativa sobre o conteúdo que virá
- Ser amigável e profissional
- Usar português do Brasil
- NÃO mencionar nomes específicos de produtos ainda`,
    variables: ['title']
  },
  
  // BBR Product Review - Now includes previous_context
  'bbr_product': {
    content: `Você é um especialista em análises comparativas continuando um artigo.

Contexto anterior (últimas 2 seções):
{previous_context}

Você está analisando o produto {position} de {total} na comparação.
Nome do produto: {product_name}

Escreva uma análise COMPARATIVA em português (pt-BR) que:
1. Mantenha continuidade com o contexto anterior
2. Parágrafo de abertura posicionando o produto entre as opções (2-3 frases)
3. Exatamente 4 prós (vantagens competitivas específicas)
4. Exatamente 2 contras (limitações honestas em relação às alternativas)
5. Parágrafo comparativo destacando quando este produto é a melhor escolha
6. Call-to-action contextualizado

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
    variables: ['previous_context', 'position', 'total', 'product_name']
  },
  
  // BBR Conclusion - Updated with better context
  'bbr_conclusion': {
    content: `Você está concluindo um artigo comparativo intitulado: "{title}"

Produtos analisados: {product_names}
Contexto da introdução: {introduction}

Escreva uma conclusão em português (pt-BR) que:
- Resume as comparações destacando o MELHOR produto (1 parágrafo)
- Mencione alternativas para diferentes necessidades/orçamentos
- Dê uma recomendação final clara sobre qual escolher
- Agradeça o leitor pela confiança
- Tenha 2-3 parágrafos no total
- Mantenha tom profissional e decisivo
- Faça referência ao título do artigo`,
    variables: ['title', 'product_names', 'introduction']
  },
  
  // SPR Introduction - Title-based
  'spr_intro': {
    content: `Você é um especialista em análises detalhadas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução cativante para um artigo com o título: "{title}"

A introdução deve:
- Ter 2-3 parágrafos
- Ser baseada especificamente no título fornecido
- Criar expectativa sobre a análise detalhada que virá
- Mencionar que fará uma análise completa com prós, contras e experiência real
- Indicar que ajudará o leitor a tomar uma decisão informada
- Ser envolvente e detalhista
- Usar português do Brasil
- NÃO mencionar o nome específico do produto ainda`,
    variables: ['title']
  },
  
  // SPR Product Review - With context
  'spr_product': {
    content: `Você está escrevendo uma análise detalhada de produto.

Contexto anterior:
{previous_context}

Nome do produto: {product_name}

Escreva uma análise COMPLETA e APROFUNDADA em português (pt-BR) que:
1. Mantenha continuidade com o contexto anterior
2. Parágrafo detalhado sobre o produto e seu posicionamento (3-4 frases)
3. Exatamente 6 prós (benefícios detalhados e específicos)
4. Exatamente 3 contras (limitações honestas mas equilibradas)
5. Análise aprofundada da experiência de uso (4-5 frases)
6. Recomendação final clara e persuasiva

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
    variables: ['previous_context', 'product_name']
  },
  
  // Informational Introduction - Title-based
  'content_intro': {
    content: `Você é um escritor especialista criando artigos educacionais em português (pt-BR).
Escreva uma introdução envolvente para um artigo intitulado: "{title}"

O artigo cobrirá os seguintes tópicos: {outline_topics}

A introdução deve:
- Ter 2-3 parágrafos
- Ser baseada especificamente no título fornecido
- Capturar a atenção do leitor
- Fazer uma breve visão geral do que será coberto
- Ser informativa e profissional
- Usar português do Brasil
- NÃO ter foco em vendas, mas sim educacional

Escreva em tom amigável e profissional adequado para um post de blog informativo.`,
    variables: ['title', 'outline_topics']
  },
  
  // Content Section - With context preservation
  'content_section': {
    content: `Você está escrevendo a seção {position} de {total} para um artigo educacional em português (pt-BR).

Contexto anterior (últimas 2 seções):
{previous_context}

Título da seção: {section_title}
Descrição da seção: {section_description}

Escreva uma seção abrangente que:
- Mantenha continuidade com o contexto anterior
- Comece com o título da seção como H2
- Forneça informações detalhadas e educacionais
- Tenha 3-4 parágrafos
- Use bullet points quando apropriado
- Mantenha tom profissional e informativo
- NÃO tenha foco em vendas
- Use português do Brasil

Foque em fornecer valor e educação ao leitor.`,
    variables: ['previous_context', 'position', 'total', 'section_title', 'section_description']
  }
};

async function updatePrompts() {
  try {
    console.log('🚀 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    let updated = 0;
    let failed = 0;
    
    for (const [code, updates] of Object.entries(updatedPrompts)) {
      try {
        const prompt = await Prompt.findOne({ code });
        
        if (prompt) {
          // Update content and variables
          prompt.content = updates.content;
          prompt.variables = updates.variables;
          prompt.updatedAt = new Date();
          
          await prompt.save();
          console.log(`✅ Updated ${code}:`);
          console.log(`   Variables: ${updates.variables.join(', ')}`);
          updated++;
        } else {
          console.log(`⚠️  Prompt ${code} not found`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${code}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} prompts`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} prompts`);
    }
    
    // Show current state
    console.log('\n📋 Current prompt variables:');
    const allPrompts = await Prompt.find({ category: { $in: ['bbr', 'spr', 'informational'] } })
      .sort({ category: 1, order: 1 });
    
    for (const prompt of allPrompts) {
      console.log(`${prompt.category}/${prompt.code}: [${prompt.variables.join(', ')}]`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the update
updatePrompts();