"use strict";
// Content Pipeline Worker
// Following Temporal OpenAI Agents Demos patterns
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const worker_1 = require("@temporalio/worker");
const activities = __importStar(require("./activities"));
const ai_sdk_1 = require("@temporalio/ai-sdk");
const openai_1 = require("@ai-sdk/openai");
async function run() {
    const connection = await worker_1.NativeConnection.connect({
        address: 'localhost:7233',
    });
    try {
        const worker = await worker_1.Worker.create({
            plugins: [
                new ai_sdk_1.AiSdkPlugin({
                    modelProvider: openai_1.openai,
                }),
            ],
            connection,
            namespace: 'default',
            taskQueue: 'content-pipeline',
            // Workflows are registered using a path as they run in a separate JS context
            workflowsPath: require.resolve('./workflows'),
            activities,
        });
        console.log('✅ Worker started successfully');
        console.log('📋 Task Queue: content-pipeline');
        console.log('🔄 Polling for workflows...\n');
        await worker.run();
    }
    finally {
        // Close the connection once the worker has stopped
        await connection.close();
    }
}
run().catch((err) => {
    console.error('❌ Worker failed:', err);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map