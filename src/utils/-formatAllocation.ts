/**
 * Formats a percentage and total amount into a allocation string
 *
 * @param percentage - The percentage value (string or number)
 * @param totalAmount - The total amount (string or number)
 * @returns A formatted string showing percentage and calculated amount
 */
export function formatAllocation(
  percentage: string | number,
  totalAmount: string | number
): string {
  // Convert inputs to numbers for calculation
  const percentageValue =
    typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  const totalAmountValue =
    typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;

  // Calculate the allocation amount
  const allocationAmount = (percentageValue * totalAmountValue) / 100;

  // Format for display
  const formattedPercentage =
    typeof percentageValue === 'number' ? percentageValue.toFixed(1) : '0.0';
  const formattedAmount =
    typeof allocationAmount === 'number' && !isNaN(allocationAmount)
      ? allocationAmount.toFixed(2)
      : '0.00';

  return `${formattedPercentage}% : $${formattedAmount}`;
}
