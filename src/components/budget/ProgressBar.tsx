import React from 'react';

interface ProgressBarProps {
  spentPercentage: number;
  timeProgress: number;
  type?: 'spending' | 'income' | 'shared_income';
  label?: string;
  distributedAmount?: number;
  totalAmount?: number;
}

export function ProgressBar({ 
  spentPercentage, 
  timeProgress, 
  type = 'spending', 
  label,
  distributedAmount = 0,
  totalAmount = 0
}: ProgressBarProps) {
  const displayPercentage = Math.min(spentPercentage, 125);
  const distributedPercentage = totalAmount > 0 ? (distributedAmount / totalAmount) * 100 : 0;
  
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
    return 'bg-indigo-500';
  };

  const getDistributedBarColor = () => {
    if (spentPercentage > distributedPercentage) {
      return 'bg-red-200'; // Over distributed amount
    }
    return 'bg-indigo-200'; // Under distributed amount
  };

  // Calculate positions relative to the 125% total width
  const getMarkerPosition = (percentage: number) => {
    return `${(percentage / 125) * 100}%`;
  };

  const getTimeMarkerPosition = () => {
    return `${(Math.min(timeProgress, 125) / 125) * 100}%`;
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
            <span 
              className="absolute text-xs text-gray-500 transform -translate-x-1/2" 
              style={{ left: getMarkerPosition(100) }}
            >
              100%
            </span>
            <span 
              className="absolute text-xs text-gray-500 transform -translate-x-full" 
              style={{ left: '100%' }}
            >
              125%
            </span>
          </div>
        </div>

        <div className="h-3 relative rounded-full overflow-hidden bg-gray-100">
          {/* Distributed amount bar (only for spending categories) */}
          {type === 'spending' && distributedAmount > 0 && (
            <div
              className={`absolute h-full transition-all duration-300 ${getDistributedBarColor()}`}
              style={{ 
                width: `${(Math.min(distributedPercentage, 125) / 125) * 100}%`,
                opacity: 0.5
              }}
            />
          )}
          
          {/* Spent amount bar */}
          <div
            className={`h-full transition-all duration-300 ${getSpendingBarColor()}`}
            style={{ width: `${(displayPercentage / 125) * 100}%` }}
          />
          
          {/* Time progress marker */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-gray-800 transition-all duration-300"
            style={{ 
              left: getTimeMarkerPosition(),
              opacity: '0.5'
            }}
          />

          {/* 100% marker line */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-gray-400"
            style={{ 
              left: getMarkerPosition(100),
              opacity: '0.3'
            }}
          />

          {/* Overflow indicator for values > 125% */}
          {spentPercentage > 125 && (
            <div className="absolute right-0 top-0 h-full w-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Additional information for spending categories */}
        {type === 'spending' && distributedAmount > 0 && (
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>
              Distributed: ${distributedAmount.toFixed(2)}
            </span>
            <span>
              Spent: ${(totalAmount * (spentPercentage / 100)).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}