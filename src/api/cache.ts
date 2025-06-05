import * as vscode from 'vscode';

interface CachedEntry<T> {
    timestamp: number;
    value: T;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function getCacheKey(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params)}`;
}

export async function getCachedResponse<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: unknown
): Promise<T | undefined> {
    const key = getCacheKey(method, params);
    const entry = context.globalState.get<CachedEntry<T>>(key);
    if (entry) {
        const age = Date.now() - entry.timestamp;
        if (age < CACHE_DURATION_MS) {
            return entry.value;
        }
        await context.globalState.update(key, undefined);
    }
    return undefined;
}

export async function setCachedResponse<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: unknown,
    value: T
): Promise<void> {
    const key = getCacheKey(method, params);
    const entry: CachedEntry<T> = { timestamp: Date.now(), value };
    await context.globalState.update(key, entry);
}
