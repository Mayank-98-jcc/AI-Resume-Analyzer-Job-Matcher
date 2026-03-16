export function waitForGoogleIdentity({ timeoutMs = 6000, pollMs = 200 } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      const gsi = globalThis?.google?.accounts?.id;
      if (gsi) return resolve(gsi);

      if (Date.now() - startedAt >= timeoutMs) {
        return reject(new Error("Google Identity Services did not load"));
      }

      window.setTimeout(tick, pollMs);
    };

    tick();
  });
}

export function ensureGoogleIdentityInitialized(clientId) {
  if (!clientId) return false;
  const gsi = globalThis?.google?.accounts?.id;
  if (!gsi) return false;

  if (globalThis.__resumeiq_gsi_initialized) return true;

  gsi.initialize({
    client_id: clientId,
    callback: (response) => {
      const handler = globalThis.__resumeiq_gsi_onCredential;
      if (typeof handler === "function") handler(response);
    }
  });

  globalThis.__resumeiq_gsi_initialized = true;
  return true;
}

export function renderGoogleButton(container, options) {
  const gsi = globalThis?.google?.accounts?.id;
  if (!gsi || !container) return false;
  container.innerHTML = "";
  gsi.renderButton(container, options);
  return true;
}

