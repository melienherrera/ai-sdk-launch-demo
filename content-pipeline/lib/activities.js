"use strict";
// Activities for Content Pipeline
// Activities are where non-deterministic operations happen
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearchActivity = webSearchActivity;
exports.gatherResearchData = gatherResearchData;
/**
 * Simulate web search activity
 * In production, this would call actual search APIs
 */
async function webSearchActivity(query) {
    console.log(`🔍 [Activity] Web search for: "${query}"`);
    // Simulate network delay
    await sleep(2000);
    // Simulate occasional failures (20% chance)
    if (Math.random() < 0.2) {
        throw new Error(`Web search failed for query: ${query}`);
    }
    // Return mock search results
    return `Search results for "${query}":
  - Best practices and patterns
  - Industry standards and guidelines
  - Common pitfalls to avoid
  - Real-world examples and case studies`;
}
/**
 * Simulate research data gathering
 */
async function gatherResearchData(topic) {
    console.log(`📚 [Activity] Gathering research data for: "${topic}"`);
    // Simulate research taking time
    await sleep(3000);
    return `Research data for "${topic}":
  - Key concepts and fundamentals
  - Advanced techniques
  - Performance considerations
  - Security best practices`;
}
/**
 * Helper function for delays (simulating real work)
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=activities.js.map