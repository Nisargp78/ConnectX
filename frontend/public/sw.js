self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: "ConnectX", body: event.data.text() };
  }

  const title = payload.title || "ConnectX";
  const options = {
    body: payload.body || "You have a new message",
    icon: payload.icon || "/CX.png",
    badge: payload.badge || "/CX.png",
    data: payload.data || { url: "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return null;
    })
  );
});
