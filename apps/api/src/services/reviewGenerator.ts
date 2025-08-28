import { aiService } from './aiService';
import { Prompt, IPrompt } from '../models/Prompt';
import { Review, IReview, IProduct } from '../models/Review';
import { User } from '../models/User';

interface GenerateContentInput {
  userId: string;
  title: string;
  contentType: 'bbr' | 'spr' | 'informational';
  products?: Array<{
    name: string;
    imageUrl?: string;
    affiliateLink: string;
  }>;
  outline?: Array<{
    title: string;
    content?: string;
  }>;
}

interface ReviewPart {
  pros: string[];
  cons: string[];
  description: string;
}

export class ReviewGenerator {
  private startTime: number = 0;

  async generateContent(input: GenerateContentInput): Promise<IReview> {
    this.startTime = Date.now();
    
    // Initialize AI service if needed
    await aiService.initialize();

    // Load prompts from database based on content type
    const prompts = await this.loadPrompts(input.contentType);
    
    if (input.contentType === 'bbr' || input.contentType === 'spr') {
      if (!prompts.intro || !prompts.product || !prompts.conclusion) {
        throw new Error('Required prompts for product reviews not found. Please configure prompts in admin panel.');
      }
    } else {
      if (!prompts.content_intro || !prompts.content_section || !prompts.content_conclusion) {
        throw new Error('Required prompts for content generation not found. Please configure prompts in admin panel.');
      }
    }

    let totalTokens = { input: 0, output: 0, total: 0 };
    let totalCost = 0;
    let provider = '';
    let model = '';

    try {
      if (input.contentType === 'bbr' || input.contentType === 'spr') {
        return await this.generateProductReview(input, prompts);
      } else {
        return await this.generateArticleContent(input, prompts);
      }
    } catch (error: any) {
      console.error('❌ Failed to generate content:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  private async generateProductReview(input: GenerateContentInput, prompts: any): Promise<IReview> {
    let totalTokens = { input: 0, output: 0, total: 0 };
    let totalCost = 0;
    let provider = '';
    let model = '';

    // 1. Generate introduction
    console.log('📝 Generating introduction...');
    const introResult = await this.generateIntroduction(prompts.intro, input.products!.length);
    totalTokens.input += introResult.usage.input;
    totalTokens.output += introResult.usage.output;
    totalTokens.total += introResult.usage.total;
    totalCost += introResult.cost;
    provider = introResult.provider;
    model = introResult.model;

    // 2. Generate review for each product
    console.log('📦 Generating product reviews...');
    const productReviews: ReviewPart[] = [];
    const reviewTexts: string[] = [];
    
    for (let i = 0; i < input.products!.length; i++) {
      const product = input.products![i];
      console.log(`  - Reviewing product ${i + 1}/${input.products!.length}: ${product.name}`);
      
      const reviewResult = await this.generateProductReviewSection(
        prompts.product,
        product,
        introResult.content,
        i + 1,
        input.products!.length
      );
      
      const parsed = this.parseProductReview(reviewResult.content, input.contentType);
      productReviews.push(parsed);
      reviewTexts.push(reviewResult.content);
      
      totalTokens.input += reviewResult.usage.input;
      totalTokens.output += reviewResult.usage.output;
      totalTokens.total += reviewResult.usage.total;
      totalCost += reviewResult.cost;
    }

    // 3. Generate outline sections if provided (for mixed content)
    const outlineSections: string[] = [];
    if (input.outline && input.outline.length > 0) {
      console.log('📖 Generating additional outline sections...');
      
      // Load content section prompt if not already loaded
      const contentSectionPrompt = prompts.content_section || 
        await Prompt.findOne({ code: 'content_section', isActive: true });
      
      for (let i = 0; i < input.outline.length; i++) {
        const outlineItem = input.outline[i];
        console.log(`  - Writing section ${i + 1}/${input.outline.length}: ${outlineItem.title}`);
        
        const sectionResult = await this.generateContentSection(
          contentSectionPrompt,
          outlineItem,
          introResult.content,
          i + 1,
          input.outline.length
        );
        
        outlineSections.push(sectionResult.content);
        
        totalTokens.input += sectionResult.usage.input;
        totalTokens.output += sectionResult.usage.output;
        totalTokens.total += sectionResult.usage.total;
        totalCost += sectionResult.cost;
      }
    }

    // 4. Generate conclusion
    console.log('✍️ Generating conclusion...');
    const conclusionResult = await this.generateConclusion(
      prompts.conclusion,
      input.products!,
      introResult.content
    );
    
    totalTokens.input += conclusionResult.usage.input;
    totalTokens.output += conclusionResult.usage.output;
    totalTokens.total += conclusionResult.usage.total;
    totalCost += conclusionResult.cost;

    // 5. Build final HTML with both products and outline sections
    const fullHtml = this.buildMixedContentHTML(
      input.title,
      introResult.content,
      input.products!,
      productReviews,
      input.outline || [],
      outlineSections,
      conclusionResult.content
    );

    // 6. Create products array with pros and cons
    const products: IProduct[] = input.products!.map((p, i) => ({
      name: p.name,
      imageUrl: p.imageUrl,
      affiliateLink: p.affiliateLink,
      pros: productReviews[i].pros,
      cons: productReviews[i].cons,
      description: productReviews[i].description
    }));

    // 7. Save review to database
    const review = new Review({
      userId: input.userId,
      title: input.title,
      products,
      content: {
        introduction: introResult.content,
        reviews: [...reviewTexts, ...outlineSections], // Combine both product reviews and outline sections
        conclusion: conclusionResult.content,
        fullHtml
      },
      metadata: {
        model,
        provider,
        tokensUsed: totalTokens,
        cost: totalCost,
        generationTime: (Date.now() - this.startTime) / 1000,
        generatedAt: new Date(),
        hasOutline: outlineSections.length > 0
      },
      status: 'draft'
    });

    await review.save();
    
    console.log(`✅ Product review generated successfully in ${review.metadata.generationTime}s`);
    console.log(`   - Provider: ${provider} (${model})`);
    console.log(`   - Tokens: ${totalTokens.total}`);
    console.log(`   - Cost: $${totalCost.toFixed(4)}`);
    if (outlineSections.length > 0) {
      console.log(`   - Additional sections: ${outlineSections.length}`);
    }
    
    return review;
  }

  private async generateArticleContent(input: GenerateContentInput, prompts: any): Promise<IReview> {
    let totalTokens = { input: 0, output: 0, total: 0 };
    let totalCost = 0;
    let provider = '';
    let model = '';

    // 1. Generate introduction
    console.log('📝 Generating article introduction...');
    const introResult = await this.generateContentIntroduction(prompts.content_intro, input.title, input.outline!);
    totalTokens.input += introResult.usage.input;
    totalTokens.output += introResult.usage.output;
    totalTokens.total += introResult.usage.total;
    totalCost += introResult.cost;
    provider = introResult.provider;
    model = introResult.model;

    // 2. Generate content for each outline section
    console.log('📖 Generating content sections...');
    const sectionTexts: string[] = [];
    
    for (let i = 0; i < input.outline!.length; i++) {
      const outlineItem = input.outline![i];
      console.log(`  - Writing section ${i + 1}/${input.outline!.length}: ${outlineItem.title}`);
      
      const sectionResult = await this.generateContentSection(
        prompts.content_section,
        outlineItem,
        introResult.content,
        i + 1,
        input.outline!.length
      );
      
      sectionTexts.push(sectionResult.content);
      
      totalTokens.input += sectionResult.usage.input;
      totalTokens.output += sectionResult.usage.output;
      totalTokens.total += sectionResult.usage.total;
      totalCost += sectionResult.cost;
    }

    // 3. Generate conclusion
    console.log('✍️ Generating article conclusion...');
    const conclusionResult = await this.generateContentConclusion(
      prompts.content_conclusion,
      input.title,
      input.outline!,
      introResult.content
    );
    
    totalTokens.input += conclusionResult.usage.input;
    totalTokens.output += conclusionResult.usage.output;
    totalTokens.total += conclusionResult.usage.total;
    totalCost += conclusionResult.cost;

    // 4. Build final HTML
    const fullHtml = this.buildContentHTML(
      input.title,
      introResult.content,
      input.outline!,
      sectionTexts,
      conclusionResult.content
    );

    // 5. Save content as review to database (reusing the same model)
    const review = new Review({
      userId: input.userId,
      title: input.title,
      products: [], // No products for content generation
      content: {
        introduction: introResult.content,
        reviews: sectionTexts, // Store sections as reviews
        conclusion: conclusionResult.content,
        fullHtml
      },
      metadata: {
        model,
        provider,
        tokensUsed: totalTokens,
        cost: totalCost,
        generationTime: (Date.now() - this.startTime) / 1000,
        generatedAt: new Date(),
        contentType: 'content' // Add content type to metadata
      },
      status: 'draft'
    });

    await review.save();
    
    console.log(`✅ Article content generated successfully in ${review.metadata.generationTime}s`);
    console.log(`   - Provider: ${provider} (${model})`);
    console.log(`   - Tokens: ${totalTokens.total}`);
    console.log(`   - Cost: $${totalCost.toFixed(4)}`);
    
    return review;
  }

  private async loadPrompts(contentType: 'bbr' | 'spr' | 'informational'): Promise<any> {
    if (contentType === 'bbr') {
      // Try to load BBR-specific prompts first
      let [intro, product, conclusion] = await Promise.all([
        Prompt.findOne({ code: 'bbr_intro', isActive: true }),
        Prompt.findOne({ code: 'bbr_product', isActive: true }),
        Prompt.findOne({ code: 'bbr_conclusion', isActive: true })
      ]);

      // Fallback to generic review prompts if BBR-specific don't exist
      if (!intro || !product || !conclusion) {
        [intro, product, conclusion] = await Promise.all([
          Prompt.findOne({ code: 'review_intro', isActive: true }),
          Prompt.findOne({ code: 'review_product', isActive: true }),
          Prompt.findOne({ code: 'review_conclusion', isActive: true })
        ]);
      }

      // If still no prompts, create defaults
      if (!intro || !product || !conclusion) {
        await this.createDefaultPrompts();
        return this.loadPrompts(contentType);
      }

      return { intro, product, conclusion };
    } else if (contentType === 'spr') {
      // Try to load SPR-specific prompts first
      let [intro, product, conclusion] = await Promise.all([
        Prompt.findOne({ code: 'spr_intro', isActive: true }),
        Prompt.findOne({ code: 'spr_product', isActive: true }),
        Prompt.findOne({ code: 'spr_conclusion', isActive: true })
      ]);

      // Fallback to generic review prompts if SPR-specific don't exist
      if (!intro || !product || !conclusion) {
        [intro, product, conclusion] = await Promise.all([
          Prompt.findOne({ code: 'review_intro', isActive: true }),
          Prompt.findOne({ code: 'review_product', isActive: true }),
          Prompt.findOne({ code: 'review_conclusion', isActive: true })
        ]);
      }

      // If still no prompts, create defaults
      if (!intro || !product || !conclusion) {
        await this.createDefaultPrompts();
        return this.loadPrompts(contentType);
      }

      return { intro, product, conclusion };
    } else {
      const [content_intro, content_section, content_conclusion] = await Promise.all([
        Prompt.findOne({ code: 'content_intro', isActive: true }),
        Prompt.findOne({ code: 'content_section', isActive: true }),
        Prompt.findOne({ code: 'content_conclusion', isActive: true })
      ]);

      // If prompts don't exist, create default ones
      if (!content_intro || !content_section || !content_conclusion) {
        await this.createDefaultPrompts();
        return this.loadPrompts(contentType);
      }

      return { content_intro, content_section, content_conclusion };
    }
  }

  private async createDefaultPrompts() {
    const defaultPrompts = [
      // Generic review prompts (used as fallback)
      {
        code: 'review_intro',
        name: 'Review Introduction (Generic)',
        content: `You are an expert product reviewer writing for an affiliate website in Portuguese (pt-BR).
Write an engaging introduction for a review article about {product_count} products.
The introduction should:
- Be 2-3 paragraphs long
- Create excitement and anticipation
- Mention that you'll be reviewing {product_count} products
- Be friendly and conversational
- Use Portuguese from Brazil
Do NOT mention specific product names yet.`,
        variables: ['product_count'],
        category: 'bbr',
        isActive: true,
        isSystem: true
      },
      // BBR-specific prompts (Best Buy Review - Multiple products comparison)
      {
        code: 'bbr_intro',
        name: 'BBR Introduction (Melhores Produtos)',
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
        isSystem: true
      },
      // SPR-specific prompts (Single Product Review - Deep dive)
      {
        code: 'spr_intro',
        name: 'SPR Introduction (Análise Única)',
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
        isSystem: true
      },
      {
        code: 'review_product',
        name: 'Product Review (Generic)',
        content: `You are an expert product reviewer. 
Context: {introduction}

You are reviewing product {position} of {total}.
Product name: {product_name}

Write a detailed review in Portuguese (pt-BR) that includes:
1. An opening paragraph describing the product (2-3 sentences)
2. Exactly 4 pros (real benefits, be specific)
3. Exactly 2 cons (honest but not deal-breakers)
4. A paragraph with your analysis (3-4 sentences)
5. A closing call-to-action encouraging the purchase

Format your response as:
DESCRIPTION: [opening paragraph]
PROS:
- [pro 1]
- [pro 2]
- [pro 3]
- [pro 4]
CONS:
- [con 1]
- [con 2]
ANALYSIS: [your analysis paragraph]`,
        variables: ['introduction', 'position', 'total', 'product_name'],
        category: 'bbr',
        isActive: true,
        isSystem: true
      },
      // BBR product review (comparison context)
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
        isSystem: true
      },
      // SPR product review (deep dive)
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
        isSystem: true
      },
      {
        code: 'review_conclusion',
        name: 'Review Conclusion (Generic)',
        content: `You reviewed {product_count} products: {product_names}.
Introduction context: {introduction}

Write a conclusion in Portuguese (pt-BR) that:
- Summarizes the reviews (1 paragraph)
- Gives a final recommendation
- Thanks the reader
- Is 2-3 paragraphs total
- Maintains the friendly, professional tone`,
        variables: ['product_count', 'product_names', 'introduction'],
        category: 'bbr',
        isActive: true,
        isSystem: true
      },
      // BBR conclusion (best choice emphasis)
      {
        code: 'bbr_conclusion',
        name: 'BBR Conclusion (Melhor Escolha)',
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
        isSystem: true
      },
      // SPR conclusion (purchase decision)
      {
        code: 'spr_conclusion',
        name: 'SPR Conclusion (Decisão Final)',
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
        isSystem: true
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
        isSystem: true
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
        isSystem: true
      },
      {
        code: 'content_conclusion',
        name: 'Content Conclusion',
        content: `You are concluding an educational article titled "{title}" in Portuguese (pt-BR).

Introduction context: {introduction}
Topics covered: {outline_topics}

Write a conclusion that:
- Summarizes the key points (1-2 paragraphs)
- Provides final thoughts or recommendations
- Thanks the reader
- Encourages engagement (comments, questions)
- Is 2-3 paragraphs total
- Maintains the educational, professional tone
- Uses Portuguese from Brazil`,
        variables: ['title', 'introduction', 'outline_topics'],
        category: 'informational',
        isActive: true,
        isSystem: true
      }
    ];

    await Prompt.insertMany(defaultPrompts);
    console.log('✅ Default prompts created');
  }

