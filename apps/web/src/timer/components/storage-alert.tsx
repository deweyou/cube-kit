interface StorageAlertProps {
  formatMessage: (message: string) => string;
  message?: string;
}

export const StorageAlert = ({ formatMessage, message }: StorageAlertProps) => {
  if (!message) return null;

  return (
    <p
      role="status"
      style={{
        margin: 0,
        border: '1px solid var(--ui-color-warning-border, #facc15)',
        borderRadius: 8,
        color: 'var(--ui-color-warning-text, #facc15)',
        fontSize: '0.8rem',
        padding: '8px 10px',
      }}
    >
      {formatMessage(message)}
    </p>
  );
};
