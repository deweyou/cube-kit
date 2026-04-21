interface ScrambleImageProps {
  svg: string;
}

export const ScrambleImage = ({ svg }: ScrambleImageProps) => (
  <div
    style={{
      width: '100%',
      maxWidth: 220,
      aspectRatio: '1',
      background: 'color-mix(in srgb, var(--ui-color-surface) 80%, transparent)',
      borderRadius: 'var(--ui-radius-auto)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    }}
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);
