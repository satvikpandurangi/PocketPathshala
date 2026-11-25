import { useEffect, useRef, type ReactNode } from 'react';
const paths = {
  book: 'M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  chart: 'M4 3v18h17M8 16v-4M13 16V7M18 16V4',
  cloud: 'M6 18a5 5 0 1 1 .5-10A6 6 0 0 1 18 7a5.5 5.5 0 0 1 0 11H6Z',
  wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0M12 20h.01',
  device: 'M4 2h16v20H4zM10 18h4',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12M6 18 18 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  refresh:
    'M20 7v5h-5M4 17v-5h5M5.4 7a8 8 0 0 1 13.2-1L20 9M4 15l1.4 3a8 8 0 0 0 13.2-1',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  speaker: 'M11 5 6 9H2v6h4l5 4V5Zm4 3a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  leaf: 'M20 3C8 2 2 6 4 14c2 8 16 6 16-11ZM4 20 16 8',
  info: 'M12 8h.01M12 12v5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
};
export function Icon({
  name,
  className = '',
}: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Avatar({
  id,
  className = '',
}: {
  id: string;
  className?: string;
}) {
  const hash = [...id].reduce((n, c) => n + c.charCodeAt(0), 0),
    colors = ['#EEDCC4', '#DDE5D6', '#E1E3EE', '#F0DAD3', '#E5DFCC'],
    shirt = ['#DDA34F', '#648B79', '#7584B4', '#B77A68', '#85945B'];
  const tone = ['#E9B17A', '#CF9462', '#DBA573'][hash % 3],
    long = hash % 2 === 0;
  return (
    <svg
      className={`portrait ${className}`}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <rect width="72" height="72" rx="22" fill={colors[hash % 5]} />
      {long && (
        <path d="M16 39C12 14 23 8 36 8s24 7 20 33l-3 15H19Z" fill="#34312F" />
      )}
      <path
        d="M12 72V63c0-14 14-19 24-19s24 5 24 19v9"
        fill={shirt[hash % 5]}
      />
      <path d="M30 42h12v12c-3 4-9 4-12 0" fill={tone} />
      <ellipse cx="36" cy="31" rx="18" ry="21" fill={tone} />
      <path
        d={
          long
            ? 'M18 31C14 10 28 7 36 8c14 0 23 11 18 25-3-3-6-9-7-15-7 10-17 11-29 13Z'
            : 'M17 29C11 12 26 6 39 8c13 2 20 10 16 24-4-2-7-7-8-13-9 7-21 8-30 10Z'
        }
        fill="#34312F"
      />
      <path
        d="M28 32h1m14 0h1"
        stroke="#34312F"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M31 41q5 4 10 0"
        stroke="#895142"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      {long && (
        <>
          <circle cx="16" cy="43" r="5" fill="#34312F" />
          <circle cx="56" cy="43" r="5" fill="#34312F" />
          <circle cx="16" cy="47" r="2.5" fill="#E07B2E" />
          <circle cx="56" cy="47" r="2.5" fill="#E07B2E" />
        </>
      )}
    </svg>
  );
}
export function Regrouping() {
  return (
    <div
      className="regrouping"
      aria-label="Regroup 52 as 4 tens and 12 ones. Subtract 2 tens and 7 ones to get 2 tens and 5 ones."
    >
      <div />
      <div>Tens</div>
      <div>Ones</div>
      <div className="regroup-label">52</div>
      <div>
        <span className="regroup-muted">5</span>
        <strong>4</strong>
      </div>
      <div>
        <span className="regroup-muted">2</span>
        <strong>12</strong>
      </div>
      <div className="regroup-label">− 27</div>
      <div>− 2</div>
      <div>− 7</div>
      <div className="regroup-result">25</div>
      <div className="regroup-result">2</div>
      <div className="regroup-result">5</div>
    </div>
  );
}
export function LearnerDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) queueMicrotask(() => previous.focus());
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="native-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
