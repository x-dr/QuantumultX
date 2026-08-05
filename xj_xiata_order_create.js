/**
 * Quantumult X
 *
 * 捕获夏塔订单创建请求，并上传到局域网服务：
 * POST http://192.168.1.35:3636/update/order-create
 */

"use strict";

const SCRIPT_NAME = "夏塔订单";
const TARGET_HOST = "xj-xiata.com";
const TARGET_PATH = "/api/wxts/order/create";

const UPLOAD_URL =
  "http://192.168.1.35:3636/update/order-create";

const LATEST_KEY = "xj_xiata_order_create_latest";
const HISTORY_KEY = "xj_xiata_order_create_history";

const MAX_HISTORY = 10;
const MAX_NOTIFY_LENGTH = 500;

function nowText() {
  const date = new Date();
  const pad = (value) =>
    String(value).padStart(2, "0");

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

function safeJsonParse(text) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function normalizeHeaders(headers) {
  const normalized = {};

  Object.keys(headers || {}).forEach((key) => {
    normalized[String(key).toLowerCase()] =
      headers[key];
  });

  return normalized;
}

function loadHistory() {
  try {
    const raw =
      $prefs.valueForKey(HISTORY_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.log(
      `[${SCRIPT_NAME}] 历史记录读取失败：${error}`
    );

    return [];
  }
}

function truncateText(text, maxLength) {
  const value = String(text || "");

  if (value.length <= maxLength) {
    return value;
  }

  return (
    value.slice(0, maxLength) + "..."
  );
}

async function uploadOrderData(
  record,
  history
) {
  const payload = {
    source: "quantumult-x",
    type: "order-create",
    uploadedAt: nowText(),
    uploadedTimestamp: Date.now(),

    latestKey: LATEST_KEY,
    historyKey: HISTORY_KEY,

    latest: record,
    history,
  };

  console.log(
    `[${SCRIPT_NAME}] 正在上传：${UPLOAD_URL}`
  );

  const response = await $task.fetch({
    url: UPLOAD_URL,
    method: "POST",

    headers: {
      "Content-Type":
        "application/json; charset=utf-8",
      Accept: "application/json",
    },

    body: JSON.stringify(payload),
  });

  const statusCode =
    response.statusCode ||
    response.status ||
    0;

  const responseBody =
    response.body || "";

  console.log(
    `[${SCRIPT_NAME}] 上传状态码：${statusCode}`
  );

  if (responseBody) {
    console.log(
      `[${SCRIPT_NAME}] 上传响应：${truncateText(
        responseBody,
        1000
      )}`
    );
  }

  if (
    statusCode < 200 ||
    statusCode >= 300
  ) {
    throw new Error(
      `上传失败，HTTP ${statusCode}：${truncateText(
        responseBody,
        300
      )}`
    );
  }

  return {
    statusCode,
    body: responseBody,
  };
}

(async function main() {
  try {
    const requestUrl = String(
      $request.url || ""
    );

    const requestMethod = String(
      $request.method || "UNKNOWN"
    ).toUpperCase();

    const requestBody =
      typeof $request.body === "string"
        ? $request.body
        : "";

    let parsedUrl;

    try {
      parsedUrl = new URL(requestUrl);
    } catch (error) {
      console.log(
        `[${SCRIPT_NAME}] URL 解析失败：${requestUrl}`
      );

      return;
    }

    if (
      parsedUrl.hostname !== TARGET_HOST ||
      parsedUrl.pathname !== TARGET_PATH
    ) {
      return;
    }

    const headers = normalizeHeaders(
      $request.headers || {}
    );

    if (!requestBody) {
      console.log(
        `[${SCRIPT_NAME}] 未获取到请求体`
      );

      $notify(
        SCRIPT_NAME,
        "请求体捕获失败",
        "未检测到请求体，请检查 MitM、重写配置及请求类型"
      );

      return;
    }

    const parsedBody =
      safeJsonParse(requestBody);

    const record = {
      capturedAt: nowText(),
      capturedTimestamp: Date.now(),

      request: {
        method: requestMethod,
        url: requestUrl,
        host: parsedUrl.hostname,
        path: parsedUrl.pathname,
        query: parsedUrl.search || "",

        contentType:
          headers["content-type"] || "",
      },

      authentication: {
        satoken:
          headers["satoken"] || "",

        timestamp:
          headers["timestamp"] || "",

        nonce:
          headers["nonce"] || "",

        signature:
          headers["signature"] || "",

        url:
          headers["url"] || "",

        zxFreeTravelVersion:
          headers[
            "zx_free_travel_version"
          ] || "",
      },

      bodyType:
        parsedBody !== null
          ? "json"
          : "text",

      body:
        parsedBody !== null
          ? parsedBody
          : requestBody,
    };

    const latestSaved =
      $prefs.setValueForKey(
        JSON.stringify(record),
        LATEST_KEY
      );

    const history = loadHistory();

    history.unshift(record);

    if (
      history.length > MAX_HISTORY
    ) {
      history.length = MAX_HISTORY;
    }

    const historySaved =
      $prefs.setValueForKey(
        JSON.stringify(history),
        HISTORY_KEY
      );

    console.log(
      "========== 夏塔订单请求 =========="
    );

    console.log(
      JSON.stringify(record, null, 2)
    );

    console.log(
      "=================================="
    );

    console.log(
      `[${SCRIPT_NAME}] 最新记录保存：${
        latestSaved
          ? "成功"
          : "失败"
      }`
    );

    console.log(
      `[${SCRIPT_NAME}] 历史记录保存：${
        historySaved
          ? "成功"
          : "失败"
      }`
    );

    let uploadSuccess = false;
    let uploadError = "";

    try {
      await uploadOrderData(
        record,
        history
      );

      uploadSuccess = true;

      console.log(
        `[${SCRIPT_NAME}] 局域网上传成功`
      );
    } catch (error) {
      uploadError =
        error.message ||
        String(error);

      console.log(
        `[${SCRIPT_NAME}] 局域网上传失败：${uploadError}`
      );
    }

    let notifyBody =
      parsedBody !== null
        ? JSON.stringify(parsedBody)
        : requestBody;

    notifyBody = truncateText(
      notifyBody,
      MAX_NOTIFY_LENGTH
    );

    if (uploadSuccess) {
      $notify(
        "夏塔订单请求已捕获",
        `${record.capturedAt}｜上传成功`,
        notifyBody
      );
    } else {
      $notify(
        "夏塔订单已捕获，但上传失败",
        record.capturedAt,
        truncateText(
          uploadError,
          MAX_NOTIFY_LENGTH
        )
      );
    }
  } catch (error) {
    console.log(
      `[${SCRIPT_NAME}] 脚本执行异常：${
        error.stack ||
        error.message ||
        String(error)
      }`
    );

    $notify(
      SCRIPT_NAME,
      "脚本执行异常",
      truncateText(
        error.message ||
          String(error),
        300
      )
    );
  } finally {
    $done({});
  }
})();
