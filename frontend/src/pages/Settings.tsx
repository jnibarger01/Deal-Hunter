import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { Header } from '../components/layout';
import { Card, CardContent, CardHeader, Button } from '../components/ui';
import { useAppSettings } from '../context/AppSettingsContext';
import styles from './Settings.module.css';

export function Settings() {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const reset = () => {
    resetSettings();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className={styles.page}>
      <Header title="Settings" subtitle="Persist your deal analysis preferences on this device" />

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

        <div className={styles.actions}>
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={reset}>
            Reset Defaults
          </Button>
          <Button icon={<Save size={16} />} onClick={save}>
            Save Settings
          </Button>
        </div>

        {saved && <p className={styles.saved}>Settings saved to local storage.</p>}
      </div>
    </div>
  );
}
