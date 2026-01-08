export interface Section {
    title: string;
    description: string;
}
export interface Outline {
    title: string;
    sections: Section[];
}
export interface ResearchResult {
    sectionIndex: number;
    sectionTitle: string;
    researchFindings: string;
}
export interface GeneratedSection {
    index: number;
    title: string;
    content: string;
}
export interface FinalArticle {
    title: string;
    content: string;
    metadata: {
        wordCount: number;
        sectionsCount: number;
        generatedAt: Date;
    };
}
//# sourceMappingURL=types.d.ts.map