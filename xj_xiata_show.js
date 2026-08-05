/**
 * 查看 Quantumult X 本地保存的夏塔请求信息
 *
 * 手动运行后：
 * 1. 通知中显示脱敏 SATOKEN
 * 2. Quantumult X 日志中输出完整 JSON
 */

"use strict";

(function () {
  var SESSION_KEY = "xj_xiata_session";
  var raw = $prefs.valueForKey(SESSION_KEY);

  if (!raw) {
    $notify(
      "夏塔 SATOKEN",
      "暂无捕获数据",
      "请先打开微信小程序并访问一个夏塔接口。"
    );

    console.log("[夏塔 SATOKEN] 暂无捕获数据");
    $done();
    return;
  }

  try {
    var session = JSON.parse(raw);
    var headers = session.headers || {};
    var satoken = headers.satoken || "";

    console.log(
      "\n========== 夏塔完整凭据 ==========\n" +
      JSON.stringify(session, null, 2) +
      "\n==================================\n"
    );

    $notify(
      "夏塔 SATOKEN",
      "完整数据已输出到 Quantumult X 日志",
      "接口：" + (session.path || "未知") + "\n" +
      "SATOKEN：" + maskSecret(satoken) + "\n" +
      "捕获时间：" + (session.capturedAt || "未知")
    );
  } catch (error) {
    console.log(
      "[夏塔 SATOKEN] 数据解析失败，原始内容：\n" + raw
    );

    $notify(
      "夏塔 SATOKEN",
      "数据解析失败",
      String(error)
    );
  }

  $done();

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
})();
