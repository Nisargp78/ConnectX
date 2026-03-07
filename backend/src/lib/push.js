import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@connectx.local";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
  console.log("[Push] VAPID details configured successfully");
} else {
  console.warn("[Push] Web push is disabled: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing.");
  console.warn("[Push] PUBLIC_KEY exists:", !!publicKey);
  console.warn("[Push] PRIVATE_KEY exists:", !!privateKey);
}

export function getVapidPublicKey() {
  return publicKey || "";
}

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export async function sendWebPush(subscription, payload) {
  if (!isPushConfigured()) {
    console.warn("[Push] Push not configured, skipping send");
    return;
  }

  try {
    console.log("[Push] Sending push to endpoint:", subscription.endpoint.substring(0, 50) + "...");
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("[Push] Push sent successfully");
  } catch (error) {
    console.error("[Push] Error sending notification:", {
      message: error?.message,
      statusCode: error?.statusCode,
      body: error?.body,
    });
    throw error;
  }
}
