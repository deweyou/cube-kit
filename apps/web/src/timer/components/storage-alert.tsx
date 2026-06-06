interface StorageAlertProps {
  message?: string;
}

export const StorageAlert = ({ message }: StorageAlertProps) => {
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
      成绩暂时无法保存：{message}
    </p>
  );
};
