import React, { useState } from "react";
import BSTextField from "../components/BSTextField";

export default function BSTextFieldExamples() {
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div style={{ padding: 20, maxWidth: 400, display: "grid", gap: 16 }}>
      <BSTextField
        label="ชื่อผู้ใช้"
        required
        value={username}
        onChange={setUsername}
      />

      <BSTextField
        label="อายุ (จำนวนเต็ม)"
        type="int"
        required
        min={1}
        max={120}
        value={age}
        onChange={setAge}
      />

      <BSTextField
        label="ราคา (ทศนิยม 2 ตำแหน่ง)"
        type="float"
        decimals={2}
        value={price}
        onChange={setPrice}
      />
    </div>
  );
}
