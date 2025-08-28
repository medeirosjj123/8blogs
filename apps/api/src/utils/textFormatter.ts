/**
 * TextFormatter Utility
 * Handles text formatting for better readability and professional presentation
 */

export class TextFormatter {
  /**
   * Formats large text blocks into readable paragraphs
   * @param text - Raw text from AI
   * @param maxSentences - Maximum sentences per paragraph (default: 2)
   * @returns HTML with proper paragraph tags
   */
  static formatToParagraphs(text: string, maxSentences: number = 2): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Remove markdown headings (## Conclusão, ## Introdução, etc.) since we add H2 tags separately
    let cleanText = text.trim();
    cleanText = cleanText.replace(/^##\s+[^\n]*\n?/gm, '').trim();

    // Split text into sentences, handling common abbreviations
    const sentences = this.splitIntoSentences(cleanText);
    
    if (sentences.length === 0) {
      return `<p>${cleanText}</p>`;
    }

    // Group sentences into paragraphs
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (const sentence of sentences) {
      currentParagraph.push(sentence.trim());
      
      // Create new paragraph when we reach max sentences
      if (currentParagraph.length >= maxSentences) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    // Add remaining sentences as final paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    // Wrap each paragraph in <p> tags with proper spacing
    return paragraphs
      .filter(p => p.trim().length > 0)
      .map(p => `<p style="margin-bottom: 16px; line-height: 1.6;">${p}</p>`)
      .join('\n');
  }

  /**
   * Splits text into sentences while handling abbreviations
   * @param text - Text to split
   * @returns Array of sentences
   */
  private static splitIntoSentences(text: string): string[] {
    // Common Portuguese abbreviations that shouldn't end sentences
    const abbreviations = [
      'Dr', 'Dra', 'Sr', 'Sra', 'Prof', 'Profa', 'etc', 'ex', 'Inc',
      'Ltd', 'vs', 'p.ex', 'i.e', 'e.g', 'Jr', 'Sr', 'RE31'
    ];

    // Replace abbreviations temporarily to avoid false splits
    let processedText = text;
    const tempReplacements: { [key: string]: string } = {};
    
    abbreviations.forEach((abbrev, index) => {
      const placeholder = `__ABBREV_${index}__`;
      const regex = new RegExp(`\\b${abbrev}\\.`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        tempReplacements[placeholder] = match;
        return placeholder;
      });
    });

    // More sophisticated sentence splitting
    // Look for patterns like ". " followed by capital letter or end of string
    const sentencePattern = /([.!?]+)(\s+|$)/g;
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = sentencePattern.exec(processedText)) !== null) {
      const sentenceEnd = match.index + match[1].length;
      const sentence = processedText.slice(lastIndex, sentenceEnd).trim();
      
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
      
      lastIndex = sentenceEnd + match[2].length;
    }

    // Add any remaining text
    if (lastIndex < processedText.length) {
      const remaining = processedText.slice(lastIndex).trim();
      if (remaining.length > 0) {
        sentences.push(remaining);
      }
    }

    // Restore abbreviations
    return sentences.map(sentence => {
      let restored = sentence;
      Object.entries(tempReplacements).forEach(([placeholder, original]) => {
        restored = restored.replace(new RegExp(placeholder, 'g'), original);
      });
      return restored;
    }).filter(s => s.length > 0);
  }

  /**
   * Builds a professional pros/cons table with green/red headers
   * @param pros - Array of advantages
   * @param cons - Array of disadvantages
   * @returns HTML table with styling
   */
  static buildProConsTable(pros: string[], cons: string[]): string {
    const prosText = pros
      .filter(pro => pro && pro.trim().length > 0)
      .map(pro => `• ${pro.trim()}`)
      .join('<br>');
    
    const consText = cons
      .filter(con => con && con.trim().length > 0)
      .map(con => `• ${con.trim()}`)
      .join('<br>');

    return `
<table class="pros-cons-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <thead>
    <tr>
      <th style="background-color: #d4edda; color: #155724; padding: 15px 12px; border: 1px solid #c3e6cb; text-align: center; font-weight: 600; font-size: 16px;">
        ✅ Vantagens
      </th>
      <th style="background-color: #f8d7da; color: #721c24; padding: 15px 12px; border: 1px solid #f5c6cb; text-align: center; font-weight: 600; font-size: 16px;">
        ❌ Desvantagens
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 15px 12px; border: 1px solid #ddd; vertical-align: top; line-height: 1.6; background-color: #f8f9fa;">
        ${prosText || '• Nenhuma vantagem listada'}
      </td>
      <td style="padding: 15px 12px; border: 1px solid #ddd; vertical-align: top; line-height: 1.6; background-color: #f8f9fa;">
        ${consText || '• Nenhuma desvantagem listada'}
      </td>
    </tr>
  </tbody>
</table>`.trim();
  }

  /**
   * Sanitizes HTML content to prevent XSS while preserving formatting
   * @param html - HTML content to sanitize
   * @returns Sanitized HTML
   */
  static sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Removes markdown formatting from text content
   * @param text - Text with potential markdown
   * @returns Clean text without markdown
   */
  static cleanMarkdown(text: string): string {
    if (!text) return '';
    
    return text
      // Remove markdown headings (##, ###, etc.)
      .replace(/^#{1,6}\s+[^\n]*\n?/gm, '')
      // Remove bold/italic markdown  
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Clean up extra whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Creates a styled CTA button
   * @param text - Button text
   * @param url - Button URL
   * @returns Styled button HTML
   */
  static buildCtaButton(text: string, url: string): string {
    return `
<div style="text-align: center; margin: 20px 0;">
  <a href="${url}" 
     target="_blank" 
     rel="nofollow noopener"
     style="display: inline-block; 
            background-color: #dc3545; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px; 
            border: none; 
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
     onmouseover="this.style.backgroundColor='#c82333'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(220, 53, 69, 0.4)';"
     onmouseout="this.style.backgroundColor='#dc3545'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(220, 53, 69, 0.3)';">
    ${text}
  </a>
</div>`.trim();
  }

  /**
   * Formats content with proper heading structure
   * @param title - Main title
   * @param content - Content to format
   * @returns Formatted content with proper headings
   */
  static addHeadingStructure(title: string, content: string): string {
    // Ensure main title is H1 and product names are H2
    let formatted = content;
    
    // Convert product names to H2 if they're not already
    formatted = formatted.replace(
      /<h3>([^<]+(?:Geladeira|Produto|Review|Análise)[^<]*)<\/h3>/gi,
      '<h2>$1</h2>'
    );
    
    return formatted;
  }
}