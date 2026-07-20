interface TimerIconProps {
  className?: string;
  size?: number;
}

const iconProps = (size: number, className?: string) => ({
  'aria-hidden': true,
  className,
  fill: 'none',
  height: size,
  viewBox: '0 0 24 24',
  width: size,
  xmlns: 'http://www.w3.org/2000/svg',
});

export const TimerNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M9 3h6M12 3v3M16.5 7.5l2-2M12 13V9M12 13l3 2"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const ResultsListNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M8 6h11M8 12h11M8 18h11"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
    <path
      d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="3"
    />
  </svg>
);

export const FormulaStudyNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M4.5 5.5h5.2A2.3 2.3 0 0 1 12 7.8V20a3 3 0 0 0-2.2-1H4.5V5.5ZM19.5 5.5h-5.2A2.3 2.3 0 0 0 12 7.8V20a3 3 0 0 1 2.2-1h5.3V5.5Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M7.5 10h2M7.5 14h1.6M15 10h2.2M15 15l3-4M18 15l-3-4"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const SettingsGearNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M10.1 3.5h3.8l.7 2.4c.5.2 1 .5 1.4.8l2.4-.7 1.9 3.3-1.8 1.7a8 8 0 0 1 0 2l1.8 1.7-1.9 3.3-2.4-.7c-.4.3-.9.6-1.4.8l-.7 2.4h-3.8l-.7-2.4c-.5-.2-1-.5-1.4-.8l-2.4.7-1.9-3.3L5.5 13a8 8 0 0 1 0-2L3.7 9.3 5.6 6l2.4.7c.4-.3.9-.6 1.4-.8l.7-2.4Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const AddIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="square" strokeWidth="2" />
  </svg>
);

export const EditIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M5 19h4l10-10-4-4L5 15v4ZM13.5 6.5l4 4M4 22h16"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const RefreshIcon = ({ className, size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size, className)}>
    <path
      d="M19 8a8 8 0 1 0 1 6M19 8V3M19 8h-5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const PreviousIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m14.5 6-6 6 6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const NextIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m9.5 6 6 6-6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const DeleteIcon = ({ className, size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size, className)}>
    <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path
      d="M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M6.5 7 7.4 19.3A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.7L17.5 7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

export const CloseIcon = ({ className, size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size, className)}>
    <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeLinecap="square" strokeWidth="2" />
  </svg>
);

export const CopyIcon = ({ className, size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size, className)}>
    <rect height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="10" x="9" y="8" />
    <path
      d="M15 6.5V5.8A1.8 1.8 0 0 0 13.2 4H6.8A1.8 1.8 0 0 0 5 5.8v9.4A1.8 1.8 0 0 0 6.8 17H7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const CheckIcon = ({ className, size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size, className)}>
    <path
      d="m6 12.5 3.7 3.7L18 8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);
