
export const onRequestGet: PagesFunction = async (context) => {
  const { env } = context;

  // Requiere binding KV: env.SIWE_NONCES
  // (en Cloudflare Pages -> Settings -> Bindings)
  const NONCES: KVNamespace | undefined = env.SIWE_NONCES;

  if (!NONCES) {
    return json(
      { ok: false, error: "KV binding missing: SIWE_NONCES" },
      500
    );
  }

  // nonce fuerte y simple (WebCrypto)
  const nonce = makeNonce(24);

  // TTL recomendado: 10 minutos (600s)
  const ttlSeconds = 10 * 60;

  // Guardamos nonce como "no usado" (value = "1")
  // Si quieres asociarlo a IP o sessionId, se puede extender luego.
  await NONCES.put(`nonce:${nonce}`, "1", {
    expirationTtl: ttlSeconds,
  });

  return json({
    ok: true,
    nonce,
    ttlSeconds,
  });
};

// Helpers
function makeNonce(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // Base64URL safe
  return base64Url(arr);
}

function base64Url(arr: Uint8Array) {
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
