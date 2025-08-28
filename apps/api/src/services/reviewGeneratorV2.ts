import { aiService } from './aiService';
import { Prompt, IPrompt } from '../models/Prompt';
import { Review, IReview, IProduct } from '../models/Review';
import { User } from '../models/User';
import { TextFormatter } from '../utils/textFormatter';

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

export class ReviewGeneratorV2 {
  private startTime: number = 0;
  private contextHistory: string[] = []; // Track last 2 sections
  private fullContentAccumulator: string[] = []; // Track ALL generated content for conclusion

  async generateContent(input: GenerateContentInput): Promise<IReview> {
    this.startTime = Date.now();
    this.contextHistory = []; // Reset context for new generation
    this.fullContentAccumulator = []; // Reset full content accumulator
    
    
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

    // 1. Generate introduction based on TITLE
    console.log('📝 Generating introduction based on title...');
    const introResult = await this.generateIntroduction(prompts.intro, input.title, input.products?.length || 0);
    console.log('📋 Introduction result:', introResult.content.substring(0, 200) + '...');
    this.updateContext(introResult.content); // Add to context history
    this.addToFullContent('Introdução', introResult.content); // Add to full content
    
    totalTokens.input += introResult.usage.input;
    totalTokens.output += introResult.usage.output;
    totalTokens.total += introResult.usage.total;
    totalCost += introResult.cost;
    provider = introResult.provider;
    model = introResult.model;

    // 2. Generate outline sections if provided (with context)
    const outlineSections: string[] = [];
    if (input.outline && input.outline.length > 0) {
      console.log('📖 Generating outline sections with context...');
      
      const contentSectionPrompt = prompts.content_section || 
        await Prompt.findOne({ code: 'content_section', isActive: true });
      
      for (let i = 0; i < input.outline.length; i++) {
        const outlineItem = input.outline[i];
        console.log(`  - Writing section ${i + 1}/${input.outline.length}: ${outlineItem.title}`);
        
        const sectionResult = await this.generateContentSection(
          contentSectionPrompt,
          outlineItem,
          this.getPreviousContext(), // Pass last 2 sections as context
          i + 1,
          input.outline.length
        );
        
        outlineSections.push(sectionResult.content);
        this.updateContext(sectionResult.content); // Update context history
        this.addToFullContent(outlineItem.title, sectionResult.content); // Add to full content
        
        totalTokens.input += sectionResult.usage.input;
        totalTokens.output += sectionResult.usage.output;
        totalTokens.total += sectionResult.usage.total;
        totalCost += sectionResult.cost;
      }
    }

    // 3. Generate product reviews (with context from intro + outlines)
    console.log('📦 Generating product reviews with context...');
    const productReviews: ReviewPart[] = [];
    const reviewTexts: string[] = [];
    
    for (let i = 0; i < input.products!.length; i++) {
      const product = input.products![i];
      console.log(`  - Reviewing product ${i + 1}/${input.products!.length}: ${product.name}`);
      
      const reviewResult = await this.generateProductReviewSection(
        prompts.product,
        product,
        this.getPreviousContext(), // Pass last 2 sections as context
        i + 1,
        input.products!.length
      );
      
      console.log('📋 Raw AI response for "' + product.name + '":', reviewResult.content);
      const parsed = this.parseProductReview(reviewResult.content, input.contentType);
      console.log('📋 Parsed result for "' + product.name + '":', parsed);
      productReviews.push(parsed);
      reviewTexts.push(reviewResult.content);
      this.updateContext(reviewResult.content); // Update context history
      this.addToFullContent(`Review: ${product.name}`, reviewResult.content); // Add to full content
      
      totalTokens.input += reviewResult.usage.input;
      totalTokens.output += reviewResult.usage.output;
      totalTokens.total += reviewResult.usage.total;
      totalCost += reviewResult.cost;
    }

    // 4. Generate conclusion (with title and full content)
    console.log('✍️ Generating conclusion...');
    const conclusionResult = await this.generateConclusion(
      prompts.conclusion,
      input.title,
      input.products!,
      introResult.content,
      this.getFullContent()
    );
    console.log('📋 Conclusion result:', conclusionResult.content.substring(0, 200) + '...');
    
    totalTokens.input += conclusionResult.usage.input;
    totalTokens.output += conclusionResult.usage.output;
    totalTokens.total += conclusionResult.usage.total;
    totalCost += conclusionResult.cost;

    // 5. Build final HTML
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
    console.log('💾 Preparing to save review with content:', {
      hasIntroduction: !!introResult.content,
      introLength: introResult.content?.length || 0,
      reviewsCount: [...outlineSections, ...reviewTexts].length,
      hasConclusion: !!conclusionResult.content,
      conclusionLength: conclusionResult.content?.length || 0,
      hasFullHtml: !!fullHtml,
      htmlLength: fullHtml?.length || 0
    });
    
    const review = new Review({
      userId: input.userId,
      title: input.title,
      contentType: input.contentType,
      products,
      content: {
        introduction: introResult.content,
        reviews: [...outlineSections, ...reviewTexts], // Outlines first, then products
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
      console.log(`   - Outline sections: ${outlineSections.length}`);
    }
    console.log(`   - Product reviews: ${products.length}`);
    
    return review;
  }

  private async generateArticleContent(input: GenerateContentInput, prompts: any): Promise<IReview> {
    let totalTokens = { input: 0, output: 0, total: 0 };
    let totalCost = 0;
    let provider = '';
    let model = '';
    this.contextHistory = []; // Reset context
    this.fullContentAccumulator = []; // Reset full content accumulator

    // 1. Generate introduction based on TITLE
    console.log('📝 Generating content introduction...');
    const introResult = await this.generateContentIntroduction(
      prompts.content_intro,
      input.title,
      input.outline!
    );
    this.updateContext(introResult.content);
    this.addToFullContent('Introdução', introResult.content); // Add to full content
    
    totalTokens.input += introResult.usage.input;
    totalTokens.output += introResult.usage.output;
    totalTokens.total += introResult.usage.total;
    totalCost += introResult.cost;
    provider = introResult.provider;
    model = introResult.model;

    // 2. Generate each section with context
    console.log('📖 Generating content sections...');
    const sections: string[] = [];
    
    for (let i = 0; i < input.outline!.length; i++) {
      const outlineItem = input.outline![i];
      console.log(`  - Writing section ${i + 1}/${input.outline!.length}: ${outlineItem.title}`);
      
      const sectionResult = await this.generateContentSection(
        prompts.content_section,
        outlineItem,
        this.getPreviousContext(),
        i + 1,
        input.outline!.length
      );
      
      sections.push(sectionResult.content);
      this.updateContext(sectionResult.content);
      this.addToFullContent(outlineItem.title, sectionResult.content); // Add to full content
      
      totalTokens.input += sectionResult.usage.input;
      totalTokens.output += sectionResult.usage.output;
      totalTokens.total += sectionResult.usage.total;
      totalCost += sectionResult.cost;
    }

    // 3. Generate conclusion
    console.log('✍️ Generating content conclusion...');
    const conclusionResult = await this.generateContentConclusion(
      prompts.content_conclusion,
      input.title,
      input.outline!,
      introResult.content,
      this.getFullContent()
    );
    
    totalTokens.input += conclusionResult.usage.input;
    totalTokens.output += conclusionResult.usage.output;
    totalTokens.total += conclusionResult.usage.total;
    totalCost += conclusionResult.cost;

    // 4. Build HTML
    const fullHtml = this.buildContentHTML(
      input.title,
      introResult.content,
      input.outline!,
      sections,
      conclusionResult.content
    );

    // 5. Save to database
    const review = new Review({
      userId: input.userId,
      title: input.title,
      contentType: input.contentType,
      products: [],
      content: {
        introduction: introResult.content,
        reviews: sections,
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
        hasOutline: true
      },
      status: 'draft'
    });

    await review.save();
    
    console.log(`✅ Content generated successfully in ${review.metadata.generationTime}s`);
    console.log(`   - Provider: ${provider} (${model})`);
    console.log(`   - Tokens: ${totalTokens.total}`);
    console.log(`   - Cost: $${totalCost.toFixed(4)}`);
    console.log(`   - Sections: ${sections.length}`);
    
    return review;
  }

  // Context management - keeps last 2 sections
  private updateContext(newSection: string) {
    this.contextHistory.push(newSection);
    // Keep only last 2 sections for context
    if (this.contextHistory.length > 2) {
      this.contextHistory.shift();
    }
  }

  private getPreviousContext(): string {
    // Return last 2 sections as context, limited to 1000 chars each
    return this.contextHistory
      .map(section => section.substring(0, 1000))
      .join('\n\n---\n\n');
  }

  // Full content management for conclusion
  private addToFullContent(sectionType: string, content: string) {
    this.fullContentAccumulator.push(`## ${sectionType}\n${content}`);
  }

  private getFullContent(): string {
    // Return all accumulated content, limited to 8000 chars total for AI processing
    const fullContent = this.fullContentAccumulator.join('\n\n---\n\n');
    return fullContent.substring(0, 8000);
  }

  // Load prompts based on content type
  private async loadPrompts(contentType: 'bbr' | 'spr' | 'informational'): Promise<any> {
    const prompts: any = {};
    
    console.log(`🔍 Loading prompts for content type: ${contentType}`);
    
    if (contentType === 'bbr') {
      // Load BBR-specific prompts
      prompts.intro = await Prompt.findOne({ code: 'bbr_intro', isActive: true });
      prompts.product = await Prompt.findOne({ code: 'bbr_product', isActive: true });
      prompts.conclusion = await Prompt.findOne({ code: 'bbr_conclusion', isActive: true });
      prompts.content_section = await Prompt.findOne({ code: 'content_section', isActive: true });
      
    } else if (contentType === 'spr') {
      // SPR-specific prompts
      prompts.intro = await Prompt.findOne({ code: 'spr_intro', isActive: true });
      prompts.product = await Prompt.findOne({ code: 'spr_product', isActive: true });
      prompts.conclusion = await Prompt.findOne({ code: 'spr_conclusion', isActive: true });
      prompts.content_section = await Prompt.findOne({ code: 'content_section', isActive: true });
    } else {
      // Informational content prompts
      prompts.content_intro = await Prompt.findOne({ code: 'content_intro', isActive: true });
      prompts.content_section = await Prompt.findOne({ code: 'content_section', isActive: true });
      prompts.content_conclusion = await Prompt.findOne({ code: 'content_conclusion', isActive: true });
    }
    
    
    return prompts;
  }

  // Generation methods with updated signatures
  private async generateIntroduction(prompt: IPrompt, title: string, productCount?: number) {
    const variables: any = { title };
    
    // Add product_count for BBR/SPR prompts if provided
    if (productCount !== undefined) {
      variables.product_count = productCount.toString();
    }
    
    const compiledPrompt = prompt.compile(variables);

    return aiService.generateContent(compiledPrompt);
  }

  private async generateProductReviewSection(
    prompt: IPrompt,
    product: any,
    previousContext: string,
    position: number,
    total: number
  ) {
    const variables = {
      previous_context: previousContext || 'No previous context',
      position: position.toString(),
      total: total.toString(),
      product_name: product.name
    };
    
    const compiledPrompt = prompt.compile(variables);

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
    previousContext: string,
    position: number,
    total: number
  ) {
    const compiledPrompt = prompt.compile({
      previous_context: previousContext || 'No previous context',
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
    introduction: string,
    fullContent: string
  ) {
    const outlineTopics = outline.map(item => item.title).join(', ');
    
    const compiledPrompt = prompt.compile({
      title,
      introduction: introduction.substring(0, 500),
      outline_topics: outlineTopics,
      full_content: fullContent
    });

    return aiService.generateContent(compiledPrompt);
  }

  private async generateConclusion(
    prompt: IPrompt,
    title: string,
    products: any[],
    introduction: string,
    fullContent: string
  ) {
    const compiledPrompt = prompt.compile({
      title,
      product_names: products.map(p => p.name).join(', '),
      introduction: introduction.substring(0, 500),
      full_content: fullContent
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

    let section = '';
    let analysisText = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('DESCRIPTION:')) {
        section = 'description';
        result.description = trimmed.replace('DESCRIPTION:', '').trim();
      } else if (trimmed === 'PROS:') {
        section = 'pros';
      } else if (trimmed === 'CONS:') {
        section = 'cons';
      } else if (trimmed.startsWith('ANALYSIS:')) {
        section = 'analysis';
        analysisText = trimmed.replace('ANALYSIS:', '').trim();
      } else if (trimmed.startsWith('-') && section === 'pros') {
        if (result.pros.length < expectedPros) {
          result.pros.push(trimmed.substring(1).trim());
        }
      } else if (trimmed.startsWith('-') && section === 'cons') {
        if (result.cons.length < expectedCons) {
          result.cons.push(trimmed.substring(1).trim());
        }
      } else if (section === 'description' && trimmed) {
        result.description += ' ' + trimmed;
      } else if (section === 'analysis' && trimmed) {
        analysisText += ' ' + trimmed;
      }
    }

    // Append analysis to description if exists
    if (analysisText) {
      result.description = result.description + '\n\n' + analysisText;
    }

    // Ensure we have the expected number of pros and cons
    while (result.pros.length < expectedPros) {
      result.pros.push(`Benefício adicional ${result.pros.length + 1}`);
    }
    while (result.cons.length < expectedCons) {
      result.cons.push(`Ponto de atenção ${result.cons.length + 1}`);
    }

    return result;
  }

  private buildMixedContentHTML(
    title: string,
    introduction: string,
    products: any[],
    productReviews: ReviewPart[],
    outline: any[],
    outlineSections: string[],
    conclusion: string
  ): string {
    let html = `<article class="review-article">\n`;
    html += `<h1 style="font-size: 28px; font-weight: bold; color: #000; margin-bottom: 24px; line-height: 1.3;">${title}</h1>\n\n`;
    
    // Introduction - format into readable paragraphs with H2 heading
    html += `<div class="introduction">\n<h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0 16px 0; line-height: 1.3;">Introdução</h2>\n${TextFormatter.formatToParagraphs(TextFormatter.cleanMarkdown(introduction))}\n</div>\n\n`;
    
    // Outline sections (if any) - come before products
    if (outlineSections.length > 0) {
      html += `<div class="content-sections">\n`;
      for (let i = 0; i < outlineSections.length; i++) {
        html += `${outlineSections[i]}\n\n`;
      }
      html += `</div>\n\n`;
    }
    
    // Product reviews
    html += `<div class="product-reviews">\n`;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const review = productReviews[i];
      
      html += `<div class="product-review">\n`;
      html += `<h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0 16px 0; line-height: 1.3;">${product.name}</h2>\n`;
      
      if (product.imageUrl) {
        html += `<img src="${product.imageUrl}" alt="${product.name}" style="max-width: 300px; max-height: 300px; width: auto; height: auto; display: block; margin: 16px 0; border-radius: 8px; object-fit: contain;" />\n`;
      }
      
      html += `<div class="description">${TextFormatter.formatToParagraphs(review.description)}</div>\n`;
      
      // Professional pros/cons table with green/red headers
      html += TextFormatter.buildProConsTable(review.pros, review.cons);
      
      // Styled CTA button
      html += TextFormatter.buildCtaButton('Ver Oferta', product.affiliateLink);
      
      html += `</div>\n\n`;
    }
    html += `</div>\n\n`;
    
    // Conclusion - format into readable paragraphs with H2 heading
    html += `<div class="conclusion">\n<h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0 16px 0; line-height: 1.3;">Conclusão</h2>\n${TextFormatter.formatToParagraphs(TextFormatter.cleanMarkdown(conclusion))}\n</div>\n`;
    
    html += `</article>`;
    
    return html;
  }

  private buildContentHTML(
    title: string,
    introduction: string,
    outline: any[],
    sections: string[],
    conclusion: string
  ): string {
    let html = `<article class="content-article">\n`;
    html += `<h1 style="font-size: 28px; font-weight: bold; color: #000; margin-bottom: 24px; line-height: 1.3;">${title}</h1>\n\n`;
    
    // Introduction with H2 heading
    html += `<div class="introduction">\n<h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0 16px 0; line-height: 1.3;">Introdução</h2>\n${TextFormatter.formatToParagraphs(TextFormatter.cleanMarkdown(introduction))}\n</div>\n\n`;
    
    // Content sections
    html += `<div class="content-sections">\n`;
    for (let i = 0; i < sections.length; i++) {
      html += `${sections[i]}\n\n`;
    }
    html += `</div>\n\n`;
    
    // Conclusion - format into readable paragraphs with H2 heading
    html += `<div class="conclusion">\n<h2 style="font-size: 24px; font-weight: bold; color: #000; margin: 20px 0 16px 0; line-height: 1.3;">Conclusão</h2>\n${TextFormatter.formatToParagraphs(TextFormatter.cleanMarkdown(conclusion))}\n</div>\n`;
    
    html += `</article>`;
    
    return html;
  }
}

// Export singleton instance
export const reviewGeneratorV2 = new ReviewGeneratorV2();