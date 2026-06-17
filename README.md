# SnapLoad 🎬
**Universal Video Downloader — Full Stack**

## Quick Setup (5 minutes)

### 1. Install yt-dlp
```bash
# Mac / Linux
pip install yt-dlp

# Windows
winget install yt-dlp
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Start the server
```bash
node server.js
# or for auto-reload:
npx nodemon server.js
```

### 4. Open browser
```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server + yt-dlp status |
| GET | `/api/info?url=...` | Get video info + available formats |
| GET | `/api/download?url=...&format_id=...` | Stream video download |

### Example — Get video info:
```
GET /api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
```json
{
  "success": true,
  "platform": "YouTube",
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://...",
  "duration": 213,
  "uploader": "Rick Astley",
  "formats": [
    { "format_id": "137", "ext": "mp4", "resolution": "1080p", "filesize": 45000000 },
    { "format_id": "140", "ext": "m4a", "resolution": "audio", "vcodec": "none" }
  ]
}
```

---

## Project Structure
```
snapload/
├── server.js          ← Express API server
├── package.json
├── public/
│   └── index.html     ← Frontend (served by Express)
└── README.md
```

## Supported Platforms
YouTube · Instagram · TikTok · Facebook · Twitter/X · Pinterest · Snapchat · Threads

---
*For educational and personal use only.*
