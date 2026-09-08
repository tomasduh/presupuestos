import type { ReactNode } from 'react';
import { FiChevronRight } from 'react-icons/fi';

interface Props {
  title: string;
  count: number;
  /** Forces the section open (e.g. while a search filter is active). Manual toggling by the
   *  user is preserved as long as this value doesn't change between renders. */
  open?: boolean;
  children: ReactNode;
}

export default function AccordionSection({ title, count, open = false, children }: Props) {
  return (
    <details className="accordion" open={open}>
      <summary className="accordion-summary">
        <FiChevronRight className="accordion-chevron" aria-hidden="true" />
        <span>{title}</span>
        <span className="badge">{count}</span>
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}
