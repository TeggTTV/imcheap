import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  applyKeypadKey,
  calculatePresetEquivalence,
  PresetItem,
} from '../utils/expenseMath';
import {
  InteractiveWheelPicker,
  WheelItem,
} from './InteractiveWheelPicker';

interface PresetSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (preset: Omit<PresetItem, 'id'>) => void;
  mileageRate: number;
  initialPreset?: Partial<PresetItem>;
}

const PRESET_CATEGORIES = [
  { id: 'Driving', label: 'Driving', icon: 'directions_car' },
  { id: 'Fitness', label: 'Fitness', icon: 'sports_volleyball' },
  { id: 'Food', label: 'Food', icon: 'fastfood' },
];

const ICON_CYCLE = [
  { icon: 'directions_car', bgColor: '#EEF2FF', iconColor: '#3730A3' },
  { icon: 'school', bgColor: '#EEF2FF', iconColor: '#3730A3' },
  { icon: 'sports_volleyball', bgColor: '#FEF3C7', iconColor: '#D97706' },
  { icon: 'favorite', bgColor: '#FFE4E6', iconColor: '#E11D48' },
  { icon: 'coffee', bgColor: '#ECFDF5', iconColor: '#047857' },
];

const UNITS: Array<'USD' | 'MILES' | 'SERVINGS'> = ['USD', 'MILES', 'SERVINGS'];

