import util from 'util';

const exec = util.promisify(require('child_process').exec);

jest.setTimeout(10000)
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

test('cli does not run when required or imported', async () => {
  expect(require('./cli').default).toBe(false)
})