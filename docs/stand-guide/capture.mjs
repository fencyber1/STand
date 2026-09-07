// Zero-dependency CDP screenshot helper (Node 20+ global WebSocket).
// Usage: node capture.mjs <debugPort> <url> <outPng> [readyJs] [timeoutMs] [width] [height]
// Exits 0 on success, 1 on failure/timeout.
import { writeFileSync } from 'fs';

const [port, url, out, readyJs = '', timeoutMs = '60000', vw = '', vh = ''] = process.argv.slice(2);
if (!port || !url || !out) {
  console.error('usage: node capture.mjs <port> <url> <out> [readyJs] [timeoutMs]');
  process.exit(1);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  // Open a fresh target
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const cur = ++id;
      pending.set(cur, { res, rej });
      ws.send(JSON.stringify({ id: cur, method, params }));
      setTimeout(() => { if (pending.has(cur)) { pending.delete(cur); rej(new Error('cdp timeout ' + method)); } }, 30000);
    });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  if (vw && vh) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: Number(vw), height: Number(vh), deviceScaleFactor: 2, mobile: true,
    });
  }
  await send('Page.navigate', { url });
  const deadline = Date.now() + Number(timeoutMs);
  let ready = false;
  const check = readyJs || '!!(document.getElementById("root") && document.getElementById("root").children.length)';
  while (Date.now() < deadline) {
    await sleep(1000);
    try {
      if (await evaluate(check)) { ready = true; break; }
    } catch {}
  }
  if (!ready) throw new Error('ready check timed out: ' + check);
  await sleep(2500); // settle animations/lazy chunks
  try {
    const skipped = await evaluate(`(() => { const b = document.querySelector('.tour-btn-skip'); if (b) { b.click(); return true; } return false; })()`);
    await sleep(1200);
    if (skipped) {
      // Tour completion navigates home — go back to the target and re-wait
      await send('Page.navigate', { url });
      const deadline2 = Date.now() + 60000;
      while (Date.now() < deadline2) {
        await sleep(1000);
        try {
          if (await evaluate(check)) break;
        } catch {}
      }
      await sleep(2500);
    }
  } catch {}
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('saved', out);
  ws.close();
}

main().catch((e) => { console.error('CAPTURE FAIL:', e.message); process.exit(1); });
