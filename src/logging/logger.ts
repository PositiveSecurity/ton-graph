import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = createLogger({
  level: 'info',
  format: format.json(),
  transports: [
    new transports.Console({ format: format.json() }),
    new transports.File({ filename: path.join(logsDir, 'extension.log') })
  ]
});

export default logger;
