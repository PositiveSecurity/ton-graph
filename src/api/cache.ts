import * as vscode from 'vscode';

interface CachedEntry<T> {
    timestamp: number;
    value: T;
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 100;
const CACHE_STATE_KEY = 'tonGraphCache';

export function getCacheKey(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params)}`;
}

export async function getCachedResponse<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: unknown
): Promise<T | undefined> {
    const key = getCacheKey(method, params);
    const state = context.workspaceState.get<{ entries: Record<string, CachedEntry<unknown>>; order: string[] }>(CACHE_STATE_KEY, { entries: {}, order: [] });
    const entry = state.entries[key] as CachedEntry<T> | undefined;
    if (entry) {
        const age = Date.now() - entry.timestamp;
        if (age < CACHE_DURATION_MS) {
            const idx = state.order.indexOf(key);
            if (idx !== -1) {
                state.order.splice(idx, 1);
                state.order.push(key);
            }
            await context.workspaceState.update(CACHE_STATE_KEY, state);
            return entry.value;
        }
        delete state.entries[key];
        const idx = state.order.indexOf(key);
        if (idx !== -1) {
            state.order.splice(idx, 1);
        }
        await context.workspaceState.update(CACHE_STATE_KEY, state);
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
    const state = context.workspaceState.get<{ entries: Record<string, CachedEntry<unknown>>; order: string[] }>(CACHE_STATE_KEY, { entries: {}, order: [] });
    state.entries[key] = { timestamp: Date.now(), value };
    const existing = state.order.indexOf(key);
    if (existing !== -1) {
        state.order.splice(existing, 1);
    }
    state.order.push(key);
    while (state.order.length > MAX_ENTRIES) {
        const oldest = state.order.shift();
        if (oldest) {
            delete state.entries[oldest];
        }
    }
    await context.workspaceState.update(CACHE_STATE_KEY, state);
}
