import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@connectx.local";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
  console.log("[PUSH] VAPID details configured successfully");
} else {
  console.warn("[PUSH] Web push is disabled: VAPID keys not configured.");
  console.warn("[PUSH] PUBLIC_KEY exists:", !!publicKey);
  console.warn("[PUSH] PRIVATE_KEY exists:", !!privateKey);
}

export function getVapidPublicKey() {
  return publicKey || "";
}

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export async function sendWebPush(subscription, payload) {
  if (!isPushConfigured()) {
    console.warn("[PUSH] Web push not configured (missing VAPID keys)");
    return;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("[PUSH] Push sent successfully");
  } catch (error) {
    console.error("[PUSH] Push send failed:", error?.statusCode, error?.message);
    throw error;
  }
}
