## วิธีการเชื่อมต่อ port 40 ในเครื่อง (ทำการเปิด port 40 ไว้แล้ว)
1.พิมพ์คำสั้ง ด้านล่างนี้ใน Command Prompt หรือ PowerShell เพื่อเชื่อมต่อไปยังเครื่องที่มี IP

net use \\10.10.60.40\BS-OMS-Keys /user:WM3SERVER\oms_key_client *

2.ใส่รหัสผ่านของผู้ใช้ที่คุณได้ตั้งค่าไว้สำหรับการเข้าถึงเครื่องนั้น
3.พิมพ์คำสั่ง ด้านล่างนี้เพื่อทดสอบการเชื่อมต่อหากสำเร็จจะได้ผลลัพธ์เป็น True

Test-Path '\\10.10.60.40\BS-OMS-Keys' 

## -------------------------------------------------------------------------------------------##

## วิธีตั้งค่าเครื่องใหม่สำหรับเชื่อมต่อ OMS Data Protection Keys ผ่าน Network Share

เอกสารนี้ใช้สำหรับกรณีที่ OMS API ต้องอ่าน/เขียน Data Protection Keys จากเครื่อง File Server ผ่าน UNC Path เช่น `BS-OMS-Keys`

> ให้เปลี่ยนค่าที่อยู่ใน `<...>` ให้ตรงกับ Server จริงก่อนรันคำสั่ง

## 1. ตรวจสอบชื่อเครื่อง File Server

ให้ทำบนเครื่องที่เก็บ Folder `BS-OMS-Keys` โดยเปิด PowerShell แบบ Run as Administrator:

```powershell
hostname

Get-CimInstance Win32_ComputerSystem |
    Select-Object Name, Domain, PartOfDomain
```

จดค่าต่อไปนี้ไว้:

```text
FILE_SERVER_NAME = ชื่อในช่อง Name
FILE_SERVER_IP   = IP ของเครื่อง File Server
```

ตัวอย่าง:

```text
FILE_SERVER_NAME = WIN-1SAPJC5TSJJ
FILE_SERVER_IP   = 10.10.60.40
Domain           = WORKGROUP
PartOfDomain     = False
```

ถ้าเป็น `WORKGROUP` ให้ใช้ Local User ของเครื่อง File Server และใช้รูปแบบ User ดังนี้:

```text
<FILE_SERVER_NAME>\oms_key_client
```

ตรวจสอบชื่อเครื่องจากเครื่อง OMS ได้ด้วย:

```powershell
ping -a <FILE_SERVER_IP>
nbtstat -A <FILE_SERVER_IP>
```

## 2. ตรวจสอบหรือสร้าง Folder สำหรับ Keys

ตรวจสอบว่า Folder มีอยู่จริงบน File Server หรือไม่ โดยเปลี่ยน Path ให้ตรงกับเครื่องจริง ตัวอย่าง path D:\BS-OMS-Keys :

```powershell
$keysPath = "D:\BS-OMS-Keys"
Test-Path $keysPath
```

ถ้าเป็น Server ใหม่และยังไม่มี Folder จึงค่อยสร้าง:

```powershell
New-Item -ItemType Directory -Path $keysPath -Force
```

ถ้ามี Folder เดิมอยู่แล้ว ให้ใช้ Folder เดิม ห้ามสร้าง Folder ใหม่ทับหรือเปลี่ยน Path โดยไม่ตรวจสอบก่อน

## 3. สร้าง Local User บน File Server

กรณี File Server เป็น `WORKGROUP` ให้สร้าง User บนเครื่อง File Server เท่านั้น:

```powershell
$password = Read-Host "Password for oms_key_client" -AsSecureString

New-LocalUser `
  -Name "oms_key_client" `
  -Password $password `
  -FullName "OMS Key Client" `
  -Description "Account for OMS Data Protection Keys"
```

ตรวจสอบ User:

```powershell
Get-LocalUser -Name "oms_key_client"
```

ไม่ควรใส่ Password ไว้ในเอกสารหรือ Source Code หากองค์กรมีนโยบายให้ Password ไม่หมดอายุ ให้ตั้งค่าตามนโยบายความปลอดภัยขององค์กรเท่านั้น

## 4. ตรวจสอบหรือสร้าง Network Share

ตรวจสอบ Share ที่มีอยู่ โดยไม่ต้อง `cd` ไปยัง Folder:

```powershell
Get-SmbShare |
    Select-Object Name, Path, Description
```

ตรวจสอบ Share เฉพาะรายการ:

```powershell
Get-SmbShare -Name "BS-OMS-Keys"
```

ถ้าพบ Share แล้ว ให้ตรวจสอบว่า `Path` ชี้ไปยัง `$keysPath` ที่ถูกต้อง

ถ้าไม่พบ Share ให้สร้าง โดยเปลี่ยน Path ให้ตรงกับ Folder จริง:

```powershell
$serverName = (Get-CimInstance Win32_ComputerSystem).Name
$keysPath = "D:\BS-OMS-Keys"
$account = "$serverName\oms_key_client"

New-SmbShare `
  -Name "BS-OMS-Keys" `
  -Path $keysPath `
  -ChangeAccess $account
