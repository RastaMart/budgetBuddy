// import React, { useState, useEffect } from 'react';
// import { Trash2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
// import { ProgressBar } from './ProgressBar';
// import { Budget } from '../../types/budget';
// import { getTimeProgress } from '../../utils/timeProgress';
// import { Modal } from '../shared/Modal';
// import { AddTransactionForm } from '../transaction/AddTransactionForm';
// import { TransactionItem } from '../transaction/TransactionItem';
// import { useAuth } from '../../hooks/useContext';
// import { supabase } from '../../lib/supabase';

// interface Transaction {
//   id: string;
//   amount: number;
//   description: string;
//   date: string;
// }

// interface BudgetItemProps {
//   budget: Budget;
//   // timeframe: string;
//   onDelete: (id: string) => void;
//   onTransactionAdded: () => void;
// }

// export function BudgetItem({
//   budget,
//   // timeframe,
//   onDelete,
//   onTransactionAdded,
// }: BudgetItemProps) {
//   const { user } = useAuth();
//   const [isExpanded, setIsExpanded] = useState(false);
//   const [showTransactionModal, setShowTransactionModal] = useState(false);
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [formData, setFormData] = useState({
//     budget_id: budget.id,
//     amount: '',
//     description: '',
//     date: new Date().toISOString().split('T')[0],
//   });
//   const [depositData, setDepositData] = useState({
//     amount: '',
//     description: '',
//     date: new Date().toISOString().split('T')[0],
//   });

//   const spentPercentage = ((budget.total_spent || 0) / budget.amount) * 100;
//   const timeProgress = getTimeProgress(budget.timeframe);

//   useEffect(() => {
//     if (isExpanded) {
//       fetchTransactions();
//     }
//   }, [isExpanded]);

//   async function fetchTransactions() {
//     try {
//       const { data, error } = await supabase
//         .from('transactions')
//         .select('id, amount, description, date')
//         .eq('budget_id', budget.id)
//         .order('date', { ascending: false });

//       if (error) throw error;
//       setTransactions(data || []);
//     } catch (error) {
//       console.error('Error fetching transactions:', error);
//     }
//   }

//   async function handleSubmit(
//     e: React.FormEvent,
//     type: 'spending' | 'deposit'
//   ) {
//     e.preventDefault();
//     if (type === 'deposit') return; // Deposits not allowed in budget view

//     try {
//       const { error } = await supabase.from('transactions').insert({
//         user_id: user.id,
//         budget_id: formData.budget_id,
//         amount: parseFloat(formData.amount),
//         description: formData.description,
//         date: formData.date,
//       });

//       if (error) throw error;

//       setFormData({
//         budget_id: budget.id,
//         amount: '',
//         description: '',
//         date: new Date().toISOString().split('T')[0],
//       });
//       setShowTransactionModal(false);
//       onTransactionAdded();
//       if (isExpanded) {
//         fetchTransactions();
//       }
//     } catch (error) {
//       console.error('Error adding transaction:', error);
//     }
//   }

//   return (
//     <>
//       <div className="px-6 py-4">
//         <div className="flex items-center justify-between">
//           <div className="flex-1">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={() => setIsExpanded(!isExpanded)}
//                   className="text-gray-500 hover:text-gray-700"
//                 >
//                   {isExpanded ? (
//                     <ChevronDown className="w-5 h-5" />
//                   ) : (
//                     <ChevronRight className="w-5 h-5" />
//                   )}
//                 </button>
//                 <h3 className="text-lg font-medium text-gray-900">
//                   {budget.name}
//                 </h3>
//                 <span className="text-sm text-gray-500">
//                   ${budget.total_spent?.toFixed(2) || '0.00'}/$
//                   {budget.amount.toFixed(2)} spent
//                 </span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={() => setShowTransactionModal(true)}
//                   className="text-indigo-600 hover:text-indigo-800"
//                 >
//                   <Plus className="w-4 h-4" />
//                 </button>
//                 <button
//                   onClick={() => onDelete(budget.id)}
//                   className="text-red-600 hover:text-red-800"
//                 >
//                   <Trash2 className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//             <div className="mt-2">
//               <ProgressBar
//                 spentPercentage={spentPercentage}
//                 timeProgress={timeProgress}
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       <Modal
//         isOpen={showTransactionModal}
//         onClose={() => setShowTransactionModal(false)}
//         title="Add Transaction"
//       >
//         <AddTransactionForm
//           formData={formData}
//           depositData={depositData}
//           onSubmit={handleSubmit}
//           onChange={(data) => setFormData({ ...formData, ...data })}
//           onDepositChange={(data) =>
//             setDepositData({ ...depositData, ...data })
//           }
//           budgets={[{ id: budget.id, name: budget.name }]}
//           selectedBudgetId={budget.id}
//         />
//       </Modal>
//     </>
//   );
// }
