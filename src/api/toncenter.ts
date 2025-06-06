import * as vscode from 'vscode';
import { getCachedResponse, setCachedResponse } from './cache';
import { getApiKey } from '../secrets/tokenManager';
import { z } from 'zod';

const BASE_URL = 'https://toncenter.com/api/v2/';

export async function callToncenter<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: Record<string, unknown>,
    schema: z.ZodSchema<T>,
    options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
    const { timeoutMs = 3000, maxRetries = 3 } = options;
    const apiKey = await getApiKey(context);
    const paramsWithKey = apiKey ? { ...params, api_key: apiKey } : { ...params };
    const cached = await getCachedResponse<T>(context, method, paramsWithKey);
    if (cached !== undefined) {
        return cached;
    }

    const search = new URLSearchParams({ ...paramsWithKey, method });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await globalThis.fetch(`${BASE_URL}?${search.toString()}`,
                { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) {
                const isServerError = res.status >= 500 && res.status < 600;
                if (attempt < maxRetries && isServerError) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const raw = await res.json();
            const data = schema.parse(raw);
            await setCachedResponse(context, method, paramsWithKey, data);
            return data;
        } catch (err: any) {
            clearTimeout(timer);
            if (attempt >= maxRetries) {
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    throw new Error('unreachable');
}
