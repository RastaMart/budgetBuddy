export function getTimeProgress(timeframe: string): number {
  const now = new Date();
  let progress = 0;

  switch (timeframe) {
    case 'weekly':
      const dayOfWeek = now.getDay();
      progress = (dayOfWeek / 7) * 100;
      break;
    case 'monthly':
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      progress = (dayOfMonth / daysInMonth) * 100;
      break;
    case 'yearly':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
      progress = (dayOfYear / daysInYear) * 100;
      break;
  }

  return progress;
}