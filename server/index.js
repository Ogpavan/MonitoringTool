import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { buildOdbcConnectionString, testDatabaseConnection } from "./db.js";
import { ensureAuthSchema, signInUser, signUpUser } from "./auth.js";
import {
  applyGlobalSslScanSchedule,
  bulkInsertTrackedDomains,
  ensureSslTrackedDomainsSchema,
  getAllTrackedDomains,
  getNextScheduledScanAt,
} from "./sslDomains.js";
import { runSslScanWorker } from "./sslScanWorker.js";
import {
  ensureMonitoringConfigurationSchema,
  getMonitoringConfiguration,
  updateMonitoringConfiguration,
} from "./configuration.js";
import {
  ensureSslScanLogsSchema,
  getLatestSslScanRunLog,
  insertSslScanRunLog,
} from "./sslScanLogs.js";

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 4000);
const scanRuntime = {
  running: false,
  startedAt: null,
  finishedAt: null,
  scanned: 0,
  total: 0,
  currentDomain: null,
  force: false,
  trigger: null,
  lastError: null,
  lastSummary: null,
};
const AUTO_SCAN_POLL_MS = Math.max(
  5000,
  Number(process.env.SSL_AUTO_SCAN_POLL_MS) || 30000,
);
let autoSchedulerTimer = null;

function toIsoDateTime(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(" ", "T").replace(
    /\.(\d{3})\d+/,
    (_full, firstThree) => `.${firstThree}`,
  );
  const withZone =
    /[zZ]|[+\-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const parsed = new Date(withZone);

  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function toDate(value) {
  const iso = toIsoDateTime(value);
  return iso ? new Date(iso) : null;
}

function startSslScan({ force = false, limit, trigger = "manual" } = {}) {
  if (scanRuntime.running) {
    return {
      started: false,
      statusCode: 409,
      status: scanRuntime,
      error: "SSL scan is already running.",
    };
  }

  scanRuntime.running = true;
  scanRuntime.startedAt = new Date().toISOString();
  scanRuntime.finishedAt = null;
  scanRuntime.scanned = 0;
  scanRuntime.total = 0;
  scanRuntime.currentDomain = null;
  scanRuntime.force = force;
  scanRuntime.trigger = trigger;
  scanRuntime.lastError = null;
  scanRuntime.lastSummary = null;

  runSslScanWorker({
    force,
    limit,
    onProgress: (event) => {
      scanRuntime.total = event.total || scanRuntime.total;
      scanRuntime.scanned = event.scanned || 0;
      if (event.phase === "domain-start") {
        scanRuntime.currentDomain = event.domain || null;
      }
      if (event.phase === "domain-complete") {
        scanRuntime.currentDomain = null;
      }
    },
  })
    .then((summary) => {
      scanRuntime.lastSummary = summary;
      scanRuntime.lastError = null;
    })
    .catch((error) => {
      scanRuntime.lastSummary = null;
      scanRuntime.lastError = error.message;
    })
    .finally(() => {
      scanRuntime.running = false;
      scanRuntime.currentDomain = null;
      scanRuntime.finishedAt = new Date().toISOString();
      insertSslScanRunLog({
        startedAt: scanRuntime.startedAt,
        finishedAt: scanRuntime.finishedAt,
        runStatus: scanRuntime.lastError ? "Failed" : "Completed",
        runTrigger: scanRuntime.trigger || "manual",
        forceRun: scanRuntime.force,
        scannedCount: scanRuntime.lastSummary?.scanned ?? scanRuntime.scanned ?? 0,
        totalCount: scanRuntime.total || 0,
        errorMessage: scanRuntime.lastError || null,
      }).catch((error) => {
        console.error("Failed to store SSL scan log:", error.message);
      });
    });

  return {
    started: true,
    statusCode: 202,
    status: scanRuntime,
  };
}

async function runAutoSchedulerTick() {
  if (scanRuntime.running) {
    return;
  }

  try {
    const nextScanAtRaw = await getNextScheduledScanAt();
    const nextScanAt = toDate(nextScanAtRaw);
    if (!nextScanAt) {
      return;
    }

    if (nextScanAt <= new Date()) {
      startSslScan({ force: false, trigger: "automatic" });
    }
  } catch (error) {
    console.error("Auto SSL scheduler tick failed:", error.message);
  }
}

function startAutoSslScheduler() {
  if (autoSchedulerTimer) {
    return;
  }

  autoSchedulerTimer = setInterval(() => {
    runAutoSchedulerTick();
  }, AUTO_SCAN_POLL_MS);

  runAutoSchedulerTick();
}

await ensureAuthSchema();
await ensureSslTrackedDomainsSchema();
await ensureMonitoringConfigurationSchema();
await ensureSslScanLogsSchema();

app.use(cors());
app.use(express.json());

app.get("/api/ssl-domains", async (_request, response) => {
  try {
    const domains = await getAllTrackedDomains();
    response.json({ ok: true, domains });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/ssl-domains/scan-status", async (_request, response) => {
  try {
    const [nextScanAt, latestRun] = await Promise.all([
      getNextScheduledScanAt(),
      getLatestSslScanRunLog(),
    ]);
    const lastRunAt = latestRun?.finishedAt || latestRun?.startedAt || null;
    response.json({
      ok: true,
      status: {
        ...scanRuntime,
        nextScanAt: toIsoDateTime(nextScanAt),
        lastRunAt: toIsoDateTime(lastRunAt),
      },
    });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/ssl-domains/scan-now", async (request, response) => {
  const force = Boolean(request.body?.force);
  const limit = Number(request.body?.limit || 0) || undefined;
  const started = startSslScan({ force, limit, trigger: "manual" });
  if (!started.started) {
    response.status(started.statusCode).json({
      ok: false,
      error: started.error,
      status: started.status,
    });
    return;
  }

  response.status(started.statusCode).json({
    ok: true,
    started: true,
    status: started.status,
  });
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "server-monitor-api" });
});

app.get("/api/health/db", async (_request, response) => {
  try {
    const details = await testDatabaseConnection();
    response.json({ ok: true, details });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/config/db", (_request, response) => {
  try {
    response.json({ ok: true, connectionString: buildOdbcConnectionString() });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/configuration", async (_request, response) => {
  try {
    const configuration = await getMonitoringConfiguration();
    response.json({ ok: true, configuration });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.put("/api/configuration", async (request, response) => {
  try {
    const configuration = await updateMonitoringConfiguration(request.body || {});
    await applyGlobalSslScanSchedule(
      configuration.sslSchedule,
      configuration.sslRescanTime,
    );
    response.json({ ok: true, configuration });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/auth/sign-up", async (request, response) => {
  try {
    const user = await signUpUser(request.body || {});
    response.status(201).json({ ok: true, user });
  } catch (error) {
    response
      .status(error.statusCode || 500)
      .json({ ok: false, error: error.message });
  }
});

app.post("/api/auth/sign-in", async (request, response) => {
  try {
    const user = await signInUser(request.body || {});
    response.json({ ok: true, user });
  } catch (error) {
    response
      .status(error.statusCode || 500)
      .json({ ok: false, error: error.message });
  }
});

app.post("/api/ssl-domains/bulk", async (request, response) => {
  try {
    const result = await bulkInsertTrackedDomains(request.body || {});
    response.status(201).json({ ok: true, ...result });
  } catch (error) {
    response
      .status(error.statusCode || 500)
      .json({ ok: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

startAutoSslScheduler();
