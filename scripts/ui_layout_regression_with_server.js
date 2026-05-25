import { spawn } from 'node:child_process';
import http from 'node:http';

const host = '127.0.0.1';
const port = process.env.MARK_LEE_UI_LAYOUT_PORT || '5173';
const serverUrl = `http://${host}:${port}`;

function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let settled = false;
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          settled = true;
          resolve(true);
          return;
        }
        retry();
      });
      req.on('error', retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });

      function retry() {
        if (settled) return;
        settled = true;
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        setTimeout(tick, 400);
      }
    };

    tick();
  });
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('exit', () => resolve());
      killer.once('error', () => resolve());
      return;
    }

    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function run() {
  const dev = spawn(`npm run dev -- --host ${host} --port ${port}`, {
    shell: true,
    stdio: 'inherit',
    windowsHide: true,
  });

  let stopping = false;
  const stopDev = async () => {
    if (stopping) return;
    stopping = true;
    await stopProcessTree(dev);
  };

  process.once('SIGINT', () => {
    stopDev().finally(() => process.exit(130));
  });
  process.once('SIGTERM', () => {
    stopDev().finally(() => process.exit(143));
  });

  try {
    await waitForServer(serverUrl);
    const runner = spawn('node', ['scripts/ui_layout_regression.js'], {
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });
    await new Promise((resolve, reject) => {
      runner.on('exit', (code) => (code === 0 ? resolve(true) : reject(new Error(`ui_layout_regression exited with code ${code}`))));
      runner.on('error', reject);
    });
  } finally {
    await stopDev();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
