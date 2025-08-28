import { Request, Response } from 'express';
import { AiModel, IAiModel } from '../models/AiModel';
import { AuthRequest } from '../types/auth';

// Get all AI models
export const getAllModels = async (req: AuthRequest, res: Response) => {
  try {
    // Include apiKey field to check if it exists
    const models = await AiModel.find()
      .select('+apiKey') // Include apiKey field
      .sort({ isPrimary: -1, isFallback: -1, isActive: -1, provider: 1, name: 1 });
    
    // Transform models to include masked keys and status
    const modelsWithApiStatus = models.map(model => {
      const modelObj = model.toObject({ virtuals: true });
      return {
        ...modelObj,
        hasApiKey: !!model.apiKey,
        apiKeyMasked: model.getMaskedApiKey(),
        apiKey: undefined // Never send encrypted key
      };
    });
    
    res.json({
      success: true,
      data: modelsWithApiStatus
    });
  } catch (error: any) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI models'
    });
  }
};

// Create new AI model
export const createModel = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      provider,
      modelId,
      apiKey,
      inputCostPer1k,
      outputCostPer1k,
      maxTokens,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
      description,
      isActive,
      isPrimary,
      isFallback
    } = req.body;

    // Validate required fields
    if (!name || !provider || !modelId || inputCostPer1k === undefined || outputCostPer1k === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, provider, modelId, inputCostPer1k, outputCostPer1k'
      });
    }

    // Check if model already exists
    const existingModel = await AiModel.findOne({ provider, modelId });
    if (existingModel) {
      return res.status(400).json({
        success: false,
        error: 'Model with this provider and modelId already exists'
      });
    }

    const model = new AiModel({
      name,
      provider,
      modelId,
      apiKey, // Store API key if provided
      inputCostPer1k,
      outputCostPer1k,
      maxTokens: maxTokens || 2000,
      temperature: temperature || 0.7,
      topP: topP || 1,
      frequencyPenalty: frequencyPenalty || 0,
      presencePenalty: presencePenalty || 0,
      description,
      isActive: isActive !== false,
      isPrimary: isPrimary || false,
      isFallback: isFallback || false,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await model.save();

    // Return model with masked key
    const responseModel = model.toObject({ virtuals: true });
    responseModel.hasApiKey = !!model.apiKey;
    responseModel.apiKeyMasked = model.getMaskedApiKey();
    delete responseModel.apiKey;

    res.status(201).json({
      success: true,
      data: responseModel,
      message: 'AI model created successfully'
    });
  } catch (error: any) {
    console.error('Error creating AI model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create AI model'
    });
  }
};

// Update AI model
export const updateModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.createdBy;

    // Add updatedBy
    updates.updatedBy = req.user._id;

    const model = await AiModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('+apiKey');

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'AI model not found'
      });
    }

    // Return model with masked key
    const responseModel = model.toObject({ virtuals: true });
    responseModel.hasApiKey = !!model.apiKey;
    responseModel.apiKeyMasked = model.getMaskedApiKey();
    delete responseModel.apiKey;

    res.json({
      success: true,
      data: responseModel,
      message: 'AI model updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating AI model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI model'
    });
  }
};

// Delete AI model
export const deleteModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const model = await AiModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'AI model not found'
      });
    }

    // Don't allow deleting primary or fallback models
    if (model.isPrimary || model.isFallback) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete primary or fallback model. Please reassign before deleting.'
      });
    }

    await model.deleteOne();

    res.json({
      success: true,
      message: 'AI model deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting AI model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI model'
    });
  }
};

// Toggle model active status
export const toggleModelStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const model = await AiModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'AI model not found'
      });
    }

    // Don't allow deactivating primary or fallback models
    if ((model.isPrimary || model.isFallback) && model.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate primary or fallback model. Please reassign before deactivating.'
      });
    }

    model.isActive = !model.isActive;
    model.updatedBy = req.user._id;
    await model.save();

    res.json({
      success: true,
      data: model,
      message: `AI model ${model.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    console.error('Error toggling AI model status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle AI model status'
    });
  }
};

// Set model as primary
export const setPrimaryModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const model = await AiModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'AI model not found'
      });
    }

    if (!model.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot set inactive model as primary. Please activate it first.'
      });
    }

    // Remove primary from all other models
    await AiModel.updateMany(
      { _id: { $ne: id } },
      { isPrimary: false }
    );

    // Set this model as primary
    model.isPrimary = true;
    model.isFallback = false; // Can't be both primary and fallback
    model.updatedBy = req.user._id;
    await model.save();

    res.json({
      success: true,
      data: model,
      message: 'Model set as primary successfully'
    });
  } catch (error: any) {
    console.error('Error setting primary model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set primary model'
    });
  }
};

// Set model as fallback
export const setFallbackModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const model = await AiModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'AI model not found'
      });
    }

    if (!model.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot set inactive model as fallback. Please activate it first.'
      });
    }

    // Remove fallback from all other models
    await AiModel.updateMany(
      { _id: { $ne: id } },
      { isFallback: false }
    );

    // Set this model as fallback
    model.isFallback = true;
    model.isPrimary = false; // Can't be both primary and fallback
    model.updatedBy = req.user._id;
    await model.save();

    res.json({
      success: true,
      data: model,
      message: 'Model set as fallback successfully'
    });
  } catch (error: any) {
    console.error('Error setting fallback model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set fallback model'
    });
  }
};