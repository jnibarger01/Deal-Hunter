# Live Deal Stream And Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dashboard-first app with a screenshot-first live deal stream, real watchlist/portfolio/alerts pages, and a fully data-driven deal detail intelligence view backed by persisted facts plus cached Gemini narratives.

**Architecture:** Add operator-facing read models on top of the existing monorepo rather than inventing a second stack. The backend gains a small set of public discovery routes, a persisted intelligence artifact, and operator-state tracking on deals; the frontend then swaps the landing experience to a new feed shell and consumes those contracts directly.

**Tech Stack:** React 18 + React Router + Vitest, Express + TypeScript + Prisma + Jest, PostgreSQL, Google Gemini

---

## File Structure

### Backend files
- Modify: `server/prisma/schema.prisma`
  Purpose: add operator-facing deal state, screenshot fields, intelligence artifact storage, and operator alert records.
- Create: `server/prisma/migrations/20260421120000_live_stream_operator_shell/migration.sql`
  Purpose: persist the schema changes in Postgres.
- Modify: `server/tests/setup.ts`
  Purpose: clear new tables between tests.
- Create: `server/src/services/discovery.service.ts`
  Purpose: feed query, hunt mutation, watchlist query, and feed card serialization.
- Create: `server/src/services/deal-intelligence.service.ts`
  Purpose: assemble factual detail payloads, cache Gemini narratives, and expose degraded states safely.
- Create: `server/src/services/portfolio.service.ts`
  Purpose: portfolio read model over acquired and sold deals.
- Modify: `server/src/services/alert.service.ts`
  Purpose: expose operator alert list reads from the new operator alert model while preserving existing user alert behavior.
- Modify: `server/src/services/ebay.ts`
  Purpose: include image URLs in live eBay payloads when available.
- Modify: `server/src/services/analytics.service.ts`
  Purpose: persist image URLs and update existing intelligence callers to delegate to the new artifact-based service where needed.
- Create: `server/src/controllers/discovery.controller.ts`
  Purpose: thin controller for feed, hunt, watchlist, and detail intelligence routes.
- Create: `server/src/controllers/portfolio.controller.ts`
  Purpose: thin controller for public portfolio reads.
- Modify: `server/src/controllers/alert.controller.ts`
  Purpose: return operator alert summaries on public list calls.
- Modify: `server/src/routes/watchlist.routes.ts`
  Purpose: expose public operator watchlist reads before authenticated legacy mutations.
- Modify: `server/src/routes/portfolio.routes.ts`
  Purpose: replace placeholder router with a real public portfolio list route.
- Modify: `server/src/routes/alert.routes.ts`
  Purpose: expose public operator alert reads while leaving auth on mutating legacy routes.
- Create: `server/src/routes/discovery.routes.ts`
  Purpose: `GET /feed`, `GET /deals/:id/intelligence`, and `POST /deals/:id/hunt`.
- Modify: `server/src/app.ts`
  Purpose: mount the new discovery routes ahead of generic deal routes.
- Create: `server/tests/integration/feed.routes.test.ts`
  Purpose: verify feed filters, sort order, and hunt behavior.
- Create: `server/tests/integration/portfolio.routes.test.ts`
  Purpose: verify portfolio list contract.
- Modify: `server/tests/integration/deal-intelligence.test.ts`
  Purpose: verify artifact caching, comparable evidence, degraded generation, and richer module payloads.
- Modify: `server/tests/integration/watchlist.test.ts`
  Purpose: cover the new public operator watchlist list shape and preserve legacy mutation coverage.
- Modify: `server/tests/integration/alert.routes.test.ts`
  Purpose: cover the new public operator alert list shape.

### Frontend files
- Modify: `frontend/src/App.tsx`
  Purpose: make the feed the landing route and add real watchlist/portfolio/alerts routes.
- Modify: `frontend/src/pages/index.ts`
  Purpose: export the new page modules.
- Modify: `frontend/src/components/layout/Sidebar.tsx`
  Purpose: switch nav labels and routes to the screenshot-first shell.
- Modify: `frontend/src/components/layout/Sidebar.module.css`
  Purpose: restyle the sidebar to the new visual direction.
- Modify: `frontend/src/components/layout/Layout.module.css`
  Purpose: support the new terminal-style shell proportions.
- Create: `frontend/src/pages/Feed.tsx`
  Purpose: live deal stream page with search, filters, sort, and hunt action.
- Create: `frontend/src/pages/Feed.module.css`
  Purpose: screenshot-style feed layout and card grid.
- Create: `frontend/src/pages/Watchlist.tsx`
  Purpose: real watchlist page over operator deal state.
- Create: `frontend/src/pages/Watchlist.module.css`
  Purpose: watchlist layout.
- Create: `frontend/src/pages/Portfolio.tsx`
  Purpose: real portfolio page over acquired and sold deals.
- Create: `frontend/src/pages/Portfolio.module.css`
  Purpose: portfolio layout.
- Create: `frontend/src/pages/Alerts.tsx`
  Purpose: real alerts page over operator alerts.
- Create: `frontend/src/pages/Alerts.module.css`
  Purpose: alerts layout.
- Modify: `frontend/src/pages/DealDetail.tsx`
  Purpose: consume the richer detail payload and render all required intelligence modules.
- Modify: `frontend/src/pages/DealDetail.module.css`
  Purpose: expand the detail layout to match the provided reference.
- Create: `frontend/src/components/discovery/LiveDealCard.tsx`
  Purpose: screenshot-style feed card with image, score, TMV, profit, and hunt CTA.
- Create: `frontend/src/components/discovery/LiveDealCard.module.css`
  Purpose: feed card styling.
- Create: `frontend/src/components/discovery/IntelligencePanel.tsx`
  Purpose: reusable right-column intelligence card wrapper.
- Create: `frontend/src/components/discovery/IntelligencePanel.module.css`
  Purpose: intelligence card styling.
- Modify: `frontend/src/types/index.ts`
  Purpose: add feed, watchlist, portfolio, alert, and rich deal detail contracts.
- Modify: `frontend/src/api/client.ts`
  Purpose: call the new backend endpoints.
- Modify: `frontend/src/hooks/useDeals.ts`
  Purpose: add hooks for feed filters, hunt mutation, detail payloads, watchlist, portfolio, and alerts.
- Modify: `frontend/src/App.routes.test.tsx`
  Purpose: verify new canonical routes and sidebar labels.
- Create: `frontend/src/pages/Feed.test.tsx`
  Purpose: verify feed rendering, card navigation, and hunt behavior.
- Modify: `frontend/src/pages/DealDetail.test.tsx`
  Purpose: verify richer intelligence modules and degraded states.

