import { FormEvent, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Header } from '../components/layout';
import { Card, CardContent, CardHeader, Button } from '../components/ui';
import { OPERATOR_TOKEN_STORAGE_KEY } from '../api/client';
import { useAppSettings } from '../context/AppSettingsContext';
import { useConnections } from '../hooks/useConnections';
import styles from './Settings.module.css';

export function Settings() {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const {
    data: connections,
    loading: connectionsLoading,
    error: connectionsError,
    createCraigslistSource,
    updateCraigslistSource,
    deleteCraigslistSource,
    runCraigslistIngest,
    testFacebookConnection,
    ingestFacebookListing,
    ingestFacebookSearch,
  } = useConnections();
  const [rssUrl, setRssUrl] = useState('');
  const [submittingFeed, setSubmittingFeed] = useState(false);
  const [runningIngest, setRunningIngest] = useState(false);
  const [facebookCookieJson, setFacebookCookieJson] = useState('');
  const [facebookListingUrl, setFacebookListingUrl] = useState('');
  const [facebookSearchQuery, setFacebookSearchQuery] = useState('');
  const [facebookSearchLocation, setFacebookSearchLocation] = useState('');
  const [facebookSearchLimit, setFacebookSearchLimit] = useState(10);
  const [operatorToken, setOperatorToken] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem(OPERATOR_TOKEN_STORAGE_KEY) ?? ''
  );
  const [operatorTokenSaved, setOperatorTokenSaved] = useState(false);

  const ebayStatusText = useMemo(() => {
    if (!connections) return 'Checking server credentials…';
    return connections.ebay.status === 'configured' ? 'Configured on server' : 'Missing server credentials';
  }, [connections]);

  const handleAddCraigslistFeed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rssUrl.trim()) return;
    setSubmittingFeed(true);
    const created = await createCraigslistSource({ rssUrl: rssUrl.trim(), enabled: true });
    if (created) {
      setRssUrl('');
    }
    setSubmittingFeed(false);
  };

  const handleRunCraigslistIngest = async () => {
    setRunningIngest(true);
    await runCraigslistIngest();
    setRunningIngest(false);
  };

  const handleFacebookTest = async () => {
    await testFacebookConnection(facebookCookieJson);
  };

  const handleFacebookListingIngest = async () => {
    await ingestFacebookListing(facebookListingUrl);
  };

  const handleFacebookSearchIngest = async () => {
    await ingestFacebookSearch({
      query: facebookSearchQuery,
      location: facebookSearchLocation || undefined,
      limit: facebookSearchLimit,
    });
  };

  const handleSaveOperatorToken = () => {
    const trimmed = operatorToken.trim();
    if (trimmed) {
      window.localStorage.setItem(OPERATOR_TOKEN_STORAGE_KEY, trimmed);
      setOperatorToken(trimmed);
    } else {
      window.localStorage.removeItem(OPERATOR_TOKEN_STORAGE_KEY);
      setOperatorToken('');
    }
    setOperatorTokenSaved(true);
  };

  const handleClearOperatorToken = () => {
    window.localStorage.removeItem(OPERATOR_TOKEN_STORAGE_KEY);
    setOperatorToken('');
    setOperatorTokenSaved(true);
  };

  return (
    <div className={styles.page}>
      <Header
        title="Settings"
        subtitle="Preferences autosave to this browser's local storage"
      />

      <div className={styles.content}>
        <Card>
          <CardHeader title="Deal Organization" subtitle="Default behavior for sorting and quality threshold" />
          <CardContent>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Default Sort Field</span>
                <select
                  value={settings.defaultSortKey}
                  onChange={(e) =>
                    updateSettings({
                      defaultSortKey: e.target.value as typeof settings.defaultSortKey,
                    })
                  }
                >
                  <option value="rank">Composite Rank</option>
                  <option value="profit">Profit %</option>
                  <option value="spread">Spread</option>
                  <option value="price">Price</option>
                  <option value="tmv">TMV</option>
                  <option value="velocity">Days to Sell</option>
                  <option value="confidence">Confidence</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Default Sort Direction</span>
                <select
                  value={settings.defaultSortDirection}
                  onChange={(e) =>
                    updateSettings({
                      defaultSortDirection: e.target.value as typeof settings.defaultSortDirection,
                    })
                  }
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Minimum Confidence ({Math.round(settings.minConfidence * 100)}%)</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.minConfidence}
                  onChange={(e) =>
                    updateSettings({
                      minConfidence: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Display & Refresh" subtitle="Personal UX defaults for your dashboard" />
          <CardContent>
            <div className={styles.grid}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={settings.compactMode}
                  onChange={(e) =>
                    updateSettings({
                      compactMode: e.target.checked,
                    })
                  }
                />
                <span>Enable compact deal cards and table rows</span>
              </label>

              <label className={styles.field}>
                <span>Auto Refresh (seconds)</span>
                <input
                  type="number"
                  min="15"
                  max="600"
                  value={settings.autoRefreshSec}
                  onChange={(e) =>
                    updateSettings({
                      autoRefreshSec: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Connections"
            subtitle="Operator-facing marketplace controls for live pulls and ingest feeds"
          />
          <CardContent>
            <div className={styles.operatorTokenPanel}>
              <label className={styles.field}>
                <span>Operator Token</span>
                <input
                  type="password"
                  value={operatorToken}
                  onChange={(event) => {
                    setOperatorToken(event.target.value);
                    setOperatorTokenSaved(false);
                  }}
                  placeholder="Paste OPERATOR_INGEST_TOKEN"
                  autoComplete="off"
                />
              </label>
              <div className={styles.feedActions}>
                <Button type="button" onClick={handleSaveOperatorToken}>
                  Save Operator Token
                </Button>
                <Button type="button" variant="secondary" onClick={handleClearOperatorToken}>
                  Clear Operator Token
                </Button>
                {operatorTokenSaved ? <span className={styles.saved}>Saved for this browser</span> : null}
              </div>
            </div>
            {connectionsError ? <p className={styles.errorText}>{connectionsError}</p> : null}
            <div className={styles.connectionsGrid}>
              <div className={styles.connectionCard}>
                <div className={styles.connectionHeader}>
                  <h4>eBay</h4>
                  <span className={styles.connectionStatus}>{ebayStatusText}</span>
                </div>
                <p className={styles.connectionHint}>
                  Live Browse pulls use server-side credentials. No operator login flow needed here.
                </p>
                <p className={styles.connectionMeta}>
                  Last live pull: {connections?.ebay.lastLivePullAt ?? 'Not pulled yet'}
                </p>
              </div>

              <div className={styles.connectionCard}>
                <div className={styles.connectionHeader}>
                  <h4>Craigslist</h4>
                  <span className={styles.connectionStatus}>
                    Scheduler {connections?.craigslist.schedulerEnabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <p className={styles.connectionHint}>
                  Save RSS feeds here, then trigger a manual ingest whenever you want fresh listings.
                </p>
                <form className={styles.feedForm} onSubmit={handleAddCraigslistFeed}>
                  <label className={styles.field}>
                    <span>RSS Feed URL</span>
                    <input
                      type="url"
                      placeholder="https://kansascity.craigslist.org/search/sss?format=rss"
                      value={rssUrl}
                      onChange={(event) => setRssUrl(event.target.value)}
                    />
                  </label>
                  <div className={styles.feedActions}>
                    <Button type="submit" loading={submittingFeed} disabled={!rssUrl.trim()}>
                      Add Craigslist Feed
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      loading={runningIngest || connectionsLoading}
                      onClick={handleRunCraigslistIngest}
                    >
                      Run Craigslist Ingest
                    </Button>
                  </div>
                </form>
                <div className={styles.sourceList}>
                  {(connections?.craigslist.sources ?? []).map((source) => (
                    <div key={source.id} className={styles.savedFeedCard}>
                      <label className={styles.field}>
                        <span>Saved Feed</span>
                        <input type="url" readOnly value={source.config.rssUrl ?? ''} />
                        <span className={styles.connectionMeta}>
                          {source.enabled ? 'Enabled' : 'Disabled'} · Last run: {source.lastRunAt ?? 'Never'}
                        </span>
                        <span className={styles.connectionMeta}>
                          Fetched: {source.config.lastFetchedCount ?? 0} · Accepted: {source.config.lastAcceptedCount ?? 0} · Rejected: {source.config.lastRejectedCount ?? 0}
                        </span>
                        {source.config.lastError ? (
                          <span className={styles.errorText}>{source.config.lastError}</span>
                        ) : null}
                      </label>
                      <div className={styles.feedActions}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => updateCraigslistSource(source.id, { enabled: !source.enabled })}
                        >
                          {source.enabled ? 'Disable Feed' : 'Enable Feed'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => deleteCraigslistSource(source.id)}
                        >
                          Remove Feed
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.connectionCard}>
                <div className={styles.connectionHeader}>
                  <h4>Facebook Marketplace</h4>
                  <span className={styles.connectionStatus}>
                    {connections?.facebook.status === 'configured' ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <p className={styles.connectionHint}>
                  Operator-driven scrape flow using your Marketplace cookies and a headless browser.
                </p>
                <p className={styles.connectionMeta}>
                  {connections?.facebook.profileName ?? 'No Facebook connection is configured yet.'}
                </p>
                <label className={styles.field}>
                  <span>Cookie JSON</span>
                  <textarea
                    className={styles.textarea}
                    value={facebookCookieJson}
                    onChange={(event) => setFacebookCookieJson(event.target.value)}
                    placeholder='[{"name":"c_user","value":"..."},{"name":"xs","value":"..."}]'
                  />
                </label>
                <div className={styles.feedActions}>
                  <Button type="button" variant="secondary" onClick={handleFacebookTest}>
                    Test Facebook Connection
                  </Button>
                </div>
                <label className={styles.field}>
                  <span>Listing URL</span>
                  <input
                    type="url"
                    value={facebookListingUrl}
                    onChange={(event) => setFacebookListingUrl(event.target.value)}
                    placeholder="https://www.facebook.com/marketplace/item/..."
                  />
                </label>
                <Button type="button" variant="secondary" onClick={handleFacebookListingIngest}>
                  Scrape Listing URL
                </Button>
                <div className={styles.grid}>
                  <label className={styles.field}>
                    <span>Saved Search Query</span>
                    <input value={facebookSearchQuery} onChange={(event) => setFacebookSearchQuery(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Location</span>
                    <input value={facebookSearchLocation} onChange={(event) => setFacebookSearchLocation(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Limit</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={facebookSearchLimit}
                      onChange={(event) => setFacebookSearchLimit(Number(event.target.value))}
                    />
                  </label>
                </div>
                <Button type="button" variant="secondary" onClick={handleFacebookSearchIngest}>
                  Scrape Saved Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={styles.actions}>
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={resetSettings}>
            Reset Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
