interface BaseChipProps {
  base: string;
}

export function BaseChip({ base }: BaseChipProps) {
  const baseColors: Record<string, string> = {
    'SSA': 'bg-blue-100 text-blue-800 border-blue-200',
    'MOCC': 'bg-green-100 text-green-800 border-green-200',
    'default': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const colorClass = baseColors[base] || baseColors.default;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
      {base}
    </span>
  );
}
