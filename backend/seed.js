require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Dean = require('./models/Dean');
const Chairperson = require('./models/Chairperson');
const Coordinator = require('./models/Coordinator');
const SkillFaculty = require('./models/SkillFaculty');
const Course = require('./models/Course');
const DepartmentRequest = require('./models/DepartmentRequest');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── WIPE ALL COLLECTIONS ──────────────────────────────
    console.log('🗑️  Clearing all collections...');
    await Promise.all([
      User.deleteMany({}),
      Dean.deleteMany({}),
      Chairperson.deleteMany({}),
      Coordinator.deleteMany({}),
      SkillFaculty.deleteMany({}),
      Course.deleteMany({}),
      DepartmentRequest.deleteMany({}),
    ]);
    console.log('✅ All collections cleared\n');

    // ── SUPER ADMIN ───────────────────────────────────────
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: process.env.SUPER_ADMIN_EMAIL,
      role: 'super_admin',
    });
    console.log(`✅ Super Admin created: ${superAdmin.email}`);

    // ── SKILL FACULTY + DEAN ──────────────────────────────
    const faculty = await SkillFaculty.create({
      code: 'SFET',
      name: 'Skill Faculty of Engineering & Technology',
      description: 'Engineering and Technology programs',
      deanName: 'Dr. Ramesh Kumar',
      deanEmail: 'dean.sfet@institution.edu',
    });

    const dean = await Dean.create({
      name: 'Dr. Ramesh Kumar',
      email: 'dean.sfet@institution.edu',
      skillFaculty: faculty._id,
    });
    faculty.dean = dean._id;
    await faculty.save();

    console.log(`✅ Dean created: ${dean.email}`);
    console.log(`✅ Skill Faculty created: ${faculty.code}\n`);
    console.log('📋 Summary:');
    console.log('   Collection: users       → 1 super admin');
    console.log('   Collection: deans       → 1 dean');
    console.log('   Collection: chairpersons → 0 (add via dashboard)');
    console.log('   Collection: coordinators → 0 (add via courses)');
    console.log('   Collection: courses      → 0 (add via chairperson dashboard)');
    console.log('\n🎉 Seed complete! Login with your Super Admin Google account.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seed();
