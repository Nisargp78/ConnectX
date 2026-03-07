import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:admin@connectx.local";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
} else {
  console.warn("Web push is disabled: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing.");
}

export function getVapidPublicKey() {
  return publicKey || "";
}

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export async function sendWebPush(subscription, payload) {
  if (!isPushConfigured()) return;

  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
