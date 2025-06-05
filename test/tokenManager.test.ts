import { expect } from 'chai';
import mock = require('mock-require');
mock('vscode', {});
import { setApiKey, deleteApiKey, getApiKey } from '../src/secrets/tokenManager';

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

describe('tokenManager', () => {
    it('removes the stored API key', async () => {
        const context = { secrets: new TestSecrets() } as any;
        await setApiKey(context, 'SECRET');
        await deleteApiKey(context);
        const value = await getApiKey(context);
        expect(value).to.be.undefined;
    });
});
