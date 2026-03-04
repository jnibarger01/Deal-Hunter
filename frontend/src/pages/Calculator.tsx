import { useMemo, useState } from 'react';
import { Calculator as CalculatorIcon, DollarSign, TrendingUp, Target, Save, Trash2, Database } from 'lucide-react';
import { Header } from '../components/layout';
import { Card, CardContent, CardHeader, Button } from '../components/ui';
import { useTMVAssumptions, useTMVScenarioActions, useTMVScenarios } from '../hooks/useDeals';
import styles from './Calculator.module.css';

const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function Calculator() {
  const [scenarioName, setScenarioName] = useState('My Scenario');
  const [category, setCategory] = useState('Electronics');
  const [source, setSource] = useState('eBay');
  const [buyPrice, setBuyPrice] = useState('200');
  const [expectedSalePrice, setExpectedSalePrice] = useState('325');
  const [shippingCost, setShippingCost] = useState('18');
  const [platformFeePct, setPlatformFeePct] = useState('13');
  const [prepCost, setPrepCost] = useState('10');
  const [taxPct, setTaxPct] = useState('0');
  const { data: assumptions, loading: assumptionsLoading } = useTMVAssumptions(category, source);
  const {
    data: scenarios,
    loading: scenariosLoading,
    refetch: refetchScenarios,
  } = useTMVScenarios();
  const {
    create: createScenario,
    remove: removeScenario,
    loading: scenarioActionLoading,
  } = useTMVScenarioActions();

  const reset = () => {
    setBuyPrice('200');
    setExpectedSalePrice('325');
    setShippingCost('18');
    setPlatformFeePct('13');
    setPrepCost('10');
    setTaxPct('0');
  };

  const applyAssumptions = () => {
    if (!assumptions) return;
    setPlatformFeePct(String(assumptions.recommendedFeePct));
    if (!buyPrice || Number(buyPrice) <= 0) {
      setBuyPrice('200');
    }
    if (!expectedSalePrice || Number(expectedSalePrice) <= 0) {
      const seedBuyPrice = Number(buyPrice) || 200;
      const projected = seedBuyPrice * (1 + assumptions.recommendedMarkupPct / 100);
      setExpectedSalePrice(String(Math.round(projected)));
    }
  };

  const saveScenario = async () => {
    const created = await createScenario({
      name: scenarioName,
      category,
      source,
      buyPrice: toNumber(buyPrice),
      expectedSalePrice: toNumber(expectedSalePrice),
      shippingCost: toNumber(shippingCost),
      platformFeePct: toNumber(platformFeePct),
      prepCost: toNumber(prepCost),
      taxPct: toNumber(taxPct),
      notes: undefined,
    });

    if (created) {
      refetchScenarios();
    }
  };

  const loadScenario = (id: string) => {
    const scenario = scenarios?.find((item) => item.id === id);
    if (!scenario) return;
    setScenarioName(scenario.name);
    setCategory(scenario.category || 'Electronics');
    setSource(scenario.source || 'eBay');
    setBuyPrice(String(scenario.buyPrice));
    setExpectedSalePrice(String(scenario.expectedSalePrice));
    setShippingCost(String(scenario.shippingCost));
    setPlatformFeePct(String(scenario.platformFeePct));
    setPrepCost(String(scenario.prepCost));
    setTaxPct(String(scenario.taxPct));
  };

  const deleteScenario = async (id: string) => {
    const ok = await removeScenario(id);
    if (ok) {
      refetchScenarios();
    }
  };

  const model = useMemo(() => {
    const buy = toNumber(buyPrice);
    const sale = toNumber(expectedSalePrice);
    const shipping = toNumber(shippingCost);
    const feePct = toNumber(platformFeePct) / 100;
    const prep = toNumber(prepCost);
    const tax = toNumber(taxPct) / 100;

    const fees = sale * feePct;
    const taxes = sale * tax;
    const totalCost = buy + shipping + prep + fees + taxes;
    const netProfit = sale - totalCost;
    const roi = buy > 0 ? netProfit / buy : 0;
    const margin = sale > 0 ? netProfit / sale : 0;
    const breakEvenBuy = sale - (shipping + prep + fees + taxes);

    return {
      fees,
      taxes,
      totalCost,
      netProfit,
      roi,
      margin,
      breakEvenBuy,
    };
  }, [buyPrice, expectedSalePrice, shippingCost, platformFeePct, prepCost, taxPct]);

  return (
    <div className={styles.page}>
      <Header
        title="TMV Calculator"
        subtitle="Estimate true margin, break-even buy price, and ROI before sourcing"
      />

      <div className={styles.content}>
        <Card>
          <CardHeader title="Deal Inputs" subtitle="Tune assumptions for your target listing" />
          <CardContent>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Scenario Name</span>
                <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} type="text" />
              </label>
              <label className={styles.field}>
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Electronics">Electronics</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Computers">Computers</option>
                  <option value="Audio">Audio</option>
                  <option value="Photography">Photography</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Source</span>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="eBay">eBay</option>
                  <option value="FB Market">FB Market</option>
                  <option value="Craigslist">Craigslist</option>
                  <option value="OfferUp">OfferUp</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Buy Price ($)</span>
                <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} type="number" min="0" step="1" />
              </label>
              <label className={styles.field}>
                <span>Expected Sale Price ($)</span>
                <input value={expectedSalePrice} onChange={(e) => setExpectedSalePrice(e.target.value)} type="number" min="0" step="1" />
              </label>
              <label className={styles.field}>
                <span>Shipping / Handling ($)</span>
                <input value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} type="number" min="0" step="1" />
              </label>
              <label className={styles.field}>
                <span>Marketplace Fee (%)</span>
                <input value={platformFeePct} onChange={(e) => setPlatformFeePct(e.target.value)} type="number" min="0" step="0.1" />
              </label>
              <label className={styles.field}>
                <span>Prep / Repair Cost ($)</span>
                <input value={prepCost} onChange={(e) => setPrepCost(e.target.value)} type="number" min="0" step="1" />
              </label>
              <label className={styles.field}>
                <span>Tax / Reserve (%)</span>
                <input value={taxPct} onChange={(e) => setTaxPct(e.target.value)} type="number" min="0" step="0.1" />
              </label>
            </div>
            <div className={styles.assumptionRow}>
              <span className={styles.assumptionText}>
                {assumptionsLoading
                  ? 'Loading source/category assumptions...'
                  : assumptions
                    ? `Backend assumptions: ${assumptions.sampleSize} comps, ${assumptions.recommendedMarkupPct}% markup, ${assumptions.recommendedFeePct}% fee`
                    : 'No assumptions loaded.'}
              </span>
              <Button variant="secondary" size="sm" onClick={applyAssumptions}>
                Apply Assumptions
              </Button>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={reset}>Reset</Button>
              <Button icon={<Save size={16} />} onClick={saveScenario} loading={scenarioActionLoading}>
                Save Scenario
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className={styles.resultsGrid}>
          <Card variant="elevated">
            <CardContent>
              <div className={styles.metricHeader}>
                <DollarSign size={18} />
                <span>Net Profit</span>
              </div>
              <p className={`${styles.metricValue} ${model.netProfit >= 0 ? styles.positive : styles.negative}`}>
                ${model.netProfit.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className={styles.metricHeader}>
                <TrendingUp size={18} />
                <span>ROI</span>
              </div>
              <p className={`${styles.metricValue} ${model.roi >= 0 ? styles.positive : styles.negative}`}>
                {(model.roi * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className={styles.metricHeader}>
                <Target size={18} />
                <span>Break-even Buy</span>
              </div>
              <p className={styles.metricValue}>${model.breakEvenBuy.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent>
              <div className={styles.metricHeader}>
                <CalculatorIcon size={18} />
                <span>Net Margin</span>
              </div>
              <p className={`${styles.metricValue} ${model.margin >= 0 ? styles.positive : styles.negative}`}>
                {(model.margin * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader title="Saved Scenario History" subtitle="Persisted in PostgreSQL for reuse" />
          <CardContent>
            <div className={styles.historyList}>
              {scenariosLoading && <p className={styles.historyEmpty}>Loading scenarios...</p>}
              {!scenariosLoading && (!scenarios || scenarios.length === 0) && (
                <p className={styles.historyEmpty}>No saved scenarios yet.</p>
              )}
              {scenarios?.map((scenario) => (
                <div key={scenario.id} className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <div className={styles.historyTitleRow}>
                      <Database size={14} />
                      <strong>{scenario.name}</strong>
                    </div>
                    <span>
                      {(scenario.category || 'General')} • {(scenario.source || 'Mixed')} • Buy ${scenario.buyPrice} {'->'} Sale ${scenario.expectedSalePrice}
                    </span>
                  </div>
                  <div className={styles.historyActions}>
                    <Button size="sm" variant="secondary" onClick={() => loadScenario(scenario.id)}>
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={14} />}
                      onClick={() => deleteScenario(scenario.id)}
                      loading={scenarioActionLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
