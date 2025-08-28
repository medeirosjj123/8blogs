#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function initializeAIConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import models
    const ApiConfig = require('../apps/api/dist/models/ApiConfig').ApiConfig;
    const Prompt = require('../apps/api/dist/models/Prompt').Prompt;

    // Check if configs already exist
    const existingConfigs = await ApiConfig.find();
    if (existingConfigs.length === 0) {
      console.log('📝 Creating default API configurations...');
      
      const defaultConfigs = [
        {
          provider: 'openai',
          name: 'OpenAI GPT-4o-mini',
          settings: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: 'gpt-4o-mini',
            maxTokens: 2000,
            temperature: 0.7
          },
          pricing: {
            inputCost: 0.15,
            outputCost: 0.60
          },
          isActive: !!process.env.OPENAI_API_KEY,
          isPrimary: true,
          isFallback: false,
          order: 1,
          healthCheck: {
            status: 'offline'
          },
          limits: {
            requestsPerMinute: 60,
            tokensPerDay: 1000000,
            currentUsage: {
              requests: 0,
              tokens: 0,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          provider: 'gemini',
          name: 'Google Gemini 1.5 Flash',
          settings: {
            apiKey: process.env.GEMINI_API_KEY || '',
            model: 'gemini-1.5-flash',
            maxTokens: 2000,
            temperature: 0.7
          },
          pricing: {
            inputCost: 0,
            outputCost: 0
          },
          isActive: !!process.env.GEMINI_API_KEY,
          isPrimary: false,
          isFallback: true,
          order: 2,
          healthCheck: {
            status: 'offline'
          },
          limits: {
            requestsPerMinute: 60,
            tokensPerDay: 1000000,
            currentUsage: {
              requests: 0,
              tokens: 0,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          }
        }
      ];

      await ApiConfig.insertMany(defaultConfigs);
      console.log('✅ API configurations created');
    } else {
      console.log('ℹ️ API configurations already exist');
    }

    // Check if prompts exist
    const existingPrompts = await Prompt.find({ category: 'reviews' });
    if (existingPrompts.length === 0) {
      console.log('📝 Creating default review prompts...');
      
      const defaultPrompts = [
        {
          code: 'review_intro',
          name: 'Review - Introdução',
          content: `Você é um especialista em análises de produtos escrevendo para um site de afiliados em português do Brasil.
Escreva uma introdução envolvente para um artigo de review sobre {product_count} produtos.
A introdução deve:
- Ter 2-3 parágrafos
- Criar entusiasmo e antecipação
- Mencionar que você analisará {product_count} produtos
- Ser amigável e conversacional
- Usar português brasileiro
NÃO mencione nomes específicos de produtos ainda.`,
          variables: ['product_count'],
          category: 'reviews',
          isActive: true,
          isSystem: true
        },
        {
          code: 'review_product',
          name: 'Review - Análise do Produto',
          content: `Você é um especialista em análises de produtos.
Contexto: {introduction}

Você está analisando o produto {position} de {total}.
Nome do produto: {product_name}

Escreva uma análise detalhada em português brasileiro que inclua:
1. Um parágrafo de abertura descrevendo o produto (2-3 frases)
2. Exatamente 4 prós (benefícios reais, seja específico)
3. Exatamente 2 contras (honestos mas não decisivos)
4. Um parágrafo com sua análise (3-4 frases)
5. Uma chamada para ação encorajando a compra

Formate sua resposta como:
DESCRIPTION: [parágrafo de abertura]
PROS:
- [pró 1]
- [pró 2]
- [pró 3]
- [pró 4]
CONS:
- [contra 1]
- [contra 2]
ANALYSIS: [seu parágrafo de análise]`,
          variables: ['introduction', 'position', 'total', 'product_name'],
          category: 'reviews',
          isActive: true,
          isSystem: true
        },
        {
          code: 'review_conclusion',
          name: 'Review - Conclusão',
          content: `Você analisou {product_count} produtos: {product_names}.
Contexto da introdução: {introduction}

Escreva uma conclusão em português brasileiro que:
- Resuma as análises (1 parágrafo)
- Dê uma recomendação final
- Agradeça ao leitor
- Tenha 2-3 parágrafos no total
- Mantenha o tom amigável e profissional`,
          variables: ['product_count', 'product_names', 'introduction'],
          category: 'reviews',
          isActive: true,
          isSystem: true
        }
      ];

      await Prompt.insertMany(defaultPrompts);
      console.log('✅ Review prompts created');
    } else {
      console.log('ℹ️ Review prompts already exist');
    }

    console.log('\n✨ AI configuration initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Add your API keys in the admin panel or .env file');
    console.log('2. Test the connections in the admin panel');
    console.log('3. Customize the prompts as needed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

initializeAIConfig();