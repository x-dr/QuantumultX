/**
 * 夏塔小程序请求凭据自动捕获
 *
 * 捕获内容：
 * - SATOKEN
 * - timestamp
 * - nonce
 * - signature
 * - url 请求头
 * - zx_free_travel_version
 * - 请求方法、接口地址、接口路径
 *
 * 数据仅保存在 Quantumult X 本地 $prefs。
 * 脚本不会修改请求，也不会上传任何数据。
 */

"use strict";

(function () {
  var SCRIPT_NAME = "夏塔 SATOKEN";
  var SESSION_KEY = "xj_xiata_session";
  var TOKEN_KEY = "xj_xiata_satoken";

  // 是否在 SATOKEN 变化时发送通知
  var NOTIFY_ON_TOKEN_CHANGE = true;

  // 是否保存全部请求头
  // 默认关闭，避免额外保存 Cookie、Authorization 等无关敏感信息
  var CAPTURE_ALL_HEADERS = false;

  try {
    var requestHeaders = $request.headers || {};
    var headers = normalizeHeaders(requestHeaders);

    var satoken = getHeader(headers, [
      "satoken",
      "sa-token",
      "sa_token"
    ]);

    if (!satoken) {
      console.log(
        "[" + SCRIPT_NAME + "] 当前请求未发现 SATOKEN：" +
        ($request.url || "未知接口")
      );
      $done({});
      return;
    }

    var previousToken = $prefs.valueForKey(TOKEN_KEY) || "";
    var isFirstCapture = !previousToken;
    var tokenChanged = previousToken !== satoken;

    var capturedHeaders = {
      satoken: satoken,
      timestamp: getHeader(headers, ["timestamp"]),
      nonce: getHeader(headers, ["nonce"]),
      signature: getHeader(headers, ["signature"]),
      url: getHeader(headers, ["url"]),
      zx_free_travel_version: getHeader(headers, [
        "zx_free_travel_version"
      ]),
      content_type: getHeader(headers, ["content-type"]),
      user_agent: getHeader(headers, ["user-agent"]),
      host: getHeader(headers, ["host"])
    };

    var session = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      method: $request.method || "",
      requestUrl: $request.url || "",
      path: getRequestPath(),
      headers: capturedHeaders
    };

    if (CAPTURE_ALL_HEADERS) {
      session.allHeaders = removeUnsafeHeaders(headers);
    }

    // 保存完整会话数据
    var sessionSaved = $prefs.setValueForKey(
      JSON.stringify(session, null, 2),
      SESSION_KEY
    );

    // 单独保存常用字段，方便其他 Quantumult X 脚本读取
    saveValue(TOKEN_KEY, capturedHeaders.satoken);
    saveValue("xj_xiata_timestamp", capturedHeaders.timestamp);
    saveValue("xj_xiata_nonce", capturedHeaders.nonce);
    saveValue("xj_xiata_signature", capturedHeaders.signature);
    saveValue("xj_xiata_url_header", capturedHeaders.url);
    saveValue(
      "xj_xiata_version",
      capturedHeaders.zx_free_travel_version
    );
    saveValue("xj_xiata_request_url", session.requestUrl);
    saveValue("xj_xiata_request_path", session.path);
    saveValue("xj_xiata_captured_at", session.capturedAt);

    if (!sessionSaved) {
      throw new Error("写入 Quantumult X 本地存储失败");
    }

    console.log(
      "[" + SCRIPT_NAME + "] 捕获成功\n" +
      "接口：" + session.path + "\n" +
      "方法：" + session.method + "\n" +
      "SATOKEN：" + maskSecret(satoken) + "\n" +
      "时间：" + session.capturedAt
    );

    if (
      NOTIFY_ON_TOKEN_CHANGE &&
      (isFirstCapture || tokenChanged)
    ) {
      var subtitle = isFirstCapture
        ? "首次获取成功"
        : "SATOKEN 已更新";

      $notify(
        SCRIPT_NAME,
        subtitle,
        "接口：" + session.path + "\n" +
        "SATOKEN：" + maskSecret(satoken)
      );
    }
  } catch (error) {
    var message = error && error.message
      ? error.message
      : String(error);

    console.log("[" + SCRIPT_NAME + "] 执行失败：" + message);

    $notify(
      SCRIPT_NAME,
      "捕获失败",
      message
    );
  }

  // 不修改原始请求
  $done({});

  /**
   * 将请求头名称统一转成小写。
   */
  function normalizeHeaders(input) {
    var output = {};

    Object.keys(input || {}).forEach(function (key) {
      var value = input[key];

      if (value !== undefined && value !== null) {
        output[String(key).toLowerCase()] = String(value);
      }
    });

    return output;
  }

  /**
   * 按候选名称获取请求头。
   */
  function getHeader(input, names) {
    for (var i = 0; i < names.length; i++) {
      var name = String(names[i]).toLowerCase();

      if (
        Object.prototype.hasOwnProperty.call(input, name) &&
        input[name] !== ""
      ) {
        return input[name];
      }
    }

    return "";
  }

  /**
   * 获取请求路径。
   */
  function getRequestPath() {
    if ($request.path) {
      return $request.path;
    }

    var requestUrl = $request.url || "";
    var matched = requestUrl.match(
      /^https?:\/\/[^/]+(\/[^?#]*)?(?:\?[^#]*)?/i
    );

    if (!matched) {
      return requestUrl;
    }

    return matched[1] || "/";
  }

  /**
   * 保存字符串值。
   */
  function saveValue(key, value) {
    if (value === undefined || value === null) {
      value = "";
    }

    $prefs.setValueForKey(String(value), key);
  }

  /**
   * 脱敏显示密钥。
   */
  function maskSecret(value) {
    value = String(value || "");

    if (value.length <= 10) {
      return value.substring(0, 2) + "****";
    }

    return (
      value.substring(0, 6) +
      "****" +
      value.substring(value.length - 4)
    );
  }

  /**
   * 开启 CAPTURE_ALL_HEADERS 时，过滤明显无关的敏感请求头。
   */
  function removeUnsafeHeaders(input) {
    var output = {};
    var blocked = {
      cookie: true,
      authorization: true,
      "proxy-authorization": true
    };

    Object.keys(input || {}).forEach(function (key) {
      if (!blocked[key]) {
        output[key] = input[key];
      }
    });

    return output;
  }
})();













加一个将完整会话数据发送到http://192.168.1.35:3636/update
