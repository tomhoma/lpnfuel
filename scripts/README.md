# LPNFuel Ingest Scripts

ดึงข้อมูลสถานีน้ำมันจาก Google Apps Script แล้ว POST เข้า `/api/v1/ingest` อัตโนมัติ

## ไฟล์

| ไฟล์ | คำอธิบาย |
|------|----------|
| `ingest.js` | Script หลัก — ใช้ Playwright เปิด headless Chrome ดึงข้อมูลจาก GAS แล้ว POST เข้า API |
| `ingest.sh` | Script สำหรับ ingest แบบ manual (วางข้อมูล JSON เอง) |
| `.env` | ค่า config (GAS_URL, API_URL, API_KEY) — **ไม่เข้า git** |
| `.env.example` | ตัวอย่าง .env สำหรับ setup เครื่องใหม่ |
| `ingest.log` | Log file — สร้างอัตโนมัติเมื่อรัน ingest.js — **ไม่เข้า git** |

## Setup ครั้งแรก (เครื่องใหม่)

ต้องมี **Node.js 18+** ติดตั้งอยู่

```bash
cd scripts

# สร้าง .env จาก example แล้วใส่ค่าจริง
cp .env.example .env
# แก้ไข .env — ใส่ GAS_URL, API_KEY ที่ถูกต้อง
nano .env

# ลง dependencies
npm install

# ลง Chromium สำหรับ Playwright
npx playwright install chromium

# ลง system libraries ที่ Chromium ต้องการ (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
```

## ทดสอบรันครั้งแรก

```bash
node ingest.js
```

ถ้าสำเร็จจะเห็น:
```
[22/3/2569 10:30:00] Fetching station data from GAS...
[22/3/2569 10:30:15] Got 57 stations. Sending to /ingest...
[22/3/2569 10:30:16] OK: 57 stations updated
```

## ตั้ง Cron (รันอัตโนมัติทุก 5 นาที)

```bash
# เปิด cron service
sudo service cron start

# ตั้ง cron job (แก้ path ของ node ให้ตรงกับเครื่อง — ดูได้จาก `which node`)
(crontab -l 2>/dev/null; echo '*/5 * * * * /home/tomhoma/.nvm/versions/node/v22.18.0/bin/node /home/tomhoma/dev/sideProject/lpnfuel/scripts/ingest.js') | crontab -

# เช็คว่าตั้งสำเร็จ
crontab -l
```

## เปิด WSL มาใหม่ (หลัง restart เครื่อง)

Cron service จะหยุดทุกครั้งที่ปิด WSL ต้องเปิดใหม่:

```bash
sudo service cron start
```

> **Tip:** เพิ่มบรรทัดนี้ใน `~/.zshrc` หรือ `~/.bashrc` เพื่อ auto-start:
> ```bash
> sudo service cron status > /dev/null 2>&1 || sudo service cron start
> ```
> แล้วตั้ง passwordless sudo สำหรับ cron:
> ```bash
> sudo visudo
> # เพิ่มบรรทัด:
> tomhoma ALL=(ALL) NOPASSWD: /usr/sbin/service cron *
> ```

## ตรวจสอบว่ายังทำงาน

```bash
# เช็คว่า cron service ทำงานอยู่
sudo service cron status

# เช็คว่า cron job ยังอยู่
crontab -l

# ดู log ล่าสุด
tail -20 ~/dev/sideProject/lpnfuel/scripts/ingest.log

# ดู log แบบ realtime
tail -f ~/dev/sideProject/lpnfuel/scripts/ingest.log

# ดู log เฉพาะ error
grep ERROR ~/dev/sideProject/lpnfuel/scripts/ingest.log
```

## ย้ายไปเครื่องอื่น

### สิ่งที่ต้องมี
- Linux / macOS / WSL
- Node.js 18+
- Internet access (เข้า Google + Railway ได้)

### ขั้นตอน

1. **Copy ไฟล์** — ต้องการแค่ 4 ไฟล์:
   ```
   ingest.js
   ingest.sh
   package.json
   .env.example
   ```

2. **Setup:**
   ```bash
   cp .env.example .env
   nano .env          # ใส่ค่า GAS_URL, API_URL, API_KEY ที่ถูกต้อง
   npm install
   npx playwright install chromium
   # Ubuntu/Debian:
   sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 \
     libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
     libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```

3. **ทดสอบ:**
   ```bash
   node ingest.js
   ```

4. **ตั้ง cron:** (แก้ path ของ `node` ให้ตรงกับเครื่องใหม่)
   ```bash
   # ดู path ของ node
   which node

   # ตั้ง cron
   (crontab -l 2>/dev/null; echo '*/5 * * * * <NODE_PATH> <SCRIPT_PATH>/ingest.js') | crontab -
   ```

## Environment Variables

ตั้งค่าใน `scripts/.env` (ดูตัวอย่างจาก `.env.example`):

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GAS_URL` | **(ต้องมี)** URL ของ Google Apps Script ที่ดึงข้อมูล |
| `API_URL` | **(ต้องมี)** URL ของ backend API เช่น `https://lpnfuel-production.up.railway.app/api/v1` |
| `API_KEY` | **(ต้องมี)** API key สำหรับ /ingest |
| `TIMEOUT_MS` | Timeout (ms) สำหรับรอข้อมูลจาก GAS (default: `60000`) |

สามารถ override ผ่าน command line ได้:
```bash
API_URL=http://localhost:8080/api/v1 node ingest.js
```
