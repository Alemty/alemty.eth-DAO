
export async function onRequestGet(context) {
  const NONCES = context.env.SIWE_NONCES;

  if (!NONCES) {
    return json({ ok: false, error: "KV binding missing: SIWE_NONCES" }, 500);
  }

  const nonce = makeNonce(24);
  const ttlSeconds = 10 * 60;

  await NONCES.put(`nonce:${nonce}`, "1", { expirationTtl: ttlSeconds });

  return json({ ok: true, nonce, ttlSeconds });
}

function makeNonce(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

function base64Url(arr) {
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
