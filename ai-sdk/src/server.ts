import express from 'express';
import cors from 'cors';
import path from 'path';
import { Connection, Client } from '@temporalio/client';
import { loadClientConnectConfig } from '@temporalio/envconfig';
import { dailyBriefingWorkflow } from './workflows/news-briefing-workflow';
import { nanoid } from 'nanoid';
import { DailyBriefing, WorkflowProgress, PhaseInfo, getProgressQuery } from './shared';
import { searchTopic, summarizeTopic, generateBriefing } from '../non-temporal/web-search';

const app = express();
const PORT = process.env.PORT || 3000;
const TEMPORAL_UI_BASE = `http://localhost:8233/namespaces/default/workflows`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Temporal client ──────────────────────────────────────────────────────────

let temporalClient: Client;

async function initializeTemporalClient() {
  console.log('🔧 Connecting to Temporal server...');
  const config = loadClientConnectConfig();
  const connection = await Connection.connect(config.connectionOptions);
  temporalClient = new Client({ connection });
  console.log('✅ Connected to Temporal server');
}

// ─── Vanilla in-memory job store ──────────────────────────────────────────────

type JobStatus = 'running' | 'completed' | 'failed';

interface VanillaJob {
  jobId: string;
  status: JobStatus;
  progress: {
    currentPhase: number;
    phases: PhaseInfo[];
  };
  result?: DailyBriefing;
  error?: string;
}

const vanillaJobs = new Map<string, VanillaJob>();

async function runVanillaWorkflow(jobId: string, topics: string[]) {
  const job = vanillaJobs.get(jobId)!;

  try {
    // Phase 1
    job.progress.currentPhase = 1;
    job.progress.phases[0].status = 'running';
    const searchResults = await Promise.all(topics.map(t => searchTopic(t)));
    job.progress.phases[0].status = 'completed';

    // Simulate a crash after Phase 1 — demonstrates that without Temporal,
    // all progress is lost and the workflow must restart from scratch.
    console.log('\n💥 Vanilla workflow crashed after Phase 1 — all progress lost!\n');
    throw new Error('Simulated crash: unhandled exception mid-workflow. All progress lost — must restart from scratch.');

    // Phase 2
    job.progress.currentPhase = 2;
    job.progress.phases[1].status = 'running';
    const summaries = await Promise.all(searchResults.map(r => summarizeTopic(r)));
    job.progress.phases[1].status = 'completed';

    // Phase 3
    job.progress.currentPhase = 3;
    job.progress.phases[2].status = 'running';
    const briefingText = await generateBriefing(summaries);
    job.progress.phases[2].status = 'completed';

    const totalSources = searchResults.reduce((acc, r) => acc + (r.sources?.length || 0), 0);

    job.status = 'completed';
    job.result = {
      date: new Date().toISOString().split('T')[0],
      topics: summaries,
      briefingText,
      totalSources,
    };
  } catch (err: any) {
    job.status = 'failed';
    job.progress.phases.forEach(p => { if (p.status === 'running') p.status = 'failed'; });
    job.error = err.message || 'Unknown error';
  }

  // Clean up after 30 minutes
  setTimeout(() => vanillaJobs.delete(jobId), 30 * 60 * 1000);
}

// ─── Vanilla routes ───────────────────────────────────────────────────────────

app.post('/api/vanilla/start', async (req, res) => {
  try {
    const { topics } = req.body;
    const validTopics = (topics as string[]).filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validTopics.length === 0) {
      return res.status(400).json({ error: 'At least one valid topic is required' });
    }

    const jobId = 'vanilla-' + nanoid();
    const job: VanillaJob = {
      jobId,
      status: 'running',
      progress: {
        currentPhase: 1,
        phases: [
          { phase: 1, label: 'Searching Topics', status: 'running' },
          { phase: 2, label: 'Summarizing Findings', status: 'pending' },
          { phase: 3, label: 'Generating Briefing', status: 'pending' },
        ],
      },
    };
    vanillaJobs.set(jobId, job);

    // Fire and forget — do not await
    runVanillaWorkflow(jobId, validTopics).catch(() => {});

    console.log(`🚀 Started vanilla job: ${jobId}`);
    res.json({ jobId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start vanilla job', details: err.message });
  }
});

app.get('/api/vanilla/status/:jobId', (req, res) => {
  const job = vanillaJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    status: job.status,
    jobId: job.jobId,
    progress: job.progress,
    ...(job.result && { result: job.result }),
    ...(job.error && { error: job.error }),
  });
});

// ─── Temporal routes ──────────────────────────────────────────────────────────

app.post('/api/briefing/start', async (req, res) => {
  try {
    const { topics } = req.body;
    const validTopics = (topics as string[]).filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validTopics.length === 0) {
      return res.status(400).json({ error: 'At least one valid topic is required' });
    }

    const workflowId = 'briefing-web-' + nanoid();
    const handle = await temporalClient.workflow.start(dailyBriefingWorkflow, {
      taskQueue: 'ai-sdk',
      args: [validTopics],
      workflowId,
    });

    console.log(`🚀 Started Temporal workflow: ${workflowId}`);
    res.json({
      workflowId,
      temporalUiUrl: `${TEMPORAL_UI_BASE}/${workflowId}/${handle.firstExecutionRunId}`,
      topics: validTopics,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start workflow', details: err.message });
  }
});

app.get('/api/briefing/status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const handle = temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();
    const statusName = description.status.name;
    const temporalUiUrl = `${TEMPORAL_UI_BASE}/${workflowId}`;

    if (statusName === 'RUNNING') {
      let progress: WorkflowProgress | null = null;
      try {
        progress = await handle.query(getProgressQuery);
      } catch {
        // Query may not be registered yet on the very first poll — return null progress
      }
      return res.json({ status: 'running', workflowId, temporalUiUrl, progress });
    }

    if (statusName === 'COMPLETED') {
      const result = await handle.result() as DailyBriefing;
      let progress: WorkflowProgress | null = null;
      try {
        progress = await handle.query(getProgressQuery);
      } catch { /* ignore */ }
      return res.json({ status: 'completed', workflowId, temporalUiUrl, progress, result });
    }

    return res.json({ status: 'failed', workflowId, temporalUiUrl, error: `Workflow status: ${statusName}` });
  } catch (err: any) {
    if (err.message?.includes('not found') || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Workflow not found', workflowId: req.params.workflowId });
    }
    res.status(500).json({ error: 'Failed to check workflow status', details: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: temporalClient ? 'healthy' : 'unhealthy' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await initializeTemporalClient();
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║          🌐  BRIEFING WEB UI SERVER                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`\n🚀 Server running at: http://localhost:${PORT}`);
      console.log(`\n📝 Make sure the Temporal worker is running: npm run start.watch\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
