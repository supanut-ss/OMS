import React, { useState } from "react";
import BSDatepicker from "../components/BSDatepicker";

export default function BSDatepickerExamples() {
  const [date, setDate] = useState(null);
  const [birthDate, setBirthDate] = useState(null);

  return (
    <div style={{ padding: 20, maxWidth: 400, display: "grid", gap: 16 }}>
      <BSDatepicker
        label="วันที่เริ่มต้น"
        required
        value={date}
        onChange={setDate}
      />

      <BSDatepicker
        label="วันเกิด"
        value={birthDate}
        onChange={setBirthDate}
        disableFuture
        helperText="เลือกได้เฉพาะวันในอดีต"
      />
    </div>
  );
}
