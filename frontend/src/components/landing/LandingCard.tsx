import type { ReactNode } from 'react';
import styles from './LandingCard.module.css';

interface LandingCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  highlight?: string;
}

export function LandingCard({ title, description, icon, highlight }: LandingCardProps) {
  return (
    <article className={styles.card}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {highlight && <p className={styles.highlight}>{highlight}</p>}
    </article>
  );
}
