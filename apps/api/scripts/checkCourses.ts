import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
    
    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
    const courses = await Course.find({}).lean();
    
    console.log('\n=== All Courses ===');
    courses.forEach((course: any) => {
      console.log(`\nTitle: ${course.title}`);
      console.log(`Thumbnail: ${course.thumbnail || 'No thumbnail'}`);
      console.log(`ID: ${course._id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCourses();