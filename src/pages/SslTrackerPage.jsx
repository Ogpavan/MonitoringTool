import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Column,
  DataTable,
  Grid,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  TextArea,
} from "@carbon/react";
import {
  AddLarge,
  ArrowUpRight,
  Download,
  Launch,
  Renew,
} from "@carbon/icons-react";
import {
  bulkInsertSslDomains,
  getSslDomains,
  getSslScanStatus,
  runSslScanNow,
} from "../lib/sslApi";
import styles from "./IllustrationPage.module.scss";

const statusToTag = {
  "Running...": "cyan",
  Healthy: "green",
  "Review chain": "warm-gray",
  "Renewal required": "red",
  Dormant: "gray",
  "Pending scan": "blue",
  Valid: "green",
  "Expiring soon": "warm-gray",
  Expired: "red",
  "Scan failed": "red",
};

const tableHeaders = [
  { key: "domain", header: "Domain" },
  { key: "environment", header: "Environment" },
  { key: "scanSchedule", header: "Scan schedule" },
  { key: "issuer", header: "Issuer / CA" },
  { key: "status", header: "SSL status" },
  { key: "expires", header: "Expiry" },
  { key: "lastScan", header: "Last scan" },
  { key: "ipAddress", header: "IP address" },
  { key: "actions", header: "" },
];

function getRowTone(status) {
  if (status === "Dormant") return styles.dormantRow;
  if (status === "Healthy") return styles.healthyRow;
  if (status === "Review chain") return styles.warningRow;
  if (status === "Pending scan") return styles.pendingRow;
  return styles.criticalRow;
}

function mapApiCertificate(record) {
  return {
    id: `db-${record.id}`,
    domain: record.domain,
    issuer: record.issuerCa || "Pending first scan",
    expiresInDays: record.expiryDate
      ? Math.max(
          Math.ceil((new Date(record.expiryDate) - new Date()) / 86400000),
          0,
        )
      : 0,
    status: record.sslStatus || "Pending scan",
    environment: record.environment,
    schedule: record.scanSchedule,
    ipAddress: record.ipAddress || "Pending DNS resolution",
    lastScanAt: record.lastScanAt,
    nextScanAt: record.nextScanAt,
    ownerName: record.ownerName,
    ownerEmail: record.ownerEmail,
    sourceType: record.sourceType,
  };
}

function formatTimestamp(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return fallback;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = parsed.toLocaleString("en-US", { month: "short" });
  const year = parsed.getFullYear();
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hour};${minute}`;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
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
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallbackParsed = new Date(raw);
  return Number.isNaN(fallbackParsed.getTime()) ? null : fallbackParsed;
}

function formatCountdown(ms) {
  if (ms <= 0) {
    return "Due now";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function formatLastRunAt(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return "Not available";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = parsed.toLocaleString("en-US", { month: "short" });
  const year = parsed.getFullYear();
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hour};${minute}`;
}

