export const serverMetrics = [
  {
    id: 's1',
    name: 'S1-API-PRIMARY',
    cpu: 92,
    memory: 88,
    disk: 71,
    state: 'online',
    trend: [62, 68, 74, 81, 85, 91, 92]
  },
  {
    id: 's2',
    name: 'S2-WEB-EAST',
    cpu: 58,
    memory: 52,
    disk: 49,
    state: 'online',
    trend: [49, 54, 50, 56, 58, 55, 58]
  },
  {
    id: 's3',
    name: 'S3-WORKER-BATCH',
    cpu: 0,
    memory: 0,
    disk: 0,
    state: 'down',
    trend: [34, 35, 28, 14, 6, 0, 0]
  },
  {
    id: 's4',
    name: 'S4-WEB-WEST',
    cpu: 33,
    memory: 41,
    disk: 38,
    state: 'online',
    trend: [28, 29, 32, 36, 33, 35, 33]
  },
  {
    id: 's5',
    name: 'S5-DB-REPLICA',
    cpu: 72,
    memory: 67,
    disk: 79,
    state: 'online',
    trend: [61, 65, 69, 70, 73, 72, 72]
  },
  {
    id: 's6',
    name: 'S6-CACHE-NODE',
    cpu: 46,
    memory: 63,
    disk: 42,
    state: 'online',
    trend: [37, 42, 44, 46, 48, 47, 46]
  },
  {
    id: 's7',
    name: 'S7-EDGE-GATEWAY',
    cpu: 81,
    memory: 76,
    disk: 69,
    state: 'online',
    trend: [63, 67, 70, 77, 78, 80, 81]
  },
  {
    id: 's8',
    name: 'S8-ANALYTICS',
    cpu: 54,
    memory: 59,
    disk: 64,
    state: 'online',
    trend: [47, 49, 51, 52, 54, 56, 54]
  }
];

export const alertsFeed = [
  {
    id: 'a1',
    title: 'Server S1 CPU critical',
    severity: 'critical',
    timestamp: '2 min ago'
  },
  {
    id: 'a2',
    title: 'Server S3 down',
    severity: 'critical',
    timestamp: '4 min ago'
  },
  {
    id: 'a3',
    title: 'Server S7 memory warning',
    severity: 'warning',
    timestamp: '11 min ago'
  }
];

export const recommendationFeed = [
  {
    id: 'r1',
    title: 'Shift 30% load from S1 to S4',
    impact: 'Reduces peak CPU pressure on the primary API tier.'
  },
  {
    id: 'r2',
    title: 'Redirect worker jobs from S7 to S6',
    impact: 'Balances memory usage across edge and cache nodes.'
  }
];
