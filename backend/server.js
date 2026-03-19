require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
connectDB().then(async () => {
  const User = require('./models/User');
  const emails = (process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || '').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
  for (const email of emails) {
    const exists = await User.findOne({ email });
    if (!exists) {
      await User.create({ name: 'Super Admin', email, role: 'super_admin' });
      console.log(`✅ Super Admin auto-created: ${email}`);
    }
  }
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'PlacePro API running' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/student-auth', require('./routes/studentAuth'));
app.use('/api/skill-faculties', require('./routes/skillFaculties'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/cv', require('./routes/cv'));
app.use('/api/student-lists', require('./routes/studentLists'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/drives', require('./routes/drives'));

// Serve frontend in production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n🚀 PlacePro API running on port ${PORT}\n`));