## Task 1: Add Operator State And Intelligence Persistence

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260421120000_live_stream_operator_shell/migration.sql`
- Modify: `server/tests/setup.ts`
- Test: `server/tests/integration/feed.routes.test.ts`

- [ ] **Step 1: Write the failing schema-driven feed test**

```ts
it('returns screenshot fields and operator state in the feed payload', async () => {
  const deal = await prisma.deal.create({
    data: {
      title: 'Sony X90L 65" 4K Google TV',
      source: 'facebook',
      sourceId: `feed-${Date.now()}`,
      category: 'tvs',
      price: 350,
      marketValue: 770,
      estimatedProfit: 280,
      dealScore: 91,
      roi: 1.2,
      imageUrl: 'https://images.example.com/tv.jpg',
      location: 'Austin, TX',
      operatorState: 'watching',
      status: 'active',
    },
  });

  await prisma.tMVResult.create({
    data: {
      dealId: deal.id,
      tmv: 770,
      confidence: 0.81,
      sampleCount: 12,
      volatility: 0.14,
      liquidityScore: 0.77,
      estimatedDaysToSell: 6,
    },
  });

  await prisma.score.create({
    data: {
      dealId: deal.id,
      profitMargin: 0.44,
      velocityScore: 0.8,
      riskScore: 0.2,
      compositeRank: 91,
    },
  });

  const response = await request(app).get('/api/v1/feed').expect(200);
  expect(response.body.data.items[0]).toEqual(
    expect.objectContaining({
      id: deal.id,
      imageUrl: 'https://images.example.com/tv.jpg',
      operatorState: 'watching',
      marketValue: 770,
      estimatedProfit: 280,
      dealScore: 91,
    })
  );
});
```

- [ ] **Step 2: Run the test to verify the schema gap**

Run: `cd server && npm run test:file -- tests/integration/feed.routes.test.ts -t "returns screenshot fields and operator state in the feed payload"`

Expected: FAIL with a Prisma validation error mentioning unknown fields such as `imageUrl` or `operatorState`.

- [ ] **Step 3: Add the Prisma fields and artifact models**

```prisma
model Deal {
  id               String        @id @default(cuid())
  source           String        @default("manual")
  sourceId         String        @default(cuid())
  title            String
  description      String?
  price            Decimal
  marketValue      Decimal?
  estimatedProfit  Decimal?
  dealScore        Decimal?
  roi              Decimal?
  imageUrl         String?
  operatorState    OperatorState @default(watching)
  pursuedAt        DateTime?
  acquiredAt       DateTime?
  soldAt           DateTime?
  purchasePrice    Decimal?
  targetResale     Decimal?
  realizedProfit   Decimal?
  condition        String?
  category         String
  marketplace      String?
  marketplaceId    String?       @unique
  itemUrl          String?
  location         String?
  zipPrefix        String?
  region           String?
  url              String?
  status           String        @default("active")
  views            Int?
  saves            Int?
  inquiries        Int?
  daysListed       Int?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  samples              MarketSample[]
  tmvResult            TMVResult?
  score                Score?
  intelligenceArtifact DealIntelligenceArtifact?
  operatorAlerts       OperatorAlert[]
  watchlistItems       WatchlistItem[]
  portfolioItems       PortfolioItem[]
  alerts               Alert[]
}

model DealIntelligenceArtifact {
  id            String             @id @default(cuid())
  dealId        String             @unique
  factSignature String
  status        IntelligenceStatus @default(pending)
  modules       Json?
  generatedAt   DateTime?
  errorMessage  String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  deal Deal @relation(fields: [dealId], references: [id], onDelete: Cascade)
}

model OperatorAlert {
  id        String           @id @default(cuid())
  dealId     String?
  type       OperatorAlertType
  status     OperatorAlertStatus @default(active)
  summary    String
  createdAt  DateTime        @default(now())

  deal Deal? @relation(fields: [dealId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
}

enum OperatorState {
  watching
  pursued
  acquired
  sold
  passed
}

enum IntelligenceStatus {
  pending
  ready
  failed
}

enum OperatorAlertType {
  high_score
  stale_pursuit
  risk_change
}

enum OperatorAlertStatus {
  active
  acknowledged
}
```

Also update `server/tests/setup.ts` so resets clear the new tables before deleting deals:

```ts
await prisma.operatorAlert.deleteMany({});
await prisma.dealIntelligenceArtifact.deleteMany({});
```

Run: `cd server && npm run prisma:migrate -- --name live_stream_operator_shell && npm run prisma:generate`

- [ ] **Step 4: Re-run the test to verify Prisma now accepts the fields**

Run: `cd server && npm run test:file -- tests/integration/feed.routes.test.ts -t "returns screenshot fields and operator state in the feed payload"`

Expected: FAIL with `Cannot GET /api/v1/feed` or a missing route error instead of a Prisma field error.

- [ ] **Step 5: Commit the schema baseline**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/20260421120000_live_stream_operator_shell/migration.sql server/tests/setup.ts
git commit -m "feat(server): add operator deal state and intelligence persistence"
```

## Task 2: Build Feed Queries And Hunt Mutation

**Files:**
- Create: `server/src/services/discovery.service.ts`
- Create: `server/src/controllers/discovery.controller.ts`
- Create: `server/src/routes/discovery.routes.ts`
- Modify: `server/src/services/ebay.ts`
- Modify: `server/src/services/analytics.service.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/integration/feed.routes.test.ts`

- [ ] **Step 1: Add failing tests for feed filters and hunt**

```ts
const seedRankedDeal = async (overrides: Partial<{
  title: string;
  source: string;
  category: string;
  compositeRank: number;
  operatorState: 'watching' | 'pursued' | 'acquired' | 'sold' | 'passed';
  imageUrl: string | null;
  purchasePrice: number | null;
  targetResale: number | null;
}> = {}) => {
  const deal = await prisma.deal.create({
    data: {
      title: overrides.title ?? 'Seed Deal',
      source: overrides.source ?? 'facebook',
      sourceId: `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: overrides.category ?? 'tech',
      price: 400,
      marketValue: 650,
      estimatedProfit: 180,
      dealScore: overrides.compositeRank ?? 90,
      roi: 0.45,
      imageUrl: overrides.imageUrl ?? null,
      location: 'Austin, TX',
      operatorState: overrides.operatorState ?? 'watching',
      purchasePrice: overrides.purchasePrice ?? null,
      targetResale: overrides.targetResale ?? null,
      status: 'active',
    },
  });

  await prisma.tMVResult.create({
    data: {
      dealId: deal.id,
      tmv: 650,
      confidence: 0.8,
      sampleCount: 10,
      volatility: 0.12,
      liquidityScore: 0.75,
      estimatedDaysToSell: 5,
    },
  });

  await prisma.score.create({
    data: {
      dealId: deal.id,
      profitMargin: 0.35,
      velocityScore: 0.8,
      riskScore: 0.2,
      compositeRank: overrides.compositeRank ?? 90,
    },
  });

  return deal;
};

it('filters the feed by search, marketplace, and sort order', async () => {
  await seedRankedDeal({ title: 'Sony X90L TV', source: 'facebook', category: 'tvs', compositeRank: 91 });
  await seedRankedDeal({ title: 'Milwaukee Impact Driver', source: 'craigslist', category: 'tools', compositeRank: 88 });

  const response = await request(app)
    .get('/api/v1/feed')
    .query({ search: 'Sony', marketplace: 'facebook', sort: 'dealScore' })
    .expect(200);

  expect(response.body.data.items).toHaveLength(1);
  expect(response.body.data.items[0].title).toContain('Sony');
});

