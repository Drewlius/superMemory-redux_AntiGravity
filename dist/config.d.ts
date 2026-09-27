export interface Config {
    apiKey: string;
    baseUrl: string;
    containerTag: string;
    similarityThreshold: number;
    maxMemories: number;
    injectProfile: boolean;
    entityContext: string;
}
export declare function loadConfig(): Config;
