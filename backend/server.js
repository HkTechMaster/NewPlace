require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'PlacePro API running' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/skill-faculties', require('./routes/skillFaculties'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n🚀 PlacePro API running on port ${PORT}\n`));
