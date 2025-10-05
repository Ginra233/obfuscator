// === SERVER.JS (VPS-only, ready to run on 142.93.236.175) ===
"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const multer = require("multer");
const { Server } = require("socket.io");
const JsConfuser = require("js-confuser");
const chalk = require("chalk");
const os = require("os");
const { execSync } = require("child_process");

// -------- CONFIG (edit if needed) --------
const VPS_IP = process.env.VPS_IP || "142.93.236.175";
const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || VPS_IP;
const UPLOAD_RETENTION_DAYS = parseInt(process.env.CLEANUP_DAYS, 10) || 7;
const UPLOAD_SIZE_LIMIT = process.env.UPLOAD_SIZE_LIMIT || "5mb"; // max upload size

// -------- app init --------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------- dirs --------
const ROOT = path.resolve(__dirname);
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const OUTPUT_DIR = path.join(ROOT, "output");
fs.ensureDirSync(PUBLIC_DIR);
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(OUTPUT_DIR);

// -------- logger --------
function log(...args) { console.log(chalk.blue.bold("[WEB-OBF]"), ...args); }
function errLog(...args) { console.error(chalk.red.bold("[WEB-OBF]"), ...args); }

// -------- middlewares --------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// -------- multer (upload) --------
function parseSizeToBytes(size) {
  if (!size) return 5 * 1024 * 1024;
  const s = String(size).toLowerCase().trim();
  const m = s.match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!m) return 5 * 1024 * 1024;
  const v = parseFloat(m[1]); const u = m[2] || "b";
  if (u === "gb") return Math.round(v * 1024 * 1024 * 1024);
  if (u === "mb") return Math.round(v * 1024 * 1024);
  if (u === "kb") return Math.round(v * 1024);
  return Math.round(v);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const base = path.basename(file.originalname || "file");
    const safe = base.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-\.]/g, "");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseSizeToBytes(UPLOAD_SIZE_LIMIT) }
});

// -------- routes --------
app.get("/", (req, res) => {
  const idx = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(idx)) return res.sendFile(idx);
  res.send("<h3>Web Obfuscator</h3><p>Put a public/index.html to use the UI.</p>");
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No file uploaded" });
  return res.json({ ok: true, filename: req.file.filename });
});

app.get("/download/:name", (req, res) => {
  const p = path.join(OUTPUT_DIR, req.params.name);
  if (!fs.existsSync(p)) return res.status(404).send("File not found");
  return res.download(p);
});