export const PresetSheetModal: React.FC<PresetSheetModalProps> = ({
  isOpen,
  onClose,
  onSavePreset,
  mileageRate,
  initialPreset,
}) => {
  const [currentValue, setCurrentValue] = useState<string>(
    initialPreset?.rawValue !== undefined ? String(initialPreset.rawValue) : '6.4'
  );
  const [unit, setUnit] = useState<'USD' | 'MILES' | 'SERVINGS'>(
    initialPreset?.unit || 'MILES'
  );
  const [title, setTitle] = useState<string>(
    initialPreset?.title || 'School → Rowan'
  );
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(
    initialPreset?.isRoundTrip ?? false
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialPreset?.category || 'Driving'
  );
  const [customCategories, setCustomCategories] = useState<
    Array<{ id: string; label: string; icon: string }>
  >([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [iconIndex, setIconIndex] = useState(0);

  const allCategories = [...PRESET_CATEGORIES, ...customCategories];
  const currentIconMeta = ICON_CYCLE[iconIndex % ICON_CYCLE.length];

  const equiv = calculatePresetEquivalence(
    currentValue,
    unit,
    isRoundTrip,
    mileageRate
  );

  const handleKeyPress = (key: string) => {
    setCurrentValue((prev) =>
      applyKeypadKey(prev, key, { maxLength: 6, maxDecimals: 2 })
    );
  };

  const cycleUnit = () => {
    const nextIdx = (UNITS.indexOf(unit) + 1) % UNITS.length;
    setUnit(UNITS[nextIdx]);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const newCat = { id: trimmed, label: trimmed, icon: 'label' };
    setCustomCategories((prev) => [...prev, newCat]);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSave = () => {
    const cleanTitle = title.trim() || 'Custom Preset';
    const shortLabel = cleanTitle.split(/\s+|→/)[0] || 'Preset';
    onSavePreset({
      label: shortLabel.slice(0, 10),
      title: cleanTitle,
      category: selectedCategory,
      icon: currentIconMeta.icon,
      bgColor: currentIconMeta.bgColor,
      iconColor: currentIconMeta.iconColor,
      unit,
      rawValue: parseFloat(currentValue) || 0,
      isRoundTrip,
      calculatedAmount: equiv.numericCost > 0 ? equiv.numericCost : 0.89,
    });
    onClose();
  };

  const unitWheelItems: WheelItem<'USD' | 'MILES' | 'SERVINGS'>[] = [
    { value: 'USD', label: '$ (USD)' },
    { value: 'MILES', label: 'MILES' },
    { value: 'SERVINGS', label: 'SERVINGS' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Configure Preset"
        >
          {/* Dimmed Scrim with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-primary/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* iOS Bottom Sheet Container with spring sliding, draggable down to dismiss */}
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
            className="relative z-20 w-full max-w-[480px] mx-auto bg-surface-container-lowest rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col pt-2 pb-5 px-6 touch-none"
          >
            {/* Top Grab Handle */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preset sheet"
              className="w-full flex flex-col items-center py-1.5 cursor-grab active:cursor-grabbing focus:outline-none"
            >
              <div className="w-9 h-1 rounded-full bg-surface-container-highest" />
            </button>

            {/* Numeric Value & Unit Wheel Row */}
            <div className="flex items-center justify-between py-1 border-none">
              <div className="flex flex-col items-start min-w-0">
                <div className="flex items-baseline">
                  <span
                    className="font-bold text-on-surface tracking-tight leading-none text-[36px] tabular-nums"
                    id="numeric-val"
                    data-testid="preset-numeric-val"
                  >
                    {currentValue}
                  </span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant">
                  <span className="material-symbols-outlined text-[13px] text-secondary">
                    schedule
                  </span>
                  <span
                    className="font-label-md text-label-md font-semibold text-on-surface-variant tabular-nums"
                    id="equiv-label"
                    data-testid="preset-equiv-label"
                  >
                    ≈ ${equiv.costFormatted}{' '}
                    <span className="font-normal opacity-80">
                      ({equiv.minutesWork}m of work)
                    </span>
                  </span>
                </div>
              </div>

              {/* Interactive Unit Picker Wheel */}
              <InteractiveWheelPicker
                items={unitWheelItems}
                value={unit}
                onChange={(nextUnit) => setUnit(nextUnit)}
                height={80}
                itemHeight={28}
                ariaLabel="Unit Picker Wheel"
              />
            </div>

            {/* Preset Identity Input Bar */}
            <div className="mt-2 bg-surface-container-low/70 rounded-xl px-3 py-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIconIndex((i) => i + 1)}
                aria-label="Cycle preset icon"
                className="relative w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {currentIconMeta.icon}
                </span>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xs overflow-hidden">
                  <span className="material-symbols-outlined text-[10px] leading-none scale-75">
                    edit
                  </span>
                </div>
              </button>
              <div className="flex-1 min-w-0 flex items-center">
                <input
                  aria-label="Preset Title"
                  className="w-full bg-transparent p-0 m-0 border-none outline-none font-headline-sm text-headline-sm font-semibold text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-0"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <button
                aria-label="Edit Preset Identity"
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    'input[aria-label="Preset Title"]'
                  );
                  el?.focus();
                }}
                className="w-7 h-7 flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit_note
                </span>
              </button>
            </div>

            {/* Round Trip & Category Section */}
            <div className="mt-2.5 flex flex-col gap-2">
              {/* Round Trip Toggle */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[14px]">
                      sync_alt
                    </span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md font-medium text-on-surface">
                      Round Trip (x2)
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Multiplies mileage calculation
                    </p>
                  </div>
                </div>
                <button
                  aria-checked={isRoundTrip}
                  aria-label="Round Trip (x2)"
                  onClick={() => setIsRoundTrip((prev) => !prev)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center relative focus:outline-none cursor-pointer ${
                    isRoundTrip ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  id="toggle-btn"
                  role="switch"
                  type="button"
                >
                  <div
                    className={`w-5 h-5 bg-surface-container-lowest rounded-full shadow-md transform transition-transform duration-200 ${
                      isRoundTrip ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                    id="toggle-knob"
                  />
                </button>
              </div>

              {/* Category Pills */}
              <div>
                <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-on-surface-variant/70 mb-1.5 block">
                  Category
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {allCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`category-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 active:scale-95 transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-on-primary shadow-sm active'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            isSelected ? '' : 'text-on-surface-variant'
                          }`}
                        >
                          {cat.icon}
                        </span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                  {!isAddingCategory ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="category-pill flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-outline-variant bg-transparent text-on-surface-variant font-label-md text-label-md shrink-0 active:scale-95 transition-all hover:border-outline hover:text-on-surface whitespace-nowrap cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        add
                      </span>
                      <span>New</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddCategorySubmit}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category..."
                        aria-label="New category name"
                        autoFocus
                        className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md w-24 focus:outline-none border border-primary"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-label-md text-label-md cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* 3x4 Numeric Keypad */}
            <div className="mt-3 pt-0.5 grid grid-cols-3 gap-y-1.5 gap-x-3 text-center">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="key-btn h-10 flex items-center justify-center font-headline-md text-headline-md font-bold text-on-surface rounded-xl active:bg-surface-container hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    {key}
                  </button>
                )
              )}
              <button
                aria-label="Backspace"
                type="button"
                onClick={() => handleKeyPress('backspace')}
                className="key-btn h-10 flex items-center justify-center text-on-surface rounded-xl active:bg-surface-container hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  backspace
                </span>
              </button>
            </div>

            {/* Save Preset CTA */}
            <div className="mt-3 pb-1">
              <button
                type="button"
                id="save-preset-btn"
                onClick={handleSave}
                className="w-full h-[50px] bg-primary text-on-primary rounded-2xl flex items-center justify-center gap-2 font-label-lg text-label-lg font-bold uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all hover:bg-neutral-800 cursor-pointer whitespace-nowrap"
              >
                <span>Save Preset</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
