import React from 'react';

interface ProgressBarProps {
  spentPercentage: number;
  timeProgress: number;
}

export function ProgressBar({ spentPercentage, timeProgress }: ProgressBarProps) {
  const isOverBudget = spentPercentage > 100;
  const isSpendingHigherThanTime = spentPercentage > timeProgress;
  
  const getSpendingBarColor = () => {
    if (isOverBudget) return 'bg-red-500';
    if (isSpendingHigherThanTime) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="space-y-1">
      {/* Spending progress */}
      <div className="h-2 relative rounded overflow-hidden bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ${getSpendingBarColor()}`}
          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
        />
      </div>
      
      {/* Time progress */}
      <div className="h-2 relative rounded overflow-hidden bg-gray-100">
        <div 
          className="h-full bg-gray-400 transition-all duration-300"
          style={{ width: `${timeProgress}%` }}
        />
      </div>
    </div>
  );
}