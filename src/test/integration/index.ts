import * as path from "path";
import Mocha from "mocha";
// eslint-disable-next-line import/no-named-as-default
import glob from "glob";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "bdd", color: true, timeout: 120 * 1000 });

  return new Promise((resolve, reject) => {
    glob("**/*.test.js", { cwd: __dirname }, (err, files) => {
      if (err) {
        return reject(err);
      }
      files.forEach((f) => mocha.addFile(path.resolve(__dirname, f)));
      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
