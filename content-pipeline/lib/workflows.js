"use strict";
// Content Pipeline Workflows
// Following Temporal OpenAI Agents Demos patterns
Object.defineProperty(exports, "__esModule", { value: true });
exports.publisherWorkflow = publisherWorkflow;
require("@temporalio/ai-sdk/lib/load-polyfills");
const ai_1 = require("ai");
const ai_sdk_1 = require("@temporalio/ai-sdk");
const workflow_1 = require("@temporalio/workflow");
const zod_1 = require("zod");
// Proxy activities with timeout configuration
const { webSearchActivity, gatherResearchData } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '2 minutes',
    retry: {
        maximumAttempts: 3,
        initialInterval: '1s',
        backoffCoefficient: 2,
    },
});
/**
 * Helper function for delays (deterministic in workflow context)
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Copywriter Agent: Generates initial outline
 */
async function copywriterOutlineAgent(topic) {
    console.log(`📋 [Copywriter] Generating outline for: "${topic}"`);
    const result = await (0, ai_1.generateText)({
        model: ai_sdk_1.temporalProvider.languageModel('gpt-4o-mini'),
        prompt: `Create a detailed outline for a technical article about: "${topic}"
    
    Generate 5-6 section titles with brief descriptions of what each section should cover.
    
    Format as JSON:
    {
      "title": "Article Title",
      "sections": [
        {"title": "Section Title", "description": "What this section covers"}
      ]
    }`,
        system: 'You are an expert content strategist. Create clear, logical outlines for technical articles.',
    });
    // Parse the outline from the response
    try {
        const parsed = JSON.parse(result.text);
        console.log(`✅ [Copywriter] Outline complete: ${parsed.sections.length} sections`);
        return parsed;
    }
    catch (e) {
        // Fallback if JSON parsing fails
        return {
            title: topic,
            sections: [
                { title: 'Introduction', description: 'Overview and context' },
                { title: 'Core Concepts', description: 'Fundamental principles' },
                { title: 'Best Practices', description: 'Recommended approaches' },
                { title: 'Common Pitfalls', description: 'What to avoid' },
                { title: 'Conclusion', description: 'Summary and next steps' },
            ],
        };
    }
}
/**
 * Research Agent: Researches a single section
 */
async function researchSectionAgent(section, index) {
    console.log(`🔍 [Research ${index + 1}] Starting: "${section.title}"`);
    // Simulate research taking time
    await sleep(4000);
    const result = await (0, ai_1.generateText)({
        model: ai_sdk_1.temporalProvider.languageModel('gpt-4o-mini'),
        prompt: `Research key points for the section: "${section.title}"
    
    Section description: ${section.description}
    
    Provide 3-5 key facts, best practices, or important points that should be covered.`,
        tools: {
            searchWeb: (0, ai_1.tool)({
                description: 'Search the web for current information',
                inputSchema: zod_1.z.object({
                    query: zod_1.z.string().describe('The search query'),
                }),
                execute: webSearchActivity,
            }),
            gatherData: (0, ai_1.tool)({
                description: 'Gather research data on a topic',
                inputSchema: zod_1.z.object({
                    topic: zod_1.z.string().describe('The topic to research'),
                }),
                execute: async ({ topic }) => {
                    return await gatherResearchData(topic);
                },
            }),
        },
        system: 'You are a research assistant. Gather relevant, accurate information using the available tools.',
    });
    console.log(`✅ [Research ${index + 1}] Complete: "${section.title}"`);
    return {
        sectionIndex: index,
        sectionTitle: section.title,
        researchFindings: result.text,
    };
}
/**
 * Research Supervisor: Coordinates parallel research for all sections
 */
async function researchSupervisor(outline) {
    console.log(`🔍 [Research Supervisor] Starting parallel research for ${outline.sections.length} sections...\n`);
    // Execute all research in parallel - THIS IS KEY FOR SCALING DEMO!
    const researchResults = await Promise.all(outline.sections.map((section, index) => researchSectionAgent(section, index)));
    console.log(`✅ [Research Supervisor] All research complete\n`);
    return researchResults;
}
/**
 * Copywriter Agent: Writes a single section
 */
async function copywriterSectionAgent(section, research, index) {
    console.log(`✍️  [Writer ${index + 1}] Starting: "${section.title}"`);
    // Simulate writing taking time
    await sleep(6000);
    const result = await (0, ai_1.generateText)({
        model: ai_sdk_1.temporalProvider.languageModel('gpt-4o'),
        prompt: `Write the section: "${section.title}"
    
    Section description: ${section.description}
    
    Research findings:
    ${research.researchFindings}
    
    Write 300-400 words with practical examples and clear explanations.`,
        system: 'You are an expert technical writer. Write clear, concise, and informative content.',
    });
    console.log(`✅ [Writer ${index + 1}] Complete: "${section.title}"`);
    return {
        index,
        title: section.title,
        content: result.text,
    };
}
/**
 * Content Generation Supervisor: Coordinates parallel content generation
 */
