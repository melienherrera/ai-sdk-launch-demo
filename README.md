# AI SDK Demo

This project demonstrates the AI SDK in both vanilla (non-temporal) and Temporal-powered implementations.

## Setup

1. Install dependencies: `npm install`
2. Set your API key: `export OPENAI_API_KEY=<your-key>`

## Vanilla AI SDK

Run standalone examples without Temporal:

```bash
npm run non-temporal:hello-world  # Basic AI SDK example
npm run non-temporal:briefing     # Web search briefing
```

## Temporal + AI SDK

For durable, recoverable AI workflows:

### 1. Start Temporal Server

```bash
temporal server start-dev
```

### 2. Start the Worker

```bash
npm run start.watch
```

### 3. Run Workflows

In a separate terminal:

```bash
npm run workflow:haiku     # Generate a haiku
npm run workflow:agent     # Agent with tools
npm run workflow:briefing  # News briefing workflow
```

## Key Differences

- **Vanilla**: Simple, direct AI SDK usage
- **Temporal**: Durable execution, retries, observability, and recovery across failures
