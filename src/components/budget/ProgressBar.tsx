import React from 'react';

interface ProgressBarProps {
  spentPercentage: number;
  timeProgress: number;
  type?: 'spending' | 'income' | 'shared_income';
  label?: string;
}

export function ProgressBar({ spentPercentage, timeProgress, type = 'spending', label }: ProgressBarProps) {
  const displayPercentage = Math.min(spentPercentage, 125);
  
  const getSpendingBarColor = () => {
    if (type === 'income' || type === 'shared_income') {
      return 'bg-green-500';
    }
    
    // For spending categories
    if (spentPercentage > 100) {
      return 'bg-red-500';
    }
    if (spentPercentage > 90) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getTimeMarkerPosition = () => {
    return `${Math.min(timeProgress, 125)}%`;
  };
  
  return (
    <div className="space-y-1">
      {label && (
        <div className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </div>
      )}
      <div className="relative">
        {/* Percentage markers */}
        <div className="absolute -top-4 w-full">
          <div className="relative h-4">
            <span className="absolute text-xs text-gray-500" style={{ left: '80%' }}>100%</span>
            <span className="absolute text-xs text-gray-500" style={{ left: '100%', transform: 'translateX(-100%)' }}>125%</span>
          </div>
        </div>

        <div className="h-2 relative rounded-full overflow-hidden bg-gray-200">
          {/* Base progress bar */}
          <div
            className={`h-full transition-all duration-300 ${getSpendingBarColor()}`}
            style={{ width: `${displayPercentage}%` }}
          />
          
          {/* Time progress marker */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-gray-800 transition-all duration-300"
            style={{ 
              left: getTimeMarkerPosition(),
              opacity: '0.5'
            }}
          />

          {/* Overflow indicator for values > 125% */}
          {spentPercentage > 125 && (
            <div className="absolute right-0 top-0 h-full w-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}