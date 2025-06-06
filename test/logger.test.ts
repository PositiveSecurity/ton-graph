import { expect } from 'chai';
import mock = require('mock-require');
import { transports as winstonTransports } from 'winston';

let logger: typeof import('../src/logging/logger').default;
let outputChannel: any;

describe('Logger', () => {
  beforeEach(() => {
    const messages: string[] = [];
    outputChannel = { appendLine: (msg: string) => messages.push(msg), messages };
    mock('vscode', { window: { createOutputChannel: () => outputChannel } });
    delete require.cache[require.resolve('../src/logging/logger')];
    logger = require('../src/logging/logger').default;
  });

  afterEach(() => {
    mock.stopAll();
    delete require.cache[require.resolve('../src/logging/logger')];
  });
  it('configures file rotation', () => {
    const fileTransport = logger.transports.find(t => t instanceof winstonTransports.File);
    expect(fileTransport).to.exist;
    expect((fileTransport as any).maxsize).to.equal(1024 * 1024);
    expect((fileTransport as any).maxFiles).to.equal(5);
  });

  it('includes output channel transport', () => {
    const streamTransport = logger.transports.find(t => t instanceof winstonTransports.Stream);
    expect(streamTransport).to.exist;
    expect(outputChannel).to.exist;
  });

  it('filters sensitive information', () => {
    logger.error('failed with api_key=SECRET', { api_key: 'SECRET', path: '/tmp/secret.txt' });
    logger.error('bad api-key:SECRET');
    logger.error('bad apikey=SECRET');
    logger.error('bad apikey?value=SECRET');
    const lastFour = outputChannel.messages.slice(-4);
    for (const msg of lastFour) {
      expect(msg).to.not.include('SECRET');
      expect(msg).to.include('[FILTERED]');
    }
    expect(lastFour[0]).to.not.include('/tmp/secret.txt');
  });

  it('filters api keys in nested objects and arrays', () => {
    logger.error('nested object', { cfg: { auth: { apiKey: 'SECRET1' } } });
    logger.error('array of values', {
      items: [
        { 'x-api-key': 'SECRET2' },
        { deep: { api_key: 'SECRET3' } },
      ],
    });
    const lastTwo = outputChannel.messages.slice(-2);
    for (const msg of lastTwo) {
      expect(msg).to.not.include('SECRET1');
      expect(msg).to.not.include('SECRET2');
      expect(msg).to.not.include('SECRET3');
      expect(msg).to.include('[FILTERED]');
    }
  });

  it('redacts absolute paths with spaces and quotes', () => {
    logger.info('opening "C:\\Secret Folder\\file.txt"');
    logger.info("processing '/tmp/some file '");
    const lastTwo = outputChannel.messages.slice(-2);
    expect(lastTwo[0]).to.not.include('C:\\Secret Folder\\file.txt');
    expect(lastTwo[1]).to.not.include('/tmp/some file');
  });
});
