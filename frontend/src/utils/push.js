import { axiosInstance } from "../lib/axios";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getPushPublicKey() {
  const res = await axiosInstance.get("/auth/push/public-key");
  return res.data?.publicKey || "";
}

export async function registerPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const publicKey = await getPushPublicKey();

  if (!publicKey) {
    return;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await axiosInstance.post("/auth/push/subscribe", {
    subscription: subscription.toJSON(),
  });
}

export async function unregisterPushSubscription() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await axiosInstance.post("/auth/push/unsubscribe", {
    endpoint: subscription.endpoint,
  });

  await subscription.unsubscribe();
}
