# 🚪 BSDataGrid - Gateway Integration Guide

## 📋 Overview

BSDataGrid และ useDynamicCrud hook ได้ถูกอัปเดตเพื่อใช้งานผ่าน API Gateway แทนการเรียก API โดยตรง สามารถใช้งานได้เหมือนเดิมโดยไม่ต้องแก้ไขโค้ด แต่ตอนนี้จะผ่าน Gateway ที่มี JWT authentication และ rate limiting

## 🔧 Configuration

### Environment Variables

```bash
# .env
REACT_APP_API_URL=http://10.10.60.66:8080/gateway/v1/api
REACT_APP_API_LICENSE_KEY="UCC4ButGTAvA9PJHVSv6sP4sUcw8XJcf2kjc5KwMiR0="
```

### Gateway Endpoints Used

| ฟังก์ชั่น         | Gateway Endpoint                | HTTP Method | Rate Limit |
| ----------------- | ------------------------------- | ----------- | ---------- |
| Metadata          | `/dynamic/metadata/{tableName}` | GET         | No limit   |
| DataGrid (Basic)  | `/dynamic/datagrid`             | POST        | 100/sec    |
| DataGrid (BS)     | `/dynamic/bs-datagrid`          | POST        | 100/sec    |
| Create Record     | `/dynamic/create`               | POST        | 50/sec     |
| Update Record     | `/dynamic/update`               | POST        | 50/sec     |
| Delete Record     | `/dynamic/delete`               | POST        | 50/sec     |
| Bulk Create       | `/dynamic/bulk-create`          | POST        | 10/10sec   |
| Bulk Update       | `/dynamic/bulk-update`          | POST        | 10/10sec   |
| Bulk Delete       | `/dynamic/bulk-delete`          | POST        | 10/10sec   |
| ComboBox Data     | `/dynamic/combobox`             | POST        | 20/sec     |
| Execute Procedure | `/dynamic/procedure/{name}`     | POST        | 20/10sec   |
| Execute Query     | `/dynamic/query`                | POST        | 20/10sec   |

## 🚀 Usage Examples

### Basic DataGrid

```jsx
import BSDataGrid from "../components/BSDataGrid";

function CustomerList() {
  return (
    <BSDataGrid
      bsObj="t_customer"
      bsRowPerPage={25}
      showAdd={true}
      bsBulkEdit={true}
    />
  );
}
```

### Advanced DataGrid with ComboBox

```jsx
<BSDataGrid
  bsObj="t_order"
  bsCols="order_id,customer_name,status,created_date"
  bsObjBy="created_date desc"
  bsObjWh="status='active'"
  bsComboBox={[
    {
      Column: "status",
      Display: "name",
      Value: "id",
      Default: "--- Select Status ---",
      PreObj: "default",
      Obj: "t_order_status",
      ObjWh: "active=1",
      ObjBy: "name asc",
    },
  ]}
/>
```

### Using useDynamicCrud Hook Directly

```jsx
import { useDynamicCrud } from "../hooks/useDynamicCrud";

function CustomComponent() {
  const {
    metadata,
    loading,
    error,
    loadMetadata,
    getTableData,
    createRecord,
    updateRecord,
    deleteRecord,
    bulkCreate,
    getComboBoxData,
  } = useDynamicCrud("t_customer");

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleCreateRecord = async (data) => {
    try {
      const result = await createRecord(data);
      console.log("Record created:", result);
    } catch (error) {
      console.error("Failed to create:", error);
    }
  };

  const handleBulkCreate = async (dataItems) => {
    try {
      const result = await bulkCreate(dataItems);
      console.log("Bulk create completed:", result);
    } catch (error) {
      console.error("Bulk create failed:", error);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {metadata && <p>Table: {metadata.displayName}</p>}
    </div>
  );
}
```

## 🛡️ Security Features

### JWT Authentication

- ทุก API call จะมี JWT token ใน Authorization header
- Token จัดการอัตโนมัติโดย AxiosMaster
- Token refresh เมื่อ 401 error

### Rate Limiting

- Basic operations: 50-100 requests/second
- Bulk operations: 10 requests/10 seconds
- Schema operations: 50 requests/10 seconds
- Query operations: 20 requests/10 seconds

## 🔄 Migration Notes

### Changes Made

1. **useDynamicCrud.js**: แทนที่ `axios` เป็ `AxiosMaster`
2. **API Endpoints**: ใช้ Gateway endpoints แทนการเรียก API โดยตรง
3. **Error Handling**: เพิ่ม "via Gateway" ใน log messages
4. **New Features**: เพิ่ม bulk operations และ combobox support

### Backward Compatibility

- ✅ BSDataGrid ทำงานเหมือนเดิม
- ✅ Props และ callbacks ไม่เปลี่ยน
- ✅ Hook interface เหมือนเดิม
- ✅ Error handling เหมือนเดิม

### What's New

- ✅ Bulk create, update, delete operations
- ✅ ComboBox data fetcher
- ✅ JWT authentication automatic
- ✅ Rate limiting protection
- ✅ Centralized API gateway

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized**

   ```javascript
   // ตรวจสอบ JWT token ใน localStorage
   const token = localStorage.getItem("token");
   console.log("JWT Token:", token);
   ```

2. **Rate Limit Exceeded**

   ```javascript
   // Gateway จะ return 429 status เมื่อเกิน rate limit
   // รอสักครู่แล้วลองใหม่
   ```

3. **Connection Error**
   ```javascript
   // ตรวจสอบ Gateway URL ใน .env
   console.log("API URL:", process.env.REACT_APP_API_URL);
   ```

### Debug Mode

```javascript
// เปิด debug mode ใน Logger
localStorage.setItem("debug", "true");

// ดู network requests ใน browser DevTools
// Network tab → XHR → ดู request/response
```

## 📊 Performance Considerations

### Rate Limiting Strategy

- **Heavy Operations**: ใช้ bulk operations แทนการ loop
- **Data Loading**: ใช้ pagination และ filtering
- **ComboBox**: Cache ข้อมูลที่ไม่เปลี่ยนบ่อย

### Best Practices

```javascript
// ✅ Good: Bulk operations
await bulkCreate([data1, data2, data3]);

// ❌ Bad: Multiple single operations
for (let data of items) {
  await createRecord(data);
}

// ✅ Good: Filtered query
const data = await getTableData({
  tableName: "t_customer",
  page: 1,
  pageSize: 25,
  customWhere: "status='active'",
});

// ❌ Bad: Load all then filter
const allData = await getTableData({ tableName: "t_customer" });
const filteredData = allData.rows.filter((r) => r.status === "active");
```

## 🎯 Future Enhancements

### Planned Features

- [ ] Real-time updates via WebSocket
- [ ] Offline mode with caching
- [ ] Advanced filtering UI
- [ ] Export/Import functionality
- [ ] Audit logging
- [ ] Multi-tenant support

### Performance Improvements

- [ ] Response caching
- [ ] Request batching
- [ ] Lazy loading
- [ ] Virtual scrolling
- [ ] Progressive loading

---

## 📞 Support

### Documentation

- [Gateway Configuration](../BS-API-Secure/ApiGateway/GATEWAY-CONFIGURATION.md)
- [Gateway Examples](../BS-API-Secure/ApiGateway/GATEWAY-EXAMPLES.md)
- [API Documentation](../BS-API-Core/ApiCore/docs/API_DOCUMENTATION.md)

### Contact

- **Team**: BS Platform Development Team
- **Email**: support@bs-platform.com
- **Slack**: #bs-platform-support
