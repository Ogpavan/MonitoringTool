export const sslCertificates = [
  {
    id: 'cert-1',
    domain: 'api.monitoring.acme.io',
    issuer: 'DigiCert TLS RSA SHA256 2020 CA1',
    expiresInDays: 12,
    status: 'Renewal required',
    environment: 'Production',
    ipAddress: '34.149.72.18'
  },
  {
    id: 'cert-2',
    domain: 'dashboard.acme.io',
    issuer: 'Let\'s Encrypt R11',
    expiresInDays: 41,
    status: 'Healthy',
    environment: 'Production',
    ipAddress: '52.117.214.41'
  },
  {
    id: 'cert-3',
    domain: 'staging-api.acme.io',
    issuer: 'GlobalSign Atlas R3 DV TLS CA 2025 Q1',
    expiresInDays: 27,
    status: 'Review chain',
    environment: 'Staging',
    ipAddress: '10.42.18.206'
  }
];

export const trackedDomains = [
  {
    id: 'dom-1',
    name: 'acme.io',
    registrar: 'Cloudflare Registrar',
    dnsProvider: 'Cloudflare',
    expiry: '2026-08-18',
    status: 'Auto-renew enabled'
  },
  {
    id: 'dom-2',
    name: 'acme-status.com',
    registrar: 'GoDaddy',
    dnsProvider: 'Route 53',
    expiry: '2026-05-07',
    status: 'Transfer suggested'
  },
  {
    id: 'dom-3',
    name: 'acmeinternal.net',
    registrar: 'Namecheap',
    dnsProvider: 'Azure DNS',
    expiry: '2026-04-02',
    status: 'Renewal window open'
  }
];

export const uptimeServices = [
  {
    id: 'up-1',
    service: 'Public API',
    slo: '99.95%',
    region: 'Global',
    status: 'Draft policy',
    note: 'Probe design pending synthetic checks rollout.'
  },
  {
    id: 'up-2',
    service: 'Operations dashboard',
    slo: '99.90%',
    region: 'US / EU',
    status: 'Instrumentation review',
    note: 'Need authenticated probe coverage before publishing.'
  },
  {
    id: 'up-3',
    service: 'Webhook ingress',
    slo: '99.99%',
    region: 'US-East',
    status: 'Backlog',
    note: 'Optional phase after SSL and domain monitors.'
  }
];

export const configurationSections = [
  {
    id: 'cfg-1',
    name: 'Notification policy',
    summary: 'Severity routing, quiet hours, escalation matrix',
    owner: 'Platform Ops'
  },
  {
    id: 'cfg-2',
    name: 'Credential rotation',
    summary: 'API tokens, registrar keys, SMTP relays',
    owner: 'Security Engineering'
  },
  {
    id: 'cfg-3',
    name: 'Probe topology',
    summary: 'Regional checks, retry budgets, synthetic flows',
    owner: 'SRE'
  }
];
