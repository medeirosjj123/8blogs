#!/usr/bin/env node

/**
 * Script to initialize all content generation prompts in the database
 * Run: node scripts/initialize-prompts.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');

// Connect to MongoDB Atlas only
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required. Please set your MongoDB Atlas connection string.');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB Atlas connection error:', err);
    process.exit(1);
  });

// Define Prompt schema
const promptSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  content: { type: String, required: true },
  variables: [String],
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isSystem: { type: Boolean, default: false },
  metadata: {
    description: String,
    example: String,
    tips: String
  },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Prompt = mongoose.model('Prompt', promptSchema);

const allPrompts = [
  // BBR Prompts (Best Buy Review - Comparação)
  {
    code: 'bbr_intro',
    name: 'BBR Introduction (Melhores Produtos)',
    content: `Você é um especialista em análises comparativas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução empolgante para um artigo comparativo com o título "{title}" sobre os {product_count} MELHORES produtos de uma categoria.
A introdução deve:
- Ter 2-3 parágrafos
- Enfatizar que você testou e comparou múltiplas opções
- Mencionar que apresentará os {product_count} melhores produtos selecionados
- Destacar que ajudará o leitor a escolher a melhor opção
- Ser amigável e profissional
- Usar português do Brasil
NÃO mencione nomes específicos de produtos ainda.`,
    variables: ['title', 'product_count'],
    category: 'bbr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introduction for BBR (Best Buy Review) comparisons',
      tips: 'Emphasize comparison and selection process'
    }
  },
  {
    code: 'bbr_product',
    name: 'BBR Product Review (Comparativo)',
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
      description: 'Product review for BBR comparison context',
      tips: 'Focus on comparative advantages'
    }
  },
  {
    code: 'bbr_conclusion',
    name: 'BBR Conclusion (Melhor Escolha)',
    content: `Você escreveu um artigo comparativo sobre {product_count} produtos: {product_names}.

Aqui está TODO o conteúdo que foi gerado nesta sessão:
{full_content}

Baseando-se em TUDO que foi escrito acima, escreva uma conclusão em português (pt-BR) que:
- Resume as comparações destacando o MELHOR produto baseado nas análises (1 parágrafo)
- Referencie pontos específicos mencionados nas reviews (prós/contras)
- Mencione alternativas para diferentes necessidades/orçamentos
- Dê uma recomendação final clara sobre qual escolher
- Agradeça o leitor pela confiança
- Tenha 2-3 parágrafos no total
- Mantenha tom profissional e decisivo`,
    variables: ['product_count', 'product_names', 'introduction', 'full_content'],
    category: 'bbr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusion for BBR emphasizing best choice',
      tips: 'Be decisive about the winner'
    }
  },
  
  // SPR-specific prompts
  {
    code: 'spr_intro',
    name: 'SPR Introduction (Análise Única)',
    content: `Você é um especialista em análises detalhadas escrevendo para um site afiliado em português (pt-BR).
Escreva uma introdução cativante para uma análise COMPLETA e APROFUNDADA com o título "{title}" de UM único produto.
A introdução deve:
- Ter 2-3 parágrafos
- Criar expectativa sobre a análise detalhada que virá
- Mencionar que fará uma análise completa com prós, contras e experiência real
- Indicar que ajudará o leitor a tomar uma decisão informada
- Ser envolvente e detalhista
- Usar português do Brasil
NÃO mencione o nome específico do produto ainda.`,
    variables: ['title'],
    category: 'spr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introduction for SPR (Single Product Review)',
      tips: 'Focus on depth and detail'
    }
  },
  {
    code: 'spr_product',
    name: 'SPR Product Review (Análise Profunda)',
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
      description: 'Deep dive product review for SPR',
      tips: 'Provide comprehensive analysis with 6 pros and 3 cons'
    }
  },
  {
    code: 'spr_conclusion',
    name: 'SPR Conclusion (Decisão Final)',
    content: `Você fez uma análise profunda do produto: {product_names}.

Aqui está TODO o conteúdo que foi gerado nesta sessão:
{full_content}

Baseando-se em TODA a análise acima, escreva uma conclusão em português (pt-BR) que:
- Resume os pontos principais da análise detalhada referenciando prós/contras específicos (1 parágrafo)
- Destaque para quem este produto é ideal baseado nas características analisadas
- Mencione se vale o investimento considerando tudo que foi discutido
- Dê um veredito final claro (recomenda ou não) com base na análise completa
- Agradeça o leitor pelo tempo dedicado
- Tenha 2-3 parágrafos no total
- Seja decisivo e esclarecedor`,
    variables: ['product_names', 'introduction', 'full_content'],
    category: 'spr',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusion for SPR with clear verdict',
      tips: 'Be definitive about the recommendation'
    }
  },
  
  // Content generation prompts
  {
    code: 'content_intro',
    name: 'Content Introduction',
    content: `You are an expert content writer creating educational articles in Portuguese (pt-BR).
Write an engaging introduction for an article titled "{title}".
The article will cover the following topics: {outline_topics}

The introduction should:
- Be 2-3 paragraphs long
- Hook the reader's attention
- Briefly overview what will be covered
- Be informative and professional
- Use Portuguese from Brazil
- NOT be sales-focused, but educational

Write in a friendly, professional tone suitable for an informative blog post.`,
    variables: ['title', 'outline_topics'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Introduction for informational content',
      tips: 'Focus on education, not sales'
    }
  },
  {
    code: 'content_section',
    name: 'Content Section',
    content: `You are writing section {position} of {total} for an educational article in Portuguese (pt-BR).

Article context: {introduction}
Section title: {section_title}
Section description: {section_description}

Write a comprehensive section that:
- Starts with the section title as H2 heading
- Provides detailed, educational information
- Is 3-4 paragraphs long
- Uses bullet points when appropriate
- Maintains professional, informative tone
- Is NOT sales-focused
- Uses Portuguese from Brazil

Focus on providing value and education to the reader.`,
    variables: ['introduction', 'position', 'total', 'section_title', 'section_description'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Section for informational content',
      tips: 'Educational focus with detailed information'
    }
  },
  {
    code: 'content_conclusion',
    name: 'Content Conclusion',
    content: `You are concluding an educational article titled "{title}" in Portuguese (pt-BR).

Here is ALL the content that was generated in this session:
{full_content}

Based on EVERYTHING written above, write a conclusion that:
- Summarizes the key points covered in all sections (1-2 paragraphs)
- References specific topics and insights mentioned in the content
- Provides final thoughts or recommendations based on the complete article
- Thanks the reader
- Encourages engagement (comments, questions)
- Is 2-3 paragraphs total
- Maintains the educational, professional tone
- Uses Portuguese from Brazil`,
    variables: ['title', 'introduction', 'outline_topics', 'full_content'],
    category: 'informational',
    isActive: true,
    isSystem: true,
    metadata: {
      description: 'Conclusion for informational content',
      tips: 'Wrap up educational content with engagement call'
    }
  }
];

async function initializePrompts() {
  try {
    console.log('📝 Initializing prompts...');
    
    // Remove old prompts with wrong categories and old codes
    console.log('🧹 Cleaning up old prompts...');
    await Prompt.deleteMany({ 
      category: { $nin: ['bbr', 'spr', 'informational'] }
    });
    
    // Remove old generic prompts that shouldn't exist anymore
    await Prompt.deleteMany({
      code: { $in: ['review_intro', 'review_product', 'review_conclusion'] }
    });
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const promptData of allPrompts) {
      try {
        const existing = await Prompt.findOne({ code: promptData.code });
        
        if (existing) {
          // Update existing prompt only if it's a system prompt
          if (existing.isSystem) {
            Object.assign(existing, promptData);
            existing.updatedAt = new Date();
            await existing.save();
            console.log(`✅ Updated: ${promptData.code}`);
            updated++;
          } else {
            console.log(`⏭️  Skipped: ${promptData.code} (user-modified)`);
            skipped++;
          }
        } else {
          // Create new prompt
          await Prompt.create(promptData);
          console.log(`✅ Created: ${promptData.code}`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Error with ${promptData.code}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Created: ${created} prompts`);
    console.log(`   Updated: ${updated} prompts`);
    console.log(`   Skipped: ${skipped} prompts`);
    console.log('\n✨ Prompt initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing prompts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run initialization
initializePrompts();