import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Column,
  DataTable,
  Grid,
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
  TextArea
} from '@carbon/react';
import { AddLarge, ArrowUpRight, Download, Launch } from '@carbon/icons-react';
import { sslCertificates } from '../data/monitoring';
import styles from './IllustrationPage.module.scss';

const statusToTag = {
  Healthy: 'green',
  'Review chain': 'yellow',
  'Renewal required': 'red',
  Dormant: 'gray'
};

const tableHeaders = [
  { key: 'domain', header: 'Domain' },
  { key: 'environment', header: 'Environment' },
  { key: 'scanSchedule', header: 'Scan schedule' },
  { key: 'issuer', header: 'Issuer / CA' },
  { key: 'status', header: 'SSL status' },
  { key: 'expires', header: 'Expiry' },
  { key: 'lastScan', header: 'Last scan' },
  { key: 'ipAddress', header: 'IP address' },
  { key: 'actions', header: '' }
];

function getRowTone(status) {
  if (status === 'Dormant') return styles.dormantRow;
  if (status === 'Healthy') return styles.healthyRow;
  if (status === 'Review chain') return styles.warningRow;
  return styles.criticalRow;
}

function SslTrackerPage() {
  const pageSizeOptions = [10, 20, 30, 50];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [environment, setEnvironment] = useState('Production');
  const [scanSchedule, setScanSchedule] = useState('Daily');
  const [certificates, setCertificates] = useState(() => sslCertificates);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSchedule, setFilterSchedule] = useState('all');
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const handleSubmit = () => {
    const domains = domainInput
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!domains.length) {
      return;
    }

    const nextCertificates = domains.map((domain, index) => ({
      id: `bulk-${Date.now()}-${index}`,
      domain,
      issuer: 'Pending first scan',
      expiresInDays: 0,
      status: 'Review chain',
      environment,
      schedule: scanSchedule,
      ipAddress: 'Pending DNS resolution'
    }));

    setCertificates((current) => [...nextCertificates, ...current]);
    setDomainInput('');
    setEnvironment('Production');
    setScanSchedule('Daily');
    setIsModalOpen(false);
  };

  const handleToggleDormant = (id) => {
    setCertificates((current) =>
      current.map((certificate) =>
        certificate.id === id
          ? {
              ...certificate,
              isDormant: !certificate.isDormant
            }
          : certificate
      )
    );
  };

  const selectedCertificate = useMemo(
    () => certificates.find((certificate) => certificate.id === selectedCertificateId) ?? null,
    [certificates, selectedCertificateId]
  );

  const rows = certificates.map((certificate) => ({
    id: certificate.id,
    domain: certificate.domain,
    environment: certificate.environment,
    scanSchedule: certificate.isDormant ? 'Not scanned' : certificate.schedule ?? 'Daily',
    issuer: certificate.issuer,
    status: certificate.isDormant ? 'Dormant' : certificate.status,
    expires: certificate.expiresInDays > 0 ? `${certificate.expiresInDays} days` : 'Pending discovery',
    lastScan: certificate.isDormant ? 'Dormant' : certificate.schedule ? 'Queued after import' : 'Today, 09:00',
    ipAddress: certificate.ipAddress ?? 'Pending DNS resolution',
    actions: 'Actions'
  }));

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch = [row.domain, row.issuer, row.ipAddress].some((value) =>
          value.toLowerCase().includes(searchTerm.trim().toLowerCase())
        );
        const matchesEnvironment = filterEnvironment === 'all' || row.environment === filterEnvironment;
        const matchesStatus = filterStatus === 'all' || row.status === filterStatus;
        const matchesSchedule = filterSchedule === 'all' || row.scanSchedule === filterSchedule;

        return matchesSearch && matchesEnvironment && matchesStatus && matchesSchedule;
      }),
    [rows, searchTerm, filterEnvironment, filterStatus, filterSchedule]
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
    const headerMarkup = tableHeaders.map((header) => `<th>${header.header}</th>`).join('');
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
          </tr>`
      )
      .join('');

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

    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ssl-scan-inventory.xls';
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

        <Button renderIcon={AddLarge} onClick={() => setIsModalOpen(true)}>
          Bulk add domains
        </Button>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>SSL scan inventory</h2>
              <Button kind="tertiary" size="sm" renderIcon={Download} onClick={handleExport} disabled={!filteredRows.length}>
                Download Excel
              </Button>
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
                onChange={(event) => setFilterEnvironment(event.target.value)}>
                <SelectItem value="all" text="All environments" />
                <SelectItem value="Production" text="Production" />
                <SelectItem value="Staging" text="Staging" />
                <SelectItem value="Development" text="Development" />
              </Select>

              <Select id="ssl-filter-status" labelText="SSL status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <SelectItem value="all" text="All statuses" />
                <SelectItem value="Healthy" text="Healthy" />
                <SelectItem value="Review chain" text="Review chain" />
                <SelectItem value="Renewal required" text="Renewal required" />
                <SelectItem value="Dormant" text="Dormant" />
              </Select>

              <Select
                id="ssl-filter-schedule"
                labelText="Scan schedule"
                value={filterSchedule}
                onChange={(event) => setFilterSchedule(event.target.value)}>
                <SelectItem value="all" text="All schedules" />
                <SelectItem value="Daily" text="Daily" />
                <SelectItem value="Twice daily" text="Twice daily" />
                <SelectItem value="Weekdays" text="Weekdays" />
              </Select>
            </div>

            <DataTable rows={paginatedRows} headers={tableHeaders}>
              {({ rows, headers, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} size="md" className={styles.sslTable}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader key={header.key} {...getHeaderProps({ header })}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} className={`${styles.sslRow} ${getRowTone(row.cells.find((cell) => cell.info.header === 'status')?.value)}`}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'domain') {
                              return (
                                <TableCell key={cell.id}>
                                  <a
                                    href={`https://${cell.value}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${cell.value}`}
                                    className={styles.domainInlineLink}>
                                    <span>{cell.value}</span>
                                    <ArrowUpRight size={16} />
                                  </a>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === 'status') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type={statusToTag[cell.value]} size="sm">
                                    {cell.value}
                                  </Tag>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === 'actions') {
                              return (
                                <TableCell key={cell.id} className={styles.actionCell}>
                                  <OverflowMenu
                                    ariaLabel={`Open actions for ${row.cells.find((item) => item.info.header === 'domain')?.value}`}
                                    size="sm"
                                    flipped>
                                    <OverflowMenuItem
                                      itemText="View details"
                                      onClick={() => setSelectedCertificateId(row.id)}
                                    />
                                    <OverflowMenuItem
                                      itemText={
                                        row.cells.find((item) => item.info.header === 'status')?.value === 'Dormant'
                                          ? 'Resume scanning'
                                          : 'Mark dormant'
                                      }
                                      onClick={() => handleToggleDormant(row.id)}
                                    />
                                  </OverflowMenu>
                                </TableCell>
                              );
                            }

                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          })}
                        </TableRow>
                      ))}
                      {!rows.length ? (
                        <TableRow>
                          <TableCell colSpan={tableHeaders.length} className={styles.emptyTableCell}>
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
        primaryButtonText="Add to daily scan"
        secondaryButtonText="Cancel"
        onRequestClose={() => setIsModalOpen(false)}
        onRequestSubmit={handleSubmit}>
        <div className={styles.modalStack}>
          <p className={styles.modalIntro}>
            Add one domain per line or comma-separated. This is a UI illustration and will add them to the page state only.
          </p>

          <TextArea
            id="bulk-domain-input"
            labelText="Domains"
            placeholder={'api.example.com\napp.example.com\nstatus.example.com'}
            rows={8}
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
          />

          <div className={styles.formGrid}>
            <Select id="ssl-environment" labelText="Environment" value={environment} onChange={(event) => setEnvironment(event.target.value)}>
              <SelectItem value="Production" text="Production" />
              <SelectItem value="Staging" text="Staging" />
              <SelectItem value="Development" text="Development" />
            </Select>

            <Select id="ssl-schedule" labelText="Scan schedule" value={scanSchedule} onChange={(event) => setScanSchedule(event.target.value)}>
              <SelectItem value="Daily" text="Daily" />
              <SelectItem value="Twice daily" text="Twice daily" />
              <SelectItem value="Weekdays" text="Weekdays" />
            </Select>
          </div>
        </div>
      </Modal>

      {selectedCertificate ? (
        <>
          <button type="button" className={styles.drawerBackdrop} aria-label="Close details panel" onClick={() => setSelectedCertificateId(null)} />
          <aside className={styles.detailDrawer} aria-label="SSL domain details">
            <div className={styles.drawerHeader}>
              <div>
                <p className={styles.drawerEyebrow}>SSL details</p>
                <h2 className={styles.drawerTitle}>{selectedCertificate.domain}</h2>
              </div>
              <Button kind="ghost" size="sm" onClick={() => setSelectedCertificateId(null)}>
                Close
              </Button>
            </div>

            <div className={styles.drawerStack}>
              <div className={styles.drawerStatusRow}>
                <Tag type={statusToTag[selectedCertificate.isDormant ? 'Dormant' : selectedCertificate.status]} size="sm">
                  {selectedCertificate.isDormant ? 'Dormant' : selectedCertificate.status}
                </Tag>
                <a
                  href={`https://${selectedCertificate.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.drawerLink}>
                  <span>Open domain</span>
                  <Launch size={16} />
                </a>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Environment</span>
                  <span className={styles.detailValue}>{selectedCertificate.environment}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Scan schedule</span>
                  <span className={styles.detailValue}>{selectedCertificate.isDormant ? 'Not scanned' : selectedCertificate.schedule ?? 'Daily'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Issuer / CA</span>
                  <span className={styles.detailValue}>{selectedCertificate.issuer}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>IP address</span>
                  <span className={styles.detailValue}>{selectedCertificate.ipAddress ?? 'Pending DNS resolution'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Expiry</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.expiresInDays > 0 ? `${selectedCertificate.expiresInDays} days remaining` : 'Pending discovery'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Last scan</span>
                  <span className={styles.detailValue}>
                    {selectedCertificate.isDormant ? 'Dormant' : selectedCertificate.schedule ? 'Queued after import' : 'Today, 09:00'}
                  </span>
                </div>
              </div>

              <div className={styles.drawerActions}>
                <Button kind={selectedCertificate.isDormant ? 'primary' : 'danger--tertiary'} onClick={() => handleToggleDormant(selectedCertificate.id)}>
                  {selectedCertificate.isDormant ? 'Resume scanning' : 'Mark dormant'}
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
