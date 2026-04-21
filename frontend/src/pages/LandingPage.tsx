import {
  ArrowRight,
  Search,
  LineChart,
  ShieldCheck,
  Zap,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LandingCard, SectionHeader, FaqItem } from '../components/landing';
import styles from './LandingPage.module.css';

const trustItems = ['eBay', 'Facebook Marketplace', 'Craigslist', 'OfferUp', 'Mercari'];

const features = [
  {
    title: 'Unified deal feed',
    description: 'Watch listings from multiple marketplaces in one place with clean filters.',
    icon: <Search size={18} />,
    highlight: 'No more tab-hopping',
  },
  {
    title: 'TMV price intelligence',
    description: 'Estimate true market value from comparable sold data to spot margin fast.',
    icon: <LineChart size={18} />,
    highlight: 'Confidence-scored valuation',
  },
  {
    title: 'Risk-aware ranking',
    description: 'Prioritize deals by upside, liquidity, and estimated time-to-sell.',
    icon: <ShieldCheck size={18} />,
    highlight: 'Balanced for real profit',
  },
  {
    title: 'Profit-first dashboard',
    description: 'See your best active opportunities and expected return in one view.',
    icon: <Wallet size={18} />,
    highlight: 'Built for decision speed',
  },
];

const steps = [
  {
    title: 'Set targets',
    description: 'Choose categories, locations, and minimum margin thresholds.',
  },
  {
    title: 'Review ranked deals',
    description: 'Deal Hunter scores listings and surfaces the best opportunities first.',
  },
  {
    title: 'Buy and flip with confidence',
    description: 'Use TMV and risk signals to decide faster and protect margin.',
  },
];

const testimonials = [
  {
    quote:
      'I stopped chasing random listings. The ranking view points me to the 2-3 deals that are actually worth messaging.',
    author: 'Marcus T.',
    role: 'Part-time electronics flipper',
  },
  {
    quote:
      'TMV confidence helps me skip weak buys. My average hold time dropped from 11 days to 6 days.',
    author: 'Erin C.',
    role: 'Furniture reseller',
  },
  {
    quote:
      'The ranked feed cuts through noise fast. I can focus on the two or three listings that actually deserve a message.',
    author: 'Luis R.',
    role: 'Sneaker and collectibles seller',
  },
];

const faqs = [
  {
    question: 'What marketplaces does Deal Hunter support?',
    answer:
      'Deal Hunter is built to aggregate listings across major marketplaces like eBay, Facebook Marketplace, Craigslist, OfferUp, and Mercari, with support expanding over time.',
  },
  {
    question: 'How is TMV calculated?',
    answer:
      'TMV combines comparable sold listing data, condition matching, and local market signals. Each estimate includes confidence so you can judge reliability before buying.',
  },
  {
    question: 'Is this only for full-time resellers?',
    answer:
      'No. It is designed for both side-hustle sellers and full-time operators who need cleaner deal selection and valuation support.',
  },
  {
    question: 'Can I test it before committing?',
    answer:
      'Yes. Start by exploring the ranked feed, run TMV analysis on a deal, and verify whether the scoring matches your sourcing process.',
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Deal Hunter</p>
          <h1 className={styles.heroTitle}>Find underpriced deals before everyone else does.</h1>
          <p className={styles.heroDescription}>
            Modern sourcing intelligence for flippers and resellers. Discover listings, estimate true
            market value, and focus on opportunities with real margin.
          </p>
          <div className={styles.heroActions}>
            <Link to="/" className={styles.primaryCta}>
              Open Dashboard <ArrowRight size={16} />
            </Link>
            <Link to="/deals" className={styles.secondaryCta}>
              Browse Deals
            </Link>
          </div>
        </div>

        <aside className={styles.heroPanel}>
          <p className={styles.panelLabel}>Live opportunity snapshot</p>
          <div className={styles.panelMetric}>
            <span className={styles.panelValue}>128</span>
            <span className={styles.panelMeta}>Active deals scored today</span>
          </div>
          <div className={styles.panelMetric}>
            <span className={styles.panelValue}>31%</span>
            <span className={styles.panelMeta}>Average top-listing margin</span>
          </div>
          <div className={styles.panelMetric}>
            <span className={styles.panelValue}>4.8d</span>
            <span className={styles.panelMeta}>Estimated sell time for top picks</span>
          </div>
        </aside>
      </header>

      <section className={styles.trustBar} aria-label="Trusted marketplaces">
        {trustItems.map((item) => (
          <span key={item} className={styles.trustItem}>
            {item}
          </span>
        ))}
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to source profitable flips"
          description="Deal Hunter combines discovery, valuation, and ranking into one focused workflow."
        />
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <LandingCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              highlight={feature.highlight}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="How It Works"
          title="From listing feed to confident buy decision"
          centered
        />
        <div className={styles.stepGrid}>
          {steps.map((step, index) => (
            <article key={step.title} className={styles.stepCard}>
              <span className={styles.stepNumber}>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.valueSection}`}>
        <SectionHeader
          eyebrow="Why Deal Hunter"
          title="Spend less time searching and more time closing profitable flips"
        />
        <div className={styles.valueGrid}>
          <div className={styles.valueBullets}>
            <p>Built for practical buying decisions in fast-moving secondary markets.</p>
            <ul>
              <li>
                <CheckCircle2 size={16} /> Prioritized opportunities instead of raw listing noise.
              </li>
              <li>
                <CheckCircle2 size={16} /> Confidence scoring so you know when to trust valuation.
              </li>
              <li>
                <CheckCircle2 size={16} /> Risk and velocity metrics to protect cash flow.
              </li>
            </ul>
          </div>
          <div className={styles.valueStats}>
            <div>
              <strong>$2,340</strong>
              <span>Average monthly potential upside surfaced</span>
            </div>
            <div>
              <strong>68%</strong>
              <span>Users report faster sourcing decisions</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Always-on ranked opportunity review</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Testimonials"
          title="Used by real resellers"
          description="Teams and solo operators use Deal Hunter to tighten sourcing and improve margin."
          centered
        />
        <div className={styles.testimonialGrid}>
          {testimonials.map((testimonial) => (
            <article key={testimonial.author} className={styles.testimonialCard}>
              <p className={styles.testimonialQuote}>“{testimonial.quote}”</p>
              <p className={styles.testimonialAuthor}>{testimonial.author}</p>
              <p className={styles.testimonialRole}>{testimonial.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader eyebrow="FAQ" title="Common questions" centered />
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.finalEyebrow}>Start Sourcing Smarter</p>
          <h2>Turn market noise into clear buy signals.</h2>
          <p>Open Deal Hunter now and review your highest-ranked opportunities in minutes.</p>
        </div>
        <Link to="/" className={styles.finalButton}>
          Launch Deal Hunter <Zap size={16} />
        </Link>
      </section>
    </div>
  );
}
