import { LineChart, SimpleBarChart } from '@carbon/charts-react';
import styles from './Charts.module.scss';

const lineOptions = {
  title: 'CPU Usage Trend',
  axes: {
    bottom: {
      mapsTo: 'date',
      scaleType: 'labels'
    },
    left: {
      mapsTo: 'value',
      title: 'CPU %'
    }
  },
  curve: 'curveMonotoneX',
  height: '280px',
  color: {
    scale: {
      'S1-API-PRIMARY': '#525252',
      'S2-WEB-EAST': '#6f6f6f',
      'S3-WORKER-BATCH': '#8d8d8d',
      'S4-WEB-WEST': '#a8a8a8',
      'S5-DB-REPLICA': '#393939',
      'S6-CACHE-NODE': '#5c5c5c',
      'S7-EDGE-GATEWAY': '#7a7a7a',
      'S8-ANALYTICS': '#b0b0b0'
    }
  },
  points: {
    enabled: false
  },
  legend: {
    enabled: false
  },
  toolbar: {
    enabled: false
  },
  grid: {
    x: {
      enabled: false
    },
    y: {
      enabled: true
    }
  }
};

const barOptions = {
  title: 'Load Distribution',
  axes: {
    left: {
      mapsTo: 'key',
      scaleType: 'labels'
    },
    bottom: {
      mapsTo: 'value',
      title: 'Load Score'
    }
  },
  height: '280px',
  color: {
    scale: {
      'Load Score': '#6f6f6f'
    }
  },
  legend: {
    enabled: false
  },
  toolbar: {
    enabled: false
  },
  grid: {
    x: {
      enabled: true
    },
    y: {
      enabled: false
    }
  }
};

function Charts({ cpuTrendData, loadDistributionData }) {
  return (
    <div className={styles.grid}>
      <div className={styles.surface}>
        <LineChart data={cpuTrendData} options={lineOptions} />
      </div>
      <div className={styles.surface}>
        <SimpleBarChart data={loadDistributionData} options={barOptions} />
      </div>
    </div>
  );
}

export default Charts;
