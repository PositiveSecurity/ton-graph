import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { getCachedResponse, setCachedResponse } from './cache';

const BASE_URL = 'https://toncenter.com/api/v2/';

export async function callToncenter<T>(
    context: vscode.ExtensionContext,
    method: string,
    params: Record<string, unknown>
): Promise<T> {
    const cached = await getCachedResponse<T>(context, method, params);
    if (cached !== undefined) {
        return cached;
    }

    const search = new URLSearchParams({ ...params, method });
    const res = await fetch(`${BASE_URL}?${search.toString()}`);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as T;
    await setCachedResponse(context, method, params, data);
    return data;
}
