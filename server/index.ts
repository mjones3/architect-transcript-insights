import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import transcribeRoutes from './routes/transcribe';
import aiRoutes from './routes/ai';
import storageRoutes from './routes/storage';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/transcribe' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/transcribe', transcribeRoutes);
app.use('/api', aiRoutes);
app.use('/api', storageRoutes);

// WebSocket handling for real-time transcription
wss.on('connection', (ws) => {
  console.log('New WebSocket connection for transcription');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'audio') {
        // Process audio data with AWS Transcribe
        const { processAudioStream } = await import('./services/awsTranscribe');
        await processAudioStream(data.data, ws);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Processing error' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/transcribe`);
});