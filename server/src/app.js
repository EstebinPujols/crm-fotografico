const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// Rutas
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const appointmentRoutes = require('./routes/appointments');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const galleryRoutes = require('./routes/galleries');
const settingsRoutes = require('./routes/settings');
const messageRoutes = require('./routes/messages');
const whatsappRoutes = require('./routes/whatsapp');
const path = require('path');

const app = express();

// ─── Middleware global ───

// CORS — permitir peticiones del frontend (cualquier puerto en desarrollo)
app.use(cors({
  origin: function (origin, callback) {
    // En desarrollo, permitir cualquier origen local
    if (!origin || origin.startsWith('http://localhost:') || process.env.NODE_ENV !== 'development') {
      callback(null, true);
    } else {
      callback(null, process.env.CORS_ORIGIN || '*');
    }
  },
  credentials: true,
}));

// Logging de peticiones
app.use(morgan('dev'));

// Parsear JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Archivos estáticos (uploads multimedia) ───
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rutas ───
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ─── 404 ───
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Error handler ───
app.use(errorHandler);

module.exports = app;
