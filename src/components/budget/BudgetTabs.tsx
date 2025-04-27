import React from "react";
import { Plus, Users, GripHorizontal } from "lucide-react";
import { Budget } from "../../types/budget";
import { BudgetUser } from "../../services/budgetService";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BudgetTabProps {
  budget: Budget;
  isSelected: boolean;
  isShared: boolean;
  onClick: () => void;
}

function SortableBudgetTab({ budget, isSelected, isShared, onClick }: BudgetTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: budget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 group
        ${
          isSelected
            ? "border-indigo-500 text-indigo-600"
            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripHorizontal className="w-4 h-4" />
      </div>
      {budget.name}
      {isShared && <Users className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

interface BudgetTabsProps {
  budgets: Budget[];
  selectedBudget: string | null;
  budgetUsers: Record<string, BudgetUser[]>;
  onSelectBudget: (budgetId: string) => void;
  onNewBudget: () => void;
  onReorderBudgets: (budgets: Budget[]) => void;
}

export function BudgetTabs({
  budgets,
  selectedBudget,
  budgetUsers,
  onSelectBudget,
  onNewBudget,
  onReorderBudgets,
}: BudgetTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = budgets.findIndex((budget) => budget.id === active.id);
      const newIndex = budgets.findIndex((budget) => budget.id === over.id);
      const newBudgets = arrayMove(budgets, oldIndex, newIndex);
      onReorderBudgets(newBudgets);
    }
  }

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between">
        <nav className="-mb-px flex space-x-8" aria-label="Budgets">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={budgets.map(b => b.id)}
              strategy={horizontalListSortingStrategy}
            >
              {budgets.map((budget) => {
                const isShared = (budgetUsers[budget.id] || []).length > 1;
                return (
                  <SortableBudgetTab
                    key={budget.id}
                    budget={budget}
                    isSelected={selectedBudget === budget.id}
                    isShared={isShared}
                    onClick={() => onSelectBudget(budget.id)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </nav>
        <button
          onClick={onNewBudget}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Budget
        </button>
      </div>
    </div>
  );
}