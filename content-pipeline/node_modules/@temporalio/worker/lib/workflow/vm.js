"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VMWorkflow = exports.VMWorkflowCreator = void 0;
const node_vm_1 = __importDefault(require("node:vm"));
const common_1 = require("@temporalio/common");
const core_bridge_1 = require("@temporalio/core-bridge");
const vm_shared_1 = require("./vm-shared");
/**
 * A WorkflowCreator that creates VMWorkflows in the current isolate
 */
class VMWorkflowCreator {
    workflowBundle;
    isolateExecutionTimeoutMs;
    registeredActivityNames;
    static unhandledRejectionHandlerHasBeenSet = false;
    static workflowByRunId = new Map();
    script;
    constructor(script, workflowBundle, isolateExecutionTimeoutMs, registeredActivityNames) {
        this.workflowBundle = workflowBundle;
        this.isolateExecutionTimeoutMs = isolateExecutionTimeoutMs;
        this.registeredActivityNames = registeredActivityNames;
        if (!VMWorkflowCreator.unhandledRejectionHandlerHasBeenSet) {
            (0, vm_shared_1.setUnhandledRejectionHandler)((runId) => VMWorkflowCreator.workflowByRunId.get(runId));
            VMWorkflowCreator.unhandledRejectionHandlerHasBeenSet = true;
        }
        this.script = script;
    }
    /**
     * Create a workflow with given options
     */
    async createWorkflow(options) {
        const context = this.getContext();
        const { isolateExecutionTimeoutMs } = this;
        const workflowModule = new Proxy({}, {
            get(_, fn) {
                return (...args) => {
                    context.__TEMPORAL__.args = args;
                    return node_vm_1.default.runInContext(`__TEMPORAL__.api.${fn}(...__TEMPORAL__.args)`, context, {
                        timeout: isolateExecutionTimeoutMs,
                        displayErrors: true,
                    });
                };
            },
        });
        workflowModule.initRuntime({
            ...options,
            sourceMap: this.workflowBundle.sourceMap,
            getTimeOfDay: core_bridge_1.native.getTimeOfDay,
            registeredActivityNames: this.registeredActivityNames,
        });
        const activator = context.__TEMPORAL_ACTIVATOR__;
        const newVM = new VMWorkflow(options.info.runId, context, activator, workflowModule);
        VMWorkflowCreator.workflowByRunId.set(options.info.runId, newVM);
        return newVM;
    }
    getContext() {
        if (this.script === undefined) {
            throw new common_1.IllegalStateError('Isolate context provider was destroyed');
        }
        const context = node_vm_1.default.createContext({}, { microtaskMode: 'afterEvaluate' });
        this.injectGlobals(context);
        this.script.runInContext(context);
        return context;
    }
    /**
     * Inject global objects as well as console.[log|...] into a vm context.
     *
     * Overridable for test purposes.
     */
    injectGlobals(context) {
        (0, vm_shared_1.injectGlobals)(context);
        context.__webpack_module_cache__ = {};
        // Object.defineProperty(context, '__webpack_module_cache__', {
        //   value: {},
        //   writable: false,
        //   enumerable: false,
        //   configurable: false,
        // });
    }
    /**
     * Create a new instance, pre-compile scripts from given code.
     *
     * This method is generic to support subclassing.
     */
    static async create(workflowBundle, isolateExecutionTimeoutMs, registeredActivityNames) {
        vm_shared_1.globalHandlers.install();
        await vm_shared_1.globalHandlers.addWorkflowBundle(workflowBundle);
        const script = new node_vm_1.default.Script(workflowBundle.code, { filename: workflowBundle.filename });
        return new this(script, workflowBundle, isolateExecutionTimeoutMs, registeredActivityNames);
    }
    /**
     * Cleanup the pre-compiled script
     */
    async destroy() {
        vm_shared_1.globalHandlers.removeWorkflowBundle(this.workflowBundle);
        delete this.script;
    }
}
exports.VMWorkflowCreator = VMWorkflowCreator;
/**
 * A Workflow implementation using Node.js' built-in `vm` module
 */
class VMWorkflow extends vm_shared_1.BaseVMWorkflow {
    async dispose() {
        this.workflowModule.dispose();
        VMWorkflowCreator.workflowByRunId.delete(this.runId);
        delete this.context;
    }
}
exports.VMWorkflow = VMWorkflow;
//# sourceMappingURL=vm.js.map