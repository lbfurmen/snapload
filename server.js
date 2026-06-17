// ─────────────────────────────────────────
//  SnapLoad — Backend Server
//  Run: node server.js
//  Requires: npm install
// ─────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { exec } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves frontend

// ────────────────────────────────────────
//  Helper: detect platform from URL
// ────────────────────────────────────────
function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url))   return 'YouTube';
  if (/instagram\.com/.test(url))           return 'Instagram';
  if (/tiktok\.com/.test(url))              return 'TikTok';
  if (/facebook\.com|fb\.watch/.test(url))  return 'Facebook';
  if (/twitter\.com|x\.com/.test(url))      return 'Twitter/X';
  if (/pinterest\.com/.test(url))           return 'Pinterest';
  if (/snapchat\.com/.test(url))            return 'Snapchat';
  if (/threads\.net/.test(url))             return 'Threads';
  return 'Unknown';
}

// ────────────────────────────────────────
//  Helper: run yt-dlp and return JSON info
// ────────────────────────────────────────
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    // yt-dlp -J returns full JSON metadata without downloading
    const cmd = `yt-dlp -J --no-playlist "${url}"`;
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch (e) {
        reject(new Error('Failed to parse video info'));
      }
    });
  });
}

// ────────────────────────────────────────
//  Route: GET /api/info?url=...
//  Returns video metadata + available formats
// ────────────────────────────────────────
app.get('/api/info', async (req, res) => {
  const { url } = req.query;

  // Validate
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const platform = detectPlatform(url);
  if (platform === 'Unknown') {
    return res.status(400).json({ error: 'Platform not supported' });
  }

  try {
    const info = await getVideoInfo(url);

    // Extract formats into clean list
    const formats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' || f.acodec !== 'none') // skip empty
      .map(f => ({
        format_id:  f.format_id,
        ext:        f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : 'audio'),
        filesize:   f.filesize || f.filesize_approx || null,
        vcodec:     f.vcodec,
        acodec:     f.acodec,
        fps:        f.fps || null,
        tbr:        f.tbr || null,  // total bitrate
      }))
      // sort best quality first
      .sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

    // Separate video+audio formats and audio-only
    const videoFormats = formats.filter(f => f.vcodec !== 'none').slice(0, 6);
    const audioFormats = formats.filter(f => f.vcodec === 'none').slice(0, 2);

    return res.json({
      success:    true,
      platform,
      title:      info.title      || 'Untitled',
      thumbnail:  info.thumbnail  || null,
      duration:   info.duration   || null,   // seconds
      uploader:   info.uploader   || null,
      view_count: info.view_count || null,
      formats:    [...videoFormats, ...audioFormats],
    });

  } catch (err) {
    console.error('[/api/info] Error:', err.message);
    return res.status(500).json({
      error: 'Could not fetch video info. Make sure yt-dlp is installed.',
      detail: err.message,
    });
  }
});

// ────────────────────────────────────────
//  Route: GET /api/download?url=...&format_id=...
//  Streams the video directly to the client
// ────────────────────────────────────────
app.get('/api/download', (req, res) => {
  const { url, format_id, filename } = req.query;

  if (!url || !format_id) {
    return res.status(400).json({ error: 'url and format_id are required' });
  }

  const safeFilename = (filename || 'video').replace(/[^a-z0-9_\-\.]/gi, '_');
  const ext = format_id.includes('audio') ? 'mp3' : 'mp4';

  // Set headers so browser triggers download
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.${ext}"`);
  res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  // Stream yt-dlp output directly to response
  const cmd = `yt-dlp -f "${format_id}" -o - "${url}"`;
  const child = exec(cmd, { maxBuffer: 1024 * 1024 * 500 }); // 500MB buffer

  child.stdout.pipe(res);

  child.stderr.on('data', data => {
    console.error('[yt-dlp stderr]', data.toString());
  });

  child.on('error', err => {
    console.error('[/api/download] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // If client disconnects, kill the process
  req.on('close', () => {
    child.kill();
  });
});

// ────────────────────────────────────────
//  Route: GET /api/health
//  Quick check that server + yt-dlp work
// ────────────────────────────────────────
app.get('/api/health', (req, res) => {
  exec('yt-dlp --version', (error, stdout) => {
    res.json({
      server:  'running',
      yt_dlp:  error ? 'NOT FOUND — run: pip install yt-dlp' : stdout.trim(),
      node:    process.version,
    });
  });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n✅ SnapLoad server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
