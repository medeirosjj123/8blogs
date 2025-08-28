import OpenAI from 'openai';

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  baseURL?: string;
}

export class OpenAIService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private topP: number;
  private frequencyPenalty: number;
  private presencePenalty: number;

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.topP = config.topP || 1;
    this.frequencyPenalty = config.frequencyPenalty || 0;
    this.presencePenalty = config.presencePenalty || 0;
  }

  /**
   * Determines the correct max tokens parameter name based on the model
   */
  private getMaxTokensParameter(modelName: string): string {
    // GPT-4o and newer models (including GPT-5) use max_completion_tokens
    // Older models use max_tokens
    if (modelName.includes('gpt-4o') || 
        modelName.includes('gpt-5') ||
        modelName.startsWith('o1')) {
      return 'max_completion_tokens';
    }
    return 'max_tokens';
  }

  /**
   * Gets model-specific parameter constraints
   */
  private getModelConstraints(modelName: string): any {
    // GPT-5-nano has specific parameter requirements
    if (modelName === 'gpt-5-nano') {
      return {
        temperature: 1, // GPT-5-nano only supports default temperature (1)
        supportedParams: ['temperature', 'max_completion_tokens', 'messages', 'model']
      };
    }
    
    // O1 models have their own constraints
    if (modelName.startsWith('o1')) {
      return {
        temperature: 1,
        supportedParams: ['max_completion_tokens', 'messages', 'model']
      };
    }
    
    return null; // No constraints for other models
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
      const modelName = options.model || this.model;
      const maxTokensParam = this.getMaxTokensParameter(modelName);
      const constraints = this.getModelConstraints(modelName);
      
      const completionParams: any = {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant specialized in writing product reviews.'
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ]
      };

      // Apply model-specific constraints or use defaults
      if (constraints) {
        // Use constrained values for special models
        completionParams.temperature = constraints.temperature;
        
        // Only add supported parameters
        if (constraints.supportedParams.includes('top_p')) {
          completionParams.top_p = options.topP || this.topP;
        }
        if (constraints.supportedParams.includes('frequency_penalty')) {
          completionParams.frequency_penalty = options.frequencyPenalty || this.frequencyPenalty;
        }
        if (constraints.supportedParams.includes('presence_penalty')) {
          completionParams.presence_penalty = options.presencePenalty || this.presencePenalty;
        }
      } else {
        // Use normal parameters for other models
        completionParams.temperature = options.temperature || this.temperature;
        completionParams.top_p = options.topP || this.topP;
        completionParams.frequency_penalty = options.frequencyPenalty || this.frequencyPenalty;
        completionParams.presence_penalty = options.presencePenalty || this.presencePenalty;
      }
      
      // Use the appropriate parameter name based on model
      completionParams[maxTokensParam] = options.maxTokens || this.maxTokens;
      
      // Log the model and parameter being used for debugging
      console.log(`🤖 Using model: ${modelName}, parameter: ${maxTokensParam}, tokens: ${completionParams[maxTokensParam]}`);
      if (constraints) {
        console.log(`⚠️ Model constraints applied: temperature=${constraints.temperature}, supported params: ${constraints.supportedParams.join(', ')}`);
      }
      
      const completion = await this.openai.chat.completions.create(completionParams);

      const usage = completion.usage;
      
      return {
        content: completion.choices[0].message.content || '',
        usage: {
          input: usage?.prompt_tokens || 0,
          output: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0
        }
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Provide specific error messages for common issues
      if (error.message?.includes('max_tokens') || error.message?.includes('max_completion_tokens')) {
        const modelName = options.model || this.model;
        const correctParam = this.getMaxTokensParameter(modelName);
        throw new Error(`Parameter error for model ${modelName}: Use '${correctParam}' instead. ${error.message}`);
      }
      
      if (error.message?.includes('temperature') && error.message?.includes('does not support')) {
        const modelName = options.model || this.model;
        throw new Error(`Temperature parameter error for ${modelName}: This model only supports default temperature (1.0). The system will now use correct parameters.`);
      }
      
      if (error.message?.includes('Unsupported parameter')) {
        const modelName = options.model || this.model;
        throw new Error(`Model ${modelName} parameter compatibility issue: ${error.message}`);
      }
      
      throw new Error(`OpenAI generation failed: ${error.message}`);
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
    const inputCost = (tokens.input / 1000000) * pricing.inputCost;
    const outputCost = (tokens.output / 1000000) * pricing.outputCost;
    return inputCost + outputCost;
  }
}