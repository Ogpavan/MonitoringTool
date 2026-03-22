import dns from "node:dns/promises";
import dotenv from "dotenv";
import tls from "node:tls";
import { getMonitoringConfiguration } from "./configuration.js";
import {
  getAllTrackedDomains,
  getTrackedDomainsDueForScan,
  saveSslScanResult,
} from "./sslDomains.js";

dotenv.config();

const DEFAULT_TIMEOUT_MS = Number(process.env.SSL_SCAN_TIMEOUT_MS || 10000);
const DEFAULT_BATCH_SIZE = Number(process.env.SSL_SCAN_BATCH_SIZE || 25);
const EXPIRY_WARNING_DAYS = Number(process.env.SSL_EXPIRY_WARNING_DAYS || 30);

function formatIsoDate(value) {
  return value instanceof Date && !Number.isNaN(value.valueOf())
    ? value.toISOString()
    : null;
}

function parseRescanTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
}

function setLocalTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function advanceToNextWeekday(date) {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while ([0, 6].includes(next.getDay()));
  return next;
}

function buildNextScanAt(scanSchedule, fromDate = new Date(), options = {}) {
  const { rescanTime = "09:00" } = options;
  const base = new Date(fromDate);
  const { hour, minute } = parseRescanTime(rescanTime);
  const schedule = String(scanSchedule || "Daily").trim();

  if (schedule === "Hourly") {
    base.setHours(base.getHours() + 1, base.getMinutes(), 0, 0);
    return base;
  }

  if (schedule === "Twice daily") {
    const firstSlotMinutes = hour * 60 + minute;
    const secondSlotMinutes = (firstSlotMinutes + 12 * 60) % (24 * 60);
    const slots = [firstSlotMinutes, secondSlotMinutes].sort((a, b) => a - b);
    const currentMinutes = base.getHours() * 60 + base.getMinutes();
    const nextSlot = slots.find((slot) => slot > currentMinutes);

    if (nextSlot !== undefined) {
      return setLocalTime(base, Math.floor(nextSlot / 60), nextSlot % 60);
    }

    const tomorrow = new Date(base);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return setLocalTime(tomorrow, Math.floor(slots[0] / 60), slots[0] % 60);
  }

  const candidateToday = setLocalTime(base, hour, minute);

  if (schedule === "Weekly") {
    if (candidateToday > base) {
      return candidateToday;
    }
    const nextWeek = setLocalTime(base, hour, minute);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  if (schedule === "Weekdays") {
    const todayIsWeekday = ![0, 6].includes(base.getDay());
    if (todayIsWeekday && candidateToday > base) {
      return candidateToday;
    }
    return setLocalTime(advanceToNextWeekday(base), hour, minute);
  }

  if (candidateToday > base) {
    return candidateToday;
  }

  const tomorrow = setLocalTime(base, hour, minute);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function parseSanList(subjectAltName) {
  if (!subjectAltName) {
    return [];
  }

  return String(subjectAltName)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^DNS:/i, "").trim());
}

function deriveSslStatus(expiryDate, chainStatus) {
  if (!expiryDate) {
    return "Unavailable";
  }

  if (chainStatus && chainStatus !== "Authorized") {
    return "Chain issue";
  }

  const now = Date.now();
  const expiryMs = expiryDate.valueOf();
  const msRemaining = expiryMs - now;
  const dayMs = 24 * 60 * 60 * 1000;

  if (msRemaining <= 0) {
    return "Expired";
  }

  if (msRemaining <= EXPIRY_WARNING_DAYS * dayMs) {
    return "Expiring soon";
  }

  return "Valid";
}

function openTlsConnection(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      },
      () => resolve(socket),
    );

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

