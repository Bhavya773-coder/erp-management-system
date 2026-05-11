import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import messageRoutes from './routes/message.routes.js';
import fileRoutes from './routes/file.routes.js';
import fleetRoutes from './routes/fleet.routes.js';
import { socketAuth } from './middleware/socketAuth.js';
import { setupSocketHandlers } from './socket/handlers.js';
import connectDB from './config/db.js';
import { initScheduleService } from './services/scheduleService.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
].filter(Boolean);

// CORS origin handler: allow listed web origins + React Native (no origin header)
const corsOriginHandler = (origin, callback) => {
  // Allow requests with no origin (React Native, curl, server-to-server)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(null, true); // Allow all in dev; restrict in production
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: corsOriginHandler,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Serve static files from the React app
const distPath = path.resolve(__dirname, '..', 'client', 'dist');
const indexFile = path.join(distPath, 'index.html');

console.log(`📂 Environment Info:`);
console.log(`   - __dirname: ${__dirname}`);
console.log(`   - process.cwd(): ${process.cwd()}`);
console.log(`   - distPath: ${distPath}`);
console.log(`   - indexFile: ${indexFile}`);

if (fs.existsSync(distPath)) {
  console.log(`✅ Static directory found at ${distPath}`);
  const indexExists = fs.existsSync(indexFile);
  console.log(`${indexExists ? '✅' : '❌'} index.html ${indexExists ? 'exists' : 'NOT found'} at ${indexFile}`);
  app.use(express.static(distPath));
} else {
  console.error(`❌ ERROR: Static directory not found at ${distPath}`);
  // Fallback for local dev
  const localDist = path.join(process.cwd(), 'client', 'dist');
  if (fs.existsSync(localDist)) {
     console.log(`✅ Found fallback dist at ${localDist}`);
     app.use(express.static(localDist));
  }
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/fleet', fleetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// The "catchall" handler
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  
  // Try to send index.html from distPath first, then local fallback
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    const localIndex = path.join(process.cwd(), 'client', 'dist', 'index.html');
    if (fs.existsSync(localIndex)) {
      res.sendFile(localIndex);
    } else {
      res.status(404).send('Application files not found. Please build the client project.');
    }
  }
});

// Socket.IO middleware and handlers
io.use(socketAuth);
setupSocketHandlers(io);
initScheduleService(io);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

export { io };
