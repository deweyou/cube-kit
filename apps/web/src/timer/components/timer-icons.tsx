interface TimerIconProps {
  size?: number;
}

const iconProps = (size: number) => ({
  'aria-hidden': true,
  fill: 'none',
  height: size,
  viewBox: '0 0 24 24',
  width: size,
  xmlns: 'http://www.w3.org/2000/svg',
});

export const RefreshTimerIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6M18 3v4h-4M6 21v-4h4"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
  </svg>
);

export const ChevronDownIcon = ({ size = 14 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m7 10 5 5 5-5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const ChevronLeftIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m15 6-6 6 6 6"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const ChevronRightIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m9 6 6 6-6 6"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const CancelIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeLinecap="square" strokeWidth="2" />
  </svg>
);

export const CheckIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m5 12 4 4 10-10"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

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

export const HomeNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M4 11.5 12 5l8 6.5M6.5 10.5V20h11V10.5M10 20v-5h4v5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const HistoryNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M5 4h14v17H5V4ZM8 8h8M8 12h4M8 16h6M16 12l2 2-2 2"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
  </svg>
);

export const ChartNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M5 20V4M5 20h16M9 16v-5M13 16V8M17 16v-9"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
  </svg>
);

export const FormulaNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M5 5h14M7 9h10M9 13h6M7 19l4-4M11 19l-4-4M15 19l2-4 2 4"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const SettingsNavIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5 6.8 15M17.2 9l2.6-1.5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
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

export const SunIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
  </svg>
);

export const MoonIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const ThemeMoonIcon = ({ size = 18 }: TimerIconProps) => (
  <svg
    aria-hidden
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18.5 15.2A7 7 0 0 1 9 5.5 7.5 7.5 0 1 0 18.5 15.2Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path d="M18 4v3M16.5 5.5h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
  </svg>
);

export const SidebarCollapseIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m7 7 10 10M17 7 7 17"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const SidebarExpandIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="m9 6 6 6-6 6"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export const LanguageIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M4 5h9M8.5 3v2M10.5 5c-.8 3.2-3 5.8-6 7.5M6 8c1.2 2 2.9 3.4 5 4.3M13 20l4-9 4 9M14.4 17h5.2"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2"
    />
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

export const DeleteIcon = ({ size = 18 }: TimerIconProps) => (
  <svg {...iconProps(size)}>
    <path
      d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="2"
    />
  </svg>
);
