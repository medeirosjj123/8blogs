import { Request, Response } from 'express';
import { reviewGeneratorV2 as reviewGenerator } from '../services/reviewGeneratorV2';
import { Review } from '../models/Review';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WordPressSite } from '../models/WordPressSite';

// Generate a new review
export const generateReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { title, contentType = 'bbr', products, outline } = req.body;

    // Validate input
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Validate based on content type
    if (contentType === 'bbr' || contentType === 'spr') {
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: contentType === 'spr' 
            ? 'Product data is required for single product review'
            : 'At least one product is required for best buy reviews'
        });
      }

      // For SPR, ensure only one product
      if (contentType === 'spr' && products.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'Single product review should have only one product'
        });
      }

      // Validate each product
      for (const product of products) {
        if (!product.name || !product.affiliateLink) {
          return res.status(400).json({
            success: false,
            message: 'Each product must have a name and affiliate link'
          });
        }
      }
    } else if (contentType === 'informational') {
      if (!outline || !Array.isArray(outline) || outline.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one outline item is required for content generation'
        });
      }

      // Validate each outline item
      for (const item of outline) {
        if (!item.title) {
          return res.status(400).json({
            success: false,
            message: 'Each outline item must have a title'
          });
        }
      }
    }

    // Generate the content
    console.log(`📝 Generating ${contentType} for user ${userId}: "${title}"`);
    const review = await reviewGenerator.generateContent({
      userId,
      title,
      contentType,
      products: (contentType === 'bbr' || contentType === 'spr') ? products : undefined,
      outline: outline
    });

    res.json({
      success: true,
      data: review,
      message: 'Review generated successfully'
    });
  } catch (error: any) {
    console.error('Error generating review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate review'
    });
  }
};

// Get user's reviews
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-content.fullHtml'), // Exclude full HTML for list view
      Review.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Get single review
export const getReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const review = await Review.findOne({ _id: id, userId });
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error: any) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review'
    });
  }
};

// Update review
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updates = req.body;

    const review = await Review.findOne({ _id: id, userId });
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['title', 'status', 'content'];
    const filteredUpdates: any = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    Object.assign(review, filteredUpdates);
    await review.save();

    res.json({
      success: true,
      data: review,
      message: 'Review updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
};

// Delete review
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const review = await Review.findOne({ _id: id, userId });
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.deleteOne();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
};

// Get review statistics
export const getReviewStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const stats = await Review.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          totalProducts: { $sum: { $size: '$products' } },
          totalCost: { $sum: '$metadata.cost' },
          totalTokens: { $sum: '$metadata.tokensUsed.total' },
          avgGenerationTime: { $avg: '$metadata.generationTime' },
          publishedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalReviews: 0,
      totalProducts: 0,
      totalCost: 0,
      totalTokens: 0,
      avgGenerationTime: 0,
      publishedCount: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

// Publish review to WordPress
export const publishReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { siteId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the review
    const review = await Review.findOne({ _id: id, userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Get the WordPress site
    const site = await WordPressSite.findOne({ _id: siteId, userId }).select('+applicationPassword');
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    // Prepare the post data
    const postData = {
      title: review.title,
      content: review.content.fullHtml,
      status: 'draft',  // Create as draft for editing in WordPress
      format: 'standard',
      categories: [], // You can add category IDs here
      tags: [] // You can add tag IDs here
    };

    // Get decrypted password
    const password = site.applicationPassword.includes(':') 
      ? site.getDecryptedPassword() 
      : site.applicationPassword;
    
    const credentials = Buffer.from(`${site.username}:${password}`).toString('base64');

    // Publish to WordPress
    const response = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WordPress publish error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to publish to WordPress',
        error: error
      });
    }

    const wpPost = await response.json();

    // Create WordPress edit URL
    const baseUrl = site.url.replace(/\/$/, ''); // Remove trailing slash
    const editUrl = `${baseUrl}/wp-admin/post.php?post=${wpPost.id}&action=edit`;

    // Update review with draft info
    review.published.push({
      siteId: site._id,
      wordpressId: wpPost.id,
      url: wpPost.link,
      publishedAt: new Date(),
      status: 'draft'
    });
    review.status = 'draft';
    await review.save();

    // Update site statistics (but don't increment published count for drafts)
    site.statistics = site.statistics || { postsPublished: 0 };
    site.statistics.lastPublishedAt = new Date();
    await site.save();

    res.json({
      success: true,
      data: {
        wordpressId: wpPost.id,
        url: wpPost.link,
        editUrl: editUrl,
        siteName: site.name
      },
      message: 'Draft created successfully! Redirecting to WordPress editor...'
    });
  } catch (error: any) {
    console.error('Error publishing review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish review',
      error: error.message
    });
  }
};