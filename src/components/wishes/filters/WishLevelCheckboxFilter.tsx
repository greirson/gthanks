'use client';

import { Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface WishLevelCheckboxFilterProps {
  selectedLevels: number[];
  onLevelsChange: (levels: number[]) => void;
  className?: string;
}

const levelLabels = [
  { value: 1, label: 'Low Priority', stars: 1 },
  { value: 2, label: 'Medium Priority', stars: 2 },
  { value: 3, label: 'High Priority', stars: 3 },
];

export function WishLevelCheckboxFilter({
  selectedLevels,
  onLevelsChange,
  className,
}: WishLevelCheckboxFilterProps) {
  const handleLevelToggle = (level: number) => {
    if (selectedLevels.includes(level)) {
      // Remove level from selection
      onLevelsChange(selectedLevels.filter((l) => l !== level));
    } else {
      // Add level to selection
      onLevelsChange([...selectedLevels, level].sort());
    }
  };

  return (
    <div className={className}>
      <div className="mb-3">
        <span className="text-sm font-medium">Wish Level</span>
      </div>

      <div className="space-y-3">
        {levelLabels.map((level) => (
          <div key={level.value} className="flex items-center space-x-2">
            <Checkbox
              id={`wish-level-${level.value}`}
              checked={selectedLevels.includes(level.value)}
              onCheckedChange={() => handleLevelToggle(level.value)}
              aria-label={`Filter by ${level.label}`}
            />
            <Label
              htmlFor={`wish-level-${level.value}`}
              className="flex cursor-pointer select-none items-center space-x-2 text-sm font-normal"
            >
              <div className="flex items-center space-x-1">
                {Array.from({ length: level.stars }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
              </div>
              <span>{level.label}</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
