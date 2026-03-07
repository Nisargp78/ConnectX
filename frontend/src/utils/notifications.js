let notificationAudio;

function playFallbackBeep() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return;
  }

  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch (error) {
      return Notification.permission;
    }
  }

  return Notification.permission;
}

export function isTabFocused() {
  if (typeof document === "undefined") {
    return true;
  }

  return !document.hidden && document.hasFocus();
}

function initializeNotificationSound() {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return;
  }

  if (!notificationAudio) {
    notificationAudio = new Audio("/notification.mp3");
    notificationAudio.preload = "auto";
    notificationAudio.volume = 0.75;
  }
}

export function playNotificationSound() {
  initializeNotificationSound();

  if (!notificationAudio) {
    return;
  }

  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => {
    // Autoplay can be blocked by the browser until user interaction.
    playFallbackBeep();
  });
}

export function showChatNotification(senderName, message) {
  const preview = message?.trim?.() || "New message";
  playNotificationSound();

  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(senderName || "New message", {
    body: preview,
    icon: "/CX.png",
    badge: "/CX.png",
    tag: `chat-${senderName || "message"}`,
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
