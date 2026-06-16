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
    <path
      d="M8 3h8M12 3v3M7 9.5a7 7 0 1 0 10 0M12 11v4l3 2"
      stroke="currentColor"
      strokeLinecap="square"
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
