require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const Chairperson = require('./models/Chairperson');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  // Show all courses and their chairperson _id
  const courses = await Course.find().select('name chairperson departmentCode');
  console.log('Courses and their chairperson _id:');
  courses.forEach(c => {
    console.log(`  "${c.name}" | dept: ${c.departmentCode} | chairperson _id: ${c.chairperson}`);
  });

  console.log('\nChairpersons and their _id:');
  const chairs = await Chairperson.find().select('name email departmentCode isActive');
  chairs.forEach(c => {
    console.log(`  _id: ${c._id} | ${c.email} | dept: ${c.departmentCode} | active: ${c.isActive}`);
  });

  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
