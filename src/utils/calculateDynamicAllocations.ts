import { supabase } from '../lib/supabase';

interface Allocation {
  id: string;
  category_id: string;
  allocation_type: 'manual' | 'dynamic';
  percentage?: number;
  reference_category_id?: string;
}

interface AllocationStats {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  total_spent: number;
  reference_total?: number;
  allocation_type?: 'manual' | 'dynamic';
}

/**
 * Calculate allocation statistics including dynamic percentages
 * @param allocations - Raw allocations from database
 * @param categoryAmount - The total amount of the parent category
 * @returns Processed allocation statistics with calculated percentages
 */
export async function calculateDynamicAllocations(
  allocations: Allocation[],
  categoryId: string,
  categoryAmount: number
): Promise<AllocationStats[]> {
  if (!allocations?.length) return [];

  // First pass: gather all allocation data
  const stats = await Promise.all(
    allocations.map(async (allocation) => {
      let name = '';
      let percentage = 0;
      let reference_total = 0;
      const allocation_type = allocation.allocation_type;

      if (
        allocation.allocation_type === 'dynamic' &&
        allocation.reference_category_id
      ) {
        // Fetch reference category details
        const { data: refCategory } = await supabase
          .from('categories')
          .select('name, budget:budgets(name)')
          .eq('id', allocation.reference_category_id)
          .single();

        if (refCategory) {
          name = `${refCategory.budget.name} - ${refCategory.name}`;

          // Get reference category transactions
          const { data: refTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category_id', allocation.reference_category_id);

          reference_total = (refTransactions || []).reduce(
            (sum, t) => sum + (t.amount || 0),
            0
          );
        }
      } else {
        name = allocation.name;
        percentage = allocation.percentage || 0;
      }

      // Calculate total spent for this allocation
      const { data: allocationTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category_id', categoryId)
        .eq('allocation_id', allocation.id);

      const total_spent = (allocationTransactions || []).reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

      return {
        id: allocation.id,
        name,
        percentage,
        amount: categoryAmount ? (categoryAmount * percentage) / 100 : 0,
        total_spent,
        reference_total:
          allocation.allocation_type === 'dynamic'
            ? reference_total
            : undefined,
        allocation_type,
      };
    })
  );

  // Calculate dynamic percentages based on reference totals
  const referenceTotal = stats.reduce(
    (sum, stat) => sum + (stat.reference_total || 0),
    0
  );

  // Update percentages for dynamic allocations
  const updatedStats = stats.map((stat) => {
    if (stat.allocation_type === 'dynamic' && referenceTotal > 0) {
      const dynamicPercentage =
        ((stat.reference_total || 0) / referenceTotal) * 100;
      return {
        ...stat,
        percentage: dynamicPercentage,
        amount: categoryAmount ? (categoryAmount * dynamicPercentage) / 100 : 0,
      };
    }
    return stat;
  });

  return updatedStats;
}
