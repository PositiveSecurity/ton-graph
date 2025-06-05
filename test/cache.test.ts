import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', {});
import { getCachedResponse, setCachedResponse, getCacheKey } from '../src/api/cache';

class TestMemento {
    private store: Record<string, any> = {};
    get<T>(key: string, defaultValue?: T): T {
        if (key in this.store) {
            return this.store[key];
        }
        return defaultValue as T;
    }
    async update(key: string, value: any): Promise<void> {
        if (value === undefined) {
            delete this.store[key];
        } else {
            this.store[key] = value;
        }
    }
}

describe('Cache', () => {
    let context: { workspaceState: TestMemento };

    beforeEach(() => {
        context = { workspaceState: new TestMemento() } as any;
    });

    it('stores and retrieves values', async () => {
        await setCachedResponse(context as any, 'm1', { a: 1 }, 123);
        const value = await getCachedResponse<number>(context as any, 'm1', { a: 1 });
        expect(value).to.equal(123);
    });

    it('expires entries after ttl', async () => {
        await setCachedResponse(context as any, 'm2', {}, 'v');
        const state = context.workspaceState.get<any>('tonGraphCache');
        const key = getCacheKey('m2', {});
        state.entries[key].timestamp = Date.now() - (10 * 60 * 1000 + 1);
        await context.workspaceState.update('tonGraphCache', state);
        const value = await getCachedResponse(context as any, 'm2', {});
        expect(value).to.be.undefined;
        const newState = context.workspaceState.get<any>('tonGraphCache');
        expect(newState.entries[key]).to.be.undefined;
    });

    it('evicts least recently used entries when limit exceeded', async () => {
        for (let i = 0; i < 101; i++) {
            await setCachedResponse(context as any, 'm', { i }, i);
        }
        const state = context.workspaceState.get<any>('tonGraphCache');
        expect(state.order.length).to.equal(100);
        const removedKey = getCacheKey('m', { i: 0 });
        expect(state.entries[removedKey]).to.be.undefined;
        const lastKey = getCacheKey('m', { i: 100 });
        expect(state.entries[lastKey].value).to.equal(100);
    });
});
