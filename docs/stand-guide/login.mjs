// Logs the demo user in via the app's /login form (CDP, zero-dep).
// Usage: STAND_EMAIL=.. STAND_PASS=.. node login.mjs <debugPort> [baseUrl]
const port = process.argv[2];
const base = (process.argv[3] || 'http://localhost:8080').replace(/\/$/, '');
if (!port || !process.env.STAND_EMAIL || !process.env.STAND_PASS) {
  console.error('usage: STAND_EMAIL=.. STAND_PASS=.. node login.mjs <port>');
  process.exit(1);
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function main() {
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
  await send('Page.navigate', { url: base + '/login' });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    await sleep(1000);
    try { if (await evaluate("!!document.querySelector('form input[type=email]')")) break; } catch {}
  }
  // Fill React-controlled inputs via native setter + input event
  await evaluate(`(() => {
    const email = ${JSON.stringify(process.env.STAND_EMAIL)};
    const pass = ${JSON.stringify(process.env.STAND_PASS)};
    const setVal = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(document.querySelector('form input[type=email]'), email);
    setVal(document.querySelector('form input[type=password]'), pass);
    return true;
  })()`);
  await evaluate(`document.querySelector('form button[type=submit]').click()`);
  // Wait for redirect to dashboard (login screen navigates away when isLoggedIn)
  const done = Date.now() + 60000;
  let ok = false;
  while (Date.now() < done) {
    await sleep(1500);
    try {
      const state = await evaluate(`({path: location.pathname, hasForm: !!document.querySelector('form input[type=email]'), err: (document.body.innerText.match(/invalid|failed|error/i)||[])[0]||''})`);
      if (state && state.path === '/' && !state.hasForm) { ok = true; break; }
      if (state && /invalid|failed/i.test(state.err || '')) throw new Error('login error shown: ' + state.err);
    } catch (e) { if (/login error/.test(e.message)) throw e; }
  }
  if (!ok) throw new Error('login did not complete');
  console.log('LOGIN OK');
  ws.close();
}
main().catch((e) => { console.error('LOGIN FAIL:', e.message); process.exit(1); });
