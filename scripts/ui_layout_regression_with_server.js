import { spawn } from 'node:child_process';
import http from 'node:http';

function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
          return;
        }
        retry();
      });
      req.on('error', retry);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };

    tick();
  });
}

async function run() {
  const dev = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    shell: true,
    stdio: 'inherit',
  });

  const stopDev = () => {
    if (!dev.killed) dev.kill('SIGTERM');
  };

  process.on('SIGINT', stopDev);
  process.on('SIGTERM', stopDev);

  try {
    await waitForServer('http://127.0.0.1:5173');
    const runner = spawn('node', ['scripts/ui_layout_regression.js'], {
      shell: true,
      stdio: 'inherit',
    });
    await new Promise((resolve, reject) => {
      runner.on('exit', (code) => (code === 0 ? resolve(true) : reject(new Error(`ui_layout_regression exited with code ${code}`))));
      runner.on('error', reject);
    });
  } finally {
    stopDev();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
