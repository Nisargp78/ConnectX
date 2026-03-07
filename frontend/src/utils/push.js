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
      console.warn("[Push] No public key returned from server");
      return "";
    }
    console.log("[Push] Public key loaded successfully");
    return key;
  } catch (error) {
    console.error("[Push] Failed to fetch public key:", error?.message || error);
    throw error;
  }
}

export async function registerPushSubscription() {
  try {
    // Check browser support
    if (!("serviceWorker" in navigator)) {
      console.log("[Push] Service Worker not supported");
      return;
    }
    if (!("PushManager" in window)) {
      console.log("[Push] PushManager not supported");
      return;
    }
    if (!("Notification" in window)) {
      console.log("[Push] Notification API not supported");
      return;
    }

    // Check HTTPS (required for service workers in production)
    if (window.location.protocol !== "https:" && !window.location.hostname?.includes("localhost")) {
      console.warn("[Push] HTTPS is required for production push notifications");
    }

    // Request permission
    console.log("[Push] Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("[Push] Notification permission:", permission);
    
    if (permission !== "granted") {
      console.log("[Push] Notification permission denied");
      return;
    }

    // Register service worker
    console.log("[Push] Registering service worker...");
    let registration;
    try {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("[Push] Service worker registered:", registration);
    } catch (swError) {
      console.error("[Push] Service worker registration failed:", swError?.message || swError);
      throw swError;
    }

    // Get public key
    console.log("[Push] Fetching VAPID public key...");
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      console.error("[Push] No public key available");
      return;
    }

    // Get or create subscription
    console.log("[Push] Checking for existing subscription...");
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log("[Push] Creating new subscription...");
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        console.log("[Push] Subscription created:", subscription.endpoint);
      } catch (subError) {
        console.error("[Push] Subscription creation failed:", subError?.message || subError);
        throw subError;
      }
    } else {
      console.log("[Push] Using existing subscription:", subscription.endpoint);
    }

    // Send subscription to backend
    console.log("[Push] Sending subscription to backend...");
    await axiosInstance.post("/auth/push/subscribe", {
      subscription: subscription.toJSON(),
    });
    console.log("[Push] Subscription saved successfully");
  } catch (error) {
    console.error("[Push] Setup failed:", error?.message || error);
    // Don't throw - allow app to continue without push support
  }
}

export async function unregisterPushSubscription() {
  try {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    console.log("[Push] Unregistering push subscription...");
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      console.log("[Push] No service worker registration found");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log("[Push] No active subscription found");
      return;
    }

    console.log("[Push] Removing subscription from backend:", subscription.endpoint);
    await axiosInstance.post("/auth/push/unsubscribe", {
      endpoint: subscription.endpoint,
    });

    console.log("[Push] Unsubscribing from push manager...");
    await subscription.unsubscribe();
    console.log("[Push] Unsubscription complete");
  } catch (error) {
    console.error("[Push] Unsubscription failed:", error?.message || error);
    // Don't throw - allow logout to proceed
  }
}
