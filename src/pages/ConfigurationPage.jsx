import { useEffect, useState } from "react";
import {
  Button,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  Toggle,
} from "@carbon/react";
import { getConfiguration, updateConfiguration } from "../lib/configurationApi";
import styles from "./IllustrationPage.module.scss";

const DEFAULT_STATE = {
  domainAutoRenew: true,
  domainAlertDays: "30",
  domainOwnerEmail: "ops@example.com",
  sslSchedule: "Daily",
  sslRescanTime: "09:00",
  sslBatchSize: "25",
  sslForceOnStartup: false,
  serverHealthWindow: "5",
  serverRetryCount: "2",
  serverNotifyEmail: "infra@example.com",
};

function toUiState(configuration = {}) {
  return {
    domainAutoRenew: Boolean(configuration.domainAutoRenew),
    domainAlertDays: String(configuration.domainAlertDays ?? DEFAULT_STATE.domainAlertDays),
    domainOwnerEmail: String(configuration.domainOwnerEmail ?? DEFAULT_STATE.domainOwnerEmail),
    sslSchedule: String(configuration.sslSchedule ?? DEFAULT_STATE.sslSchedule),
    sslRescanTime: String(configuration.sslRescanTime ?? DEFAULT_STATE.sslRescanTime),
    sslBatchSize: String(configuration.sslBatchSize ?? DEFAULT_STATE.sslBatchSize),
    sslForceOnStartup: Boolean(configuration.sslForceOnStartup),
    serverHealthWindow: String(
      configuration.serverHealthWindow ?? DEFAULT_STATE.serverHealthWindow,
    ),
    serverRetryCount: String(configuration.serverRetryCount ?? DEFAULT_STATE.serverRetryCount),
    serverNotifyEmail: String(
      configuration.serverNotifyEmail ?? DEFAULT_STATE.serverNotifyEmail,
    ),
  };
}

function toApiPayload(state) {
  return {
    domainAutoRenew: state.domainAutoRenew,
    domainAlertDays: Number(state.domainAlertDays),
    domainOwnerEmail: state.domainOwnerEmail,
    sslSchedule: state.sslSchedule,
    sslRescanTime: state.sslRescanTime,
    sslBatchSize: Number(state.sslBatchSize),
    sslForceOnStartup: state.sslForceOnStartup,
    serverHealthWindow: Number(state.serverHealthWindow),
    serverRetryCount: Number(state.serverRetryCount),
    serverNotifyEmail: state.serverNotifyEmail,
  };
}

