import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Course } from '../src/models/Course';
import { Module } from '../src/models/Module';
import { Lesson } from '../src/models/Lesson';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: '../.env' });

async function verifyData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://8links:6zuQIeXNTWPo1qTh@cluster0.2yead.mongodb.net/tatame?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check for admin user
    const admin = await User.findOne({ email: 'admin@tatame.com' });
    console.log('👤 Admin User:');
    console.log(`   Email: ${admin?.email}`);
    console.log(`   Role: ${admin?.role}`);
    console.log(`   ID: ${admin?._id}\n`);

    // Count documents
    const courseCount = await Course.countDocuments();
    const moduleCount = await Module.countDocuments();
    const lessonCount = await Lesson.countDocuments();
    
    console.log('📊 Database Statistics:');
    console.log(`   Courses: ${courseCount}`);
    console.log(`   Modules: ${moduleCount}`);
    console.log(`   Lessons: ${lessonCount}\n`);

    // List all courses
    const courses = await Course.find().select('title slug level isPublished modules');
    console.log('📚 Courses in Database:');
    for (const course of courses) {
      console.log(`\n   📖 ${course.title}`);
      console.log(`      ID: ${course._id}`);
      console.log(`      Slug: ${course.slug}`);
      console.log(`      Level: ${course.level}`);
      console.log(`      Published: ${course.isPublished}`);
      console.log(`      Modules: ${course.modules?.length || 0}`);
      
      // Get modules for this course
      const modules = await Module.find({ courseId: course._id }).select('title order lessons');
      if (modules.length > 0) {
        console.log(`      Module Details:`);
        for (const module of modules.sort((a, b) => a.order - b.order)) {
          const lessonCount = await Lesson.countDocuments({ moduleId: module._id });
          console.log(`        - ${module.title} (${lessonCount} lessons)`);
        }
      }
    }

    console.log('\n✅ Data verification complete!');
    console.log('\n📝 Notes:');
    console.log('   - All courses are stored in MongoDB');
    console.log('   - Both student and admin pages should show the same courses');
    console.log('   - Admin can create, edit, and delete courses');
    console.log('   - No duplicates should exist\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the verification
verifyData();