it('marks a deal as pursued when hunt is posted twice', async () => {
  const deal = await seedRankedDeal({ title: 'JBL Bar 9.1', compositeRank: 89 });

  await request(app).post(`/api/v1/deals/${deal.id}/hunt`).expect(200);
  const second = await request(app).post(`/api/v1/deals/${deal.id}/hunt`).expect(200);

  expect(second.body.data.operatorState).toBe('pursued');
  expect(second.body.data.pursuedAt).toEqual(expect.any(String));
});
```

- [ ] **Step 2: Run the feed route tests**

Run: `cd server && npm run test:file -- tests/integration/feed.routes.test.ts`

Expected: FAIL with missing route/controller errors for `/api/v1/feed` and `/api/v1/deals/:id/hunt`.

- [ ] **Step 3: Implement the feed serializer and hunt action**

Create `server/src/services/discovery.service.ts`:

```ts
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const asNumber = (value: unknown) => (value == null ? null : Number(value));

export class DiscoveryService {
  async getFeed(params: {
    search?: string;
    marketplace?: string;
    category?: string;
    sort?: 'dealScore' | 'createdAt' | 'estimatedProfit';
  }) {
    const items = await prisma.deal.findMany({
      where: {
        status: 'active',
        tmvResult: { isNot: null },
        score: { isNot: null },
        ...(params.search
          ? {
              title: {
                contains: params.search,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(params.marketplace ? { source: params.marketplace } : {}),
        ...(params.category ? { category: params.category } : {}),
      },
      include: { tmvResult: true, score: true },
      orderBy:
        params.sort === 'estimatedProfit'
          ? { estimatedProfit: 'desc' }
          : params.sort === 'createdAt'
          ? { createdAt: 'desc' }
          : { score: { compositeRank: 'desc' } },
      take: 50,
    });

    return items.map((deal) => ({
      id: deal.id,
      title: deal.title,
      source: deal.source,
      category: deal.category,
      price: Number(deal.price),
      marketValue: asNumber(deal.marketValue ?? deal.tmvResult?.tmv),
      estimatedProfit: asNumber(deal.estimatedProfit),
      dealScore: asNumber(deal.dealScore ?? deal.score?.compositeRank),
      roi: asNumber(deal.roi),
      imageUrl: deal.imageUrl,
      condition: deal.condition,
      location: deal.location,
      createdAt: deal.createdAt.toISOString(),
      operatorState: deal.operatorState,
      tmv: deal.tmvResult
        ? {
            tmv: Number(deal.tmvResult.tmv),
            confidence: Number(deal.tmvResult.confidence),
            estimatedDaysToSell: deal.tmvResult.estimatedDaysToSell,
          }
        : null,
    }));
  }

  async huntDeal(dealId: string) {
    const existing = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!existing) throw new AppError('Deal not found', 404);

    const pursuedAt = existing.pursuedAt ?? new Date();

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { operatorState: 'pursued', pursuedAt },
    });

    return {
      id: updated.id,
      operatorState: updated.operatorState,
      pursuedAt: updated.pursuedAt?.toISOString() ?? null,
    };
  }
}

export default new DiscoveryService();
```

Update `server/src/services/ebay.ts` and `server/src/services/analytics.service.ts` to carry image URLs through the live eBay path:

```ts
interface EbayListing {
  itemId: string;
  title: string;
  currentPrice: number;
  condition: string;
  categoryName: string;
  location: string;
  viewItemURL: string;
  imageUrl?: string;
}

export interface LiveEbayDeal {
  id: string;
  source: 'ebay';
  sourceId: string;
  title: string;
  price: number;
  condition: string;
  category: LiveEbayCategory;
  location: string;
  url: string;
  imageUrl?: string;
  createdAt: string;
}
```

Mount the route in `server/src/app.ts` before `dealRoutes`:

```ts
apiRouter.use('/', discoveryRoutes);
apiRouter.use('/deals', dealIngestRoutes);
apiRouter.use('/deals', dealRoutes);
```

- [ ] **Step 4: Re-run the backend feed tests**

Run: `cd server && npm run test:file -- tests/integration/feed.routes.test.ts`

Expected: PASS with both feed and hunt assertions green.

- [ ] **Step 5: Commit the feed API**

```bash
git add server/src/services/discovery.service.ts server/src/controllers/discovery.controller.ts server/src/routes/discovery.routes.ts server/src/services/ebay.ts server/src/services/analytics.service.ts server/src/app.ts server/tests/integration/feed.routes.test.ts
git commit -m "feat(server): add feed query and hunt action"
```

## Task 3: Persist Rich Deal Intelligence Artifacts

**Files:**
- Create: `server/src/services/deal-intelligence.service.ts`
- Modify: `server/src/controllers/discovery.controller.ts`
- Modify: `server/src/routes/discovery.routes.ts`
- Modify: `server/tests/integration/deal-intelligence.test.ts`

- [ ] **Step 1: Add failing tests for rich intelligence modules and degraded responses**

```ts
const seedRankedDeal = async (overrides: Partial<{ title: string; compositeRank: number; imageUrl: string | null }> = {}) => {
  const deal = await prisma.deal.create({
    data: {
      title: overrides.title ?? 'Seed Deal',
      source: 'facebook',
      sourceId: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: 'tech',
      price: 900,
      marketValue: 1400,
      estimatedProfit: 300,
      dealScore: overrides.compositeRank ?? 94,
      roi: 0.5,
      imageUrl: overrides.imageUrl ?? null,
      condition: 'excellent',
      location: 'Round Rock, TX',
      operatorState: 'watching',
      status: 'active',
    },
  });

  await prisma.tMVResult.create({
    data: {
      dealId: deal.id,
      tmv: 1400,
      confidence: 0.84,
      sampleCount: 18,
      volatility: 0.12,
      liquidityScore: 0.81,
      estimatedDaysToSell: 5,
    },
  });

  await prisma.score.create({
    data: {
      dealId: deal.id,
      profitMargin: 0.32,
      velocityScore: 0.78,
      riskScore: 0.18,
      compositeRank: overrides.compositeRank ?? 94,
    },
  });

  return deal;
};

it('returns factual detail plus cached narrative modules', async () => {
  const deal = await seedRankedDeal({ title: 'Nikon Z6 II Body Only', compositeRank: 94, imageUrl: 'https://images.example.com/nikon.jpg' });

  await prisma.marketSample.createMany({
    data: [
      { dealId: deal.id, observedPrice: 1325, observedAt: new Date(), source: 'ebay', status: 'sold', title: 'Nikon Z6 II body' },
      { dealId: deal.id, observedPrice: 1400, observedAt: new Date(), source: 'ebay', status: 'sold', title: 'Nikon Z6 II body only' },
    ],
  });

  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        repairAnalysis: { skillLevel: 'BEGINNER', summary: 'Clean flip.', likelyIssue: 'None', partsCost: 0 },
        marketDynamics: { summary: 'Strong demand.', targetPrice: 1400, priceHistory: [1500, 1475, 1450, 1425, 1400, 1400] },
        comparableEvidence: { summary: 'Recent sold comps cluster tightly.', samples: ['Nikon body sold for $1400'] },
        negotiation: { targetOffer: 675, openingScript: 'I can do $675 cash today.' },
        sourcingNotes: { summary: 'Seller rotating gear.' },
        risks: { summary: 'Verify shutter count in person.', level: 'low' },
        nextAction: { summary: 'Message seller today before local pickup traffic increases.' },
      }) }] } }],
    }),
  })) as unknown as typeof fetch;

  const response = await request(app).get(`/api/v1/deals/${deal.id}/intelligence`).expect(200);
  expect(response.body.data.comparableEvidence.samples).toHaveLength(1);
  expect(response.body.data.meta.status).toBe('ready');
});