```

ถ้า Share มีอยู่แล้วแต่ User ยังไม่มีสิทธิ์:

```powershell
$serverName = (Get-CimInstance Win32_ComputerSystem).Name
$account = "$serverName\oms_key_client"

Grant-SmbShareAccess `
  -Name "BS-OMS-Keys" `
  -AccountName $account `
  -AccessRight Change `
  -Force
```

## 5. ตั้งค่า NTFS Permission ให้ Folder

ให้สิทธิ์ `Modify` กับ User ที่สร้างไว้:

```powershell
$serverName = (Get-CimInstance Win32_ComputerSystem).Name
$keysPath = "D:\BS-OMS-Keys"
$account = "$serverName\oms_key_client"

icacls $keysPath /grant "${account}:(OI)(CI)M"
```

ตรวจสอบสิทธิ์:

```powershell
Get-SmbShareAccess -Name "BS-OMS-Keys"
Get-Acl $keysPath
```

OMS ต้องมีสิทธิ์ทั้ง 2 ระดับ:

- Share Permission
- NTFS Permission

## 6. เชื่อมต่อจากเครื่อง OMS

ให้ทำบนเครื่องที่รัน OMS API โดยใช้ชื่อเครื่อง File Server เป็นหลัก:

```powershell
$serverName = "<FILE_SERVER_NAME>"
$sharePath = "\\$serverName\BS-OMS-Keys"

net use $sharePath /user:"$serverName\oms_key_client" * /persistent:yes
```

ใส่ Password ของ `oms_key_client` เมื่อระบบถาม

ถ้าใช้ชื่อเครื่องไม่ได้ ให้ใช้ IP ใน Network Path แต่ยังต้องใช้ชื่อ File Server เป็น Prefix ของ User:

```powershell
net use \\<FILE_SERVER_IP>\BS-OMS-Keys /user:<FILE_SERVER_NAME>\oms_key_client * /persistent:yes
```

ตรวจสอบการเชื่อมต่อ:

```powershell
net use
Test-Path "\\<FILE_SERVER_NAME>\BS-OMS-Keys"
Get-ChildItem "\\<FILE_SERVER_NAME>\BS-OMS-Keys"
```

ถ้า `Test-Path` ได้ `True` แสดงว่าสามารถเข้าถึง Share ได้

## 7. ตั้งค่า OMS Data Protection Keys Path

ตั้งค่าเป็น UNC Path โดยตรง ห้ามใช้ Drive Letter เช่น `Z:`:

```text
OMS_DATA_PROTECTION_KEYS_PATH=\\<FILE_SERVER_NAME>\BS-OMS-Keys
```

ตัวอย่าง:

```text
OMS_DATA_PROTECTION_KEYS_PATH=\\WIN-1SAPJC5TSJJ\BS-OMS-Keys
```

ถ้าจำเป็นต้องใช้ IP:

```text
OMS_DATA_PROTECTION_KEYS_PATH=\\10.10.60.40\BS-OMS-Keys
```

หลังแก้ค่าแล้วให้ Restart OMS Service หรือ IIS Application Pool

## 8. ข้อควรระวังเรื่อง IIS และ Windows Service

คำสั่ง `net use` ที่รันโดย User `Administrator` อาจใช้ได้เฉพาะ Session ของ Administrator และอาจไม่ถูกมองเห็นโดย IIS Application Pool หรือ Windows Service

ก่อนใช้งานจริงต้องตรวจสอบว่า Account ที่รัน OMS API สามารถเข้าถึง Share ได้ด้วย โดย Account นั้นต้องมีทั้ง Share Permission และ NTFS Permission

ไม่แนะนำให้ใช้การ Map Drive เพราะ Windows Service หรือ IIS Application Pool อาจมองไม่เห็น Drive Mapping ของ User ที่ Login อยู่ ควรใช้ UNC Path โดยตรง

## 9. การลบ Connection เดิม

ถ้ามี Credential หรือ Connection เดิมค้างอยู่ ให้ลบเฉพาะ Share นี้ก่อนเชื่อมต่อใหม่:

```powershell
net use \\<FILE_SERVER_NAME>\BS-OMS-Keys /delete
```

จากนั้นรันคำสั่งในหัวข้อที่ 6 ใหม่

## 10. แนวทางตรวจสอบ Error 86

ถ้าได้ข้อความ `System error 86 has occurred` ให้ตรวจสอบตามลำดับ:

1. User `oms_key_client` มีอยู่บน File Server จริงหรือไม่
2. Password ถูกต้องหรือไม่
3. ใช้ User Prefix เป็นชื่อ File Server หรือไม่ เช่น `WIN-1SAPJC5TSJJ\oms_key_client`
4. Share ชื่อ `BS-OMS-Keys` มีอยู่จริงหรือไม่
5. User มีทั้ง Share Permission และ NTFS Permission หรือไม่
6. มี Connection เดิมค้างอยู่หรือไม่

ตรวจสอบ User และ Share บน File Server:

```powershell
Get-LocalUser -Name "oms_key_client"
Get-SmbShare -Name "BS-OMS-Keys"
Get-SmbShareAccess -Name "BS-OMS-Keys"
```
