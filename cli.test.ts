import util from 'util';
import { ensureFileSync, writeFileSync } from 'fs-extra';

const exec = util.promisify(require('child_process').exec);

jest.setTimeout(10000)

beforeAll(() => {
  const cssInNodeModulesPath = "node_modules/css-in-node-modules-test/test.css"
  ensureFileSync(cssInNodeModulesPath);
  writeFileSync(cssInNodeModulesPath, `.test { color: #000; }`);
});

test('cli outputs to /app/.generated-css-links', async () => {
  const { stdout, stderr } = await exec('ts-node ./cli');

  if (stderr) console.error(`error: ${stderr}`);
  console.log(stdout);

  expect(!!stdout && stderr).toBe(false);
})

test('cli outputs to /app/.somewhere-else', async () => {
  const { stdout, stderr } = await exec('ts-node ./cli -o .somewhere-else');

  if (stderr) console.error(`error: ${stderr}`);
  console.log(stdout);

  expect(!!stdout && stderr).toBe(false);
})

test('cli outputs to /app/.generated-css-links.sass-css', async () => {
  const { stdout, stderr } = await exec('ts-node ./cli --sass');
  
  if (stderr) console.error(`error: ${stderr}`);
  console.log(stdout);

  expect(!!stdout && stderr).toBe(false);
})