app.get("/metrics", (req, res) => {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const ramPercent = Math.round((used / total) * 100);
    const load = (os.loadavg()[0] || 0).toFixed(2);
    const uptimeMin = Math.floor(os.uptime() / 60);
    let diskPercent = null;
    try {
      const out = execSync("df -h --output=pcent / | tail -1 || true").toString().trim();
      const m = out.match(/(\d+)%/);
      if (m) diskPercent = parseInt(m[1], 10);
    } catch (e) { diskPercent = null; }
    return res.json({ cpuLoad: load, ramPercent, uptimeMin, diskPercent, loadAvg: load });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// -------- obfuscation configs (trimmed versions; replace with your full functions if needed) --------
function getUltraSafeConfig() {
  return {
    target: "node",
    calculator: true,
    compact: true,
    hexadecimalNumbers: true,
    controlFlowFlattening: 1,
    deadCode: 1,
    dispatcher: true,
    duplicateLiteralsRemoval: 1,
    flatten: true,
    globalConcealing: true,
    identifierGenerator: "zeroWidth",
    renameVariables: true,
    renameGlobals: true,
    minify: true,
    movedDeclarations: true,
    objectExtraction: true,
    opaquePredicates: 0.75,
    stringConcealing: true,
    stringCompression: true,
    stringEncoding: true,
    stringSplitting: 0.75,
    rgf: false
  };
}

function getNebulaObfuscationConfig() {
  const generateNebulaName = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const prefix = "NX";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}${randomPart}`;
  };

  return {
    target: "node",
    compact: true,
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: generateNebulaName,
    stringCompression: true,
    stringConcealing: false,
    stringEncoding: true,
    stringSplitting: false,
    controlFlowFlattening: 1,
    flatten: true,
    shuffle: true,
    rgf: true,
    deadCode: true,
    opaquePredicates: true,
    dispatcher: true,
    globalConcealing: true,
    objectExtraction: true,
    duplicateLiteralsRemoval: true,
    lock: {
      selfDefending: true,
      antiDebug: true,
      integrity: true,
      tamperProtection: true,
    },
  };
}

function getNovaObfuscationConfig() {
  const generateNovaName = () => {
    return "var_" + Math.random().toString(36).substring(7);
  };
  return {
    target: "node",
    calculator: false,
    compact: true,
    controlFlowFlattening: 1,
    deadCode: 1,
    dispatcher: true,
    duplicateLiteralsRemoval: 1,
    flatten: true,
    globalConcealing: true,
    hexadecimalNumbers: 1,
    identifierGenerator: generateNovaName,
    lock: {
      antiDebug: true,
      integrity: true,
      selfDefending: true,
    },
    minify: true,
    movedDeclarations: true,
    objectExtraction: true,
    opaquePredicates: true,
    renameGlobals: true,
    renameVariables: true,
    shuffle: true,
    stack: true,
    stringCompression: true,
    stringConcealing: true,
  };
}

function getArabObfuscationConfig() {
  const arabicChars = [
    "أ","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ",
    "ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي",
  ];

  const generateArabicName = () => {
    const length = Math.floor(Math.random() * 4) + 3;
    let name = "";
    for (let i = 0; i < length; i++) {
      name += arabicChars[Math.floor(Math.random() * arabicChars.length)];
    }
    return name;
  };

  return {
    target: "node",
    compact: true,
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: () => generateArabicName(),
    stringEncoding: true,
    stringSplitting: true,
    controlFlowFlattening: 1,
    shuffle: true,
    duplicateLiteralsRemoval: true,
    deadCode: true,
    calculator: true,
    opaquePredicates: true,
    lock: {
      selfDefending: true,
      antiDebug: true,
      integrity: true,
      tamperProtection: true,
    },
  };
}

function getJapanxArabObfuscationConfig() {
  const japaneseXArabChars = [
    "あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ",
    "た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ",
    "ま","み","む","め","も","や","ゆ","よ","أ","ب","ت","ث","ج","ح","خ","د","ذ",
    "ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي",
    "ら","り","る","れ","ろ","わ","を","ん",
  ];
  const generateJapaneseXArabName = () => {
    const length = Math.floor(Math.random() * 4) + 3;
    let name = "";
    for (let i = 0; i < length; i++) {
      name += japaneseXArabChars[Math.floor(Math.random() * japaneseXArabChars.length)];
    }
    return name;
  };
  return {
    target: "node",
    compact: true,
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: () => generateJapaneseXArabName(),
    stringCompression: true,
    stringConcealing: true,
    stringEncoding: true,
    stringSplitting: true,
    controlFlowFlattening: 1,
    flatten: true,
    shuffle: true,
    rgf: false,
    dispatcher: true,
    duplicateLiteralsRemoval: true,
    deadCode: true,
    calculator: true,
    opaquePredicates: true,
    lock: {
      selfDefending: true,
      antiDebug: true,
      integrity: true,
      tamperProtection: true,
    },
  };
}

function getJapanObfuscationConfig() {
  const japaneseChars = [
    "あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ",
    "た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ",
    "ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん",
  ];
  const generateJapaneseName = () => {
    const length = Math.floor(Math.random() * 4) + 3;
    let name = "";
    for (let i = 0; i < length; i++) {
      name += japaneseChars[Math.floor(Math.random() * japaneseChars.length)];
    }
    return name;
  };

  return {
    target: "node",
    compact: true,
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: () => generateJapaneseName(),
    stringEncoding: true,
    stringSplitting: true,
    controlFlowFlattening: 1,
    flatten: true,
    shuffle: true,
    duplicateLiteralsRemoval: true,
    deadCode: true,
    calculator: true,
    opaquePredicates: true,
    lock: {
      selfDefending: true,
      antiDebug: true,
      integrity: true,
      tamperProtection: true,
    },
  };
}
const TByypas = `(async () => {
  const fs = require("fs");
  const path = require("path");
  const C = require("chalk");
  const A = require("axios");
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  let mainFile;
  if (pkg.main) {
    mainFile = path.resolve(process.cwd(), pkg.main);
  } else if (pkg.scripts && pkg.scripts.start) {
    const parts = pkg.scripts.start.split(" ");
    mainFile = path.resolve(process.cwd(), parts[parts.length - 1]);
  } else {
    mainFile = process.argv[1];
  }
  const snapshot = fs.readFileSync(mainFile, "utf8");
  setInterval(() => {
    const now = fs.readFileSync(mainFile, "utf8");
    if (snapshot !== now) {
      console.log(C.redBright("[ ⚠️ ] File sedang dirombak!"));
      process.abort();
    }
  }, 2000);
  if (A.interceptors && A.interceptors.request.handlers.length > 0) {
    console.log(C.redBright("[ ⚠️ ] Axios interceptor detected!"));
    process.abort();
  }
  Object.freeze(A);
  Object.seal(A);
})();`;

function createPasswordTemplate(encodedPassword, originalCode) {
  return `${TByypas}
(async () => {
const readline = require('readline');
const chalk = require('chalk');
const passwordBuffer = Buffer.from('${encodedPassword}', 'base64');
const correctPassword = passwordBuffer.toString('utf8');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
console.clear();
console.log(chalk.bold.red("🔑 MASUKKAN PASSWORD:"));
rl.question('> ', (inputPassword) => {
  if (inputPassword !== correctPassword) {
    console.log(chalk.bold.red("❌ PASSWORD SALAH"));
    process.exit(1);
  }
${originalCode}
  rl.close();
});
})();`;
}

// helpers to obfuscate & write
async function obfuscateAndWrite(code, config, prefix = "enc_") {
  const result = await JsConfuser.obfuscate(code, config);
  let obf;
  if (typeof result === "string") obf = result;
  else if (result && typeof result.code === "string") obf = result.code;
  else if (result && typeof result.toString === "function") obf = result.toString();
  else obf = JSON.stringify(result);
  const fname = `${prefix}${Date.now()}.js`;
  const fpath = path.join(OUTPUT_DIR, fname);
  await fs.writeFile(fpath, obf, "utf8");
  return fname;
}
async function obfuscateWithOptions({ code, presetConfig, addAntiBypass = false, password = null, identifierPrefix = "enc_" }) {
  let base = code;
  if (addAntiBypass) base = `${TByypas}\n${code}`;
  if (password) {
    const encoded = Buffer.from(password).toString("base64");
    base = createPasswordTemplate(encoded, base);
    presetConfig = presetConfig || getDefaultConfig();
  }
  return await obfuscateAndWrite(base, presetConfig, identifierPrefix);
}

// -------- socket.io (no auth) ----------
io.on("connection", (socket) => {
  log("Client connected:", socket.id);

  socket.on("disconnect", () => log("Client disconnected:", socket.id));

  socket.on("start", async (data) => {
    try {
      const { file, preset, password, antibypass } = data || {};
      if (!file) { socket.emit("error", { message: "No file specified." }); return; }
      const src = path.join(UPLOAD_DIR, file);
      if (!fs.existsSync(src)) { socket.emit("error", { message: "File not found." }); return; }

      socket.emit("progress", { status: "Reading file...", percent: 10 });
      const code = await fs.readFile(src, "utf8");

      socket.emit("progress", { status: "Selecting preset...", percent: 25 });
      const cfg = (preset || "").toLowerCase() === "nova" ? getNovaObfuscationConfig()
                : (preset || "").toLowerCase() === "nebula" ? getNebulaObfuscationConfig()
                : (preset || "").toLowerCase() === "arab" ? getArabObfuscationConfig()
                : (preset || "").toLowerCase() === "japan" ? getJapanObfuscationConfig()
                : getDefaultConfig();

      socket.emit("progress", { status: "Obfuscating...", percent: 50 });

      const outName = await obfuscateWithOptions({
        code,
        presetConfig: cfg,
        addAntiBypass: !!antibypass,
        password: password || null,
        identifierPrefix: `enc_${Date.now()}_`,
      });

      socket.emit("progress", { status: "Writing result...", percent: 90 });
      socket.emit("done", { filename: outName, download: `/download/${outName}` });
      socket.emit("progress", { status: "Finished!", percent: 100 });
      log(chalk.green("✔ Finished obfuscation:"), file);
    } catch (e) {
      errLog("Obfuscation error:", e?.message || e);
      socket.emit("error", { message: e?.message || String(e) });
    }
  });
});

// -------- cleanup utility (remove old uploads) ----------
async function cleanupOldFiles(dir, olderThanDays) {
  try {
    const files = await fs.readdir(dir);
    const now = Date.now();
    const cutoff = olderThanDays * 24 * 60 * 60 * 1000;
    for (const f of files) {
      const p = path.join(dir, f);
      try {
        const st = await fs.stat(p);
        if (st.isFile() && (now - st.mtimeMs) > cutoff) {
          await fs.remove(p);
          log("Removed old file:", p);
        }
      } catch (e) { /* ignore file errors */ }
    }
  } catch (e) {
    errLog("Cleanup error:", e.message || e);
  }
}
setInterval(() => cleanupOldFiles(UPLOAD_DIR, UPLOAD_RETENTION_DAYS), 24 * 60 * 60 * 1000);
cleanupOldFiles(UPLOAD_DIR, UPLOAD_RETENTION_DAYS).catch(() => {});

// -------- graceful shutdown --------
function shutdown() {
  log("Shutting down...");
  try { io.close(); } catch(e){}
  server.close(() => { log("HTTP server closed."); process.exit(0); });
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// -------- start server --------
server.listen(PORT, HOST, () => {
  log(chalk.yellow(`[INFO] Mode: VPS`));
  log(chalk.green.bold(`[SERVER] Running at http://${HOST}:${PORT}`));
  log(`Public dir: ${PUBLIC_DIR}`);
  log(`Upload dir: ${UPLOAD_DIR}`);
  log(`Output dir: ${OUTPUT_DIR}`);
});