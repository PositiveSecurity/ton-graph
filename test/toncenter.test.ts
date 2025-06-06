import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', {});
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { callToncenter } from '../src/api/toncenter';
import { z } from 'zod';

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

class TestSecrets {
    private storage: Record<string, any> = {};
    async get(key: string): Promise<any> {
        return this.storage[key];
    }
    async store(key: string, value: any): Promise<void> {
        this.storage[key] = value;
    }
    async delete(key: string): Promise<void> {
        delete this.storage[key];
    }
}

const server = setupServer();

const schema = z.object({ ok: z.boolean() });

before(() => server.listen());
afterEach(() => server.resetHandlers());
after(() => server.close());

describe('callToncenter', () => {
    it('times out after retrying once with backoff', async () => {
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res, ctx) => {
                return res(ctx.delay(200), ctx.json({ ok: true }));
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        const start = Date.now();
        try {
            await callToncenter(context, 'test', {}, schema, { timeoutMs: 50, maxRetries: 1 });
            expect.fail('should throw');
        } catch {
            const elapsed = Date.now() - start;
            expect(elapsed).to.be.greaterThan(190);
        }
    });

    it('stops after max retries with exponential delays', async () => {
        let calls = 0;
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res) => {
                calls++;
                return res.networkError('failed');
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        const start = Date.now();
        try {
            await callToncenter(context, 'test', {}, schema, { timeoutMs: 50, maxRetries: 2 });
            expect.fail('should throw');
        } catch {
            const elapsed = Date.now() - start;
            expect(calls).to.equal(3);
            expect(elapsed).to.be.greaterThan(290);
        }
    });

    it('caches successful responses', async () => {
        let calls = 0;
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res, ctx) => {
                calls++;
                return res(ctx.json({ ok: true }));
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        const result1 = await callToncenter(context, 'test', { q: 1 }, schema);
        expect(result1).to.deep.equal({ ok: true });
        expect(calls).to.equal(1);
        const result2 = await callToncenter(context, 'test', { q: 1 }, schema);
        expect(result2).to.deep.equal({ ok: true });
        expect(calls).to.equal(1);
    });

    it('retries once on HTTP 500 and then throws', async () => {
        let calls = 0;
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res, ctx) => {
                calls++;
                return res(ctx.status(500));
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        try {
            await callToncenter(context, 'test', {}, schema, { timeoutMs: 50, maxRetries: 1 });
            expect.fail('should throw');
        } catch {
            expect(calls).to.equal(2);
        }
    });

    it('rejects malformed responses without caching', async () => {
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res, ctx) => {
                return res(ctx.json({ wrong: true }));
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        try {
            await callToncenter(context, 'test', {}, schema);
            expect.fail('should throw');
        } catch {
            const cached = context.workspaceState.get('tonGraphCache');
            expect(cached).to.be.undefined;
        }
    });

    it('stops after max retries on timeouts', async () => {
        let attempts = 0;
        server.use(
            rest.get('https://toncenter.com/api/v2/', (_req, res, ctx) => {
                attempts++;
                return res(ctx.delay(200), ctx.json({ ok: true }));
            })
        );
        const context = { workspaceState: new TestMemento(), secrets: new TestSecrets() } as any;
        try {
            await callToncenter(context, 'test', {}, schema, { timeoutMs: 50, maxRetries: 2 });
            expect.fail('should throw');
        } catch {
            expect(attempts).to.equal(3);
        }
    });
});
