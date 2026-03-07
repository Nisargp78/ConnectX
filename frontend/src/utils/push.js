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
  try {
    const res = await axiosInstance.get("/auth/push/public-key");
    const key = res.data?.publicKey;
    if (!key) {
      return "";
    }
    return key;
  } catch (error) {
    throw error;
  }
}

export async function registerPushSubscription() {
  try {
    // Check browser support
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (!("PushManager" in window)) {
      return;
    }
    if (!("Notification" in window)) {
      return;
    }

    // Check HTTPS (required for service workers in production)
    if (window.location.protocol !== "https:" && !window.location.hostname?.includes("localhost")) {
      // Production warning silently logged
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      return;
    }

    // Register service worker
    let registration;
    try {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
    } catch (swError) {
      throw swError;
    }

    // Get public key
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      return;
    }

    // Get or create subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } catch (subError) {
        throw subError;
      }
    }

    // Send subscription to backend
    await axiosInstance.post("/auth/push/subscribe", {
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    // Allow app to continue without push support
  }
}

export async function unregisterPushSubscription() {
  try {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return;
    }

    await axiosInstance.post("/auth/push/unsubscribe", {
      endpoint: subscription.endpoint,
    });

    await subscription.unsubscribe();
  } catch (error) {
    // Allow logout to proceed
  }
}