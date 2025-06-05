import * as Mocha from 'mocha';
import * as path from 'path';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: true });
  const testsRoot = path.resolve(__dirname);

  return new Promise((c, e) => {
    glob('**/*.test.js', { cwd: testsRoot })
      .then(files => {
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          mocha.run(failures => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          e(err);
        }
      })
      .catch(e);
  });
}

run();
