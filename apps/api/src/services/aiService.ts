import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';
import { AiModel, IAiModel } from '../models/AiModel';

export class AIService {
  private primaryService: OpenAIService | GeminiService | null = null;
  private fallbackService: OpenAIService | GeminiService | null = null;
  private primaryModel: IAiModel | null = null;
  private fallbackModel: IAiModel | null = null;

  async initialize() {
    try {
      // Load primary and fallback models with their API keys
      this.primaryModel = await AiModel.findOne({ isPrimary: true, isActive: true }).select('+apiKey');
      this.fallbackModel = await AiModel.findOne({ isFallback: true, isActive: true }).select('+apiKey');
      
      // Initialize primary service
      if (this.primaryModel) {
        // Use model's API key or fallback to environment variable
        const apiKey = this.primaryModel.apiKey || process.env.OPENAI_API_KEY;
        
        console.log('🔍 Using primary AI Model:', {
          name: this.primaryModel.name,
          provider: this.primaryModel.provider,
          modelId: this.primaryModel.modelId,
          hasApiKey: !!apiKey,
          usingEnvKey: !this.primaryModel.apiKey && !!process.env.OPENAI_API_KEY,
          apiKeyMasked: this.primaryModel.getMaskedApiKey() || 'Using env key'
        });

        if (!apiKey) {
          throw new Error(`Primary model ${this.primaryModel.name} doesn't have a valid API key configured (neither in DB nor .env)`);
        }

        // Create service configuration with plain API key
        const primaryConfig = {
          apiKey: apiKey,
          model: this.primaryModel.modelId,
          maxTokens: this.primaryModel.maxTokens,
          temperature: this.primaryModel.temperature,
          topP: this.primaryModel.topP || 1,
          frequencyPenalty: this.primaryModel.frequencyPenalty || 0,
          presencePenalty: this.primaryModel.presencePenalty || 0
        };

        // Initialize the appropriate service
        if (this.primaryModel.provider === 'openai') {
          this.primaryService = new OpenAIService(primaryConfig);
        } else if (this.primaryModel.provider === 'gemini') {
          this.primaryService = new GeminiService(primaryConfig);
        } else {
          throw new Error(`Unsupported provider: ${this.primaryModel.provider}`);
        }
      }

      // Initialize fallback service
      if (this.fallbackModel) {
        // Use model's API key or fallback to environment variable
        const fallbackApiKey = this.fallbackModel.apiKey || process.env.OPENAI_API_KEY;
        
        console.log('🔍 Using fallback AI Model:', {
          name: this.fallbackModel.name,
          provider: this.fallbackModel.provider,
          modelId: this.fallbackModel.modelId,
          hasApiKey: !!fallbackApiKey,
          usingEnvKey: !this.fallbackModel.apiKey && !!process.env.OPENAI_API_KEY,
          apiKeyMasked: this.fallbackModel.getMaskedApiKey() || 'Using env key'
        });

        if (fallbackApiKey) {
          const fallbackConfig = {
            apiKey: fallbackApiKey,
            model: this.fallbackModel.modelId,
            maxTokens: this.fallbackModel.maxTokens,
            temperature: this.fallbackModel.temperature,
            topP: this.fallbackModel.topP || 1,
            frequencyPenalty: this.fallbackModel.frequencyPenalty || 0,
            presencePenalty: this.fallbackModel.presencePenalty || 0
          };

          if (this.fallbackModel.provider === 'openai') {
            this.fallbackService = new OpenAIService(fallbackConfig);
          } else if (this.fallbackModel.provider === 'gemini') {
            this.fallbackService = new GeminiService(fallbackConfig);
          }
        }
      }

      if (!this.primaryService) {
        throw new Error('No primary AI service configured. Please configure a primary model with API key in the admin panel.');
      }

      console.log(`✅ AI Service initialized with ${this.primaryModel.provider} (${this.primaryModel.modelId}) as primary`);
      if (this.fallbackService) {
        console.log(`✅ Fallback service: ${this.fallbackModel?.provider} (${this.fallbackModel?.modelId})`);
      }
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      throw error;
    }
  }

  async generateContent(
    prompt: string, 
    options: any = {}
  ): Promise<{
    content: string;
    provider: string;
    model: string;
    usage: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
  }> {
    if (!this.primaryService) {
      await this.initialize();
    }

    let lastError: Error | null = null;
    
    // Try primary service
    if (this.primaryService && this.primaryModel) {
      try {
        console.log(`🚀 Generating with ${this.primaryModel.provider} (${this.primaryModel.modelId})...`);
        
        const result = await this.primaryService.generate(prompt, options);
        const cost = this.calculateCost(result.usage, this.primaryModel);
        
        return {
          ...result,
          provider: this.primaryModel.provider,
          model: this.primaryModel.modelId,
          cost
        };
      } catch (error: any) {
        console.error(`❌ Primary service (${this.primaryModel.provider}) failed:`, error.message);
        lastError = error;
      }
    }

    // Try fallback service if available
    if (this.fallbackService && this.fallbackModel) {
      try {
        console.log(`🔄 Trying fallback service ${this.fallbackModel.provider} (${this.fallbackModel.modelId})...`);
        
        const result = await this.fallbackService.generate(prompt, options);
        const cost = this.calculateCost(result.usage, this.fallbackModel);
        
        return {
          ...result,
          provider: this.fallbackModel.provider,
          model: this.fallbackModel.modelId,
          cost
        };
      } catch (error: any) {
        console.error(`❌ Fallback service (${this.fallbackModel.provider}) failed:`, error.message);
        lastError = error;
      }
    }

    // Both services failed
    throw new Error(`All AI services failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private calculateCost(usage: { input: number; output: number }, model: IAiModel): number {
    const inputCost = (usage.input / 1000) * model.inputCostPer1k;
    const outputCost = (usage.output / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  // Optional: Method to update usage statistics if needed
  private async updateUsageStats(modelId: string, usage: any, status: string, error?: string) {
    // This can be implemented if you want to track usage per model
    // For now, we'll just log it
    console.log(`📊 Usage for model ${modelId}:`, {
      status,
      usage,
      error
    });
  }
}

// Export singleton instance
export const aiService = new AIService();