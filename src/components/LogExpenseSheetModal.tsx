import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { applyKeypadKey, calculateWorkHoursLabel } from '../utils/expenseMath';

interface LogExpenseSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
  initialCategory?: string;
  initialNote?: string;
  hourlyWage: number;
  onLogExpense: (entry: {
    amount: number;
    category: string;
    note: string;
    icon: string;
  }) => void;
}

const LOG_CATEGORIES = [
  { id: 'Driving', label: 'Driving', emoji: '🚗', icon: 'directions_car' },
  { id: 'Fitness', label: 'Fitness', emoji: '🏐', icon: 'fitness_center' },
  { id: 'Food', label: 'Food', emoji: '🍔', icon: 'restaurant' },
  { id: 'Other', label: 'Other', emoji: '📦', icon: 'shopping_bag' },
];

export const LogExpenseSheetModal: React.FC<LogExpenseSheetModalProps> = ({
  isOpen,
  onClose,
  initialAmount = '18.59',
  initialCategory = 'Fitness',
  initialNote = '',
  hourlyWage,
  onLogExpense,
}) => {
  const [currentInput, setCurrentInput] = useState<string>(initialAmount);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [note, setNote] = useState<string>(initialNote);

  useEffect(() => {
    if (isOpen) {
      setCurrentInput(initialAmount && parseFloat(initialAmount) > 0 ? initialAmount : '18.59');
      setSelectedCategory(initialCategory || 'Fitness');
      setNote(initialNote || '');
    }
  }, [isOpen, initialAmount, initialCategory, initialNote]);

  const workHoursLabel = calculateWorkHoursLabel(currentInput, hourlyWage);

  const handleKeypadClick = (val: string) => {
    setCurrentInput((prev) => applyKeypadKey(prev, val, { maxLength: 8, maxDecimals: 2 }));
  };

  const handleLogSubmit = () => {
    const parsed = parseFloat(currentInput);
    const amountToLog = !isNaN(parsed) && parsed > 0 ? parsed : 18.59;
    const catMeta =
      LOG_CATEGORIES.find((c) => c.id.toLowerCase() === selectedCategory.toLowerCase()) ||
      LOG_CATEGORIES[1];

    onLogExpense({
      amount: Number(amountToLog.toFixed(2)),
      category: catMeta.label,
      note: note.trim(),
      icon: catMeta.icon,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Log Expense Keypad"
        >
          {/* Semi-Transparent Scrim Overlay with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-primary/30 backdrop-blur-[2px] z-20"
            onClick={onClose}
          />

          {/* Expanded Bottom Sheet Modal with spring slide-up and slide-down, draggable down to dismiss */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 100) {
                onClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-30 w-full max-w-[480px] mx-auto bg-surface-container-lowest rounded-t-[28px] shadow-2xl flex flex-col pt-3 pb-6 px-6 touch-none"
          >
            {/* Grab Bar Indicator */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close log expense sheet"
              className="w-full flex justify-center py-1 mb-3 cursor-grab active:cursor-grabbing focus:outline-none"
            >
              <div className="w-9 h-1 bg-surface-container-highest rounded-full" />
            </button>

            {/* Active Currency Entry & Delight Calculation */}
            <div className="flex flex-col items-center justify-center text-center my-1">
              <div className="flex items-baseline justify-center tracking-tight">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface-variant mr-1">
                  $
                </span>
                <span
                  className="font-numeric-entry text-numeric-entry text-on-surface font-bold tabular-nums"
                  id="amount-display"
                  data-testid="log-amount-display"
                >
                  {currentInput || '0'}
                </span>
              </div>
              {/* Psychology / Mindful Metric Badge */}
              <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full">
                <span className="material-symbols-outlined text-on-surface-variant text-[15px]">
                  schedule
                </span>
                <span
                  className="font-label-md text-label-md text-on-surface-variant font-medium tabular-nums"
                  id="work-hours-metric"
                  data-testid="log-work-hours-metric"
                >
                  {workHoursLabel}
                </span>
              </div>
            </div>

            {/* Category Selector Carousel */}
            <div className="mt-5 mb-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2 px-1">
                Category
              </span>
              <div
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
                id="category-pills"
              >
                {LOG_CATEGORIES.map((cat) => {
                  const isSelected =
                    selectedCategory.toLowerCase() === cat.id.toLowerCase();
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`category-pill flex items-center gap-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 shrink-0 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'px-4 py-2 bg-primary text-on-primary shadow-sm'
                          : 'px-3.5 py-2 bg-surface-container text-on-surface'
                      }`}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note Container */}
            <div className="mb-4">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-outline text-[18px]">
                  edit_note
                </span>
                <input
                  aria-label="What was this for? (optional)"
                  className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                  maxLength={40}
                  placeholder="What was this for? (optional)"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* Custom iOS Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-4" id="numeric-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleKeypadClick(val)}
                  className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
                >
                  {val}
                </button>
              ))}
              <button
                type="button"
                aria-label="Backspace"
                onClick={() => handleKeypadClick('back')}
                className="num-key h-14 rounded-full bg-transparent hover:bg-surface-container-low font-headline-lg text-headline-lg font-bold text-on-surface flex items-center justify-center transition-all active:scale-95 active:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px]">
                  backspace
                </span>
              </button>
            </div>

            {/* Primary Action CTA */}
            <button
              type="button"
              id="save-expense-btn"
              onClick={handleLogSubmit}
              className="w-full h-[52px] bg-primary text-on-primary rounded-xl font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-[0.98] transition-transform cursor-pointer whitespace-nowrap"
            >
              <span>Log</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