it('returns factual data with failed meta when Gemini is unavailable', async () => {
  const deal = await seedRankedDeal({ title: 'PS5 Digital Edition', compositeRank: 82 });
  global.fetch = jest.fn(async () => ({ ok: false })) as unknown as typeof fetch;

  const response = await request(app).get(`/api/v1/deals/${deal.id}/intelligence`).expect(200);
  expect(response.body.data.meta.status).toBe('failed');
  expect(response.body.data.marketDynamics.summary).toEqual(expect.any(String));
});
```

- [ ] **Step 2: Run the intelligence test file**

Run: `cd server && npm run test:file -- tests/integration/deal-intelligence.test.ts`

Expected: FAIL because the current payload only contains three modules and no `meta` block.

- [ ] **Step 3: Implement artifact-backed detail assembly**

Create `server/src/services/deal-intelligence.service.ts`:

```ts
import prisma from '../config/database';
import config from '../config/env';
import { AppError } from '../middleware/errorHandler';

const factSignature = (input: { dealUpdatedAt: Date; tmvAt?: Date | null; scoreAt?: Date | null; state: string }) =>
  [input.dealUpdatedAt.toISOString(), input.tmvAt?.toISOString() ?? 'no-tmv', input.scoreAt?.toISOString() ?? 'no-score', input.state].join('|');

export class DealIntelligenceService {
  async getDealDetail(dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        tmvResult: true,
        score: true,
        samples: {
          where: { status: 'sold' },
          orderBy: { observedAt: 'desc' },
          take: 6,
        },
        intelligenceArtifact: true,
      },
    });

    if (!deal) throw new AppError('Deal not found', 404);

    const signature = factSignature({
      dealUpdatedAt: deal.updatedAt,
      tmvAt: deal.tmvResult?.calculatedAt,
      scoreAt: deal.score?.calculatedAt,
      state: deal.operatorState,
    });

    const factual = this.buildFactualPayload(deal);
    const artifact = deal.intelligenceArtifact;

    if (artifact?.status === 'ready' && artifact.factSignature === signature && artifact.modules) {
      return { ...factual, ...artifact.modules, meta: { status: 'ready', generatedAt: artifact.generatedAt?.toISOString() ?? null, stale: false } };
    }

    const generated = await this.generateNarrativeModules(factual);

    await prisma.dealIntelligenceArtifact.upsert({
      where: { dealId },
      create: {
        dealId,
        factSignature: signature,
        status: generated.status,
        modules: generated.modules,
        generatedAt: generated.generatedAt,
        errorMessage: generated.errorMessage,
      },
      update: {
        factSignature: signature,
        status: generated.status,
        modules: generated.modules,
        generatedAt: generated.generatedAt,
        errorMessage: generated.errorMessage,
      },
    });

    return {
      ...factual,
      ...generated.modules,
      meta: {
        status: generated.status,
        generatedAt: generated.generatedAt?.toISOString() ?? null,
        stale: false,
      },
    };
  }
}
```

The payload returned by `buildFactualPayload` should include these sections exactly:

```ts
{
  deal: {
    id: deal.id,
    title: deal.title,
    imageUrl: deal.imageUrl,
    description: deal.description,
    source: deal.source,
    condition: deal.condition,
    location: deal.location,
    operatorState: deal.operatorState,
    price: Number(deal.price),
    marketValue: Number(deal.marketValue ?? deal.tmvResult?.tmv ?? deal.price),
    roi: Number(deal.roi ?? deal.score?.profitMargin ?? 0),
    dealScore: Number(deal.dealScore ?? deal.score?.compositeRank ?? 0),
  },
  comparableEvidence: {
    summary: `Based on ${deal.samples.length} recent sold comps.`,
    samples: deal.samples.map((sample) => ({
      title: sample.title ?? 'Comparable sale',
      price: Number(sample.finalPrice ?? sample.observedPrice),
      source: sample.source,
      observedAt: sample.observedAt.toISOString(),
    })),
  },
}
```

If Gemini fails, return fallback modules and set `status: 'failed'` instead of throwing.

- [ ] **Step 4: Re-run the intelligence tests**

Run: `cd server && npm run test:file -- tests/integration/deal-intelligence.test.ts`

Expected: PASS with both cached-ready and degraded-failed assertions green.

- [ ] **Step 5: Commit the intelligence service**

```bash
git add server/src/services/deal-intelligence.service.ts server/src/controllers/discovery.controller.ts server/src/routes/discovery.routes.ts server/tests/integration/deal-intelligence.test.ts
git commit -m "feat(server): add cached deal intelligence detail payloads"
```

## Task 4: Expose Real Watchlist, Portfolio, And Alerts Read Models

**Files:**
- Modify: `server/src/routes/watchlist.routes.ts`
- Create: `server/src/controllers/portfolio.controller.ts`
- Create: `server/src/services/portfolio.service.ts`
- Modify: `server/src/routes/portfolio.routes.ts`
- Modify: `server/src/controllers/alert.controller.ts`
- Modify: `server/src/services/alert.service.ts`
- Modify: `server/src/routes/alert.routes.ts`
- Modify: `server/tests/integration/watchlist.test.ts`
- Create: `server/tests/integration/portfolio.routes.test.ts`
- Modify: `server/tests/integration/alert.routes.test.ts`

- [ ] **Step 1: Write failing list-shape tests for the three sidebar pages**

```ts
const seedRankedDeal = async (overrides: Partial<{ title: string; operatorState: 'watching' | 'pursued' | 'acquired' | 'sold' | 'passed'; compositeRank: number; purchasePrice: number | null; targetResale: number | null }> = {}) => {
  const deal = await prisma.deal.create({
    data: {
      title: overrides.title ?? 'Seed Deal',
      source: 'facebook',
      sourceId: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: 'tech',
      price: 900,
      marketValue: 1400,
      estimatedProfit: 300,
      dealScore: overrides.compositeRank ?? 94,
      roi: 0.5,
      location: 'Austin, TX',
      operatorState: overrides.operatorState ?? 'watching',
      purchasePrice: overrides.purchasePrice ?? null,
      targetResale: overrides.targetResale ?? null,
      status: 'active',
    },
  });

  await prisma.tMVResult.create({
    data: {
      dealId: deal.id,
      tmv: 1400,
      confidence: 0.84,
      sampleCount: 18,
      volatility: 0.12,
      liquidityScore: 0.81,
      estimatedDaysToSell: 5,
    },
  });

  await prisma.score.create({
    data: {
      dealId: deal.id,
      profitMargin: 0.32,
      velocityScore: 0.78,
      riskScore: 0.18,
      compositeRank: overrides.compositeRank ?? 94,
    },
  });

  return deal;
};

