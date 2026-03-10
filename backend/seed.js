/**
 * SEED SCRIPT - Run once to set up Super Admin
 * Usage: node seed.js
 * 
 * Make sure your .env file is configured with MONGODB_URI and SUPER_ADMIN_EMAIL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const SkillFaculty = require('./models/SkillFaculty');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');
};

const seedData = async () => {
  try {
    await connectDB();

    // ─── 1. Create or verify Super Admin ───────────────────────────────────
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'hiteshkhutela@gmail.com';

    let superAdmin = await User.findOne({ email: superAdminEmail });

    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        email: superAdminEmail,
        role: 'super_admin',
        isActive: true,
      });
      console.log(`✅ Super Admin created: ${superAdminEmail}`);
    } else {
      console.log(`ℹ️  Super Admin already exists: ${superAdminEmail}`);
    }

    // ─── 2. Create sample Skill Faculties (optional) ───────────────────────
    const sampleFaculties = [
      {
        code: 'SFET',
        name: 'Skill Faculty of Engineering & Technology',
        description: 'Covers engineering disciplines including Computer Science, Mechanical, Electrical, and Civil Engineering.',
        deanName: 'Dr. Rajesh Kumar',
        deanEmail: 'dean.sfet@placement.edu',
        establishedYear: 2015,
        departments: [
          { name: 'Computer Science & Engineering', code: 'CSE' },
          { name: 'Mechanical Engineering', code: 'ME' },
          { name: 'Electrical Engineering', code: 'EE' },
        ],
      },
      {
        code: 'SFASH',
        name: 'Skill Faculty of Arts, Science & Humanities',
        description: 'Covers liberal arts, natural sciences, social sciences, and humanities programs.',
        deanName: 'Dr. Priya Sharma',
        deanEmail: 'dean.sfash@placement.edu',
        establishedYear: 2016,
        departments: [
          { name: 'Physics', code: 'PHY' },
          { name: 'Chemistry', code: 'CHEM' },
          { name: 'Mathematics', code: 'MATH' },
        ],
      },
      {
        code: 'SFMSR',
        name: 'Skill Faculty of Management, Social Science & Research',
        description: 'Covers business management, social science research, and MBA programs.',
        deanName: 'Dr. Amit Verma',
        deanEmail: 'dean.sfmsr@placement.edu',
        establishedYear: 2017,
        departments: [
          { name: 'Business Administration', code: 'MBA' },
          { name: 'Economics', code: 'ECO' },
          { name: 'Sociology', code: 'SOC' },
        ],
      },
    ];

    for (const facultyData of sampleFaculties) {
      const existing = await SkillFaculty.findOne({ code: facultyData.code });
      if (!existing) {
        // Create dean user
        let deanUser = await User.findOne({ email: facultyData.deanEmail });
        if (!deanUser) {
          deanUser = await User.create({
            name: facultyData.deanName,
            email: facultyData.deanEmail,
            role: 'dean',
          });
        }

        const faculty = await SkillFaculty.create({
          ...facultyData,
          dean: deanUser._id,
          contactEmail: facultyData.deanEmail,
        });

        deanUser.skillFaculty = faculty._id;
        await deanUser.save();

        console.log(`✅ Created Skill Faculty: ${facultyData.code} - ${facultyData.name}`);
      } else {
        console.log(`ℹ️  Skill Faculty already exists: ${facultyData.code}`);
      }
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login Instructions:');
    console.log(`   Super Admin: Sign in with Google using ${superAdminEmail}`);
    console.log('   Deans: Sign in with Google using their registered email\n');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

seedData();
