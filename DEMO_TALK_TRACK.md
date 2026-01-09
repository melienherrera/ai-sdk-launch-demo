# Temporal Integration with Vercel AI SDK - Demo Talk Track

## Total Duration: ~5 minutes

---

## Part 1: Introduction (0:00 - 0:30)

**[Screen: Title Slide or IDE Overview]**

"Let me introduce to you the new Temporal integration with the Vercel AI SDK. First, let's take a look at a sample with the Vercel AI SDK on its own."

---

## Part 2: Vanilla AI SDK Demo (0:30 - 2:00)

**[Screen: Open `non-temporal.ts`]**

"Here's a typical TypeScript application using the Vercel AI SDK. What makes the AI SDK so powerful for TypeScript developers is how clean and intuitive the code is."

**[Highlight the `haikuAgent` function - lines 21-28]**

"Look at this haiku generator - it's just a few lines of code. We call `generateText`, pass in our model, prompt, and system instructions. That's it. The AI SDK handles all the complexity of interacting with OpenAI for us."

**[Highlight the `toolsAgent` function - lines 30-54]**

"But it gets even better with agentic workflows. Here we have an agent that can use tools - in this case, getting weather information and calculating areas. The AI SDK automatically handles:
- Tool schema definitions with Zod
- Function calling orchestration
- Multi-step reasoning with `stepCountIs`

For TypeScript developers, this is a dream - full type safety, minimal boilerplate, and you can build sophisticated AI agents in minutes instead of days."

**[Run the demo]**

```bash
$ npm run non-temporal haiku
```

**[Show the output]**

"Beautiful! The AI generated a haiku about recursion, and our code was simple and elegant."

---

## Part 3: The Production Problem (2:00 - 2:45)

**[Screen: Back to code or a simple diagram]**

"But here's the challenge: this approach isn't production-ready. Let me explain why.

Imagine you're running a complex AI agent workflow in production - maybe it's:
- Processing user requests through multiple LLM calls
- Making dozens of tool executions
- Running for minutes or even hours

What happens if:
- Your server crashes midway through?
- The API rate limit is hit?
- There's a network timeout?
- You need to deploy new code?

**You start over from the beginning.**

That means:
- ❌ Wasted tokens and API costs
- ❌ Wasted computation time
- ❌ Poor user experience
- ❌ No visibility into what went wrong
- ❌ No way to retry just the failed step

For any serious production application, this simply won't work."

---

## Part 4: Introducing Temporal Integration (2:45 - 4:30)

**[Screen: Split view or transition to Temporal files]**

"That's exactly why we built the Temporal integration for the Vercel AI SDK. And here's what's incredible - you use virtually the **SAME EXACT TYPESCRIPT CODE** with just a couple of key changes."

**[Screen: Show `workflows.ts` side-by-side with `non-temporal.ts`]**

"Let me show you. Here's our haiku agent with Temporal:"

**[Highlight lines 13-19 in workflows.ts]**

"Notice anything? It's **identical** except for one import and one line change:
- Instead of `openai('gpt-4o-mini')` 
- We use `temporalProvider.languageModel('gpt-4o-mini')`

That's it! Same function signature, same AI SDK API, same clean TypeScript code."

**[Show the `toolsAgent` in workflows.ts - lines 22-39]**

"The tools agent is the same story. We define our tools the exact same way, but now when `getWeather` is called..."

**[Show `activities.ts`]**

"...it runs as a Temporal Activity. Activities in Temporal are automatically:
- ✅ Retried on failure with exponential backoff
- ✅ Tracked and observable
- ✅ Recoverable if your server crashes

**[Show `worker.ts`]**

"Setup is straightforward - you create a Temporal Worker with the AI SDK plugin, point it to your workflows, and you're done."

**[Show `client.ts`]**

"Starting a workflow looks just like calling a function. But now you get a handle that survives across server restarts."

---

## Part 5: The Magic - Durability in Action (4:30 - 5:00)

**[Run the Temporal demo or show a diagram]**

"So what do you get with this minimal code change?

**Full durability and observability.**

- 💪 **Crash-proof**: Server crashes? The workflow resumes exactly where it left off
- 🔄 **Automatic retries**: Transient failures are handled automatically  
- 💰 **Token efficiency**: Never waste tokens re-running successful steps
- 👀 **Full visibility**: See every LLM call, every tool execution, every decision
- ⏱️ **Long-running workflows**: Run for days or weeks without worry
- 🔧 **Versioning**: Deploy new code without breaking in-flight workflows

And you did all this with virtually identical TypeScript code."

---

## Closing (5:00 - 5:15)

**[Screen: Summary slide or documentation]**

"The Temporal integration for Vercel AI SDK brings production-grade reliability to your AI applications without sacrificing the developer experience you love. Same clean TypeScript code, same AI SDK APIs - just add durability.

Ready to make your AI applications production-ready? Check out the integration at temporal.io/ai-sdk."

---

## Visual Cues & Demo Notes

### Key Code Comparisons to Show:
1. **Side-by-side comparison**: `haikuAgent` in both files
2. **Highlight the ONE line difference**: model provider change
3. **Show the tool integration**: How activities work seamlessly

### Demo Commands:
```bash
# Terminal 1: Run vanilla version
npm run non-temporal haiku

# Terminal 2: Start Temporal worker (if doing live demo)
npm run worker

# Terminal 3: Run Temporal version
npm run client haiku
```

### Optional Advanced Demo (if time permits):
- Show the Temporal UI with workflow execution history
- Demonstrate a workflow surviving a server restart
- Show retry behavior on a simulated failure

---

## Key Messages to Emphasize:

1. **"SAME EXACT TYPESCRIPT CODE"** - Repeat this multiple times
2. **Minimal learning curve** - If you know AI SDK, you know Temporal integration
3. **Production-ready** - This is what separates prototypes from real applications
4. **Built for TypeScript developers** - Type-safe, modern, clean APIs
5. **Durability without complexity** - One line change, infinite reliability

---

## Tone & Delivery Notes:

- **Energy level**: Enthusiastic but not overselling - let the simplicity speak for itself
- **Pacing**: Slow down on the "one line change" moment - this is the wow factor
- **Emphasis**: When showing code comparisons, pause to let viewers see the similarity
- **Relatability**: Use phrases like "as TypeScript developers, we love..." to connect with audience

