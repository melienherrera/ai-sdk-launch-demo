"use strict";
// Content Pipeline Client
// Following Temporal OpenAI Agents Demos patterns
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@temporalio/client");
const envconfig_1 = require("@temporalio/envconfig");
const workflows_1 = require("./workflows");
const nanoid_1 = require("nanoid");
async function run() {
    const args = process.argv;
    const topic = args[2] || 'Kubernetes networking best practices';
    console.log(`\n🚀 Starting Content Pipeline`);
    console.log(`📝 Topic: "${topic}"\n`);
    const config = (0, envconfig_1.loadClientConnectConfig)();
    const connection = await client_1.Connection.connect(config.connectionOptions);
    const client = new client_1.Client({ connection });
    const handle = await client.workflow.start(workflows_1.publisherWorkflow, {
        taskQueue: 'content-pipeline',
        args: [topic],
        workflowId: 'content-pipeline-' + (0, nanoid_1.nanoid)(),
    });
    console.log(`✅ Workflow started`);
    console.log(`🆔 Workflow ID: ${handle.workflowId}`);
    console.log(`🔗 View in Temporal UI: http://localhost:8233/namespaces/default/workflows/${handle.workflowId}\n`);
    console.log(`⏳ Waiting for workflow to complete...\n`);
    // Wait for workflow result
    try {
        const result = await handle.result();
        console.log('📄 Final Article:\n');
        console.log(result);
    }
    catch (err) {
        console.error('❌ Workflow failed:', err);
        process.exit(1);
    }
}
run().catch((err) => {
    console.error('❌ Client error:', err);
    process.exit(1);
});
//# sourceMappingURL=client.js.map