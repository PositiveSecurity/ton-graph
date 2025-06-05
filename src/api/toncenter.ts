import * as vscode from 'vscode';
import { getCachedResponse, setCachedResponse } from './cache';
import { getApiKey } from '../secrets/tokenManager';

const BASE_URL = 'https://toncenter.com/api/v2/';

export async function callToncenter<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 10000
): Promise<T> {
    const apiKey = await getApiKey(context);
    const paramsWithKey = apiKey ? { ...params, api_key: apiKey } : { ...params };
    const cached = await getCachedResponse<T>(context, method, paramsWithKey);
    if (cached !== undefined) {
        return cached;
    }

    const search = new URLSearchParams({ ...paramsWithKey, method });

    for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await globalThis.fetch(`${BASE_URL}?${search.toString()}`,
                { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = (await res.json()) as T;
            await setCachedResponse(context, method, paramsWithKey, data);
            return data;
        } catch (err: any) {
            clearTimeout(timer);
            if (attempt === 0 && !(err instanceof Error && err.message.startsWith('HTTP'))) {
                continue; // retry once on network error or timeout
            }
            throw err;
        }
    }

    throw new Error('Failed to fetch from toncenter');
}
