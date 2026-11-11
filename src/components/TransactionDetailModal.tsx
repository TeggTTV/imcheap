import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../utils/expenseMath';
import { formatTransactionTimestamp } from '../utils/dateUtils';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(transaction?.title || '');
  const [amountStr, setAmountStr] = useState(transaction ? String(transaction.amount) : '');
  const [note, setNote] = useState(transaction?.note || '');

  React.useEffect(() => {
    if (transaction) {
      setTitle(transaction.title);
      setAmountStr(String(transaction.amount));
      setNote(transaction.note || '');
    }
  }, [transaction]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const parsedAmount = parseFloat(amountStr) || transaction.amount;
    onSave({
      ...transaction,
      title: title.trim() || transaction.title,
      amount: Math.abs(parsedAmount),
      note: note.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!transaction) return;
    onDelete(transaction.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {transaction && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Transaction"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-primary/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

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
            className="relative z-30 w-full max-w-[480px] mx-auto bg-surface-container-lowest rounded-t-[28px] shadow-2xl p-6 flex flex-col gap-4 touch-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit transaction sheet"
              className="w-full flex justify-center py-1 cursor-grab active:cursor-grabbing focus:outline-none"
            >
              <div className="w-9 h-1 bg-surface-container-highest rounded-full" />
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-on-surface">
                Edit Transaction
              </h2>
              <span className="text-[12px] text-on-surface-variant">
                {transaction.category} • {formatTransactionTimestamp(transaction.timestamp)}
              </span>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="tx-title-input"
                  className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1"
                >
                  Title
                </label>
                <input
                  id="tx-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-semibold focus:outline-none border border-transparent focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-amount-input"
                  className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1"
                >
                  Amount ($)
                </label>
                <input
                  id="tx-amount-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold tabular-nums focus:outline-none border border-transparent focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-note-input"
                  className="block text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1"
                >
                  Note (optional)
                </label>
                <input
                  id="tx-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none border border-transparent focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 h-[48px] bg-primary text-on-primary rounded-xl font-bold uppercase tracking-wider text-[13px] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete transaction"
                  className="h-[48px] px-4 bg-error-container text-on-error-container rounded-xl font-semibold text-[13px] hover:bg-error hover:text-on-error transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