function ConfigurationPage() {
  const [formState, setFormState] = useState(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    getConfiguration()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setFormState(toUiState(response.configuration));
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setErrorMessage(error.message || "Failed to load configuration.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const patchForm = (nextPartial) => {
    setFormState((current) => ({
      ...current,
      ...nextPartial,
    }));
  };

  const handleSave = async (tabName) => {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await updateConfiguration(toApiPayload(formState));
      setFormState(toUiState(response.configuration));
      setSavedMessage(`${tabName} configuration saved.`);
      window.setTimeout(() => setSavedMessage(""), 2200);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Settings</p>
          <h1 className={styles.title}>Configuration</h1>
          <p className={styles.subtitle}>
            Set scan schedule, rescan time, and monitoring behavior from a single control panel.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            {isLoading ? (
              <InlineLoading description="Loading configuration..." status="active" />
            ) : null}

            {savedMessage ? (
              <InlineNotification
                kind="success"
                lowContrast
                hideCloseButton
                title={savedMessage}
                subtitle="These values were saved in the monitoring database."
                className={styles.inlineNotice}
              />
            ) : null}

            {errorMessage ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Configuration error"
                subtitle={errorMessage}
                className={styles.inlineNotice}
              />
            ) : null}

            <Tabs>
              <TabList aria-label="Configuration tabs">
                <Tab>Domain</Tab>
                <Tab>SSL</Tab>
                <Tab>Server</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <section className={styles.configPanel}>
                    <h2 className={styles.sectionTitle}>Domain scan settings</h2>
                    <div className={styles.configGrid}>
                      <Toggle
                        id="domain-auto-renew"
                        labelText="Auto-renew tracking"
                        labelA="Disabled"
                        labelB="Enabled"
                        toggled={formState.domainAutoRenew}
                        onToggle={(value) => patchForm({ domainAutoRenew: value })}
                      />
                      <TextInput
                        id="domain-alert-days"
                        labelText="Alert before expiry (days)"
                        type="number"
                        min={1}
                        max={365}
                        value={formState.domainAlertDays}
                        onChange={(event) =>
                          patchForm({ domainAlertDays: event.target.value })
                        }
                      />
                      <TextInput
                        id="domain-owner-email"
                        labelText="Owner notification email"
                        type="email"
                        value={formState.domainOwnerEmail}
                        onChange={(event) =>
                          patchForm({ domainOwnerEmail: event.target.value })
                        }
                      />
                    </div>
                    <div className={styles.configActions}>
                      <Button disabled={isSaving} onClick={() => handleSave("Domain")}>
                        {isSaving ? "Saving..." : "Save Domain Settings"}
                      </Button>
                    </div>
                  </section>
                </TabPanel>

                <TabPanel>
                  <section className={styles.configPanel}>
                    <h2 className={styles.sectionTitle}>SSL rescan settings</h2>
                    <div className={styles.configGrid}>
                      <Select
                        id="ssl-schedule"
                        labelText="SSL scan schedule"
                        value={formState.sslSchedule}
                        onChange={(event) => patchForm({ sslSchedule: event.target.value })}>
                        <SelectItem value="Hourly" text="Hourly" />
                        <SelectItem value="Daily" text="Daily" />
                        <SelectItem value="Weekdays" text="Weekdays" />
                        <SelectItem value="Weekly" text="Weekly" />
                      </Select>

                      <TextInput
                        id="ssl-rescan-time"
                        labelText="SSL rescan time"
                        type="time"
                        value={formState.sslRescanTime}
                        onChange={(event) =>
                          patchForm({ sslRescanTime: event.target.value })
                        }
                      />

                      <TextInput
                        id="ssl-batch-size"
                        labelText="Domains per worker run"
                        type="number"
                        min={1}
                        max={500}
                        value={formState.sslBatchSize}
                        onChange={(event) =>
                          patchForm({ sslBatchSize: event.target.value })
                        }
                      />

                      <Toggle
                        id="ssl-force-startup"
                        labelText="Force full SSL scan on startup"
                        labelA="Disabled"
                        labelB="Enabled"
                        toggled={formState.sslForceOnStartup}
                        onToggle={(value) =>
                          patchForm({ sslForceOnStartup: value })
                        }
                      />
                    </div>
                    <div className={styles.configActions}>
                      <Button disabled={isSaving} onClick={() => handleSave("SSL")}>
                        {isSaving ? "Saving..." : "Save SSL Settings"}
                      </Button>
                    </div>
                  </section>
                </TabPanel>

                <TabPanel>
                  <section className={styles.configPanel}>
                    <h2 className={styles.sectionTitle}>Server monitoring settings</h2>
                    <div className={styles.configGrid}>
                      <TextInput
                        id="server-health-window"
                        labelText="Health check interval (minutes)"
                        type="number"
                        min={1}
                        max={120}
                        value={formState.serverHealthWindow}
                        onChange={(event) =>
                          patchForm({ serverHealthWindow: event.target.value })
                        }
                      />

                      <TextInput
                        id="server-retry-count"
                        labelText="Retry attempts before alert"
                        type="number"
                        min={0}
                        max={10}
                        value={formState.serverRetryCount}
                        onChange={(event) =>
                          patchForm({ serverRetryCount: event.target.value })
                        }
                      />

                      <TextInput
                        id="server-notify-email"
                        labelText="Server alert email"
                        type="email"
                        value={formState.serverNotifyEmail}
                        onChange={(event) =>
                          patchForm({ serverNotifyEmail: event.target.value })
                        }
                      />
                    </div>
                    <div className={styles.configActions}>
                      <Button disabled={isSaving} onClick={() => handleSave("Server")}>
                        {isSaving ? "Saving..." : "Save Server Settings"}
                      </Button>
                    </div>
                  </section>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default ConfigurationPage;
