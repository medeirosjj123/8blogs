import { Request, Response } from 'express';
import { Prompt } from '../models/Prompt';
import { AuthRequest } from '../middlewares/authMiddleware';

// Get all prompts (admin only)
export const getAllPrompts = async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query;
    
    const query: any = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const prompts = await Prompt.find(query)
      .sort({ category: 1, order: 1 })
      .populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      data: prompts
    });
  } catch (error: any) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompts'
    });
  }
};

// Get single prompt
export const getPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const prompt = await Prompt.findById(id)
      .populate('lastUpdatedBy', 'name email');
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    res.json({
      success: true,
      data: prompt
    });
  } catch (error: any) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prompt'
    });
  }
};

// Create new prompt (admin only)
export const createPrompt = async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, content, variables, category, metadata } = req.body;
    
    // Check if prompt with this code already exists
    const existing = await Prompt.findOne({ code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Prompt with this code already exists'
      });
    }

    const prompt = new Prompt({
      code,
      name,
      content,
      variables: variables || [],
      category,
      metadata: metadata || {},
      isActive: true,
      isSystem: false,
      lastUpdatedBy: req.user?.id
    });

    await prompt.save();

    res.status(201).json({
      success: true,
      data: prompt,
      message: 'Prompt created successfully'
    });
  } catch (error: any) {
    console.error('Error creating prompt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create prompt'
    });
  }
};

// Update prompt (admin only)
export const updatePrompt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Don't allow changing code if it's a system prompt
    if (prompt.isSystem && updates.code && updates.code !== prompt.code) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change code of system prompt'
      });
    }

    // Update fields
    Object.assign(prompt, updates);
    prompt.lastUpdatedBy = req.user?.id;
    
    await prompt.save();

    res.json({
      success: true,
      data: prompt,
      message: 'Prompt updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update prompt'
    });
  }
};

// Delete prompt (admin only)
export const deletePrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Don't allow deleting system prompts
    if (prompt.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system prompt'
      });
    }

    await prompt.deleteOne();

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prompt'
    });
  }
};

// Toggle prompt status
export const togglePromptStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    prompt.isActive = !prompt.isActive;
    await prompt.save();

    res.json({
      success: true,
      data: prompt,
      message: `Prompt ${prompt.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    console.error('Error toggling prompt status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle prompt status'
    });
  }
};

// Test prompt with sample data
export const testPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;
    
    const prompt = await Prompt.findById(id);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Compile the prompt with provided variables
    const compiled = prompt.compile(variables || {});

    res.json({
      success: true,
      data: {
        original: prompt.content,
        compiled,
        variables: prompt.variables
      }
    });
  } catch (error: any) {
    console.error('Error testing prompt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test prompt'
    });
  }
};

// Initialize default prompts
export const initializeDefaultPrompts = async (req: Request, res: Response) => {
  try {
    // Remove old prompts from unused categories and old generic prompts
    await Prompt.deleteMany({ 
      category: { $nin: ['bbr', 'spr', 'informational'] }
    });
    
    // Remove old generic prompts that shouldn't exist anymore
    await Prompt.deleteMany({
      code: { $in: ['review_intro', 'review_product', 'review_conclusion'] }
    });

    const defaultPrompts = [
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

    // Upsert prompts (create or update)
    let created = 0;
    let updated = 0;
    
    for (const promptData of defaultPrompts) {
      const existing = await Prompt.findOne({ code: promptData.code });
      
      if (existing) {
        // Update existing prompt if it's a system prompt
        if (existing.isSystem) {
          Object.assign(existing, promptData);
          existing.updatedAt = new Date();
          await existing.save();
          updated++;
        }
      } else {
        // Create new prompt
        await Prompt.create(promptData);
        created++;
      }
    }

    res.json({
      success: true,
      message: `Prompts initialized: ${created} created, ${updated} updated`,
      data: { created, updated }
    });
  } catch (error: any) {
    console.error('Error initializing prompts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default prompts'
    });
  }
};