async function contentGenerationSupervisor(outline, research) {
    console.log(`✍️  [Content Supervisor] Starting parallel content generation for ${outline.sections.length} sections...\n`);
    // Generate all sections in parallel - GREAT FOR SCALING DEMO!
    const sections = await Promise.all(outline.sections.map((section, index) => {
        const sectionResearch = research.find((r) => r.sectionIndex === index);
        if (!sectionResearch) {
            throw new Error(`No research found for section ${index}`);
        }
        return copywriterSectionAgent(section, sectionResearch, index);
    }));
    console.log(`✅ [Content Supervisor] All sections complete\n`);
    return sections;
}
/**
 * Editor Agent: Reviews and improves all content
 */
async function editorAgent(sections) {
    console.log('📖 [Editor] Reviewing content...');
    const combinedContent = sections
        .sort((a, b) => a.index - b.index)
        .map((s) => `## ${s.title}\n\n${s.content}`)
        .join('\n\n');
    const result = await (0, ai_1.generateText)({
        model: ai_sdk_1.temporalProvider.languageModel('gpt-4o'),
        prompt: `Review and improve this technical article:
    
${combinedContent}

Improve clarity, fix any errors, ensure consistency in tone and style, and enhance readability.
Return the complete edited article.`,
        system: 'You are an expert technical editor. Improve content while maintaining accuracy and the author\'s voice.',
    });
    console.log('✅ [Editor] Review complete\n');
    return result.text;
}
/**
 * Helper function to calculate word count
 */
function calculateWordCount(text) {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
}
/**
 * Main Publisher Workflow: Orchestrates the entire content creation pipeline
 * This is the workflow that gets called from the client
 */
async function publisherWorkflow(topic) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎬 PUBLISHER WORKFLOW STARTED`);
    console.log(`📝 Topic: "${topic}"`);
    console.log(`${'='.repeat(60)}\n`);
    const startTime = Date.now();
    try {
        // Stage 1: Generate outline
        console.log('📋 STAGE 1: OUTLINE GENERATION');
        console.log('-'.repeat(60));
        const outline = await copywriterOutlineAgent(topic);
        console.log(`✅ Outline complete: ${outline.sections.length} sections\n`);
        // Stage 2: Parallel research (KEY DEMO STAGE!)
        console.log('🔍 STAGE 2: PARALLEL RESEARCH');
        console.log('-'.repeat(60));
        const research = await researchSupervisor(outline);
        console.log(`✅ Research complete: ${research.length} sections researched\n`);
        // Stage 3: Parallel content generation (ANOTHER KEY DEMO STAGE!)
        console.log('✍️  STAGE 3: PARALLEL CONTENT GENERATION');
        console.log('-'.repeat(60));
        const sections = await contentGenerationSupervisor(outline, research);
        console.log(`✅ Content generation complete: ${sections.length} sections written\n`);
        // Stage 4: Editor review
        console.log('📖 STAGE 4: EDITORIAL REVIEW');
        console.log('-'.repeat(60));
        const editedContent = await editorAgent(sections);
        console.log('✅ Editorial review complete\n');
        // Stage 5: Final publishing
        console.log('🚀 STAGE 5: FINAL PUBLISHING');
        console.log('-'.repeat(60));
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const finalArticle = {
            title: outline.title,
            content: editedContent,
            metadata: {
                wordCount: calculateWordCount(editedContent),
                sectionsCount: sections.length,
                generatedAt: new Date(),
            },
        };
        console.log('✅ Publishing complete!');
        console.log(`⏱️  Total duration: ${duration} seconds\n`);
        console.log(`${'='.repeat(60)}`);
        console.log(`🎉 WORKFLOW COMPLETED SUCCESSFULLY`);
        console.log(`${'='.repeat(60)}\n`);
        // Return formatted output
        return `
# ${finalArticle.title}

${finalArticle.content}

---

**Metadata:**
- Word Count: ${finalArticle.metadata.wordCount}
- Sections: ${finalArticle.metadata.sectionsCount}
- Generated: ${finalArticle.metadata.generatedAt.toISOString()}
- Duration: ${duration}s
`;
    }
    catch (error) {
        console.error('❌ Workflow failed:', error);
        throw error;
    }
}
//# sourceMappingURL=workflows.js.map