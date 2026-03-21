# ⛽ LPNFuel — เช็คน้ำมันลำพูน

Mobile-first web app สำหรับเช็คสถานะน้ำมันปั๊มทั้งจังหวัดลำพูนแบบ real-time

**🔗 Live:** [lpnfuel.pages.dev](https://lpnfuel.pages.dev)

---

## ปัญหาที่แก้

ช่วงน้ำมันขาดแคลน คนลำพูนต้องขับวนหาปั๊มที่มีน้ำมัน ไม่รู้ว่าปั๊มไหนมี ปั๊มไหนหมด LPNFuel รวมข้อมูลสถานะน้ำมัน 57 ปั๊มทั้งจังหวัดไว้ในแอปเดียว อัปเดตทุก 3 นาที ดูง่ายบนมือถือ

## Features

- 🗺️ **แผนที่ปั๊มทั้งจังหวัด** — Leaflet + OpenStreetMap จุดเขียว=มี จุดแดง=หมด
- 🔍 **กรองตามชนิดน้ำมัน** — ดีเซล, แก๊สโซฮอล์ 91, เบนซิน 95, E20
- 📍 **หาปั๊มใกล้ฉัน** — ใช้ GPS เรียงตามระยะทาง
- 🚚 **สถานะการจัดส่ง** — รู้ว่าปั๊มไหนน้ำมันกำลังมา
- 📊 **Dashboard วิเคราะห์** — สรุปภาพรวม, อำเภอไหนวิกฤต, แนวโน้ม 7 วัน
- 💰 **ราคาน้ำมันวันนี้** — ดึงอัตโนมัติจาก thai-oil-api
- 🧭 **นำทาง** — กดปุ่มเปิด Google Maps นำทางไปปั๊มได้เลย

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Map | Leaflet + OpenStreetMap |
| Backend | Go |
| Database | PostgreSQL (Neon.tech) |
| Hosting FE | Cloudflare Pages |
| Hosting BE | Railway |

**ฟรีทั้งหมด ไม่ต้องบัตร credit**

## Architecture

```
[Google Sheet] ← อาสาสมัครอัปเดตสถานะน้ำมัน
      ↓ Google Apps Script (GAS)
[Go Worker] ← cron ทุก 3 นาที (07:00-22:00)
      ↓
[PostgreSQL] ← Neon.tech (free tier)
      ↑
[React SPA] ← Cloudflare Pages → user เปิดบนมือถือ
```

## แหล่งข้อมูล

ข้อมูลสถานะน้ำมันมาจาก Google Sheet ที่มีอาสาสมัครในจังหวัดลำพูนคอยอัปเดต เผยแพร่ผ่าน Google Apps Script endpoint สาธารณะ ระบบดึงข้อมูลมาเก็บใน DB เพื่อแสดงผลบนแผนที่และวิเคราะห์แนวโน้ม

---

## 🚀 อยากทำให้จังหวัดตัวเอง?

Repo นี้ออกแบบมาให้ Fork ไปปรับใช้กับจังหวัดอื่นได้ง่าย

### สิ่งที่ต้องมี

1. **แหล่งข้อมูลสถานะน้ำมัน** — Google Sheet + GAS endpoint หรือ API อะไรก็ได้ที่ return JSON
2. **พิกัดปั๊มน้ำมัน** — lat/lng ของแต่ละปั๊มในจังหวัด (ค้นจาก Google Maps)

### ขั้นตอน

```bash
# 1. Fork repo
git clone https://github.com/YOUR_USER/lpnfuel.git
cd lpnfuel
```

**2. แก้ไขไฟล์ที่ต้องปรับ:**

| ไฟล์ | แก้อะไร |
|---|---|
| `.env` | เปลี่ยน `GAS_URL` เป็น endpoint ของจังหวัดคุณ, ใส่ `DATABASE_URL` ของคุณ |
| `data/stations_geo.csv` | ใส่ lat/lng ของปั๊มในจังหวัดคุณ |
| `backend/fetcher/gas.go` | ปรับ JSON parser ถ้า schema ข้อมูลต่างจากลำพูน |
| `frontend/src/App.tsx` | เปลี่ยนชื่อจังหวัด, พิกัดกลางแผนที่ |

**3. ข้อมูลที่ต้องปรับใน code:**

```
ชื่อแอป:         LPNFuel → ชื่อจังหวัดคุณ
พิกัดกลางแผนที่:  [18.35, 98.92] → พิกัดกลางจังหวัดคุณ
Zoom level:      10 → ปรับตามขนาดจังหวัด
รายชื่ออำเภอ:    เมืองลำพูน, ป่าซาง, ... → อำเภอของจังหวัดคุณ
```

**4. สมัคร services ฟรี (ไม่ต้องบัตร):**
- [Neon.tech](https://neon.tech) — PostgreSQL
- [Railway](https://railway.app) — Backend hosting
- [Cloudflare Pages](https://pages.cloudflare.com) — Frontend hosting

**5. Deploy ตามขั้นตอนใน `LPNFUEL-HUMAN-CHECKLIST.md`**

### ตัวอย่างชื่อสำหรับจังหวัดอื่น

| จังหวัด | ชื่อแนะนำ | Domain |
|---|---|---|
| เชียงใหม่ | CMFuel | cmfuel.pages.dev |
| เชียงราย | CRFuel | crfuel.pages.dev |
| ลำปาง | LPGFuel | lpgfuel.pages.dev |
| แพร่ | PRFuel | prfuel.pages.dev |

---

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL (หรือ Neon.tech connection string)

### Setup

```bash
# Backend
cd backend
cp ../.env .env
go mod download
go run main.go

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Project Structure

```
lpnfuel/
├── LPNFUEL-SPEC.md              # Full project specification
├── LPNFUEL-HUMAN-CHECKLIST.md   # Setup checklist for humans
├── backend/                      # Go API + cron worker
│   ├── main.go
│   ├── Dockerfile
│   ├── api/                      # HTTP handlers
│   ├── fetcher/                  # GAS + price data fetcher
│   ├── db/                       # PostgreSQL queries + migrations
│   └── geo/                      # Distance calculation
├── frontend/                     # React + Vite SPA
│   ├── src/
│   │   ├── pages/                # MapPage, DashboardPage
│   │   ├── components/           # MapView, BottomSheet, FilterBar, ...
│   │   └── hooks/                # useStations, useGeolocation, ...
│   └── public/
└── data/
    └── stations_geo.csv          # Station coordinates (manual)
```

## License

MIT — ใช้ได้เลย ดัดแปลงได้เลย ไม่ต้องขออนุญาต

## Credits

- ข้อมูลสถานะน้ำมัน: อาสาสมัครจังหวัดลำพูน
- แผนที่: [OpenStreetMap](https://www.openstreetmap.org/) contributors
- ราคาน้ำมัน: [thai-oil-api](https://github.com/max180643/thai-oil-api)
