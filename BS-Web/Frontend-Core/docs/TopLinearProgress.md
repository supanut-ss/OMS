
# TopLinearProgress Component

Component แสดง **LinearProgress bar** บนสุดของหน้า เหมาะสำหรับแสดงสถานะโหลด  
ตัว LinearProgress จะอยู่ใต้ AppBar และอยู่เหนือเนื้อหา

---

## Example

```jsx
import TopLinearProgress from "./TopLinearProgress";
import { useState } from "react";

function DemoTopProgress() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <button onClick={() => setLoading(true)}>Start Loading</button>
      <button onClick={() => setLoading(false)}>Stop Loading</button>
      <TopLinearProgress open={loading} />
    </>
  );
}
```

---

## Props

| Prop   | Type    | Default | Description |
|--------|--------|---------|-------------|
| `open` | boolean | -       | กำหนดว่า LinearProgress จะแสดงหรือไม่ |

---

## Behavior

- ใช้ `@mui/material/LinearProgress`  
- แสดงอยู่ **ใต้ AppBar** (`top: theme.mixins.toolbar.minHeight`)  
- อยู่ **เหนือเนื้อหา** (`zIndex: theme.zIndex.appBar`)  
- ถ้า `open` เป็น `false` จะไม่ render  
