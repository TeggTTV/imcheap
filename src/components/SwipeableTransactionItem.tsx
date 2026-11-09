import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Transaction } from '../utils/expenseMath';

interface SwipeableTransactionItemProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const SwipeableTransactionItem: React.FC<SwipeableTransactionItemProps> = ({
  tx,
  onEdit,
  onDelete,
}) => {
  const x = useMotionValue(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // When sliding right (x > 0), green area on the left reveals with "Editing transaction"
  const editOpacity = useTransform(x, [10, 70], [0, 1]);
  // When sliding left (x < 0), red area on the right reveals with "Deleting transaction"
  const deleteOpacity = useTransform(x, [-10, -70], [0, 1]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 75;
    if (info.offset.x > threshold) {
      // Swiped right -> Edit
      onEdit(tx);
    } else if (info.offset.x < -threshold) {
      // Swiped left -> Delete
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(tx.id);
      }, 200);
    }
  };

  if (isDeleting) {
    return (
      <motion.div
        initial={{ opacity: 1, height: 'auto', scaleY: 1 }}
        animate={{ opacity: 0, height: 0, scaleY: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full overflow-hidden"
      />
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden select-none">
      {/* Green Left Background (Editing) revealed when sliding right */}
      <motion.div
        style={{ opacity: editOpacity }}
        className="absolute inset-0 bg-emerald-600 rounded-xl flex items-center justify-start px-4 text-white"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
          <span className="material-symbols-outlined text-[20px]">edit</span>
          <span>Editing transaction</span>
        </div>
      </motion.div>

      {/* Red Right Background (Deleting) revealed when sliding left */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-600 rounded-xl flex items-center justify-end px-4 text-white"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 font-semibold text-[13px] tracking-tight">
          <span>Deleting transaction</span>
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </div>
      </motion.div>

      {/* Draggable Transaction Card */}
      <motion.div
        drag="x"
        dragSnapToOrigin
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.25}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-surface-container-lowest rounded-xl p-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-surface-container-high/50 cursor-grab active:cursor-grabbing transition-[box-shadow]"
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              {tx.icon}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[14px] text-on-surface leading-tight">
              {tx.title}
            </span>
            <span className="text-[12px] text-on-surface-variant">
              {tx.category} • {tx.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-none">
          <span
            className={`font-bold text-[15px] tracking-tight tabular-nums ${
              tx.type === 'income' ? 'text-secondary' : 'text-on-surface'
            }`}
          >
            {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
