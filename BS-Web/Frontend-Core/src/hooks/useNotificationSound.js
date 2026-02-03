import { useEffect, useRef } from "react";
import Config from "../utils/Config";

export default function useNotificationSound(trigger) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(Config.BASE_URL+"/sounds/notification.mp3");
      audioRef.current.volume = 0.6;
    }

    if (trigger) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [trigger]);
}