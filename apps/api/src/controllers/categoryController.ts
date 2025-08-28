import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Feature } from '../models/Feature';

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    
    const query: any = {};
    if (!includeInactive || includeInactive === 'false') {
      query.isActive = true;
    }
    
    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get feature count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Feature.countDocuments({
          category: category.code,
          deleted: false
        });
        return { ...category, featureCount: count };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get active categories for public use
export const getPublicCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.findActive();
    
    // Get feature count for each category (only active features)
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Feature.countDocuments({
          category: category.code,
          deleted: false,
          status: { $in: ['active', 'maintenance'] }
        });
        return {
          id: category._id,
          code: category.code,
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          featureCount: count
        };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount.filter(cat => cat.featureCount > 0) // Only show categories with features
    });
  } catch (error) {
    console.error('Error fetching public categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get single category
export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get features in this category
    const features = await Feature.find({
      category: category.code,
      deleted: false
    }).select('name status').lean();
    
    res.json({
      success: true,
      data: {
        category,
        features
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Create new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { code, name, description, icon, color, order } = req.body;
    
    // Check if category code already exists
    const existing = await Category.findOne({ code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category with this code already exists'
      });
    }
    
    // Get max order if not provided
    let categoryOrder = order;
    if (categoryOrder === undefined) {
      const maxOrderCategory = await Category.findOne().sort({ order: -1 });
      categoryOrder = maxOrderCategory ? maxOrderCategory.order + 10 : 10;
    }
    
    const category = new Category({
      code,
      name,
      description,
      icon: icon || 'Folder',
      color: color || '#666666',
      order: categoryOrder,
      isActive: true,
      isSystem: false
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Don't allow changing code if it's a system category
    if (category.isSystem && updates.code && updates.code !== category.code) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change code of system category'
      });
    }
    
    // If code is being changed, update all features
    const oldCode = category.code;
    const newCode = updates.code || oldCode;
    
    Object.assign(category, updates);
    await category.save();
    
    // Update features if code changed
    if (oldCode !== newCode) {
      await Feature.updateMany(
        { category: oldCode },
        { category: newCode }
      );
    }
    
    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

// Toggle category status
export const toggleCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.json({
      success: true,
      data: category,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle category status'
    });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { forceDelete } = req.body; // Allow force deletion with explicit confirmation
    
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if there are features in this category
    const featureCount = await Feature.countDocuments({
      category: category.code,
      deleted: false
    });
    
    if (featureCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${featureCount} features are using it.`,
        featureCount
      });
    }
    
    // For system categories, require explicit force delete confirmation
    if (category.isSystem && !forceDelete) {
      return res.status(403).json({
        success: false,
        message: 'This is a system category. Confirm deletion with forceDelete flag.',
        isSystem: true,
        requiresConfirmation: true
      });
    }
    
    await category.deleteOne();
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

// Reorder categories
export const reorderCategories = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body; // Array of { id, order }
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid categories array'
      });
    }
    
    // Update each category's order
    await Promise.all(
      categories.map(({ id, order }) =>
        Category.findByIdAndUpdate(id, { order })
      )
    );
    
    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder categories'
    });
  }
};

// Initialize default categories
export const initializeDefaultCategories = async (req: Request, res: Response) => {
  try {
    const defaultCategories = [
      { code: 'seo', name: 'SEO', icon: 'Search', color: '#10B981', order: 10, isSystem: true },
      { code: 'automation', name: 'Automação', icon: 'Zap', color: '#F59E0B', order: 20, isSystem: true },
      { code: 'monitoring', name: 'Monitoramento', icon: 'Activity', color: '#3B82F6', order: 30, isSystem: true },
      { code: 'optimization', name: 'Otimização', icon: 'Rocket', color: '#8B5CF6', order: 40, isSystem: true },
      { code: 'security', name: 'Segurança', icon: 'Shield', color: '#EF4444', order: 50, isSystem: true },
      { code: 'analytics', name: 'Analytics', icon: 'BarChart', color: '#06B6D4', order: 60, isSystem: true },
      { code: 'content', name: 'Conteúdo', icon: 'FileText', color: '#EC4899', order: 70, isSystem: true },
      { code: 'wordpress', name: 'WordPress', icon: 'Globe', color: '#E10600', order: 80, isSystem: true }
    ];
    
    const created = [];
    const skipped = [];
    
    for (const categoryData of defaultCategories) {
      const existing = await Category.findOne({ code: categoryData.code });
      if (!existing) {
        const category = new Category(categoryData);
        await category.save();
        created.push(category.name);
      } else {
        skipped.push(categoryData.name);
      }
    }
    
    res.json({
      success: true,
      message: 'Default categories initialized',
      data: {
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('Error initializing default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default categories'
    });
  }
};