it('lists watchlist deals from operator state without authentication', async () => {
  await seedRankedDeal({ title: 'Nikon Z6 II', operatorState: 'pursued', compositeRank: 94 });
  const response = await request(app).get('/api/v1/watchlist').expect(200);
  expect(response.body.data.items[0]).toEqual(expect.objectContaining({ operatorState: 'pursued' }));
});

it('lists acquired and sold deals in the portfolio route', async () => {
  await seedRankedDeal({ title: 'Sony A7C', operatorState: 'acquired', purchasePrice: 900, targetResale: 1350, compositeRank: 90 });
  const response = await request(app).get('/api/v1/portfolio').expect(200);
  expect(response.body.data.items[0]).toEqual(expect.objectContaining({ operatorState: 'acquired', purchasePrice: 900 }));
});

it('lists active operator alerts without authentication', async () => {
  const deal = await seedRankedDeal({ title: 'Milwaukee M18 Fuel', compositeRank: 88 });
  await prisma.operatorAlert.create({ data: { dealId: deal.id, type: 'high_score', summary: 'High score opportunity' } });
  const response = await request(app).get('/api/v1/alerts').expect(200);
  expect(response.body.data.items[0]).toEqual(expect.objectContaining({ summary: 'High score opportunity' }));
});
```

- [ ] **Step 2: Run the three integration files**

Run: `cd server && npm run test:file -- tests/integration/watchlist.test.ts tests/integration/portfolio.routes.test.ts tests/integration/alert.routes.test.ts`

Expected: FAIL because watchlist and alerts still require auth and portfolio is not implemented.

- [ ] **Step 3: Implement public operator list routes**

Make `GET /watchlist` public by moving it above `router.use(authenticate)` in `server/src/routes/watchlist.routes.ts`:

```ts
router.get('/', watchlistController.getOperatorWatchlist);

router.use(authenticate);
router.post('/', validate(addValidation), watchlistController.addToWatchlist);
router.delete('/:dealId', validate(dealIdParamValidation), watchlistController.removeFromWatchlist);
router.patch('/:dealId/notes', validate(dealIdParamValidation), watchlistController.updateNotes);
```

Add the new read method in `server/src/controllers/watchlist.controller.ts`:

```ts
async getOperatorWatchlist(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await discoveryService.listWatchlistDeals();
    res.status(200).json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}
```

Create `server/src/services/portfolio.service.ts`:

```ts
import prisma from '../config/database';

