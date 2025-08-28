import { Request, Response } from 'express';
import { ProfileSuggestion } from '../models/ProfileSuggestion';
import { AuthRequest } from '../middlewares/authMiddleware';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Get all suggestions (public endpoint for frontend)
export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const query: any = { isActive: true };
    if (category) {
      query.category = category;
    }
    
    const suggestions = await ProfileSuggestion
      .find(query)
      .sort({ category: 1, order: 1, value: 1 })
      .select('category value');
    
    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching suggestions');
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sugestões'
    });
  }
};

// Admin: Get all suggestions with full details
export const getAllSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { category, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    if (category) {
      query.category = category;
    }
    
    const [suggestions, total] = await Promise.all([
      ProfileSuggestion
        .find(query)
        .sort({ category: 1, order: 1, value: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name email'),
      ProfileSuggestion.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        suggestions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching all suggestions');
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sugestões'
    });
  }
};

// Admin: Create suggestion
export const createSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { category, value, order = 0, isActive = true } = req.body;
    
    if (!category || !value) {
      return res.status(400).json({
        success: false,
        message: 'Categoria e valor são obrigatórios'
      });
    }
    
    // Check if suggestion already exists
    const existing = await ProfileSuggestion.findOne({ category, value });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Esta sugestão já existe nesta categoria'
      });
    }
    
    const suggestion = new ProfileSuggestion({
      category,
      value,
      order,
      isActive,
      createdBy: req.user.userId
    });
    
    await suggestion.save();
    
    res.status(201).json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    logger.error({ error }, 'Error creating suggestion');
    res.status(500).json({
      success: false,
      message: 'Erro ao criar sugestão'
    });
  }
};

// Admin: Create multiple suggestions at once
export const bulkCreateSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { category, values } = req.body;
    
    if (!category || !values || !Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        message: 'Categoria e valores são obrigatórios'
      });
    }
    
    const suggestions = [];
    const errors = [];
    
    for (let i = 0; i < values.length; i++) {
      const value = values[i].trim();
      if (!value) continue;
      
      // Check if already exists
      const existing = await ProfileSuggestion.findOne({ category, value });
      if (existing) {
        errors.push(`"${value}" já existe`);
        continue;
      }
      
      suggestions.push({
        category,
        value,
        order: i,
        isActive: true,
        createdBy: req.user.userId
      });
    }
    
    if (suggestions.length > 0) {
      await ProfileSuggestion.insertMany(suggestions);
    }
    
    res.status(201).json({
      success: true,
      data: {
        created: suggestions.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error bulk creating suggestions');
    res.status(500).json({
      success: false,
      message: 'Erro ao criar sugestões em massa'
    });
  }
};

// Admin: Update suggestion
export const updateSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { id } = req.params;
    const { value, order, isActive } = req.body;
    
    const suggestion = await ProfileSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Sugestão não encontrada'
      });
    }
    
    // Check if new value already exists in same category
    if (value && value !== suggestion.value) {
      const existing = await ProfileSuggestion.findOne({ 
        category: suggestion.category, 
        value,
        _id: { $ne: id }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Este valor já existe nesta categoria'
        });
      }
      
      suggestion.value = value;
    }
    
    if (order !== undefined) suggestion.order = order;
    if (isActive !== undefined) suggestion.isActive = isActive;
    
    await suggestion.save();
    
    res.json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    logger.error({ error }, 'Error updating suggestion');
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar sugestão'
    });
  }
};

// Admin: Delete suggestion
export const deleteSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { id } = req.params;
    
    const suggestion = await ProfileSuggestion.findByIdAndDelete(id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Sugestão não encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Sugestão removida com sucesso'
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting suggestion');
    res.status(500).json({
      success: false,
      message: 'Erro ao remover sugestão'
    });
  }
};

// Admin: Delete all suggestions in a category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    const { category } = req.params;
    
    const result = await ProfileSuggestion.deleteMany({ category });
    
    res.json({
      success: true,
      message: `${result.deletedCount} sugestões removidas da categoria ${category}`
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting category');
    res.status(500).json({
      success: false,
      message: 'Erro ao remover categoria'
    });
  }
};