function SslTrackerPage() {
  const pageSizeOptions = [10, 20, 30, 50];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [environment, setEnvironment] = useState("Production");
  const [scanSchedule, setScanSchedule] = useState("Daily");
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEnvironment, setFilterEnvironment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchedule, setFilterSchedule] = useState("all");
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isScanStarting, setIsScanStarting] = useState(false);
  const [scanStatus, setScanStatus] = useState({
    running: false,
    startedAt: null,
    finishedAt: null,
    scanned: 0,
    total: 0,
    currentDomain: null,
    nextScanAt: null,
    lastRunAt: null,
    force: false,
    lastError: null,
    lastSummary: null,
  });
  const [tickerMs, setTickerMs] = useState(Date.now());
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  // Fetch domains from API on mount
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([getSslDomains(), getSslScanStatus()])
      .then(([domainsRes, statusRes]) => {
        if (!mounted) {
          return;
        }

        if (domainsRes.domains) {
          setCertificates(domainsRes.domains.map(mapApiCertificate));
        }
        if (statusRes.status) {
          setScanStatus(statusRes.status);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!scanStatus.running) {
      return () => {
        active = false;
      };
    }

    const timer = window.setInterval(async () => {
      if (!active) {
        return;
      }

      try {
        const status = await loadScanStatus();
        if (status.running === false) {
          await refreshDomains();
          if (status.lastError) {
            setScanError(status.lastError);
          } else {
            const scanned = status.lastSummary?.scanned ?? status.scanned ?? 0;
            setScanSuccess(
              `SSL scan completed. ${scanned} domain${scanned === 1 ? "" : "s"} processed.`,
            );
          }
        }
      } catch {
        // ignore polling errors to avoid noisy UI while user is on page
      }
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [scanStatus.running]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const response = await getSslScanStatus();
        if (response.status) {
          setScanStatus(response.status);
        }
      } catch {
        // keep UI quiet for transient polling issues
      }
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTickerMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);
  const handleSubmit = async () => {
    const domains = domainInput
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!domains.length) {
      setSubmitError("Enter at least one domain to track.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const response = await bulkInsertSslDomains({
        environment,
        scanSchedule,
        domains,
      });

      const insertedCertificates = response.inserted.map(mapApiCertificate);

      // After successful insert, refresh from API
      const refreshed = await getSslDomains();
      setCertificates(refreshed.domains.map(mapApiCertificate));
      setDomainInput("");
      setEnvironment("Production");
      setScanSchedule("Daily");
      setIsModalOpen(false);

      const insertedCount =
        response.summary?.inserted ?? insertedCertificates.length;
      const skippedCount = response.summary?.skipped ?? 0;
      setSubmitSuccess(
        skippedCount
          ? `Added ${insertedCount} domain${insertedCount === 1 ? "" : "s"} and skipped ${skippedCount} duplicate entr${skippedCount === 1 ? "y" : "ies"}.`
          : `Added ${insertedCount} domain${insertedCount === 1 ? "" : "s"} to SSL tracking.`,
      );
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDormant = (id) => {
    setCertificates((current) =>
      current.map((certificate) =>
        certificate.id === id
          ? {
              ...certificate,
              isDormant: !certificate.isDormant,
            }
          : certificate,
      ),
    );
  };

  const refreshDomains = async () => {
    const refreshed = await getSslDomains();
    setCertificates(refreshed.domains.map(mapApiCertificate));
  };

  const loadScanStatus = async () => {
    const response = await getSslScanStatus();
    setScanStatus(response.status || {});
    return response.status || {};
  };

  const handleScanNow = async () => {
    setScanError("");
    setScanSuccess("");
    setIsScanStarting(true);

    try {
      await runSslScanNow({ force: true });
      await loadScanStatus();
    } catch (error) {
      setScanError(error.message || "Failed to start SSL scan.");
    } finally {
      setIsScanStarting(false);
    }
  };

  const nextScanMeta = useMemo(() => {
    if (scanStatus.running) {
      return "In progress";
    }

    if (!scanStatus.nextScanAt) {
      return "Not scheduled";
    }

    const nextAt = new Date(scanStatus.nextScanAt);
    if (Number.isNaN(nextAt.getTime())) {
      return "Not scheduled";
    }

    const countdown = formatCountdown(nextAt.getTime() - tickerMs);
    const exact = formatTimestamp(nextAt.toISOString(), "Unknown time");
    return `${countdown} (${exact})`;
  }, [scanStatus.running, scanStatus.nextScanAt, tickerMs]);

  const lastRunMeta = useMemo(
    () => formatLastRunAt(scanStatus.lastRunAt),
    [scanStatus.lastRunAt],
  );

  const selectedCertificate = useMemo(
    () =>
      certificates.find(
        (certificate) => certificate.id === selectedCertificateId,
      ) ?? null,
    [certificates, selectedCertificateId],
  );

  const rows = certificates.map((certificate) => ({
    isRunning:
      scanStatus.running && scanStatus.currentDomain === certificate.domain,
    id: certificate.id,
    domain: certificate.domain,
    environment: certificate.environment,
    scanSchedule: certificate.isDormant
      ? "Not scanned"
      : (certificate.schedule ?? "Daily"),
    issuer: certificate.issuer,
    status:
      scanStatus.running && scanStatus.currentDomain === certificate.domain
        ? "Running..."
        : certificate.isDormant
          ? "Dormant"
          : certificate.status,
    expires:
      certificate.expiresInDays > 0
        ? `${certificate.expiresInDays} days`
        : "Pending discovery",
    lastScan: certificate.isDormant
      ? "Dormant"
      : formatTimestamp(
          certificate.lastScanAt,
          "Not scanned yet",
        ),
    ipAddress: certificate.ipAddress ?? "Pending DNS resolution",
    actions: "Actions",
  }));

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch = [row.domain, row.issuer, row.ipAddress].some(
          (value) =>
            value.toLowerCase().includes(searchTerm.trim().toLowerCase()),
        );
        const matchesEnvironment =
          filterEnvironment === "all" || row.environment === filterEnvironment;
        const matchesStatus =
          filterStatus === "all" || row.status === filterStatus;
        const matchesSchedule =
          filterSchedule === "all" || row.scanSchedule === filterSchedule;

        return (
          matchesSearch &&
          matchesEnvironment &&
          matchesStatus &&
          matchesSchedule
        );
      }),
    [rows, searchTerm, filterEnvironment, filterStatus, filterSchedule],
  );

  const totalItems = filteredRows.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;

    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterEnvironment, filterStatus, filterSchedule]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleExport = () => {
    const headerMarkup = tableHeaders
      .map((header) => `<th>${header.header}</th>`)
      .join("");
    const rowMarkup = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${row.domain}</td>
            <td>${row.environment}</td>
            <td>${row.scanSchedule}</td>
            <td>${row.issuer}</td>
            <td>${row.status}</td>
            <td>${row.expires}</td>
            <td>${row.lastScan}</td>
            <td>${row.ipAddress}</td>
          </tr>`,
      )
      .join("");

    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table>
            <thead><tr>${headerMarkup}</tr></thead>
            <tbody>${rowMarkup}</tbody>
          </table>
        </body>
      </html>`;

    const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ssl-scan-inventory.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Monitoring</p>
          <h1 className={styles.title}>SSL tracker</h1>
        </div>
        <div className={styles.heroInlineNotices}>
          {isLoading ? (
            <InlineNotification
              lowContrast
              kind="info"
              title="Loading domains..."
              hideCloseButton
              className={styles.inlineNotice}
            />
          ) : null}
          {submitSuccess ? (
            <InlineNotification
              lowContrast
              kind="success"
              title="Bulk import complete"
              subtitle={submitSuccess}
              onCloseButtonClick={() => setSubmitSuccess("")}
              className={styles.inlineNotice}
            />
          ) : null}
          {submitError ? (
            <InlineNotification
              lowContrast
              kind="error"
              title="Bulk import failed"
              subtitle={submitError}
              onCloseButtonClick={() => setSubmitError("")}
              className={styles.inlineNotice}
            />
          ) : null}
          {scanStatus.running ? (
            <InlineNotification
              lowContrast
              kind="info"
              title="SSL scan is running"
              subtitle={
                scanStatus.currentDomain
                  ? `Scanning ${scanStatus.currentDomain} (${scanStatus.scanned || 0}/${scanStatus.total || 0})`
                  : `Progress: ${scanStatus.scanned || 0}/${scanStatus.total || 0}`
              }
              hideCloseButton
              className={styles.inlineNotice}
            />
          ) : null}
          {scanSuccess ? (
            <InlineNotification
              lowContrast
              kind="success"
              title={scanSuccess}
              onCloseButtonClick={() => setScanSuccess("")}
              className={styles.inlineNotice}
            />
          ) : null}
          {scanError ? (
            <InlineNotification
              lowContrast
              kind="error"
              title="Scan failed"
              subtitle={scanError}
              onCloseButtonClick={() => setScanError("")}
              className={styles.inlineNotice}
            />
          ) : null}
        </div>

        <Button renderIcon={AddLarge} onClick={() => setIsModalOpen(true)}>
          Bulk add domains
        </Button>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>SSL scan inventory</h2>
              <div className={styles.pillRow}>
                <span className={styles.scanMeta}>
                  Next scan: {nextScanMeta}
                </span>
                <span className={styles.scanMeta}>
                  Last scan run: {lastRunMeta}
                </span>
                <Button
                  kind="secondary"
                  size="sm"
                  renderIcon={Renew}
                  onClick={handleScanNow}
                  disabled={isScanStarting || scanStatus.running}
                >
                  {isScanStarting || scanStatus.running ? "Scan running..." : "Scan now"}
                </Button>
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={Download}
                  onClick={handleExport}
                  disabled={!filteredRows.length}
                >
                  Download Excel
                </Button>
              </div>
            </div>

            <div className={styles.filterGrid}>
              <TextInput
                id="ssl-search"
                labelText="Search domains"
                placeholder="Search domain, issuer, or IP address"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <Select
                id="ssl-filter-environment"
                labelText="Environment"
                value={filterEnvironment}
                onChange={(event) => setFilterEnvironment(event.target.value)}
              >
                <SelectItem value="all" text="All environments" />
                <SelectItem value="Production" text="Production" />
                <SelectItem value="Staging" text="Staging" />
                <SelectItem value="Development" text="Development" />
              </Select>

              <Select
                id="ssl-filter-status"
                labelText="SSL status"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <SelectItem value="all" text="All statuses" />
                <SelectItem value="Healthy" text="Healthy" />
                <SelectItem value="Review chain" text="Review chain" />
                <SelectItem value="Renewal required" text="Renewal required" />
                <SelectItem value="Pending scan" text="Pending scan" />
                <SelectItem value="Dormant" text="Dormant" />
                <SelectItem value="Running..." text="Running..." />
                <SelectItem value="Valid" text="Valid" />
                <SelectItem value="Expiring soon" text="Expiring soon" />
                <SelectItem value="Expired" text="Expired" />
                <SelectItem value="Scan failed" text="Scan failed" />
              </Select>

              <Select
                id="ssl-filter-schedule"
                labelText="Scan schedule"
                value={filterSchedule}
                onChange={(event) => setFilterSchedule(event.target.value)}
              >
                <SelectItem value="all" text="All schedules" />
                <SelectItem value="Daily" text="Daily" />
                <SelectItem value="Twice daily" text="Twice daily" />
                <SelectItem value="Weekdays" text="Weekdays" />
              </Select>
            </div>

            <DataTable rows={paginatedRows} headers={tableHeaders}>
              {({ rows, headers, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <Table
                    {...getTableProps()}
                    size="md"
                    className={styles.sslTable}
                  >
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => {
                          const { key, ...rest } = getHeaderProps({ header });
                          return (
                            <TableHeader key={key} {...rest}>
                              {header.header}
                            </TableHeader>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={`${styles.sslRow} ${getRowTone(row.cells.find((cell) => cell.info.header === "status")?.value)}`}
                        >
                          {row.cells.map((cell) => {
                            if (cell.info.header === "domain") {
                              return (
                                <TableCell key={cell.id}>
                                  <a
                                    href={`https://${cell.value}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${cell.value}`}
                                    className={styles.domainInlineLink}
                                  >
                                    <span>{cell.value}</span>
                                    <ArrowUpRight size={16} />
                                  </a>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === "status") {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag
                                    type={statusToTag[cell.value] || "gray"}
                                    size="sm"
                                  >
                                    {cell.value}
                                  </Tag>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === "actions") {
                              return (
                                <TableCell
                                  key={cell.id}
                                  className={styles.actionCell}
                                >
                                  <OverflowMenu
                                    ariaLabel={`Open actions for ${row.cells.find((item) => item.info.header === "domain")?.value}`}
                                    size="sm"
                                    flipped
                                  >
                                    <OverflowMenuItem
                                      itemText="View details"
                                      onClick={() =>
                                        setSelectedCertificateId(row.id)
                                      }
                                    />
                                    <OverflowMenuItem
                                      itemText={
                                        row.cells.find(
                                          (item) =>
                                            item.info.header === "status",
                                        )?.value === "Dormant"
                                          ? "Resume scanning"
                                          : "Mark dormant"
                                      }
                                      onClick={() =>
                                        handleToggleDormant(row.id)
                                      }
                                    />
                                  </OverflowMenu>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      {!rows.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={tableHeaders.length}
                            className={styles.emptyTableCell}
                          >
                            No domains match the selected filters.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                  <Pagination
                    className={styles.tablePagination}
                    page={page}
                    pageSize={pageSize}
                    pageSizes={pageSizeOptions}
                    totalItems={totalItems}
                    onChange={({ page, pageSize }) => {
                      setPage(page);
                      setPageSize(pageSize);
                    }}
                  />
                </TableContainer>
              )}
            </DataTable>
          </div>
        </Column>
      </Grid>

      <Modal
        open={isModalOpen}
        modalHeading="Bulk add domains for SSL scanning"
        primaryButtonText={
          isSubmitting ? "Adding domains..." : "Add to daily scan"
        }
        primaryButtonDisabled={isSubmitting}
        secondaryButtonText="Cancel"
        onRequestClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
          }
        }}
        onRequestSubmit={handleSubmit}
      >
        <div className={styles.modalStack}>
          <p className={styles.modalIntro}>
            Add one domain per line or comma-separated. Domains will be saved to
            the monitoring database for later SSL scans.
          </p>

          <TextArea
            id="bulk-domain-input"
            labelText="Domains"
            placeholder={"Enter one domain per line"}
            rows={8}
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
          />

          <div className={styles.formGrid}>
            <Select
              id="ssl-environment"
              labelText="Environment"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              <SelectItem value="Production" text="Production" />
              <SelectItem value="Staging" text="Staging" />
              <SelectItem value="Development" text="Development" />
            </Select>

            <Select
              id="ssl-schedule"
              labelText="Scan schedule"
              value={scanSchedule}
              onChange={(event) => setScanSchedule(event.target.value)}
            >
              <SelectItem value="Daily" text="Daily" />
              <SelectItem value="Twice daily" text="Twice daily" />
              <SelectItem value="Weekdays" text="Weekdays" />
            </Select>
          </div>
        </div>
      </Modal>

      {selectedCertificate ? (
        <>
          <button
            type="button"
            className={styles.drawerBackdrop}
            aria-label="Close details panel"
            onClick={() => setSelectedCertificateId(null)}
          />
          <aside
            className={styles.detailDrawer}
            aria-label="SSL domain details"
          >
            <div className={styles.drawerHeader}>
              <div>
                <p className={styles.drawerEyebrow}>SSL details</p>
                <h2 className={styles.drawerTitle}>
                  {selectedCertificate.domain}
                </h2>
              </div>
              <Button
                kind="ghost"
                size="sm"
                onClick={() => setSelectedCertificateId(null)}
              >
                Close
              </Button>
            </div>

            <div className={styles.drawerStack}>
              <div className={styles.drawerStatusRow}>
                <Tag
                  type={
                    statusToTag[
                      selectedCertificate.isDormant
                        ? "Dormant"
                        : selectedCertificate.status
                    ] || "gray"
                  }
                  size="sm"
                >
                  {selectedCertificate.isDormant
                    ? "Dormant"
                    : selectedCertificate.status}
                </Tag>
                <a
                  href={`https://${selectedCertificate.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.drawerLink}
                >
                  <span>Open domain</span>
                  <Launch size={16} />
                </a>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Environment</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.environment}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Scan schedule</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.isDormant
                      ? "Not scanned"
                      : (selectedCertificate.schedule ?? "Daily")}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Issuer / CA</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.issuer}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>IP address</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.ipAddress ?? "Pending DNS resolution"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Expiry</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.expiresInDays > 0
                      ? `${selectedCertificate.expiresInDays} days remaining`
                      : "Pending discovery"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Last scan</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.isDormant
                      ? "Dormant"
                      : formatTimestamp(
                          selectedCertificate.lastScanAt,
                          selectedCertificate.schedule
                            ? "Queued after import"
                            : "Today, 09:00",
                        )}
                  </span>
                </div>
              </div>

              <div className={styles.drawerActions}>
                <Button
                  kind={
                    selectedCertificate.isDormant
                      ? "primary"
                      : "danger--tertiary"
                  }
                  onClick={() => handleToggleDormant(selectedCertificate.id)}
                >
                  {selectedCertificate.isDormant
                    ? "Resume scanning"
                    : "Mark dormant"}
                </Button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </main>
  );
}

export default SslTrackerPage;
