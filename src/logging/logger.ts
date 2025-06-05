import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Writable } from 'stream';

export const outputChannel = vscode.window.createOutputChannel('TON Graph');

const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${rest}`;
  })
);

const outputStream = new Writable({
  write(chunk, _enc, callback) {
    outputChannel.appendLine(chunk.toString().trim());
    callback();
  },
});

const logger = createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new transports.File({
      filename: path.join(logsDir, 'extension.log'),
      maxsize: 1024 * 1024,
      maxFiles: 5,
    }),
    new transports.Stream({
      stream: outputStream,
    }),
  ],
});

export default logger;
