import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('mutation-results', { recursive: true });
for (const [mutation, check] of Object.entries({ icon: 'A icon', disabled: 'B disabled', targets: 'C interactive', overflow: 'D extreme', duplicates: 'E title', consequences: 'F title', resolved: 'C interactive' })) {
  const result = spawnSync('bun', ['run', 'test:ui', '--project=dark-1280', '--grep', check, '--reporter=json', `--output=mutation-results/${mutation}`], {
    env: { ...process.env, UI_MUTATION: mutation }, encoding: 'utf8', timeout: 120_000,
  });
  writeFileSync(`mutation-results/${mutation}.json`, result.stdout || '');
  const report = JSON.parse(result.stdout);
  const errors = report.suites.flatMap(suite => suite.specs.flatMap(spec => spec.tests.flatMap(test => test.results.flatMap(result => result.errors))));
  if (result.status !== 1 || !errors.some(error => error.message?.includes(mutation === 'resolved' ? 'fixed issues; remove these entries' : 'new UI violations'))) {
    throw new Error(`${mutation}: expected a new UI violation; got exit ${result.status}: ${result.stderr}`);
  }
  console.log(`${mutation}: rejected with ${mutation === 'resolved' ? 'an unexpectedly fixed known issue' : 'a new UI violation'}`);
}
