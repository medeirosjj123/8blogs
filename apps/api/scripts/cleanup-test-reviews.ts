#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Define Review schema
const reviewSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  contentType: String,
  products: Array,
  content: String,
  metadata: Object,
  analytics: Object,
  status: String,
  published: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const Review = mongoose.model('Review', reviewSchema);

async function cleanupTestReviews() {
  console.log('🧹 Cleaning up test reviews from MongoDB...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find test reviews
    const testPatterns = [
      { title: /Test Review/i },
      { title: /Test Product/i },
      { title: /AI Generation/i },
      { title: /Encrypted Key/i },
      { 'products.name': /Test Product/i }
    ];
    
    const testReviews = await Review.find({
      $or: testPatterns
    });
    
    console.log(`Found ${testReviews.length} test reviews:\n`);
    
    for (const review of testReviews) {
      console.log(`- ${review.title}`);
      console.log(`  Created: ${review.createdAt}`);
      console.log(`  Type: ${review.contentType}`);
      if (review.metadata?.cost) {
        console.log(`  Cost: $${review.metadata.cost}`);
      }
    }
    
    if (testReviews.length > 0) {
      console.log('\nDeleting test reviews...');
      
      const result = await Review.deleteMany({
        $or: testPatterns
      });
      
      console.log(`\n✅ Deleted ${result.deletedCount} test reviews`);
    } else {
      console.log('\nNo test reviews found');
    }
    
    // Also show remaining reviews count
    const remainingCount = await Review.countDocuments();
    console.log(`\n📊 Remaining reviews in database: ${remainingCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

cleanupTestReviews();