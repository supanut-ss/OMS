import React, { useEffect, useState } from "react";
import signalrService from "../services/signalrService";

const Notification = ({ userId }) => {
  const [allNoti, setAllNoti] = useState([]);
  const [userNoti, setUserNoti] = useState([]);

  useEffect(() => {
    const init = async () => {
      await signalrService.start(userId);

      signalrService.onAll((message) => {
        setAllNoti((prev) => [...prev, message]);
      });

      signalrService.onUser((message) => {
        setUserNoti((prev) => [...prev, message]);
      });
    };

    init();
  }, [userId]);

  return (
    <div className="p-4">
      <h3 className="font-bold text-lg">All Users</h3>
      {allNoti.map((m, i) => (
        <div key={i} className="border p-2 my-1">{m}</div>
      ))}

      <h3 className="font-bold text-lg mt-4">For You</h3>
      {userNoti.map((m, i) => (
        <div key={i} className="border p-2 my-1 bg-yellow-50">{m}</div>
      ))}
    </div>
  );
};

export default Notification;
