/**
 * PT Granitoguna Building Ceramics
 * Warehouse Sparepart Locator (MVP)
 *
 * Backend: Node.js + Express
 * Fungsi:
 * - Serve file frontend (index.html, admin.html, js, css)
 * - Serve file denah (SVG)
 * - Serve database sederhana (data/db.json)
 * - API Search barang
 * - API Map + marker racks
 * - API Admin: tambah/update rack marker
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// Middleware
// ==============================
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ==============================
// Static folders
// ==============================
// Frontend folder (HTML/CSS/JS)
app.use("/", express.static(path.join(__dirname, "frontend")));

// Maps folder (SVG)
app.use("/maps", express.static(path.join(__dirname, "maps")));

// Data folder (db.json) - read only for user
app.use("/data", express.static(path.join(__dirname, "data")));

// ==============================
// Helper: load & save DB JSON
// ==============================
const DB_PATH = path.join(__dirname, "data", "db.json");

function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to read db.json:", err);
    return null;
  }
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("❌ Failed to write db.json:", err);
    return false;
  }
}

// ==============================
// API: Health check
// ==============================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    company: "PT Granitoguna Building Ceramics",
    service: "Warehouse Locator API",
    time: new Date().toISOString(),
  });
});

// ==============================
// API: Search item by name/code
// ==============================
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();

  if (!q) {
    return res.json({
      ok: true,
      results: [],
      message: "Query kosong",
    });
  }

  const db = loadDB();
  if (!db) {
    return res.status(500).json({ ok: false, message: "DB tidak bisa dibaca" });
  }

  const items = db.items || [];
  const racks = db.racks || [];

  const results = items
    .filter((it) => {
      const name = (it.name || "").toLowerCase();
      const code = (it.code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    })
    .map((it) => {
      const rack = racks.find((r) => r.id === it.rackId);
      return {
        id: it.id,
        name: it.name,
        code: it.code,
        rackId: it.rackId,
        rackCode: rack ? rack.code : "-",
        rackX: rack ? rack.x : null,
        rackY: rack ? rack.y : null,
      };
    });

  res.json({
    ok: true,
    query: q,
    total: results.length,
    results,
  });
});

// ==============================
// API: Get warehouse map info
// ==============================
app.get("/api/map", (req, res) => {
  const db = loadDB();
  if (!db) {
    return res.status(500).json({ ok: false, message: "DB tidak bisa dibaca" });
  }

  res.json({
    ok: true,
    company: db.company,
    warehouse: db.warehouse,
    mapFile: "/maps/warehouse.svg",
    racks: db.racks || [],
  });
});

// ==============================
// API: Admin add/update rack marker
// ==============================
app.post("/api/admin/rack", (req, res) => {
  /**
   * body:
   * {
   *   code: "A01",
   *   x: 120,
   *   y: 250
   * }
   */

  const code = (req.body.code || "").trim().toUpperCase();
  const x = Number(req.body.x);
  const y = Number(req.body.y);

  if (!code || Number.isNaN(x) || Number.isNaN(y)) {
    return res.status(400).json({
      ok: false,
      message: "Data tidak valid. Pastikan code, x, y ada.",
    });
  }

  const db = loadDB();
  if (!db) {
    return res.status(500).json({ ok: false, message: "DB tidak bisa dibaca" });
  }

  if (!db.racks) db.racks = [];

  // Cari rack existing berdasarkan code
  let rack = db.racks.find((r) => r.code === code);

  if (!rack) {
    // Buat baru
    rack = {
      id: `R-${code}`,
      code,
      x,
      y,
    };
    db.racks.push(rack);
  } else {
    // Update koordinat
    rack.x = x;
    rack.y = y;
  }

  const ok = saveDB(db);
  if (!ok) {
    return res.status(500).json({
      ok: false,
      message: "Gagal menyimpan DB",
    });
  }

  res.json({
    ok: true,
    message: `Rack ${code} berhasil disimpan`,
    rack,
  });
});

// ==============================
// Fallback route (default page)
// ==============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ==============================
// Start server
// ==============================
app.listen(PORT, () => {
  console.log("========================================");
  console.log("✅ PT Granitoguna Building Ceramics");
  console.log("✅ Warehouse Sparepart Locator (MVP)");
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log("========================================");
});
