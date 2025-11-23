import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import transcribeRoutes from './routes/transcribe';
import audioRoutes, { initializeAudioWebSocket } from './routes/audio';
import aiRoutes from './routes/ai';
import storageRoutes from './routes/storage';
import claudeRoutes from './routes/claude';
import speakerRoutes from './routes/speakers';
import { authenticateToken, optionalAuth } from './middleware/auth';

dotenv.config();

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes (no authentication required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protected routes (require authentication)
app.use('/api/transcribe', authenticateToken, transcribeRoutes);
app.use('/api/audio', optionalAuth, audioRoutes); // Allow some public access for testing
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/storage', authenticateToken, storageRoutes);
app.use('/api/claude', authenticateToken, claudeRoutes);
app.use('/api/speakers', authenticateToken, speakerRoutes);

// Initialize WebSocket for audio processing
const audioWebSocketServer = initializeAudioWebSocket(server);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/transcribe`);
});