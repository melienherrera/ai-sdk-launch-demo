# Daily News Briefing Agent Demo

A demo that generates personalized daily tech briefings using an AI agent — and shows what happens when you run it **with** and **without** durable execution.

Both implementations produce the same output: a multi-topic briefing built from live web searches, AI summarization, and a final synthesis step. The difference is in what happens when things go wrong mid-run.

## How it works

The agent runs in three phases:

1. **Search** — web searches for each topic in parallel
2. **Summarize** — condenses findings into key points per topic
3. **Briefing** — synthesizes everything into a final report

**Without durability**: if the process crashes mid-run, all progress is lost and the agent must restart from scratch.

**With Temporal**: each phase is checkpointed. If the worker crashes or an API call fails, Temporal retries and resumes from where it left off — no lost work.

## Setup

1. Install dependencies:
   ```bash
   cd ai-sdk && npm install
   ```
2. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=<your-key>
   ```

## Running the Web UI (recommended)

The web UI runs both versions side by side so you can compare them live.

**Prerequisites** — three terminals, all from the `ai-sdk/` directory:

```bash
# Terminal 1: Start Temporal server
temporal server start-dev

# Terminal 2: Start the Temporal worker
npm run start.watch

# Terminal 3: Start the web server
npm run server
```

Open **http://localhost:3000**, enter your topics, and hit Generate. Both agents start simultaneously — watch the phase-by-phase progress and see how the durable version handles retries automatically.

## Running from the CLI

**Without Temporal:**
```bash
npm run non-temporal:hello-world  # Basic agent example
npm run non-temporal:briefing     # News briefing
```

**With Temporal** (requires Temporal server + worker running):
```bash
npm run workflow:haiku     # Generate a haiku
npm run workflow:agent     # Agent with tools
npm run workflow:briefing  # News briefing workflow
```

Custom topics:
```bash
npm run workflow:briefing "AI developments" "TypeScript updates"
```

## Without vs. With Durability

| | Without Temporal | With Temporal |
|---|---|---|
| Crash recovery | Restart from scratch | Resume from last checkpoint |
| Retries | Manual | Automatic with backoff |
| Observability | Logs only | Full workflow history + UI |
| Long-running agents | Fragile | Fault-tolerant |
