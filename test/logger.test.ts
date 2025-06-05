import { expect } from 'chai';
import logger from '../src/logging/logger';
import { transports as winstonTransports } from 'winston';

describe('Logger', () => {
  it('configures file rotation', () => {
    const fileTransport = logger.transports.find(t => t instanceof winstonTransports.File);
    expect(fileTransport).to.exist;
    expect((fileTransport as any).maxsize).to.equal(1024 * 1024);
    expect((fileTransport as any).maxFiles).to.equal(5);
  });
});
