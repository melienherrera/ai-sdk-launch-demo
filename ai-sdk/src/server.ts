import express from 'express';
import cors from 'cors';
import path from 'path';
import { Connection, Client } from '@temporalio/client';
import { loadClientConnectConfig } from '@temporalio/envconfig';
import { dailyBriefingWorkflow } from './workflows/news-briefing-workflow';
import { nanoid } from 'nanoid';
import { DailyBriefing } from './shared';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Global Temporal client
let temporalClient: Client;

async function initializeTemporalClient() {
  try {
    console.log('🔧 Connecting to Temporal server...');
    const config = loadClientConnectConfig();
    const connection = await Connection.connect(config.connectionOptions);
    temporalClient = new Client({ connection });
    console.log('✅ Connected to Temporal server');
  } catch (error) {
    console.error('❌ Failed to connect to Temporal server:', error);
    throw error;
  }
}

// POST /api/briefing/start
app.post('/api/briefing/start', async (req, res) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Topics array is required and must not be empty' });
    }

    const validTopics = topics.filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validTopics.length === 0) {
      return res.status(400).json({ error: 'At least one valid topic is required' });
    }

    const workflowId = 'briefing-web-' + nanoid();
    const handle = await temporalClient.workflow.start(dailyBriefingWorkflow, {
      taskQueue: 'ai-sdk',
      args: [validTopics],
      workflowId,
    });

    console.log(`🚀 Started briefing workflow: ${workflowId}`);
    console.log(`📋 Topics: ${validTopics.join(', ')}`);

    res.json({ workflowId, message: 'Briefing workflow started successfully', topics: validTopics });
  } catch (error: any) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ error: 'Failed to start workflow', details: error.message });
  }
});

// GET /api/briefing/status/:workflowId
app.get('/api/briefing/status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const handle = temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();

    if (description.status.name === 'RUNNING') {
      return res.json({ status: 'running', workflowId });
    }

    if (description.status.name === 'COMPLETED') {
      const result = await handle.result() as DailyBriefing;
      return res.json({ status: 'completed', workflowId, result });
    }

    return res.json({
      status: 'failed',
      workflowId,
      error: `Workflow status: ${description.status.name}`,
    });
  } catch (error: any) {
    console.error('Error checking workflow status:', error);
    if (error.message?.includes('not found') || error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Workflow not found', workflowId: req.params.workflowId });
    }
    res.status(500).json({ error: 'Failed to check workflow status', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const isConnected = temporalClient !== undefined;
  if (isConnected) {
    res.json({ status: 'healthy', temporal: 'connected' });
  } else {
    res.status(503).json({ status: 'unhealthy', temporal: 'disconnected' });
  }
});

async function startServer() {
  try {
    await initializeTemporalClient();
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║          🌐  BRIEFING WEB UI SERVER                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`\n🚀 Server running at: http://localhost:${PORT}`);
      console.log(`\n📝 Make sure the Temporal worker is running:`);
      console.log(`   npm run start.watch\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
