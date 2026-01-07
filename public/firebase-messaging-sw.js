// payload処理
self.addEventListener('push', function(event) {
  let payload = event.data?.json() || {};

  const title = payload.notification?.title || payload.data?.title || "通知";
  const options = {
    // jsonからタイトル取得(notificationが優先)
    body: payload.notification?.body || payload.data?.body || "",
    // jsonからdataの中身(url)を取得
    // data: { url: payload.data?.url || "/" }
  };

  // 通知を表示
  event.waitUntil(self.registration.showNotification(title, options));
});

// クリック動作
self.addEventListener('notificationclick', function(event) {
  // 通知を閉じる/消す?
  event.notification.close();
  
  // url取得と遷移
  const url = event.notification.data.url;
  event.waitUntil(clients.openWindow(url));
});

// Push通知を受け取ると呼ばれる(旧: payloadのnotificationしか対応できない)
// self.addEventListener('push', function (event) {
//     // メッセージを表示する
//     var data = {};
//     if (event.data) {
//       data = event.data.json();
//     }
//     var title = data.notification.title;
//     var message = data.notification.body;
//     event.waitUntil(
//       self.registration.showNotification(title, {
//         'body': message
//       })
//     );
// });
