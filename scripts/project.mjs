import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const windows = process.platform === 'win32';
const localUv = resolve(root, '.tools', windows ? 'Scripts/uv.exe' : 'bin/uv');
const uv = process.env.UV || (existsSync(localUv) ? localUv : 'uv');
const action = process.argv[2];
const files = process.argv.slice(3).map((file) => resolve(root, file));
const npmCli = process.env.npm_execpath;
const backend = resolve(root, 'backend');

function run(command, args, cwd = root) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function tool(path, args) {
  run(process.execPath, [resolve(root, 'node_modules', path), ...args]);
}

function npm(args) {
  if (!npmCli) throw new Error('Run this command through npm run.');
  run(process.execPath, [npmCli, ...args]);
}

function python(args) {
  run(uv, ['run', '--frozen', ...args], backend);
}

function format(check) {
  tool('prettier/bin/prettier.cjs', ['.', check ? '--check' : '--write']);
  python([
    'ruff',
    'format',
    ...(check ? ['--check'] : []),
    '.',
    '../scripts/verify_wheel.py',
  ]);
  if (!check)
    python(['ruff', 'check', '--fix', '.', '../scripts/verify_wheel.py']);
}

function lint() {
  tool('eslint/bin/eslint.js', ['.', '--max-warnings=0']);
  python(['ruff', 'check', '.', '../scripts/verify_wheel.py']);
}

function typecheck() {
  npm(['--workspace', 'frontend', 'run', 'typecheck']);
  python(['mypy']);
}

function test() {
  npm(['--workspace', 'frontend', 'run', 'test']);
  python(['pytest']);
}

function build() {
  npm(['--workspace', 'frontend', 'run', 'build']);
  python(['python', '../scripts/verify_wheel.py', '--uv', uv]);
}

const backendArgs = [
  'run',
  '--frozen',
  'uvicorn',
  'prepare_backend.app:app',
  '--reload',
  '--reload-dir',
  'src',
  '--host',
  '127.0.0.1',
  '--port',
  '8000',
];
if (existsSync(resolve(backend, '.env')))
  backendArgs.push('--env-file', '.env');

switch (action) {
  case 'setup':
    run(uv, ['sync', '--frozen'], backend);
    break;
  case 'dev:backend':
    run(uv, backendArgs, backend);
    break;
  case 'dev': {
    if (!npmCli) throw new Error('Use npm run dev.');
    const children = [
      spawn(
        process.execPath,
        [npmCli, '--workspace', 'frontend', 'run', 'dev'],
        { cwd: root, stdio: 'inherit' },
      ),
      spawn(uv, backendArgs, { cwd: backend, stdio: 'inherit' }),
    ];
    let stopping = false;
    function stop(code = 0) {
      if (stopping) return;
      stopping = true;
      for (const child of children) {
        if (!child.pid) continue;
        if (windows)
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
          });
        else child.kill('SIGTERM');
      }
      process.exit(code);
    }
    process.on('SIGINT', () => stop());
    process.on('SIGTERM', () => stop());
    for (const child of children) {
      child.on('error', (error) => {
        console.error(error.message);
        stop(1);
      });
      child.on('exit', (code) => stop(code ?? 1));
    }
    break;
  }
  case 'format':
    format(false);
    break;
  case 'format:check':
    format(true);
    break;
  case 'lint':
    lint();
    break;
  case 'typecheck':
    typecheck();
    break;
  case 'test':
    test();
    break;
  case 'build':
    build();
    break;
  case 'check':
    format(true);
    lint();
    typecheck();
    break;
  case 'verify':
    format(true);
    lint();
    typecheck();
    test();
    build();
    break;
  case 'hooks:install':
    python(['pre-commit', 'install']);
    break;
  case 'hooks:check':
    python(['pre-commit', 'run', '--all-files']);
    break;
  case 'hook-web-format':
    tool('prettier/bin/prettier.cjs', ['--write', ...files]);
    break;
  case 'hook-web-lint':
    tool('eslint/bin/eslint.js', ['--max-warnings=0', ...files]);
    break;
  case 'hook-python-format':
    python(['ruff', 'format', ...files]);
    break;
  case 'hook-python-lint':
    python(['ruff', 'check', ...files]);
    break;
  default:
    throw new Error(`Unknown action: ${action}`);
}
