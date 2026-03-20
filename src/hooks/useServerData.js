import { useEffect, useMemo, useState } from 'react';
import { alertsFeed, recommendationFeed, serverMetrics } from '../data/servers';

const calculateLoadScore = ({ cpu, memory, disk, state }) => {
  if (state === 'down') {
    return 100;
  }

  return Number((cpu * 0.5 + memory * 0.3 + disk * 0.2).toFixed(1));
};

const resolveStatus = (server) => {
  if (server.state === 'down') {
    return 'Down';
  }

  const loadScore = calculateLoadScore(server);

  if (loadScore < 60) {
    return 'Healthy';
  }

  if (loadScore <= 80) {
    return 'Warning';
  }

  return 'Critical';
};

export function useServerData() {
  const [isLoading, setIsLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hydratedServers = serverMetrics
        .map((server) => {
          const loadScore = calculateLoadScore(server);
          const status = resolveStatus(server);

          return {
            ...server,
            loadScore,
            status
          };
        })
        .sort((left, right) => right.loadScore - left.loadScore);

      setServers(hydratedServers);
      setAlerts(alertsFeed);
      setRecommendations(recommendationFeed);
      setIsLoading(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  const summary = useMemo(() => {
    const totalServers = servers.length;
    const healthy = servers.filter((server) => server.status === 'Healthy').length;
    const warning = servers.filter((server) => server.status === 'Warning').length;
    const critical = servers.filter((server) => ['Critical', 'Down'].includes(server.status)).length;

    return { totalServers, healthy, warning, critical };
  }, [servers]);

  const cpuTrendData = useMemo(() => {
    const labels = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

    return servers.flatMap((server) =>
      labels.map((label, index) => ({
        group: server.name,
        date: label,
        value: server.trend[index]
      }))
    );
  }, [servers]);

  const loadDistributionData = useMemo(
    () =>
      servers.map((server) => ({
        group: 'Load Score',
        key: server.name,
        value: server.loadScore
      })),
    [servers]
  );

  const rebalanceServer = (serverId) => {
    setServers((currentServers) =>
      currentServers
        .map((server) => {
          if (server.id !== serverId || server.state === 'down') {
            return server;
          }

          const nextCpu = Math.max(server.cpu - 12, 18);
          const nextMemory = Math.max(server.memory - 8, 20);
          const nextDisk = Math.max(server.disk - 3, 18);
          const nextServer = {
            ...server,
            cpu: nextCpu,
            memory: nextMemory,
            disk: nextDisk
          };

          return {
            ...nextServer,
            loadScore: calculateLoadScore(nextServer),
            status: resolveStatus(nextServer)
          };
        })
        .sort((left, right) => right.loadScore - left.loadScore)
    );
  };

  return {
    isLoading,
    servers,
    alerts,
    recommendations,
    summary,
    cpuTrendData,
    loadDistributionData,
    rebalanceServer
  };
}
