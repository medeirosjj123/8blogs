import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxTokens: number;
  private temperature: number;
  private topP: number;

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.model || 'gemini-1.5-flash' 
    });
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.topP = config.topP || 1;
  }

  async generate(prompt: string, options: any = {}): Promise<{
    content: string;
    usage: {
      input: number;
      output: number;
      total: number;
    };
  }> {
    try {
      const fullPrompt = options.systemPrompt 
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: options.temperature || this.temperature,
          maxOutputTokens: options.maxTokens || this.maxTokens,
          topP: options.topP || this.topP
        }
      });

      const response = await result.response;
      const text = response.text();
      
      // Estimate token usage (Gemini doesn't provide exact counts)
      const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);
      const estimatedOutputTokens = Math.ceil(text.length / 4);

      return {
        content: text,
        usage: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
          total: estimatedInputTokens + estimatedOutputTokens
        }
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate('Test connection. Reply with "OK"', {
        maxTokens: 10
      });
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      return false;
    }
  }

  calculateCost(tokens: { input: number; output: number }, pricing: { inputCost: number; outputCost: number }): number {
    // Gemini 1.5 Flash is free up to certain limits
    if (pricing.inputCost === 0 && pricing.outputCost === 0) {
      return 0;
    }
    const inputCost = (tokens.input / 1000000) * pricing.inputCost;
    const outputCost = (tokens.output / 1000000) * pricing.outputCost;
    return inputCost + outputCost;
  }
}