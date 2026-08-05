/*
 * Quantumult X — xj-xiata mini-program session capture
 *
 * Use as a `script-request-header` rewrite.  It does not modify the request
 * and it never sends data anywhere.  Captured values are stored only in this
 * Quantumult X profile's persistent storage.
 */

const STORAGE_KEY = "xj_xiata_last_session";
const request = typeof $request === "undefined" ? {} : $request;
const headers = request.headers || {};

function header(name) {
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  return key ? String(headers[key] || "") : "";
}

function redact(value) {
  if (!value) return "未发现";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

const session = {
  capturedAt: new Date().toISOString(),
  requestUrl: request.url || "",
  satoken: header("satoken"),
  apiPath: header("url"),
  signature: header("signature"),
  nonce: header("nonce"),
  timestamp: header("timestamp"),
};

if (session.satoken) {
  $prefs.setValueForKey(JSON.stringify(session), STORAGE_KEY);
  $notify(
    "夏塔小程序会话已更新",
    session.apiPath || session.requestUrl,
    `SATOKEN: ${redact(session.satoken)}\n签名: ${redact(session.signature)}`,
  );
}

$done({});
