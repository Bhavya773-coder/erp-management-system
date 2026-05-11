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

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve static files from the React app
const distPath = path.resolve(process.cwd(), 'client', 'dist');
const indexFile = path.join(distPath, 'index.html');

console.log(`📂 Path Diagnostic:`);
console.log(`   - Current Directory (cwd): ${process.cwd()}`);
console.log(`   - Directory Name (__dirname): ${__dirname}`);
console.log(`   - Resolved Dist Path: ${distPath}`);

if (fs.existsSync(distPath)) {
  console.log(`✅ Web client found at ${distPath}. Serving static files.`);
  app.use(express.static(distPath));
} else {
  console.log(`ℹ️ Web client not found at ${distPath}. Server will operate in API-only mode.`);
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
  res.json({ 
    status: 'OK', 
    service: 'Arcadian ERP API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// The "catchall" handler
app.get('*', (req, res) => {
  // If it's an API route that wasn't caught, return 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  
  // Try to serve React app if it exists
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  
  // Fallback: Show a friendly API status page
  res.send(`
    <html>
      <head>
        <title>Arcadian ERP API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center; }
          .container { padding: 2rem; border-radius: 1rem; background: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
          h1 { color: #22c55e; margin-bottom: 0.5rem; }
          p { color: #94a3b8; }
          .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 1rem; background: #064e3b; color: #4ade80; font-size: 0.875rem; font-weight: 600; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Arcadian API is Live</h1>
          <p>The backend server is running successfully.</p>
          <div class="status">● System Operational</div>
          <p style="margin-top: 2rem; font-size: 0.75rem;">(Note: Web Client not deployed in this instance)</p>
        </div>
      </body>
    </html>
  `);
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