async function scanTrackedDomain(
  domainRecord,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options = {},
) {
  const { rescanTime = "09:00" } = options;
  const port = Number(domainRecord.monitorPort || 443);
  const lastScanAt = new Date();
  const nextScanAt = buildNextScanAt(domainRecord.scanSchedule, lastScanAt, {
    rescanTime,
  });

  try {
    const dnsResult = await dns.lookup(domainRecord.domain, { family: 0 });
    const socket = await openTlsConnection(domainRecord.domain, port, timeoutMs);

    try {
      const certificate = socket.getPeerCertificate(true);

      if (!certificate || !certificate.valid_to) {
        throw new Error("No peer certificate was presented by the remote host.");
      }

      const expiryDate = new Date(certificate.valid_to);
      const sanEntries = parseSanList(certificate.subjectaltname);
      const chainStatus = socket.authorized
        ? "Authorized"
        : socket.authorizationError || "Unauthorized";

      return {
        issuerCa:
          certificate.issuer?.O ||
          certificate.issuer?.CN ||
          certificate.issuerCertificate?.subject?.CN ||
          null,
        sslStatus: deriveSslStatus(expiryDate, chainStatus),
        expiryDate,
        lastScanAt,
        nextScanAt,
        ipAddress: dnsResult.address || null,
        commonName: certificate.subject?.CN || domainRecord.domain,
        sanList: sanEntries.length ? sanEntries.join(", ") : null,
        serialNumber: certificate.serialNumber || null,
        thumbprint:
          certificate.fingerprint256 || certificate.fingerprint || null,
        signatureAlgorithm: certificate.sigalg || null,
        keyAlgorithm: certificate.asymmetricKeyType || null,
        keySizeBits: certificate.bits || null,
        tlsVersion: socket.getProtocol() || null,
        certificateChainStatus: chainStatus,
        lastErrorMessage: null,
      };
    } finally {
      socket.end();
    }
  } catch (error) {
    return {
      issuerCa: null,
      sslStatus: "Scan failed",
      expiryDate: null,
      lastScanAt,
      nextScanAt,
      ipAddress: null,
      commonName: domainRecord.domain,
      sanList: null,
      serialNumber: null,
      thumbprint: null,
      signatureAlgorithm: null,
      keyAlgorithm: null,
      keySizeBits: null,
      tlsVersion: null,
      certificateChainStatus: "Connection failed",
      lastErrorMessage: error.message,
    };
  }
}

export async function runSslScanWorker(options = {}) {
  let config = null;
  try {
    config = await getMonitoringConfiguration();
  } catch {
    config = null;
  }

  const limit =
    Number(options.limit) ||
    Number(config?.sslBatchSize) ||
    DEFAULT_BATCH_SIZE;
  const force =
    typeof options.force === "boolean"
      ? options.force
      : Boolean(config?.sslForceOnStartup);
  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const rescanTime = String(config?.sslRescanTime || "09:00");

  const safeLimit = Math.max(1, Number(limit) || DEFAULT_BATCH_SIZE);
  const domains = force
    ? (await getAllTrackedDomains()).slice(0, safeLimit)
    : await getTrackedDomainsDueForScan(safeLimit);
  const results = [];
  const onProgress =
    typeof options.onProgress === "function" ? options.onProgress : null;

  for (const domainRecord of domains) {
    if (onProgress) {
      onProgress({
        phase: "domain-start",
        domainId: domainRecord.id,
        domain: domainRecord.domain,
        scanned: results.length,
        total: domains.length,
      });
    }

    const scanResult = await scanTrackedDomain(domainRecord, timeoutMs, {
      rescanTime,
    });
    const savedRecord = await saveSslScanResult(domainRecord.id, scanResult);

    const rowResult = {
      id: domainRecord.id,
      domain: domainRecord.domain,
      sslStatus: scanResult.sslStatus,
      expiryDate: formatIsoDate(scanResult.expiryDate),
      lastErrorMessage: scanResult.lastErrorMessage,
      saved: Boolean(savedRecord),
    };
    results.push(rowResult);

    if (onProgress) {
      onProgress({
        phase: "domain-complete",
        domainId: domainRecord.id,
        domain: domainRecord.domain,
        scanned: results.length,
        total: domains.length,
        result: rowResult,
      });
    }
  }

  return {
    force,
    scanned: results.length,
    results,
  };
}

function parseCliOptions(argv) {
  const options = {};

  for (const arg of argv) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        options.limit = Math.floor(value);
      }
      continue;
    }

    if (arg.startsWith("--timeout-ms=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        options.timeoutMs = Math.floor(value);
      }
    }
  }

  if (String(process.env.SSL_SCAN_FORCE_ALL || "").toLowerCase() === "true") {
    options.force = true;
  }

  return options;
}

const isDirectRun = process.argv[1]
  ? import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
  : false;

if (isDirectRun) {
  runSslScanWorker(parseCliOptions(process.argv.slice(2)))
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
    })
    .catch((error) => {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: error.message,
            details: error.odbcErrors || null,
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
    });
}
