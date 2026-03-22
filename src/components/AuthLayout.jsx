import { Theme, Tag } from '@carbon/react';
import { ChartLine, Locked, Security, WatsonHealthAiResults } from '@carbon/icons-react';
import styles from './AuthLayout.module.scss';

const trustSignals = [
  {
    icon: Locked,
    label: 'Guardrails',
    value: 'SSO ready',
    note: 'MFA and session rotation for operations teams'
  },
  {
    icon: Security,
    label: 'Coverage',
    value: '324 assets',
    note: 'Servers, certificates, domains, and alert policies'
  },
  {
    icon: ChartLine,
    label: 'Latency',
    value: '42 ms',
    note: 'Median response time across monitored regions'
  }
];

function AuthLayout({ eyebrow, title, description, alternateAction, children }) {
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <main className={styles.shell}>
        <Theme theme="g100">
          <section className={styles.storyPanel}>
            <div className={styles.brandRow}>
              <div className={styles.brandMark}>
                <WatsonHealthAiResults size={24} />
              </div>
              <div>
                <p className={styles.productName}>IBM Server Monitor</p>
                <p className={styles.productMeta}>Carbon-aligned control plane</p>
              </div>
            </div>

            <div className={styles.storyCopy}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>{description}</p>
            </div>

            <div className={styles.signalGrid}>
              {trustSignals.map(({ icon: Icon, label, value, note }) => (
                <article key={label} className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <span className={styles.signalIcon} aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <Tag type="cool-gray">{label}</Tag>
                  </div>
                  <p className={styles.signalValue}>{value}</p>
                  <p className={styles.signalNote}>{note}</p>
                </article>
              ))}
            </div>
          </section>
        </Theme>

        <section className={styles.formPanel}>
          <div className={styles.formPanelInner}>
            {alternateAction ? <div className={styles.alternateAction}>{alternateAction}</div> : null}
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;
