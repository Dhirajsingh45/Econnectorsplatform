const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { checkSLAExpirations } = require('./controllers/dispatchController');
const Message = require('./models/Message');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback for cross-origin client configurations
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});
app.set('io', io);

// Global Database Connection Guard for API endpoints
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database connection is currently unavailable. Please try again shortly.'
    });
  }
  next();
});

// Production API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/ecosystem', require('./routes/ecosystemRoutes'));
app.use('/api/dispatch', require('./routes/dispatchRoutes'));
app.use('/api/animals', require('./routes/animalRoutes'));
app.use('/api/vet', require('./routes/vetRoutes'));
app.use('/api/shelter', require('./routes/shelterRoutes'));
app.use('/api/adoptions', require('./routes/adoptionRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sightings', require('./routes/sightingRoutes'));
app.use('/api/foster', require('./routes/fosterRoutes'));
app.use('/api/lost-found', require('./routes/lostFoundRoutes'));
app.use('/api/training', require('./routes/trainingRoutes'));
app.use('/api/abc', require('./routes/abcRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_sector', (sector) => {
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });
    socket.join(sector);
    console.log(`👤 User joined sector: ${sector}`);
  });

  socket.on('send_message', async (data) => {
    const { sector, sender, text, type } = data;
    try {
      if (mongoose.connection.readyState === 1) {
        const message = await Message.create({
          sender,
          sector: sector || 'global',
          text,
          type: type || 'text'
        });
        io.to(sector || 'global').emit('receive_message', message);
      }
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    dbState: isConnected ? 'CONNECTED' : 'DISCONNECTED',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Ecoconnect Production API is operational.');
});

// 404 Handler for undefined API routes
app.use('/api/*splat', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Mongoose Lifecycle Event Listeners
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB connection lost. API requests requiring database will return 503.');
});
mongoose.connection.on('reconnected', () => {
  console.log('🍃 MongoDB connection restored successfully.');
});

// Database Connection & Server Initialization
const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/Ecoconnect';

  const options = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    socketTimeoutMS: 45000,
    family: 4
  };

  if (primaryUri) {
    try {
      console.log('⌛ Connecting to Primary MongoDB...');
      await mongoose.connect(primaryUri, options);
      console.log('🍃 Primary MongoDB Connected Successfully');
      return true;
    } catch (err) {
      console.error(' Primary MongoDB Connection Failed:', err.message);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('⌛ Attempting fallback to local MongoDB...');
      await mongoose.connect(fallbackUri, options);
      console.log('🍃 Local Fallback MongoDB Connected Successfully');
      return true;
    } catch (fallbackErr) {
      console.error('❌ Local Fallback MongoDB Connection failed:', fallbackErr.message);
    }
  }

  console.error('❌ Could not establish database connection.');
  return false;
};

// Start standalone HTTP & Socket.IO server when run directly
if (require.main === module) {
  connectDB().then((connected) => {
    if (!connected) {
      console.warn('⚠️ Server launching with DISCONNECTED database state. API endpoints will return 503 until DB connects.');
    }

    server.listen(PORT, () => {
      console.log(`🚀 Ecoconnect Persistent Server running on port ${PORT}`);
    });

    // Background SLA expiration timer
    setInterval(() => {
      if (mongoose.connection.readyState === 1) {
        checkSLAExpirations().catch((err) => console.error('SLA Expiration Error:', err));
      }
    }, 30000);
  });
}

module.exports = app;