  private async generateIntroduction(prompt: IPrompt, productCount: number) {
    const compiledPrompt = prompt.compile({
      product_count: productCount.toString()
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateProductReviewSection(
    prompt: IPrompt,
    product: any,
    introduction: string,
    position: number,
    total: number
  ) {
    const compiledPrompt = prompt.compile({
      introduction: introduction.substring(0, 500), // Limit context size
      position: position.toString(),
      total: total.toString(),
      product_name: product.name
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateContentIntroduction(prompt: IPrompt, title: string, outline: any[]) {
    const outlineTopics = outline.map(item => item.title).join(', ');
    
    const compiledPrompt = prompt.compile({
      title,
      outline_topics: outlineTopics
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateContentSection(
    prompt: IPrompt,
    outlineItem: any,
    introduction: string,
    position: number,
    total: number
  ) {
    const compiledPrompt = prompt.compile({
      introduction: introduction.substring(0, 500), // Limit context size
      position: position.toString(),
      total: total.toString(),
      section_title: outlineItem.title,
      section_description: outlineItem.content || 'No specific description provided'
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateContentConclusion(
    prompt: IPrompt,
    title: string,
    outline: any[],
    introduction: string
  ) {
    const outlineTopics = outline.map(item => item.title).join(', ');
    
    const compiledPrompt = prompt.compile({
      title,
      introduction: introduction.substring(0, 500),
      outline_topics: outlineTopics
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateConclusion(
    prompt: IPrompt,
    products: any[],
    introduction: string
  ) {
    const compiledPrompt = prompt.compile({
      product_count: products.length.toString(),
      product_names: products.map(p => p.name).join(', '),
      introduction: introduction.substring(0, 500)
    });

    return aiService.generateContent(compiledPrompt);
  }

  private parseProductReview(content: string, contentType: 'bbr' | 'spr' | 'informational' = 'bbr'): ReviewPart {
    const lines = content.split('\n');
    const result: ReviewPart = {
      pros: [],
      cons: [],
      description: ''
    };

    // Determine expected counts based on content type
    const expectedPros = contentType === 'spr' ? 6 : 4;
    const expectedCons = contentType === 'spr' ? 3 : 2;

    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('DESCRIPTION:')) {
        result.description = trimmed.replace('DESCRIPTION:', '').trim();
        currentSection = 'description';
      } else if (trimmed === 'PROS:') {
        currentSection = 'pros';
      } else if (trimmed === 'CONS:') {
        currentSection = 'cons';
      } else if (trimmed.startsWith('ANALYSIS:')) {
        result.description += '\n\n' + trimmed.replace('ANALYSIS:', '').trim();
        currentSection = 'analysis';
      } else if (trimmed.startsWith('- ')) {
        const item = trimmed.substring(2);
        if (currentSection === 'pros' && result.pros.length < expectedPros) {
          result.pros.push(item);
        } else if (currentSection === 'cons' && result.cons.length < expectedCons) {
          result.cons.push(item);
        }
      } else if (trimmed && currentSection === 'description') {
        result.description += ' ' + trimmed;
      } else if (trimmed && currentSection === 'analysis') {
        result.description += ' ' + trimmed;
      }
    }

    // Ensure we have the right number of pros and cons
    while (result.pros.length < expectedPros) {
      result.pros.push('Excelente custo-benefício');
    }
    while (result.cons.length < expectedCons) {
      result.cons.push('Pode não atender todos os perfis');
    }

    return result;
  }

  private buildProductReviewHTML(
    title: string,
    introduction: string,
    products: any[],
    reviews: ReviewPart[],
    conclusion: string
  ): string {
    // Use the mixed content builder with empty outline
    return this.buildMixedContentHTML(
      title,
      introduction,
      products,
      reviews,
      [],
      [],
      conclusion
    );
  }

  private buildMixedContentHTML(
    title: string,
    introduction: string,
    products: any[],
    reviews: ReviewPart[],
    outline: any[],
    outlineSections: string[],
    conclusion: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    .product-review {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .introduction, .conclusion {
      margin: 30px 0;
      font-size: 16px;
      color: #333;
    }
    .product-section {
      margin: 40px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 10px;
    }
    .product-section h2 {
      color: #E10600;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .product-image {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
    }
    .pros-cons-table {
      margin: 20px 0;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .pros-cons-table table {
      width: 100%;
      border-collapse: collapse;
    }
    .pros-cons-table th {
      padding: 15px;
      font-weight: bold;
      text-align: left;
      color: white;
      font-size: 16px;
    }
    .pros-cons-table th:first-child {
      background: #10B981;
    }
    .pros-cons-table th:last-child {
      background: #EF4444;
    }
    .pros-cons-table td {
      padding: 20px;
      background: white;
      vertical-align: top;
      width: 50%;
    }
    .pros-cons-table ul {
      margin: 0;
      padding-left: 20px;
    }
    .pros-cons-table li {
      margin: 8px 0;
      color: #555;
    }
    .review-text {
      margin: 20px 0;
      color: #333;
      line-height: 1.7;
    }
    .content-section {
      margin: 40px 0;
      font-size: 16px;
    }
    .content-section h2 {
      color: #E10600;
      font-size: 24px;
      margin: 40px 0 20px 0;
      font-weight: bold;
      border-bottom: 2px solid #E10600;
      padding-bottom: 10px;
    }
    .content-section p {
      margin: 15px 0;
    }
    .content-section ul, .content-section ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    .content-section li {
      margin: 8px 0;
    }
    .cta-button {
      display: inline-block;
      background: #E10600;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      text-align: center;
      margin: 20px auto;
      display: block;
      max-width: 300px;
      transition: background 0.3s;
    }
    .cta-button:hover {
      background: #c00500;
    }
  </style>
</head>
<body>
  <article class="product-review">
    <h1>${title}</h1>
    
    <div class="introduction">${introduction.replace(/\n/g, '<br>')}</div>
    
    ${products.map((product, i) => `
      <div class="product-section">
        <h2>${product.name}</h2>
        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-image">` : ''}
        
        <div class="review-text">${reviews[i].description.replace(/\n/g, '<br>')}</div>
        
        <div class="pros-cons-table">
          <table>
            <thead>
              <tr>
                <th>✅ Prós</th>
                <th>❌ Contras</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <ul>
                    ${reviews[i].pros.map(pro => `<li>${pro}</li>`).join('')}
                  </ul>
                </td>
                <td>
                  <ul>
                    ${reviews[i].cons.map(con => `<li>${con}</li>`).join('')}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <a href="${product.affiliateLink}" class="cta-button" target="_blank" rel="nofollow noopener">
          Ver Melhor Preço →
        </a>
      </div>
    `).join('')}
    
    ${outlineSections.length > 0 ? `
      <!-- Additional Content Sections -->
      ${outlineSections.map((section, i) => `
        <div class="content-section">
          ${section.replace(/\n/g, '<br>')}
        </div>
      `).join('')}
    ` : ''}
    
    <div class="conclusion">${conclusion.replace(/\n/g, '<br>')}</div>
  </article>
</body>
</html>`;
  }

  private buildContentHTML(
    title: string,
    introduction: string,
    outline: any[],
    sectionTexts: string[],
    conclusion: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    .content-article {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .content-article h1 {
      color: #E10600;
      font-size: 32px;
      margin-bottom: 20px;
      font-weight: bold;
    }
    .content-article h2 {
      color: #E10600;
      font-size: 24px;
      margin: 40px 0 20px 0;
      font-weight: bold;
      border-bottom: 2px solid #E10600;
      padding-bottom: 10px;
    }
    .introduction, .conclusion {
      margin: 30px 0;
      font-size: 16px;
      background: #f9f9f9;
      padding: 20px;
      border-radius: 10px;
    }
    .content-section {
      margin: 40px 0;
      font-size: 16px;
    }
    .content-section p {
      margin: 15px 0;
    }
    .content-section ul, .content-section ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    .content-section li {
      margin: 8px 0;
    }
    .content-section blockquote {
      border-left: 4px solid #E10600;
      margin: 20px 0;
      padding: 10px 20px;
      background: #f5f5f5;
      font-style: italic;
    }
  </style>
</head>
<body>
  <article class="content-article">
    <h1>${title}</h1>
    
    <div class="introduction">${introduction.replace(/\n/g, '<br>')}</div>
    
    ${sectionTexts.map((section, i) => `
      <div class="content-section">
        ${section.replace(/\n/g, '<br>')}
      </div>
    `).join('')}
    
    <div class="conclusion">${conclusion.replace(/\n/g, '<br>')}</div>
  </article>
</body>
</html>`;
  }
  // Backward compatibility method
  async generateReview(input: any): Promise<IReview> {
    return this.generateContent({
      ...input,
      contentType: 'bbr'
    });
  }
}

// Singleton instance
export const reviewGenerator = new ReviewGenerator();