'use client';

import { TeacherMatch } from '@/types/recommendation';
import { Button } from '@/components/ui/Button';

interface TeacherMatchCardProps {
  teacher: TeacherMatch;
  rank?: 'primary' | 'secondary' | 'tertiary';
  onSelect?: (teacher: TeacherMatch) => void;
  onRemove?: (teacherId: string) => void;
}

export const TeacherMatchCard: React.FC<TeacherMatchCardProps> = ({
  teacher,
  rank = 'primary',
  onSelect,
  onRemove,
}) => {
  const rankColors = {
    primary: 'border-green-300 bg-green-50',
    secondary: 'border-blue-300 bg-blue-50',
    tertiary: 'border-gray-300 bg-gray-50',
  };

  const rankBadges = {
    primary: '🥇 Top Match',
    secondary: '🥈 Strong Match',
    tertiary: '🥉 Good Match',
  };

  return (
    <div className={`border-2 rounded-lg p-6 ${rankColors[rank]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-2">{rankBadges[rank]}</div>
          <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
          <p className="text-sm text-gray-600">
            {teacher.university} • {teacher.department}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-green-600">{teacher.fitScore}%</div>
          <p className="text-xs text-gray-600">Fit Score</p>
        </div>
      </div>

      {/* Match Reason */}
      <div className="mb-4 p-3 bg-white rounded border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Why this match:</strong> {teacher.matchReason}
        </p>
      </div>

      {/* Strengths */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">✓ Strengths</p>
        <div className="flex flex-wrap gap-2">
          {teacher.strengths.map((strength, idx) => (
            <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {strength}
            </span>
          ))}
        </div>
      </div>

      {/* Concerns */}
      {teacher.concerns.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">⚠ Concerns</p>
          <div className="flex flex-wrap gap-2">
            {teacher.concerns.map((concern, idx) => (
              <span key={idx} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {concern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-xs text-gray-600">Experience</p>
          <p className="font-medium text-gray-900">{teacher.experience}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Availability</p>
          <p className="font-medium text-gray-900">{teacher.availability}</p>
        </div>
      </div>

      {/* Teaching Style */}
      <div className="mb-4 p-3 bg-white rounded border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Style:</strong> {teacher.style}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onSelect && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onSelect(teacher)}
          >
            Select
          </Button>
        )}
        {onRemove && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onRemove(teacher.id)}
          >
            Exclude
          </Button>
        )}
      </div>
    </div>
  );
};
