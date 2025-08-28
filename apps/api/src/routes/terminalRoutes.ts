import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  testVPSConnection,
  connectToVPS,
  executeCommand,
  startInstallation,
  disconnectFromVPS,
  getUserSessions
} from '../controllers/terminalController';

const router = Router();

// All terminal routes require authentication
router.use(authenticate);

// Test VPS connection (validates Ubuntu 22.04)
router.post('/test', testVPSConnection);

// Connect to VPS and create session
router.post('/connect', connectToVPS);

// Execute command on VPS
router.post('/execute', executeCommand);

// Start WordPress installation
router.post('/install', startInstallation);

// Get user's active sessions
router.get('/sessions', getUserSessions);

// Disconnect from VPS
router.delete('/disconnect/:sessionId', disconnectFromVPS);

export default router;