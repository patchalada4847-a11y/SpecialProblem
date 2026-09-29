const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

// 1. Require Routes ทั้งหมดให้ครบ
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const contractRoutes = require('./routes/contractRoutes');
const billRoutes = require('./routes/billRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const migrateDatabase = require('./config/migrateDatabase');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 2. เรียกใช้งาน API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
  res.send('Dormitory Management API Running... Go to <a href="/api-docs">/api-docs</a>');
});

const PORT = process.env.PORT || 5000;
migrateDatabase()
  .then(() => {
    console.log('Database schema is up to date');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to apply database schema migrations:', err);
    process.exit(1);
  });