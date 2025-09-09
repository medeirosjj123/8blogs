import { Request, Response, NextFunction } from 'express';
import { reviewGeneratorV2 as reviewGenerator } from '../services/reviewGeneratorV2';
import { Review } from '../models/Review';
import { AuthRequest } from '../middlewares/authMiddleware';
import { WordPressSite } from '../models/WordPressSite';
import { reviewQueueService } from '../services/reviewQueue.service';
import { ReviewGenerationJob } from '../models/ReviewGenerationJob';
import mongoose from 'mongoose';

// Generate a new review
export const generateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    
    // Call next() to continue to tracking middleware
    next();
  } catch (error: any) {
    console.error('Error generating review:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate review'
    });
  }
};

// Generate multiple reviews in bulk
export const generateBulkReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { reviews, publishToWordPress = false, selectedSiteId } = req.body;

    // Validate input
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reviews array is required and must not be empty'
      });
    }

    if (reviews.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 reviews allowed per batch'
      });
    }

    // Validate each review
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      if (!review.title) {
        return res.status(400).json({
          success: false,
          message: `Review ${i + 1}: Title is required`
        });
      }

      // Validate content type specific requirements
      if (review.contentType === 'bbr' || review.contentType === 'spr') {
        if (!review.products || !Array.isArray(review.products) || review.products.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Review ${i + 1}: Products are required for ${review.contentType} content`
          });
        }

        // Validate products
        for (const product of review.products) {
          if (!product.name || !product.affiliateLink) {
            return res.status(400).json({
              success: false,
              message: `Review ${i + 1}: Each product must have a name and affiliate link`
            });
          }
        }
      }
    }

    const startTime = Date.now();
    const bulkId = `bulk-${Date.now()}-${userId}`;
    
    console.log(`\n=== BULK GENERATION STARTED ===`);
    console.log(`Bulk ID: ${bulkId}`);
    console.log(`User: ${userId}`);
    console.log(`Total Reviews: ${reviews.length}`);
    console.log(`WordPress Publishing: ${publishToWordPress ? 'ENABLED' : 'DISABLED'}`);
    if (publishToWordPress) {
      console.log(`Target WordPress Site ID: ${selectedSiteId}`);
    }
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`==============================\n`);
    
    // Process reviews with batching (5 at a time)
    const results = [];
    const BATCH_SIZE = 5;
    let totalTokens = 0;
    let totalCost = 0;
    
    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
      const batch = reviews.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();
      console.log(`\n--- BATCH ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(reviews.length/BATCH_SIZE)} STARTED ---`);
      
      const batchPromises = batch.map(async (reviewData, batchIndex) => {
        const globalIndex = i + batchIndex;
        const reviewStart = Date.now();
        
        try {
          console.log(`\n[REVIEW ${globalIndex + 1}/${reviews.length}] Starting generation`);
          console.log(`  Title: "${reviewData.title}"`);
          console.log(`  Content Type: ${reviewData.contentType || 'bbr'}`);
          console.log(`  Products: ${reviewData.products?.length || 0}`);
          console.log(`  Time: ${new Date().toISOString()}`);
          
          const review = await reviewGenerator.generateContent({
            userId,
            title: reviewData.title,
            contentType: reviewData.contentType || 'bbr',
            products: reviewData.products || [],
            outline: reviewData.outline || []
          });
          
          const reviewTime = Date.now() - reviewStart;
          totalTokens += review.metadata?.tokensUsed?.total || 0;
          totalCost += review.metadata?.cost || 0;
          
          console.log(`[REVIEW ${globalIndex + 1}] ✅ GENERATED SUCCESSFULLY`);
          console.log(`  MongoDB ID: ${review._id}`);
          console.log(`  Collection: reviews`);
          console.log(`  Slug: ${review.slug}`);
          console.log(`  AI Provider: ${review.metadata?.aiProvider || 'unknown'}`);
          console.log(`  AI Model: ${review.metadata?.aiModel || 'unknown'}`);
          console.log(`  Tokens Used: ${review.metadata?.tokensUsed?.total || 0}`);
          console.log(`  Cost: $${review.metadata?.cost || 0}`);
          console.log(`  Generation Time: ${reviewTime}ms`);
          console.log(`  Word Count: ${review.content?.wordCount || 0}`);
          console.log(`  Status: ${review.status}`);

          // If WordPress publishing is enabled, publish the review
          if (publishToWordPress && selectedSiteId) {
            try {
              console.log(`\n[WORDPRESS ${globalIndex + 1}] Starting WordPress publishing`);
              const site = await WordPressSite.findOne({ 
                _id: selectedSiteId, 
                userId 
              }).select('+applicationPassword');

              if (site) {
                console.log(`  Target Site: ${site.name || site.url}`);
                console.log(`  Site URL: ${site.url}`);
                console.log(`  Site ID: ${site._id}`);
                
                // Real WordPress publishing logic
                console.log(`  WordPress URL: ${site.url}`);
                console.log(`  WordPress Username: ${site.username}`);
                
                // Get decrypted password
                const password = site.applicationPassword.includes(':') 
                  ? site.getDecryptedPassword() 
                  : site.applicationPassword;
                
                const credentials = Buffer.from(`${site.username}:${password}`).toString('base64');

                // Prepare the post data
                const postData = {
                  title: review.title,
                  content: review.content?.fullHtml || '',
                  status: 'draft',
                  format: 'standard',
                  categories: [],
                  tags: []
                };

                console.log(`  Posting to: ${site.url}/wp-json/wp/v2/posts`);

                // Publish to WordPress
                const wpResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(postData)
                });

                if (!wpResponse.ok) {
                  const errorText = await wpResponse.text();
                  console.log(`  ❌ WordPress API error (${wpResponse.status}): ${errorText}`);
                  throw new Error(`WordPress API error: ${wpResponse.status}`);
                }

                const wpPost = await wpResponse.json();
                console.log(`  WordPress Post ID: ${wpPost.id}`);
                console.log(`  WordPress Post URL: ${wpPost.link}`);

                // Create WordPress edit URL
                const baseUrl = site.url.replace(/\/$/, '');
                const editUrl = `${baseUrl}/wp-admin/post.php?post=${wpPost.id}&action=edit`;

                // Update review with publication info
                if (!review.published) {
                  review.published = [];
                }
                
                review.published.push({
                  siteId: site._id,
                  wordpressId: wpPost.id,
                  url: wpPost.link,
                  publishedAt: new Date(),
                  status: 'draft'
                });
                
                review.status = 'draft';
                await review.save();

                // Also set legacy fields for compatibility
                review.publishedAt = new Date();
                review.publishedTo = {
                  platform: 'wordpress',
                  siteId: site._id.toString(),
                  siteDomain: site.url,
                  postUrl: wpPost.link,
                  editUrl: editUrl
                };
                await review.save();
                
                // Delete review from MongoDB after successful WordPress publish
                await Review.findByIdAndDelete(review._id);
                console.log(`  🗑️ Review deleted from MongoDB (WordPress is now the permanent storage)`);
                
                console.log(`[WORDPRESS ${globalIndex + 1}] ✅ PUBLISHED SUCCESSFULLY`);
                console.log(`  Post URL: ${review.publishedTo.postUrl}`);
                console.log(`  Published At: ${review.publishedAt.toISOString()}`);
              } else {
                console.log(`[WORDPRESS ${globalIndex + 1}] ❌ SITE NOT FOUND`);
                console.log(`  Site ID: ${selectedSiteId} not found for user ${userId}`);
              }
            } catch (publishError: any) {
              console.log(`[WORDPRESS ${globalIndex + 1}] ❌ PUBLISHING FAILED`);
              console.log(`  Error: ${publishError.message}`);
              console.log(`  Stack: ${publishError.stack}`);
              // Continue processing - publishing failure shouldn't stop generation
            }
          }

          return {
            title: reviewData.title,
            status: 'success',
            reviewId: review._id,
            review: review,
            details: {
              mongoId: review._id,
              collection: 'reviews',
              slug: review.slug,
              aiProvider: review.metadata?.aiProvider || 'unknown',
              aiModel: review.metadata?.aiModel || 'unknown',
              tokensUsed: review.metadata?.tokensUsed?.total || 0,
              cost: review.metadata?.cost || 0,
              generationTime: reviewTime,
              wordCount: review.content?.wordCount || 0,
              wordpressUrl: review.publishedTo?.postUrl || null,
              publishedAt: review.publishedAt || null,
              preview: {
                introduction: review.content?.introduction?.substring(0, 500) || '',
                conclusion: review.content?.conclusion?.substring(0, 500) || '',
                productCount: reviewData.products?.length || 0,
                contentType: review.contentType,
                fullContentUrl: `/api/reviews/${review._id}` // URL to view full review
              }
            }
          };
        } catch (error: any) {
          const reviewTime = Date.now() - reviewStart;
          console.log(`[REVIEW ${globalIndex + 1}] ❌ GENERATION FAILED`);
          console.log(`  Title: "${reviewData.title}"`);
          console.log(`  Error: ${error.message}`);
          console.log(`  Time to failure: ${reviewTime}ms`);
          console.log(`  Stack trace: ${error.stack}`);
          
          return {
            title: reviewData.title,
            status: 'error',
            error: error.message || 'Failed to generate review',
            details: {
              errorMessage: error.message,
              generationTime: reviewTime,
              failedAt: new Date().toISOString()
            }
          };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const batchTime = Date.now() - batchStart;
      const batchSuccess = batchResults.filter(r => r.status === 'success').length;
      const batchErrors = batchResults.filter(r => r.status === 'error').length;
      
      console.log(`--- BATCH ${Math.floor(i/BATCH_SIZE) + 1} COMPLETED ---`);
      console.log(`  Success: ${batchSuccess}/${batch.length}`);
      console.log(`  Errors: ${batchErrors}/${batch.length}`);
      console.log(`  Batch Time: ${batchTime}ms`);

      // Small delay between batches to avoid overwhelming the AI API
      if (i + BATCH_SIZE < reviews.length) {
        console.log(`  Waiting 2s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const totalTime = Date.now() - startTime;
    const publishedCount = results.filter(r => r.details?.wordpressUrl).length;

    console.log(`\n=== BULK GENERATION COMPLETED ===`);
    console.log(`Bulk ID: ${bulkId}`);
    console.log(`Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`Success: ${successCount}/${reviews.length}`);
    console.log(`Errors: ${errorCount}/${reviews.length}`);
    console.log(`WordPress Published: ${publishedCount}/${reviews.length}`);
    console.log(`Total Tokens Used: ${totalTokens}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Average Time per Review: ${(totalTime/reviews.length).toFixed(0)}ms`);
    console.log(`Storage: MongoDB database 'tatame', collection 'reviews'`);
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log(`===============================\n`);

    // Set review count for usage tracking
    res.locals.reviewCount = successCount;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          bulkId,
          total: reviews.length,
          successful: successCount,
          failed: errorCount,
          publishedToWordPress: publishedCount,
          totalTime: totalTime,
          totalTokens: totalTokens,
          totalCost: totalCost,
          averageTimePerReview: Math.round(totalTime/reviews.length),
          storage: {
            database: 'tatame',
            collection: 'reviews'
          },
          completedAt: new Date().toISOString()
        }
      },
      message: `Bulk generation completed: ${successCount}/${reviews.length} reviews generated successfully`
    });
    
    // Call next() to continue to tracking middleware
    next();
  } catch (error: any) {
    console.error('Error in bulk review generation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate reviews in bulk'
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
    const { siteId, reviewId, wordPressSiteId } = req.body;
    
    // Handle both old route (/:id/publish) and new route (/publish-draft)
    const targetReviewId = id || reviewId;
    const targetSiteId = siteId || wordPressSiteId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the review
    const review = await Review.findOne({ _id: targetReviewId, userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Get the WordPress site
    const site = await WordPressSite.findOne({ _id: targetSiteId, userId }).select('+applicationPassword');
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

    // Delete the review from MongoDB after successful WordPress publish
    await Review.findByIdAndDelete(targetReviewId);
    console.log(`🗑️ Review "${review.title}" deleted from MongoDB after WordPress publish`);

    // Update site statistics (but don't increment published count for drafts)
    site.statistics = site.statistics || { postsPublished: 0 };
    site.statistics.lastPublishedAt = new Date();
    await site.save();

    res.json({
      success: true,
      data: {
        postId: wpPost.id, // Frontend expects postId
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

// Bulk publish multiple reviews to WordPress
export const bulkPublishReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { reviewIds, wordPressSiteId } = req.body;

    // Validate input
    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review IDs array is required and must not be empty'
      });
    }

    if (!wordPressSiteId) {
      return res.status(400).json({
        success: false,
        message: 'WordPress site ID is required'
      });
    }

    if (reviewIds.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 reviews allowed per bulk publish'
      });
    }

    console.log(`🚀 Starting bulk publish of ${reviewIds.length} reviews to WordPress site ${wordPressSiteId}`);
    
    // Get the WordPress site
    const site = await WordPressSite.findOne({ _id: wordPressSiteId, userId }).select('+applicationPassword');
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'WordPress site not found'
      });
    }

    // Get all reviews
    const reviews = await Review.find({ 
      _id: { $in: reviewIds }, 
      userId 
    });

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reviews found'
      });
    }

    console.log(`📝 Found ${reviews.length} reviews to publish`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Get decrypted password
    const password = site.applicationPassword.includes(':') 
      ? site.getDecryptedPassword() 
      : site.applicationPassword;
    
    const credentials = Buffer.from(`${site.username}:${password}`).toString('base64');

    // Process each review
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const startTime = Date.now();
      
      try {
        console.log(`\n[BULK PUBLISH ${i + 1}/${reviews.length}] Publishing "${review.title}"`);
        
        // Check if already published to this site
        const existingPublication = review.published?.find(
          pub => pub.siteId?.toString() === site._id.toString()
        );

        if (existingPublication) {
          console.log(`  ⚠️ Already published - skipping`);
          results.push({
            reviewId: review._id,
            title: review.title,
            status: 'skipped',
            message: 'Already published to this site',
            existingUrl: existingPublication.url
          });
          continue;
        }

        // Prepare the post data
        const postData = {
          title: review.title,
          content: review.content?.fullHtml || '',
          status: 'draft',
          format: 'standard',
          categories: [],
          tags: []
        };

        // Publish to WordPress
        const wpResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData)
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          console.log(`  ❌ WordPress API error: ${errorText}`);
          
          results.push({
            reviewId: review._id,
            title: review.title,
            status: 'error',
            message: `WordPress API error: ${wpResponse.status}`,
            error: errorText
          });
          failureCount++;
          continue;
        }

        const wpPost = await wpResponse.json();
        const processingTime = Date.now() - startTime;

        // Create WordPress edit URL
        const baseUrl = site.url.replace(/\/$/, '');
        const editUrl = `${baseUrl}/wp-admin/post.php?post=${wpPost.id}&action=edit`;

        // Update review with publication info
        if (!review.published) {
          review.published = [];
        }
        
        review.published.push({
          siteId: site._id,
          wordpressId: wpPost.id,
          url: wpPost.link,
          publishedAt: new Date(),
          status: 'draft'
        });
        
        if (review.status !== 'published') {
          review.status = 'draft';
        }
        
        await review.save();

        // Delete from MongoDB to free space - mandatory after WordPress publish
        await Review.findByIdAndDelete(review._id);
        console.log(`  🗑️ Deleted from MongoDB (WordPress is permanent storage)`);

        console.log(`  ✅ Published successfully - ID: ${wpPost.id} (${processingTime}ms)`);
        
        results.push({
          reviewId: review._id,
          title: review.title,
          status: 'success',
          wordpressId: wpPost.id,
          url: wpPost.link,
          editUrl: editUrl,
          processingTime
        });
        
        successCount++;

        // Small delay to avoid overwhelming WordPress
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        console.log(`  ❌ Error publishing review: ${error.message}`);
        
        results.push({
          reviewId: review._id,
          title: review.title,
          status: 'error',
          message: error.message,
          processingTime
        });
        failureCount++;
      }
    }

    // Update site statistics
    site.statistics = site.statistics || { postsPublished: 0 };
    site.statistics.lastPublishedAt = new Date();
    await site.save();

    const summary = {
      total: reviews.length,
      successful: successCount,
      failed: failureCount,
      skipped: results.filter(r => r.status === 'skipped').length,
      siteName: site.name || site.domain,
      completedAt: new Date().toISOString()
    };

    console.log(`\n🎉 BULK PUBLISH COMPLETED:`);
    console.log(`  Total: ${summary.total}`);
    console.log(`  Successful: ${summary.successful}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Skipped: ${summary.skipped}`);
    console.log(`  Site: ${summary.siteName}`);

    res.json({
      success: true,
      data: {
        results,
        summary
      },
      message: `Bulk publish completed: ${successCount} successful, ${failureCount} failed`
    });

  } catch (error: any) {
    console.error('Error in bulk publish:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk publish reviews',
      error: error.message
    });
  }
};

// ========================= QUEUE-BASED GENERATION =========================

// Helper function to generate single review (used by queue processor)
export const generateSingleReviewWithData = async (data: {
  userId: mongoose.Types.ObjectId;
  title: string;
  contentType?: 'bbr' | 'spr' | 'informational';
  products: Array<{
    name: string;
    imageUrl?: string;
    affiliateLink: string;
    pros: string[];
    cons: string[];
    description?: string;
  }>;
  outline?: string[];
}) => {
  const { userId, title, contentType = 'bbr', products, outline } = data;
  
  console.log(`📝 [QUEUE] Generating ${contentType} for user ${userId}: "${title}"`);
  
  const review = await reviewGenerator.generateContent({
    userId: userId.toString(),
    title,
    contentType,
    products: (contentType === 'bbr' || contentType === 'spr') ? products : undefined,
    outline: outline
  });

  return review;
};

// Helper function to publish review to WordPress (used by queue processor)
export const publishReviewToWordPress = async (
  reviewId: string,
  siteId: string,
  userId: string
) => {
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    const site = await WordPressSite.findOne({ 
      _id: siteId, 
      userId 
    }).select('+applicationPassword');

    if (!site) {
      throw new Error('WordPress site not found');
    }

    // Get decrypted password
    const password = site.applicationPassword.includes(':') 
      ? site.getDecryptedPassword() 
      : site.applicationPassword;
    
    const credentials = Buffer.from(`${site.username}:${password}`).toString('base64');

    // Prepare the post data
    const postData = {
      title: review.title,
      content: review.content?.fullHtml || '',
      status: 'draft',
      format: 'standard',
      categories: [],
      tags: []
    };

    // Publish to WordPress
    const wpResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const wpPost = await wpResponse.json();

    // Create WordPress edit URL
    const baseUrl = site.url.replace(/\/$/, '');
    const editUrl = `${baseUrl}/wp-admin/post.php?post=${wpPost.id}&action=edit`;

    // Update review with publication info
    if (!review.published) {
      review.published = [];
    }
    
    review.published.push({
      siteId: site._id,
      wordpressId: wpPost.id,
      url: wpPost.link,
      publishedAt: new Date(),
      status: 'draft'
    });
    
    review.status = 'draft';
    await review.save();

    // Also set legacy fields for compatibility
    review.publishedAt = new Date();
    review.publishedTo = {
      platform: 'wordpress',
      siteId: site._id.toString(),
      siteDomain: site.url,
      postUrl: wpPost.link,
      editUrl: editUrl
    };
    await review.save();
    
    // Delete review from MongoDB after successful WordPress publish
    await Review.findByIdAndDelete(review._id);

    return {
      success: true,
      url: wpPost.link,
      editUrl: editUrl,
      wordpressId: wpPost.id
    };

  } catch (error: any) {
    console.error('WordPress publishing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Queue bulk review generation (NEW ENDPOINT)
export const queueBulkReviewGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { reviews, publishToWordPress = false, selectedSiteId } = req.body;

    // Validate input (same validation as original bulk endpoint)
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reviews array is required and must not be empty'
      });
    }

    if (reviews.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 reviews allowed per batch'
      });
    }

    // Validate each review
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      if (!review.title) {
        return res.status(400).json({
          success: false,
          message: `Review ${i + 1}: Title is required`
        });
      }

      // Validate content type specific requirements
      if (review.contentType === 'bbr' || review.contentType === 'spr') {
        if (!review.products || !Array.isArray(review.products) || review.products.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Review ${i + 1}: Products are required for ${review.contentType} content`
          });
        }

        // Validate products
        for (const product of review.products) {
          if (!product.name || !product.affiliateLink) {
            return res.status(400).json({
              success: false,
              message: `Review ${i + 1}: Each product must have a name and affiliate link`
            });
          }
        }
      }
    }

    // Queue the job
    const result = await reviewQueueService.queueBulkReviewGeneration({
      userId: userId,
      reviewsData: reviews,
      publishToWordPress,
      selectedSiteId
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to queue review generation job',
        error: result.error
      });
    }

    console.log(`🚀 Bulk review generation queued for user ${userId}`);
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Reviews: ${reviews.length}`);
    console.log(`   WordPress: ${publishToWordPress ? 'ENABLED' : 'DISABLED'}`);

    res.json({
      success: true,
      data: {
        jobId: result.jobId,
        bullJobId: result.bullJobId,
        reviewCount: reviews.length,
        estimatedTime: result.estimatedTime,
        publishToWordPress,
        message: 'Review generation job queued successfully'
      },
      message: `${reviews.length} reviews queued for generation`
    });

  } catch (error: any) {
    console.error('Error queuing bulk review generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to queue review generation',
      error: error.message
    });
  }
};

// Get job status
export const getJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }

    const result = await reviewQueueService.getJobStatus(jobId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Job not found'
      });
    }

    // Verify job belongs to user
    const job = await ReviewGenerationJob.findById(jobId);
    
    // Debug logging for user ownership verification
    console.log('🔍 [JOB-ACCESS-DEBUG]', {
      jobId,
      jobFound: !!job,
      jobUserId: job?.userId?.toString(),
      requestUserId: userId,
      userMatch: job?.userId?.toString() === userId
    });
    
    // Allow access if: job belongs to user OR user is admin
    const isAdmin = req.user?.role === 'admin';
    const hasAccess = job && (job.userId.toString() === userId || isAdmin);
    
    if (!hasAccess) {
      console.warn('❌ [JOB-ACCESS-DENIED]', {
        jobId,
        jobUserId: job?.userId?.toString(),
        requestUserId: userId,
        isAdmin,
        reason: !job ? 'Job not found' : 'User ID mismatch and not admin'
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    console.log('✅ [JOB-ACCESS-GRANTED]', {
      jobId,
      jobUserId: job.userId.toString(),
      requestUserId: userId,
      isAdmin,
      accessReason: job.userId.toString() === userId ? 'owner' : 'admin'
    });

    // Log the actual job data being returned
    console.log('📊 [JOB-STATUS-RESPONSE]', {
      jobId,
      jobStatus: result.job?.status,
      jobProgress: result.job?.progress,
      jobCurrentStep: result.job?.currentStep,
      jobResultsCount: result.job?.results?.completed?.length || 0,
      fullJobData: JSON.stringify(result.job, null, 2)
    });

    res.json({
      success: true,
      data: result.job,
      message: 'Job status retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error.message
    });
  }
};

// Get user jobs
export const getUserJobs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const result = await reviewQueueService.getUserJobs(userId, limit);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to get jobs'
      });
    }

    res.json({
      success: true,
      data: {
        jobs: result.jobs,
        total: result.jobs.length
      },
      message: 'Jobs retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error getting user jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs',
      error: error.message
    });
  }
};

// Get queue statistics (admin endpoint)
export const getQueueStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await reviewQueueService.getQueueStats();

    res.json({
      success: true,
      data: stats,
      message: 'Queue statistics retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message
    });
  }
};