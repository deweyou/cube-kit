import { Button } from '@deweyou-design/react/button';

interface ResultActionsProps {
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}

export const ResultActions = ({ onContinue, onPlusTwo, onDnf, onDelete }: ResultActionsProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <Button variant="filled" color="primary" size="md" onClick={onContinue}>
      继续
    </Button>
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="outlined" color="neutral" size="sm" onClick={onPlusTwo}>
        +2
      </Button>
      <Button variant="outlined" color="danger" size="sm" onClick={onDnf}>
        DNF
      </Button>
      <Button variant="outlined" color="danger" size="sm" onClick={onDelete}>
        删除
      </Button>
    </div>
  </div>
);
