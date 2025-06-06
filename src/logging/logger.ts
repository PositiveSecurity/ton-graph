import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Writable } from 'stream';

const sanitizeFormat = format((info) => {
  function redactPaths(text: string): string {
    return text
      .split(/\s+/)
      .map(part => {
        const cleaned = part.replace(/['"`]/g, '');
        return path.isAbsolute(cleaned) || path.win32.isAbsolute(cleaned)
          ? '[REDACTED_PATH]'
          : part;
      })
      .join(' ');
  }

  const sanitize = (value: any): any => {
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        if (/api[_-]?key/i.test(k)) {
          value[k] = '[FILTERED]';
        } else {
          value[k] = sanitize(value[k]);
        }
      }
      return value;
    }
    if (typeof value === 'string') {
      value = redactPaths(value);
      const apiKeyPattern = /(api[_-]?key\s*[=:]\s*)([^\s]+)/i;
      return value.replace(apiKeyPattern, '$1[FILTERED]');
    }
    return value;
  };

  info.message = sanitize(info.message);
  sanitize(info);
  return info;
});

export const outputChannel = vscode.window.createOutputChannel('TON Graph');

const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = format.combine(
  sanitizeFormat(),
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
  level: process.env.TON_GRAPH_LOG_LEVEL || 'debug',
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