export class PortfolioService {
  async listPortfolio() {
    const deals = await prisma.deal.findMany({
      where: { operatorState: { in: ['acquired', 'sold'] } },
      include: { tmvResult: true, score: true },
      orderBy: { acquiredAt: 'desc' },
    });

    return deals.map((deal) => ({
      id: deal.id,
      title: deal.title,
      imageUrl: deal.imageUrl,
      operatorState: deal.operatorState,
      purchasePrice: deal.purchasePrice == null ? null : Number(deal.purchasePrice),
      targetResale: deal.targetResale == null ? null : Number(deal.targetResale),
      realizedProfit: deal.realizedProfit == null ? null : Number(deal.realizedProfit),
      marketValue: deal.marketValue == null ? Number(deal.tmvResult?.tmv ?? 0) : Number(deal.marketValue),
      dealScore: deal.dealScore == null ? Number(deal.score?.compositeRank ?? 0) : Number(deal.dealScore),
      acquiredAt: deal.acquiredAt?.toISOString() ?? null,
      soldAt: deal.soldAt?.toISOString() ?? null,
    }));
  }
}
```

Update `server/src/services/alert.service.ts` with a public operator list:

```ts
async listOperatorAlerts() {
  return prisma.operatorAlert.findMany({
    where: { status: 'active' },
    include: { deal: true },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 4: Re-run the sidebar backend tests**

Run: `cd server && npm run test:file -- tests/integration/watchlist.test.ts tests/integration/portfolio.routes.test.ts tests/integration/alert.routes.test.ts`

Expected: PASS with public list reads green and legacy auth mutation coverage still green.

- [ ] **Step 5: Commit the list routes**

```bash
git add server/src/routes/watchlist.routes.ts server/src/controllers/watchlist.controller.ts server/src/services/portfolio.service.ts server/src/controllers/portfolio.controller.ts server/src/routes/portfolio.routes.ts server/src/services/alert.service.ts server/src/controllers/alert.controller.ts server/src/routes/alert.routes.ts server/tests/integration/watchlist.test.ts server/tests/integration/portfolio.routes.test.ts server/tests/integration/alert.routes.test.ts
git commit -m "feat(server): add operator watchlist portfolio and alert views"
```

## Task 5: Add Frontend Contracts For Feed, Detail, And Sidebar Pages

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/hooks/useDeals.ts`
- Modify: `frontend/src/App.routes.test.tsx`

- [ ] **Step 1: Write failing route and hook-contract tests**

```ts
it('uses feed, watchlist, portfolio, and alerts as the canonical sidebar routes', () => {
  window.history.replaceState({}, '', '/');

  render(
    <AppSettingsProvider>
      <App />
    </AppSettingsProvider>
  );

  expect(screen.getByRole('link', { name: /feed/i })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: /watchlist/i })).toHaveAttribute('href', '/watchlist');
  expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', '/portfolio');
  expect(screen.getByRole('link', { name: /alerts/i })).toHaveAttribute('href', '/alerts');
});
```

- [ ] **Step 2: Run the route contract test**

Run: `cd frontend && npm test -- App.routes.test.tsx`

Expected: FAIL because the sidebar still exposes `Dashboard`, `All Deals`, `TMV Calculator`, and `Settings` as the primary links.

- [ ] **Step 3: Add the new typed contracts and client methods**

Extend `frontend/src/types/index.ts` with the new API shapes:

```ts
export interface FeedDeal {
  id: string;
  title: string;
  source: string;
  category: string;
  price: number;
  marketValue: number | null;
  estimatedProfit: number | null;
  dealScore: number | null;
  roi: number | null;
  imageUrl: string | null;
  condition: string | null;
  location: string | null;
  createdAt: string;
  operatorState: 'watching' | 'pursued' | 'acquired' | 'sold' | 'passed';
  tmv: {
    tmv: number;
    confidence: number;
    estimatedDaysToSell: number | null;
  } | null;
}

export interface DealDetailPayload {
  deal: {
    id: string;
    title: string;
    imageUrl: string | null;
    description: string | null;
    source: string;
    condition: string | null;
    location: string | null;
    operatorState: string;
    price: number;
    marketValue: number;
    roi: number;
    dealScore: number;
  };
  repairAnalysis: { skillLevel: string; summary: string; likelyIssue: string; partsCost: number };
  marketDynamics: { summary: string; targetPrice: number; priceHistory: number[] };
  comparableEvidence: { summary: string; samples: Array<{ title: string; price: number; source: string; observedAt: string }> };
  negotiation: { targetOffer: number; openingScript: string };
  sourcingNotes: { summary: string };
  risks: { summary: string; level: 'low' | 'medium' | 'high' };
  nextAction: { summary: string };
  meta: { status: 'ready' | 'failed' | 'pending'; generatedAt: string | null; stale: boolean };
}
```

Add client methods in `frontend/src/api/client.ts`:

```ts
getFeed: async (params: { search?: string; marketplace?: string; category?: string; sort?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.search) search.set('search', params.search);
  if (params.marketplace) search.set('marketplace', params.marketplace);
  if (params.category) search.set('category', params.category);
  if (params.sort) search.set('sort', params.sort);
  const query = search.toString();
  const res = await request<ApiResponse<{ items: FeedDeal[] }>>(`/feed${query ? `?${query}` : ''}`);
  return res.data.items;
},

huntDeal: async (id: string) => {
  const res = await request<ApiResponse<{ id: string; operatorState: string; pursuedAt: string | null }>>(`/deals/${id}/hunt`, { method: 'POST' });
  return res.data;
},

getDealDetail: async (id: string) => {
  const res = await request<ApiResponse<DealDetailPayload>>(`/deals/${id}/intelligence`);
  return res.data;
},
```

- [ ] **Step 4: Re-run the frontend route contract test**

Run: `cd frontend && npm test -- App.routes.test.tsx`

Expected: FAIL with missing page components or sidebar labels until the shell is updated in the next task, but TypeScript should accept the new contracts.

- [ ] **Step 5: Commit the client-contract layer**

```bash
git add frontend/src/types/index.ts frontend/src/api/client.ts frontend/src/hooks/useDeals.ts frontend/src/App.routes.test.tsx
git commit -m "feat(frontend): add discovery and intelligence api contracts"
```

## Task 6: Replace The Landing Experience With The Live Feed Shell

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/index.ts`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Sidebar.module.css`
- Modify: `frontend/src/components/layout/Layout.module.css`
- Create: `frontend/src/components/discovery/LiveDealCard.tsx`
- Create: `frontend/src/components/discovery/LiveDealCard.module.css`
- Create: `frontend/src/pages/Feed.tsx`
- Create: `frontend/src/pages/Feed.module.css`
- Create: `frontend/src/pages/Feed.test.tsx`
- Modify: `frontend/src/App.routes.test.tsx`

- [ ] **Step 1: Write the failing feed page test**

```tsx
const useFeedMock = vi.fn();

vi.mock('../hooks/useDeals', () => ({
  useFeed: (...args: unknown[]) => useFeedMock(...args),
  useHuntDeal: () => ({ hunt: vi.fn() }),
}));

it('renders the live deal stream and opens hunt actions through the new card component', async () => {
  useFeedMock.mockReturnValue({
    data: [
      {
        id: 'deal-1',
        title: 'Nikon Z6 II Body Only',
        source: 'facebook',
        category: 'tech',
        price: 900,
        marketValue: 1400,
        estimatedProfit: 450,
        dealScore: 94,
        roi: 0.5,
        imageUrl: 'https://images.example.com/nikon.jpg',
        condition: 'excellent',
        location: 'Round Rock, TX',
        createdAt: '2026-04-21T12:00:00.000Z',
        operatorState: 'watching',
        tmv: { tmv: 1400, confidence: 0.84, estimatedDaysToSell: 5 },
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Feed />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText(/live deal stream/i)).toBeInTheDocument();
  expect(screen.getByText(/nikon z6 ii body only/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /hunt/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the feed page test**

Run: `cd frontend && npm test -- src/pages/Feed.test.tsx`

Expected: FAIL because `Feed.tsx` and the `useFeed` hook do not exist yet.

- [ ] **Step 3: Implement the new shell and feed page**

Create `frontend/src/pages/Feed.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { LiveDealCard } from '../components/discovery/LiveDealCard';
import { useFeed, useHuntDeal } from '../hooks/useDeals';
import styles from './Feed.module.css';

export function Feed() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('all');
  const [sort, setSort] = useState('dealScore');
  const { data, loading } = useFeed({ search, marketplace: marketplace === 'all' ? undefined : marketplace, sort });
  const { hunt } = useHuntDeal();

  const subtitle = useMemo(() => 'Scanned local listings within 25 miles of Austin, TX', []);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search deals (e.g. Sony TV, Milwaukee...)" />
        </label>
        <select value={marketplace} onChange={(event) => setMarketplace(event.target.value)}>
          <option value="all">All</option>
          <option value="facebook">FB Marketplace</option>
          <option value="ebay">eBay</option>
          <option value="craigslist">Craigslist</option>
        </select>
        <button type="button" className={styles.locationChip}>
          <MapPin size={14} />
          Austin, TX
        </button>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="dealScore">Sort: Deal Score</option>
          <option value="estimatedProfit">Sort: Profit</option>
          <option value="createdAt">Sort: Newest</option>
        </select>
      </div>

      <header className={styles.header}>
        <h1>Live Deal Stream</h1>
        <p>{subtitle}</p>
      </header>

      <section className={styles.grid}>
        {(data ?? []).map((deal) => (
          <LiveDealCard
            key={deal.id}
            deal={deal}
            onOpen={() => navigate(`/deals/${deal.id}`)}
            onHunt={async () => {
              await hunt(deal.id);
              navigate(`/deals/${deal.id}`);
            }}
          />
        ))}
        {!loading && (data ?? []).length === 0 ? <div className={styles.empty}>No deals match the current filters.</div> : null}
      </section>
    </div>
  );
}
```

Update `frontend/src/App.tsx` routes:

```tsx
<Route path="/" element={<Feed />} />
<Route path="/watchlist" element={<Watchlist />} />
<Route path="/portfolio" element={<Portfolio />} />
<Route path="/alerts" element={<Alerts />} />
<Route path="/deals/:id" element={<DealDetail />} />
<Route path="/deals" element={<Navigate to="/" replace />} />
```

Update the sidebar nav items in `frontend/src/components/layout/Sidebar.tsx`:

```tsx
const navItems: NavItem[] = [
  { path: '/', label: 'Feed', icon: <Radio size={20} />, end: true },
  { path: '/watchlist', label: 'Watchlist', icon: <Bookmark size={20} /> },
  { path: '/portfolio', label: 'Portfolio', icon: <BriefcaseBusiness size={20} /> },
  { path: '/alerts', label: 'Alerts', icon: <Bell size={20} /> },
];
```

- [ ] **Step 4: Run the feed and route tests**

Run: `cd frontend && npm test -- src/pages/Feed.test.tsx src/App.routes.test.tsx`

Expected: PASS with the new feed route and shell labels.

- [ ] **Step 5: Commit the shell and feed**

```bash
git add frontend/src/App.tsx frontend/src/pages/index.ts frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.module.css frontend/src/components/layout/Layout.module.css frontend/src/components/discovery/LiveDealCard.tsx frontend/src/components/discovery/LiveDealCard.module.css frontend/src/pages/Feed.tsx frontend/src/pages/Feed.module.css frontend/src/pages/Feed.test.tsx frontend/src/App.routes.test.tsx
git commit -m "feat(frontend): replace dashboard with live deal stream shell"
```

## Task 7: Expand The Deal Detail Page To The Full Intelligence View

**Files:**
- Modify: `frontend/src/pages/DealDetail.tsx`
- Modify: `frontend/src/pages/DealDetail.module.css`
- Create: `frontend/src/components/discovery/IntelligencePanel.tsx`
- Create: `frontend/src/components/discovery/IntelligencePanel.module.css`
- Modify: `frontend/src/pages/DealDetail.test.tsx`

- [ ] **Step 1: Write the failing detail-page test for the full module stack**

```tsx
const useDealDetailMock = vi.fn();

vi.mock('../hooks/useDeals', () => ({
  useDealDetail: (...args: unknown[]) => useDealDetailMock(...args),
}));

const renderDealDetail = () =>
  render(
    <MemoryRouter initialEntries={['/deals/deal-1']}>
      <Routes>
        <Route path="/deals/:id" element={<DealDetail />} />
      </Routes>
    </MemoryRouter>
  );

it('renders the full intelligence stack and degraded meta state', () => {
  useDealDetailMock.mockReturnValue({
    data: {
      deal: {
        id: 'deal-1',
        title: 'Nikon Z6 II Body Only - Low shutter count',
        imageUrl: 'https://images.example.com/nikon.jpg',
        description: 'Switching to Sony. Camera is in mint condition.',
        source: 'facebook',
        condition: 'excellent',
        location: 'Round Rock, TX',
        operatorState: 'pursued',
        price: 900,
        marketValue: 1400,
        roi: 0.5,
        dealScore: 94,
      },
      repairAnalysis: { skillLevel: 'BEGINNER', summary: 'Clean flip.', likelyIssue: 'None', partsCost: 0 },
      marketDynamics: { summary: 'Cooling slightly.', targetPrice: 1400, priceHistory: [1500, 1475, 1450, 1425, 1400, 1400] },
      comparableEvidence: { summary: 'Sold comps are tight.', samples: [{ title: 'Sold comp', price: 1400, source: 'ebay', observedAt: '2026-04-20T12:00:00.000Z' }] },
      negotiation: { targetOffer: 675, openingScript: 'I can do $675 today.' },
      sourcingNotes: { summary: 'Seller is rotating gear.' },
      risks: { summary: 'Verify shutter count.', level: 'low' },
      nextAction: { summary: 'Message seller now.' },
      meta: { status: 'failed', generatedAt: null, stale: false },
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  renderDealDetail();

  expect(screen.getByText(/comparable evidence/i)).toBeInTheDocument();
  expect(screen.getByText(/sourcing notes/i)).toBeInTheDocument();
  expect(screen.getByText(/recommended next action/i)).toBeInTheDocument();
  expect(screen.getByText(/verify shutter count/i)).toBeInTheDocument();
  expect(screen.getByText(/factual detail loaded, ai narrative degraded/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the detail page test file**

Run: `cd frontend && npm test -- src/pages/DealDetail.test.tsx`

Expected: FAIL because the page still expects the old three-module payload.

- [ ] **Step 3: Rebuild the detail page around the richer payload**

Use a single detail hook instead of parallel `useDeal`, `useRankedDeal`, and `useDealIntelligence` calls:

```tsx
const { data, loading, refetch } = useDealDetail(id || '');
const deal = data?.deal;

if (!deal) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.emptyTitle}>Deal not found</h1>
        <p className={styles.emptyText}>No deal data available.</p>
      </div>
    </div>
  );
}
```

Render the right-column modules with the new panel component:

```tsx
<IntelligencePanel title="Comparable Evidence">
  <p className={styles.analysisText}>{data.comparableEvidence.summary}</p>
  <div className={styles.compGrid}>
    {data.comparableEvidence.samples.map((sample) => (
      <div key={`${sample.title}-${sample.observedAt}`} className={styles.compRow}>
        <span>{sample.title}</span>
        <strong>{formatCurrency(sample.price)}</strong>
      </div>
    ))}
  </div>
</IntelligencePanel>

<IntelligencePanel title="Sourcing Notes">
  <p className={styles.analysisText}>{data.sourcingNotes.summary}</p>
</IntelligencePanel>

<IntelligencePanel title="Risks">
  <p className={styles.analysisText}>{data.risks.summary}</p>
</IntelligencePanel>

<IntelligencePanel title="Recommended Next Action">
  <p className={styles.analysisText}>{data.nextAction.summary}</p>
</IntelligencePanel>
```

Show a degraded-state banner when `data.meta.status === 'failed'`:

```tsx
{data.meta.status === 'failed' ? (
  <div className={styles.degradedBanner}>Factual detail loaded, AI narrative degraded.</div>
) : null}
```

- [ ] **Step 4: Re-run the detail tests**

Run: `cd frontend && npm test -- src/pages/DealDetail.test.tsx`

Expected: PASS with the richer intelligence stack and degraded-state banner covered.

- [ ] **Step 5: Commit the detail page rewrite**

```bash
git add frontend/src/pages/DealDetail.tsx frontend/src/pages/DealDetail.module.css frontend/src/components/discovery/IntelligencePanel.tsx frontend/src/components/discovery/IntelligencePanel.module.css frontend/src/pages/DealDetail.test.tsx
git commit -m "feat(frontend): add rich deal intelligence detail view"
```

## Task 8: Build Real Watchlist, Portfolio, And Alerts Pages

**Files:**
- Create: `frontend/src/pages/Watchlist.tsx`
- Create: `frontend/src/pages/Watchlist.module.css`
- Create: `frontend/src/pages/Portfolio.tsx`
- Create: `frontend/src/pages/Portfolio.module.css`
- Create: `frontend/src/pages/Alerts.tsx`
- Create: `frontend/src/pages/Alerts.module.css`
- Modify: `frontend/src/pages/index.ts`
- Modify: `frontend/src/hooks/useDeals.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add failing smoke tests for the remaining sidebar pages**

```tsx
const useWatchlistMock = vi.fn();
const usePortfolioMock = vi.fn();
const useAlertsMock = vi.fn();

vi.mock('../hooks/useDeals', () => ({
  useWatchlist: () => useWatchlistMock(),
  usePortfolio: () => usePortfolioMock(),
  useAlerts: () => useAlertsMock(),
}));

const renderWatchlist = () => render(<MemoryRouter><Watchlist /></MemoryRouter>);
const renderPortfolio = () => render(<MemoryRouter><Portfolio /></MemoryRouter>);
const renderAlerts = () => render(<MemoryRouter><Alerts /></MemoryRouter>);

it('renders watchlist cards with pursued state badges', () => {
  useWatchlistMock.mockReturnValue({ data: [{ id: 'deal-1', title: 'Nikon Z6 II', operatorState: 'pursued', price: 900, marketValue: 1400, dealScore: 94, imageUrl: null, source: 'facebook', category: 'tech', location: 'Round Rock, TX', createdAt: '2026-04-21T12:00:00.000Z', estimatedProfit: 450, roi: 0.5, condition: 'excellent', tmv: { tmv: 1400, confidence: 0.84, estimatedDaysToSell: 5 } }], loading: false, error: null, refetch: vi.fn() });
  renderWatchlist();
  expect(screen.getByText(/pursued/i)).toBeInTheDocument();
});

it('renders portfolio metrics for acquired inventory', () => {
  usePortfolioMock.mockReturnValue({ data: [{ id: 'deal-1', title: 'Sony A7C', operatorState: 'acquired', purchasePrice: 900, targetResale: 1350, realizedProfit: null, marketValue: 1400, dealScore: 90, imageUrl: null, acquiredAt: '2026-04-21T12:00:00.000Z', soldAt: null }], loading: false, error: null, refetch: vi.fn() });
  renderPortfolio();
  expect(screen.getByText('$900')).toBeInTheDocument();
  expect(screen.getByText(/acquired/i)).toBeInTheDocument();
});

it('renders alert summaries and links them back to deal detail', () => {
  useAlertsMock.mockReturnValue({ data: [{ id: 'alert-1', summary: 'High score opportunity', type: 'high_score', createdAt: '2026-04-21T12:00:00.000Z', deal: { id: 'deal-1', title: 'Milwaukee Impact Driver' } }], loading: false, error: null, refetch: vi.fn() });
  renderAlerts();
  expect(screen.getByRole('link', { name: /milwaukee impact driver/i })).toHaveAttribute('href', '/deals/deal-1');
});
```

- [ ] **Step 2: Run the frontend smoke tests**

Run: `cd frontend && npm test -- src/pages/Watchlist.test.tsx src/pages/Portfolio.test.tsx src/pages/Alerts.test.tsx`

Expected: FAIL because the page modules do not exist yet.

- [ ] **Step 3: Implement the three real pages with shared feed language**

Create `frontend/src/pages/Watchlist.tsx`:

```tsx
import { LiveDealCard } from '../components/discovery/LiveDealCard';
import { useWatchlist } from '../hooks/useDeals';
import styles from './Watchlist.module.css';

export function Watchlist() {
  const { data, loading } = useWatchlist();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Watchlist</h1>
        <p>Tracked and pursued opportunities.</p>
      </header>
      <div className={styles.grid}>
        {(data ?? []).map((deal) => <LiveDealCard key={deal.id} deal={deal} compact />)}
        {!loading && (data ?? []).length === 0 ? <div className={styles.empty}>No watched deals yet.</div> : null}
      </div>
    </div>
  );
}
```

Create `frontend/src/pages/Portfolio.tsx`:

```tsx
import { usePortfolio } from '../hooks/useDeals';
import styles from './Portfolio.module.css';

export function Portfolio() {
  const { data } = usePortfolio();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Portfolio</h1>
        <p>Acquired inventory and realized outcomes.</p>
      </header>
      <div className={styles.table}>
        {(data ?? []).map((item) => (
          <article key={item.id} className={styles.row}>
            <h2>{item.title}</h2>
            <span>{item.operatorState}</span>
            <strong>{item.purchasePrice == null ? '—' : `$${item.purchasePrice}`}</strong>
            <strong>{item.targetResale == null ? '—' : `$${item.targetResale}`}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
```

Create `frontend/src/pages/Alerts.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useAlerts } from '../hooks/useDeals';
import styles from './Alerts.module.css';

export function Alerts() {
  const { data } = useAlerts();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Alerts</h1>
        <p>Opportunity and risk changes across the active book.</p>
      </header>
      <div className={styles.list}>
        {(data ?? []).map((alert) => (
          <article key={alert.id} className={styles.item}>
            <p>{alert.summary}</p>
            {alert.deal ? <Link to={`/deals/${alert.deal.id}`}>{alert.deal.title}</Link> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Re-run the frontend page smoke tests**

Run: `cd frontend && npm test -- src/pages/Watchlist.test.tsx src/pages/Portfolio.test.tsx src/pages/Alerts.test.tsx`

Expected: PASS with each sidebar page rendering real data and links.

- [ ] **Step 5: Commit the remaining pages**

```bash
git add frontend/src/pages/Watchlist.tsx frontend/src/pages/Watchlist.module.css frontend/src/pages/Portfolio.tsx frontend/src/pages/Portfolio.module.css frontend/src/pages/Alerts.tsx frontend/src/pages/Alerts.module.css frontend/src/pages/index.ts frontend/src/hooks/useDeals.ts frontend/src/api/client.ts frontend/src/App.tsx
git commit -m "feat(frontend): add watchlist portfolio and alerts pages"
```

## Task 9: Full Verification And Cleanup

**Files:**
- Modify as needed: any files touched in Tasks 1-8
- Test: `server/tests/integration/*.test.ts`, `frontend/src/**/*.test.tsx`

- [ ] **Step 1: Run the focused backend verification**

Run: `cd server && npm run test:file -- tests/integration/feed.routes.test.ts tests/integration/deal-intelligence.test.ts tests/integration/watchlist.test.ts tests/integration/portfolio.routes.test.ts tests/integration/alert.routes.test.ts`

Expected: PASS with all operator-shell backend tests green.

- [ ] **Step 2: Run the focused frontend verification**

Run: `cd frontend && npm test -- src/App.routes.test.tsx src/pages/Feed.test.tsx src/pages/DealDetail.test.tsx src/pages/Watchlist.test.tsx src/pages/Portfolio.test.tsx src/pages/Alerts.test.tsx`

Expected: PASS with all route and page smoke tests green.

- [ ] **Step 3: Run the build verification**

Run: `npm run build`

Expected: PASS with both workspaces compiling successfully.

- [ ] **Step 4: Sanity-check the app manually**

Run: `npm run dev`

Verify these exact flows in the browser:
- `/` loads the dark live deal stream shell
- clicking a deal opens `/deals/:id`
- clicking `Hunt` opens `/deals/:id` and the watchlist page later shows the deal as `pursued`
- `/watchlist`, `/portfolio`, and `/alerts` all render real data or clean empty states
- a failed Gemini call still leaves the detail page usable

- [ ] **Step 5: Commit the verification pass**

```bash
git add frontend server
git commit -m "test: verify live deal stream operator shell"
```

## Self-Review

### Spec coverage
- Screenshot-first `Feed`: covered by Task 6.
- Rich `Deal Detail` with factual and AI-backed sections: covered by Task 3 and Task 7.
- Real `Watchlist`, `Portfolio`, and `Alerts`: covered by Task 4 and Task 8.
- Hybrid cached intelligence generation: covered by Task 3.
- `Hunt` opens detail and marks `pursued`: covered by Task 2 and Task 6.

### Placeholder scan
- No placeholder markers remain.
- Each task names exact files and commands.
- Every test and implementation step includes concrete code or exact commands.

### Type consistency
- Backend operator state is consistently `watching | pursued | acquired | sold | passed`.
- Frontend feed cards, watchlist cards, and detail payload all use `dealScore`, `marketValue`, and `estimatedProfit` consistently.
- Detail payload uses `nextAction`, `sourcingNotes`, `comparableEvidence`, and `meta` in both backend and frontend tasks.
