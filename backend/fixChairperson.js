// Fix misassigned chairperson accounts
// Usage: node fixChairperson.js
require('dotenv').config();
const mongoose = require('mongoose');
const Chairperson = require('./models/Chairperson');
const SkillFaculty = require('./models/SkillFaculty');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  // Show all chairpersons and their current assignment
  const chairs = await Chairperson.find().populate('skillFaculty', 'name code');
  console.log('Current Chairpersons:');
  chairs.forEach(c => {
    console.log(`  ${c.name} | ${c.email} | dept: ${c.departmentCode || 'none'} | active: ${c.isActive}`);
  });

  // Find all departments and their assigned chairperson emails
  const faculties = await SkillFaculty.find();
  console.log('\nDepartment Assignments:');
  faculties.forEach(f => {
    f.departments.forEach(d => {
      console.log(`  ${d.name} | chairEmail: ${d.chairpersonEmail} | chairId: ${d.chairperson}`);
    });
  });

  // Fix: mark any chairperson whose email does NOT appear in any department as inactive
  const allDeptEmails = new Set();
  faculties.forEach(f => f.departments.forEach(d => { if (d.chairpersonEmail) allDeptEmails.add(d.chairpersonEmail.toLowerCase()); }));

  let fixed = 0;
  for (const c of chairs) {
    if (!allDeptEmails.has(c.email.toLowerCase()) && c.isActive) {
      console.log(`\n⚠️  ${c.name} (${c.email}) is not assigned to any dept — deactivating`);
      c.isActive = false;
      c.skillFaculty = null;
      c.departmentCode = null;
      await c.save();
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} chairperson(s)`);
  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
