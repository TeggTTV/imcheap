import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BalanceSummary, IncomeSettings } from '../utils/expenseMath';

interface BalanceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: BalanceSummary;
  settings: IncomeSettings;
  onOpenIncomeSettings: () => void;
}

export const BalanceBreakdownModal: React.FC<BalanceBreakdownModalProps> = ({
  isOpen,
  onClose,
  summary,
  settings,
  onOpenIncomeSettings,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="breakdown-title"
        >
          {/* iOS Dimming Scrim with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-0 bg-primary/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* iOS Modal Bottom Sheet Presentation with spring sliding, draggable down to dismiss */}
          <motion.section
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
            className="relative z-50 w-full max-w-[480px] mx-auto bg-surface-container-lowest rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] touch-none"
          >
            {/* Top Pill Grab Handle */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close balance breakdown"
              className="w-full flex items-center justify-center pt-[10px] pb-2 cursor-grab active:cursor-grabbing focus:outline-none"
            >
              <div className="w-9 h-1 rounded-full bg-outline-variant" />
            </button>

            {/* Sheet Content Container */}
            <div className="px-6 pt-3 pb-8 flex flex-col">
              <header className="flex items-start justify-between">
                <div>
                  <h2
                    className="text-[18px] font-bold text-[#111111] leading-tight"
                    id="breakdown-title"
                  >
                    Balance Breakdown
                  </h2>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">
                    Current Cycle: {settings.cycleLabel}
                  </p>
                </div>
              </header>

              {/* Summary Card */}
              <div className="mt-4 bg-[#F9FAFB] border border-[#F3F4F6] rounded-2xl p-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[28px] font-bold text-[#111111] leading-none tracking-tight tabular-nums"
                      data-testid="breakdown-available"
                    >
                      ${summary.availableBalance.toFixed(2)}
                    </span>
                    <span className="text-[14px] text-[#9CA3AF] font-normal tabular-nums">
                      of ${summary.basePaycheck.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#16A34A] transition-all duration-500 ease-out"
                      style={{ width: `${summary.percentLeft}%` }}
                    />
                  </div>
                  <p className="text-[13px] font-semibold text-[#16A34A] mt-1.5 text-right tabular-nums">
                    {summary.percentLeft}% left
                  </p>
                </div>
              </div>

              {/* Streamlined Math Rows */}
              <div className="mt-4 divide-y divide-[#F3F4F6]">
                {/* Row 1: Base Paycheck */}
                <div className="flex items-center justify-between py-3 text-[15px] font-medium">
                  <span className="text-[#111111]">
                    Base Paycheck ({settings.hoursPerCycle}h @ ${settings.hourlyWage}
                    /hr)
                  </span>
                  <span className="text-[#111111] tabular-nums">
                    +${summary.basePaycheck.toFixed(2)}
                  </span>
                </div>
                {/* Row 2: Logged Expenses */}
                <div className="flex items-center justify-between py-3 text-[15px] font-medium">
                  <span className="text-[#111111]">
                    Logged Expenses ({summary.itemCount} items)
                  </span>
                  <span className="text-[#DC2626] tabular-nums">
                    -${summary.loggedExpenses.toFixed(2)}
                  </span>
                </div>
                {/* Row 3: Unspent Work */}
                <div className="flex items-center justify-between py-3 text-[15px] font-medium">
                  <span className="text-[#6B7280]">Unspent Work</span>
                  <span className="text-[#6B7280] tabular-nums">
                    ~{summary.unspentWorkHours} hrs
                  </span>
                </div>
              </div>

              {/* Footer Link */}
              <div className="pt-4 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenIncomeSettings();
                  }}
                  className="text-[14px] font-semibold text-[#111111] hover:opacity-80 transition-opacity flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Income Settings →
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};
