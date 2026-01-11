// Load .env FIRST - must be imported before anything else
import './load-env.js';

// Now import other modules (they will have access to env vars)
import express from 'express';
import cors from 'cors';
import { handleError } from './shared/errors.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/uploads.js';
import auditRoutes from './routes/audit.js';
import healthRoutes from './routes/health.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const errorResponse = handleError(err, req.path);
  res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

export default app;

