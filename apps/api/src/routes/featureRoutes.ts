import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { Feature } from '../models/Feature';

const router = Router();

// Public feature routes (requires authentication but not admin)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role || 'aluno';
    
    const query: any = {
      deleted: false,
      status: { $in: ['active', 'maintenance'] }  // Show both active and maintenance features
    };
    
    if (userRole !== 'admin') {
      query.permissions = userRole;
    }
    
    const features = await Feature.find(query).sort({ category: 1, name: 1 });
    
    res.json({
      success: true,
      data: features.map(f => ({
        id: f._id,
        code: f.code,
        name: f.name,
        description: f.description,
        category: f.category,
        icon: f.icon,
        route: f.route,
        status: f.status,
        maintenanceMessage: f.maintenanceMessage,
        config: f.config
      }))
    });
  } catch (error) {
    console.error('Error fetching public features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features'
    });
  }
});

// Get specific feature by code
router.get('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const userRole = (req as any).user?.role || 'aluno';
    
    const query: any = {
      code,
      deleted: false,
      status: { $in: ['active', 'maintenance'] }
    };
    
    if (userRole !== 'admin') {
      query.permissions = userRole;
    }
    
    const feature = await Feature.findOne(query);
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found or not accessible'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: feature._id,
        code: feature.code,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        icon: feature.icon,
        route: feature.route,
        status: feature.status,
        maintenanceMessage: feature.maintenanceMessage,
        config: feature.config
      }
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature'
    });
  }
});

export default router;