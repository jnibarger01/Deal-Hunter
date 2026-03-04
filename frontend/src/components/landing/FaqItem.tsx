import styles from './FaqItem.module.css';

interface FaqItemProps {
  question: string;
  answer: string;
}

export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <details className={styles.item}>
      <summary className={styles.question}>{question}</summary>
      <p className={styles.answer}>{answer}</p>
    </details>
  );
}
