export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Browser ไม่รองรับ Notification");
    return;
  }

  const permission = await Notification.requestPermission();

  console.log("NOTI permission:", permission);

  return permission;
};
