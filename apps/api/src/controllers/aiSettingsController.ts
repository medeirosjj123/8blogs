import { Request, Response } from 'express';
import { AiSettings } from '../models/AiSettings';
import { AuthRequest } from '../types/auth';

// Available models configuration
const availableModels = {
  openai: [
    { 
      value: 'gpt-4o-mini', 
      label: 'GPT-4o Mini', 
      description: 'Fast and efficient, ideal for most content',
      costPerInputToken: 0.00015,
      costPerOutputToken: 0.0006
    },
    { 
      value: 'gpt-4o', 
      label: 'GPT-4o', 
      description: 'Most capable model, best quality',
      costPerInputToken: 0.005,
      costPerOutputToken: 0.015
    },
    { 
      value: 'gpt-4-turbo', 
      label: 'GPT-4 Turbo', 
      description: 'High quality with vision capabilities',
      costPerInputToken: 0.01,
      costPerOutputToken: 0.03
    },
    { 
      value: 'gpt-3.5-turbo', 
      label: 'GPT-3.5 Turbo', 
      description: 'Fast and cheap, good for simple tasks',
      costPerInputToken: 0.0005,
      costPerOutputToken: 0.0015
    }
  ],
  gemini: [
    { 
      value: 'gemini-1.5-pro', 
      label: 'Gemini 1.5 Pro', 
      description: 'Google\'s most capable model',
      costPerInputToken: 0.00125,
      costPerOutputToken: 0.005
    },
    { 
      value: 'gemini-1.5-flash', 
      label: 'Gemini 1.5 Flash', 
      description: 'Fast and efficient',
      costPerInputToken: 0.000075,
      costPerOutputToken: 0.0003
    },
    { 
      value: 'gemini-pro', 
      label: 'Gemini Pro', 
      description: 'Balanced performance',
      costPerInputToken: 0.0005,
      costPerOutputToken: 0.0015
    }
  ],
  anthropic: [
    { 
      value: 'claude-3-opus-20240229', 
      label: 'Claude 3 Opus', 
      description: 'Most intelligent Claude model',
      costPerInputToken: 0.015,
      costPerOutputToken: 0.075
    },
    { 
      value: 'claude-3-sonnet-20240229', 
      label: 'Claude 3 Sonnet', 
      description: 'Balanced performance and cost',
      costPerInputToken: 0.003,
      costPerOutputToken: 0.015
    },
    { 
      value: 'claude-3-haiku-20240307', 
      label: 'Claude 3 Haiku', 
      description: 'Fast and affordable',
      costPerInputToken: 0.00025,
      costPerOutputToken: 0.00125
    }
  ]
};

export const getAiSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await AiSettings.getActive();
    
    res.json({
      success: true,
      data: {
        settings,
        availableModels
      }
    });
  } catch (error: any) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings'
    });
  }
};

export const updateAiSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { provider, model, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = req.body;

    // Validate provider and model
    if (!availableModels[provider as keyof typeof availableModels]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    const modelConfig = availableModels[provider as keyof typeof availableModels].find(m => m.value === model);
    if (!modelConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model for selected provider'
      });
    }

    // Get current active settings
    let settings = await AiSettings.findOne({ isActive: true });
    
    if (settings) {
      // Update existing settings
      settings.provider = provider;
      settings.model = model;
      settings.temperature = temperature ?? settings.temperature;
      settings.maxTokens = maxTokens ?? settings.maxTokens;
      settings.topP = topP ?? settings.topP;
      settings.frequencyPenalty = frequencyPenalty ?? settings.frequencyPenalty;
      settings.presencePenalty = presencePenalty ?? settings.presencePenalty;
      settings.costPerInputToken = modelConfig.costPerInputToken;
      settings.costPerOutputToken = modelConfig.costPerOutputToken;
      settings.description = modelConfig.description;
      settings.updatedBy = req.user._id;
      
      await settings.save();
    } else {
      // Create new settings
      settings = await AiSettings.create({
        provider,
        model,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2000,
        topP: topP ?? 1,
        frequencyPenalty: frequencyPenalty ?? 0,
        presencePenalty: presencePenalty ?? 0,
        costPerInputToken: modelConfig.costPerInputToken,
        costPerOutputToken: modelConfig.costPerOutputToken,
        description: modelConfig.description,
        isActive: true,
        updatedBy: req.user._id
      });
    }

    res.json({
      success: true,
      data: settings,
      message: 'AI settings updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings'
    });
  }
};

export const getModelsList = async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: availableModels
    });
  } catch (error: any) {
    console.error('Error fetching models list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models list'
    });
  }
};