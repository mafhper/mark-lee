import { spawn } from 'node:child_process';
import http from 'node:http';

const host = '127.0.0.1';
const port = process.env.MARK_LEE_UI_LAYOUT_PORT || '5280';
const serverUrl = `http://${host}:${port}`;

/**
 * A porta já está ocupada por alguém?
 *
 * **O defeito que este guarda fecha.** O Vite deste projeto só é `strictPort`
 * sob Tauri (`strictPort: isTauriRuntime`, e `isTauriRuntime` vem de
 * `TAURI_DEV_HOST` — que este harness **não** passa; ele passa `TAURI_DEV_PORT`).
 * Fora do Tauri, `strictPort` é `false`: se a porta estiver ocupada, o Vite **sobe
 * na próxima livre, em silêncio** — 5280 ocupada levava o servidor novo para
 * 5281. Aí o `waitForServer` abaixo recebia 200 **do servidor alheio**, o teste
 * navegava para `host:port` e media **outra aplicação**, sem nenhum aviso.
 *
 * A consequência é pior do que um teste instável: com um `vite preview` na porta,
 * o harness passa pelas telas de um `dist/` **antigo** e reporta reprovação — ou
 * aprovação — sobre código que não é o que está no disco. E a mensagem de erro
 * que ele emite nesse caso ("o popover não cabe a 420px") não aponta para a causa.
 *
 * **Por que reprovar em vez de reaproveitar o servidor que estiver lá:** um
 * `npm run dev` na porta serviria o código certo, porque o Vite reassiste os
 * arquivos. Mas essa é uma **propriedade do Vite**, não uma garantia do harness, e
 * a diferença entre "dev" e "preview" é justamente `dist/` antigo. Preferimos o
 * erro legível ao pressuposto certo.
 *
 * O que este guarda **não** faz: não escolhe porta, não muda o contrato de porta
 * (que vive em `vite.config.ts`, `tauri.conf.json` e os dois scripts deste
 * harness — ver MKL-N12), e não afeta o CI, onde `test:ui-layout` não roda.
 */
function portaOcupada(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ocupada) => {
      if (settled) return;
      settled = true;
      resolve(ocupada);
    };
    const req = http.get(url, (res) => {
      res.resume();
      finish(true);
    });
    req.on('error', () => finish(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      finish(false);
    });
  });
}


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
  // A guarda vem **antes** do `spawn`. Depois, o servidor alheio já estaria
  // respondendo e a checagem não distinguiria "a porta é minha" de "a porta é de
  // outro" — que é exatamente o que precisa distinguir.
  if (await portaOcupada(serverUrl)) {
    throw new Error(
      `A porta ${port} já responde antes do harness subir o servidor dele.\n` +
        `  O Vite deste projeto é \`strictPort\` só sob Tauri, então com a porta ocupada\n` +
        `  ele sobe na próxima livre em silêncio e este teste passaria a medir o\n` +
        `  servidor que estiver na ${port} — que pode ser um \`dist\` antigo, e aí a\n` +
        `  reprovação aponta para o código errado.\n\n` +
        `  Feche o que ocupa a ${port} (o \`npm run dev\` da sua sessão, um \`vite preview\`)\n` +
        `  e rode de novo. Para usar outra porta: MARK_LEE_UI_LAYOUT_PORT=5282 npm run test:ui-layout`,
    );
  }

//A porta vai pelo AMBIENTE, e nao por `--port` na linha de comando.
//`--port` prevalece sobre o `vite.config.ts`, e isso e exatamente a armadilha
//que o `icon-core` nao fechou: o script do `package.json` contorna a propria
//correcao do config. Passando `TAURI_DEV_PORT`, o config continua sendo o dono
//da porta — e o `hmrPort`, que ele deriva de `devPort + 1`, continua coerente.
//
//`MARK_LEE_UI_LAYOUT_PORT` continua valendo, porque e o nome que este harness
//usa; ele e repassado como `TAURI_DEV_PORT` para que o config veja o mesmo
//numero.
const dev = spawn(`npm run dev -- --host ${host}`, {
  shell: true,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, TAURI_DEV_PORT: String(port) },
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
