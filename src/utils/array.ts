export const valueAretheSameMoreThan = (arr: any[], threshold: number) => {
  if (!arr.length) {
    return false; // Handle empty arrays
  }

  let counts = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[0]) {
      counts++;
    }
  }

  return counts >= threshold * arr.length;
};

export const mostFrequentValueOfArray = (array: any[]): any => {
  // Handle edge cases
  if (!array || array.length === 0) {
    return null;
  }

  // Count occurrences of each value
  const occurrences = {};
  for (const item of array) {
    occurrences[item] = (occurrences[item] || 0) + 1;
  }

  // Find the value with the highest occurrence count
  let maxCount = 0;
  let mostFrequentValue = null;

  for (const [value, count] of Object.entries(occurrences)) {
    if (count > maxCount) {
      maxCount = count;
      // Convert string keys back to their original type if needed
      mostFrequentValue = array.includes(Number(value)) ? Number(value) : value;
    }
  }

  return mostFrequentValue;
};
