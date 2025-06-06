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
    const last = outputChannel.messages[outputChannel.messages.length - 1];
    expect(last).to.not.include('SECRET');
    expect(last).to.not.include('/tmp/secret.txt');
  });

  it('redacts absolute paths with spaces and quotes', () => {
    logger.info('opening "C:\\Secret Folder\\file.txt"');
    logger.info("processing '/tmp/some file '");
    const lastTwo = outputChannel.messages.slice(-2);
    expect(lastTwo[0]).to.not.include('C:\\Secret Folder\\file.txt');
    expect(lastTwo[1]).to.not.include('/tmp/some file');
  });
});
