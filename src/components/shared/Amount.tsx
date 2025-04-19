import React from 'react';

interface AmountProps {
  value: number;
  className?: string;
}

export function Amount({ value, className = '' }: AmountProps) {
  const isPositive = value >= 0;
  const displayValue = Math.abs(value).toFixed(2);
  const sign = isPositive ? '+' : '-';
  
  return (
    <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-gray-900'} ${className}`}>
      {sign}${displayValue}
    </span>
  );
}