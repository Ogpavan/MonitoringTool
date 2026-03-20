import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tooltip
} from '@carbon/react';
import { Information } from '@carbon/icons-react';
import styles from './ServerTable.module.scss';

const headers = [
  { key: 'name', header: 'Server Name' },
  { key: 'cpu', header: 'CPU %' },
  { key: 'memory', header: 'Memory %' },
  { key: 'disk', header: 'Disk %' },
  { key: 'loadScore', header: 'Load Score' },
  { key: 'status', header: 'Status' }
];

const statusToTagType = {
  Healthy: 'green',
  Warning: 'yellow',
  Critical: 'red',
  Down: 'red'
};

function metricLabel(label, description) {
  return (
    <span className={styles.metricHeader}>
      {label}
      <Tooltip align="bottom" label={label} description={description}>
        <button type="button" className={styles.tooltipButton} aria-label={`${label} explanation`}>
          <Information size={14} />
        </button>
      </Tooltip>
    </span>
  );
}

function ServerIdentity({ server }) {
  return (
    <div className={styles.serverIdentity}>
      <span className={`${styles.serverDot} ${styles[server.state === 'down' ? 'down' : 'online']}`} aria-hidden="true" />
      <div className={styles.serverCopy}>
        <span className={styles.serverName}>{server.name}</span>
        <span className={styles.serverMeta}>{server.state === 'down' ? 'Unavailable' : 'Online'} • {server.id.toUpperCase()}</span>
      </div>
    </div>
  );
}

function MetricCell({ value, tone }) {
  return <span className={`${styles.metricValue} ${tone ? styles[tone] : ''}`}>{value}%</span>;
}

function getRowTone(status) {
  if (status === 'Healthy') return styles.healthyRow;
  if (status === 'Warning') return styles.warningRow;
  return styles.criticalRow;
}

function ServerTable({ servers }) {
  const rows = servers.map((server) => ({
    id: server.id,
    name: server.name,
    cpu: server.cpu,
    memory: server.memory,
    disk: server.disk,
    loadScore: server.loadScore,
    status: server.status
  }));

  return (
    <div className={styles.surface}>
      <DataTable rows={rows} headers={headers} isSortable size="sm">
        {({ rows, headers, getHeaderProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} className={styles.table} size="sm" useZebraStyles={false}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const renderedHeader =
                      header.key === 'cpu'
                        ? metricLabel('CPU %', 'Current processor utilization by server.')
                        : header.key === 'memory'
                          ? metricLabel('Memory %', 'Current RAM utilization by server.')
                          : header.key === 'disk'
                            ? metricLabel('Disk %', 'Used storage capacity on the server.')
                            : header.header;

                    return (
                      <TableHeader
                        {...getHeaderProps({
                          header,
                          isSortable: header.key === 'loadScore'
                        })}
                        key={header.key}
                        className={header.key !== 'name' && header.key !== 'status' ? styles.numericHeader : ''}>
                        {renderedHeader}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const server = servers.find((item) => item.id === row.id);

                  return (
                    <TableRow key={row.id} className={`${styles.row} ${getRowTone(server?.status)}`}>
                      {row.cells.map((cell) => {
                        if (cell.info.header === 'name') {
                          return (
                            <TableCell key={cell.id} className={styles.nameCell}>
                              <ServerIdentity server={server} />
                            </TableCell>
                          );
                        }

                        if (cell.info.header === 'cpu') {
                          return (
                            <TableCell key={cell.id} className={styles.numericCell}>
                              <MetricCell value={cell.value} tone={cell.value >= 85 ? 'criticalText' : ''} />
                            </TableCell>
                          );
                        }

                        if (cell.info.header === 'memory') {
                          return (
                            <TableCell key={cell.id} className={styles.numericCell}>
                              <MetricCell value={cell.value} tone={cell.value >= 80 ? 'warningText' : ''} />
                            </TableCell>
                          );
                        }

                        if (cell.info.header === 'disk') {
                          return (
                            <TableCell key={cell.id} className={styles.numericCell}>
                              <MetricCell value={cell.value} />
                            </TableCell>
                          );
                        }

                        if (cell.info.header === 'loadScore') {
                          return (
                            <TableCell key={cell.id} className={styles.numericCell}>
                              <span className={styles.loadScore}>{Number(cell.value).toFixed(1)}</span>
                            </TableCell>
                          );
                        }

                        if (cell.info.header === 'status') {
                          return (
                            <TableCell key={cell.id}>
                              <Tag className={styles.statusTag} size="sm" type={statusToTagType[cell.value]}>
                                {cell.value}
                              </Tag>
                            </TableCell>
                          );
                        }

                        return <TableCell key={cell.id}>{cell.value}</TableCell>;
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
}

export default ServerTable;
