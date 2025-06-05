import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { getCachedResponse, setCachedResponse } from './cache';
import { getApiKey } from '../secrets/tokenManager';

const BASE_URL = 'https://toncenter.com/api/v2/';

export async function callToncenter<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: Record<string, unknown>
): Promise<T> {
    const apiKey = await getApiKey(context);
    const paramsWithKey = apiKey ? { ...params, api_key: apiKey } : { ...params };
    const cached = await getCachedResponse<T>(context, method, paramsWithKey);
    if (cached !== undefined) {
        return cached;
    }

    const search = new URLSearchParams({ ...paramsWithKey, method });
    const res = await fetch(`${BASE_URL}?${search.toString()}`);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as T;
    await setCachedResponse(context, method, paramsWithKey, data);
    return data;
}
