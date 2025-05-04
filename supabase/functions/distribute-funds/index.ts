import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { budgetId, categoryId } = await req.json();

    if (!budgetId || !categoryId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get income category details and its total spent amount
    const { data: incomeCategory, error: incomeCategoryError } = await supabaseClient
      .from('categories')
      .select(`
        *,
        transactions(amount)
      `)
      .eq('id', categoryId)
      .single();

    if (incomeCategoryError || !incomeCategory) {
      throw new Error('Income category not found');
    }

    // Calculate available amount in income category
    const totalIncome = incomeCategory.transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Get spending categories with their current spent amounts
    const { data: spendingCategories, error: spendingCategoriesError } = await supabaseClient
      .from('categories')
      .select(`
        *,
        transactions(amount)
      `)
      .eq('budget_id', budgetId)
      .eq('type', 'spending');

    if (spendingCategoriesError) {
      throw spendingCategoriesError;
    }

    // Calculate total spending budget and remaining amounts
    const spendingCategoriesWithStats = spendingCategories.map(category => {
      const totalSpent = category.transactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );
      const remaining = category.amount - totalSpent;
      return {
        ...category,
        totalSpent,
        remaining: remaining > 0 ? remaining : 0
      };
    });

    const totalRemainingBudget = spendingCategoriesWithStats.reduce(
      (sum, category) => sum + category.remaining,
      0
    );

    // Create virtual transactions
    const transactions = [];
    const now = new Date().toISOString();

    // Calculate distribution amounts
    let remainingToDistribute = totalIncome;
    
    for (const spendingCategory of spendingCategoriesWithStats) {
      if (remainingToDistribute <= 0) break;

      // Calculate the proportion of this category's remaining amount
      const proportion = spendingCategory.remaining / totalRemainingBudget;
      let distributionAmount = Math.min(
        remainingToDistribute,
        spendingCategory.remaining
      );

      if (totalRemainingBudget > totalIncome) {
        // If we don't have enough to fill all categories, distribute proportionally
        distributionAmount = totalIncome * proportion;
      }

      if (distributionAmount > 0) {
        // Create negative transaction in income category
        transactions.push({
          user_id: incomeCategory.user_id,
          category_id: incomeCategory.id,
          amount: -distributionAmount,
          description: `Distribution to ${spendingCategory.name}`,
          date: now,
          assigned_date: now,
          type: 'income_distribution'
        });

        // Create positive transaction in spending category
        transactions.push({
          user_id: incomeCategory.user_id,
          category_id: spendingCategory.id,
          amount: distributionAmount,
          description: `Distribution from ${incomeCategory.name}`,
          date: now,
          assigned_date: now,
          type: 'income_distribution'
        });

        remainingToDistribute -= distributionAmount;
      }
    }

    // Insert all transactions
    const { error: transactionsError } = await supabaseClient
      .from('transactions')
      .insert(transactions);

    if (transactionsError) {
      throw transactionsError;
    }

    return new Response(
      JSON.stringify({ success: true, transactionsCreated: transactions.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});