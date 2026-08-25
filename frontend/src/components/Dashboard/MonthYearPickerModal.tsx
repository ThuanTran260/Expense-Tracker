import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

interface MonthYearPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: number; // 1-12
  selectedYear: number;
  onChange: (month: number, year: number) => void;
}

export default function MonthYearPickerModal({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  onChange,
}: MonthYearPickerModalProps) {
  const { t, language } = useTranslation();
  const [tempYear, setTempYear] = useState(selectedYear);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Keep tempYear in sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempYear(selectedYear);
    }
  }, [isOpen, selectedYear]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Non-passive wheel listener on window to prevent background scroll
      const preventDefaultWheel = (e: WheelEvent) => {
        e.preventDefault();
      };
      window.addEventListener('wheel', preventDefaultWheel, { passive: false });

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('wheel', preventDefaultWheel);
      };
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();

  const handlePrevYear = () => {
    setSlideDirection('left');
    setTempYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setSlideDirection('right');
    setTempYear((prev) => prev + 1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY > 0) {
      handleNextYear();
    } else if (e.deltaY < 0) {
      handlePrevYear();
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    onChange(monthIndex + 1, tempYear);
    onClose();
  };

  const handleResetToCurrent = () => {
    onChange(currentMonthNum, currentYearNum);
    onClose();
  };

  // Get localized short month names array
  const rawMonths = (t('dashboard.shortMonths') as unknown as string[]) || [];
  const monthNames = Array.isArray(rawMonths) && rawMonths.length === 12
    ? rawMonths
    : (language === 'en'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12']);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="picker-overlay"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(18px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="month-picker-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.div
            key="picker-card"
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
            className="month-picker-card"
            onWheel={handleWheel}
            style={{
              width: '90%',
              maxWidth: 385,
              borderRadius: 24,
              padding: '1.5rem',
              background: 'var(--color-surface, rgba(30, 30, 45, 0.88))',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
              color: 'var(--color-text-primary)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  {t('dashboard.choosePeriod')}
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Year Navigator Carousel */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-border)',
                marginBottom: '1.25rem',
              }}
            >
              <motion.button
                whileTap={{ scale: 0.88 }}
                className="btn btn-ghost btn-sm"
                onClick={handlePrevYear}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <ChevronLeft size={20} />
              </motion.button>

              <AnimatePresence mode="wait">
                <motion.span
                  key={tempYear}
                  initial={{ opacity: 0, x: slideDirection === 'right' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: slideDirection === 'right' ? -20 : 20 }}
                  transition={{ duration: 0.18 }}
                  style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}
                >
                  {tempYear}
                </motion.span>
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.88 }}
                className="btn btn-ghost btn-sm"
                onClick={handleNextYear}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <ChevronRight size={20} />
              </motion.button>
            </div>

            {/* Month Grid (3x4) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {monthNames.map((monthName, idx) => {
                const mNum = idx + 1;
                const isSelected = mNum === selectedMonth && tempYear === selectedYear;
                const isCurrentMonth = mNum === currentMonthNum && tempYear === currentYearNum;

                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectMonth(idx)}
                    style={{
                      padding: '0.75rem 0.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '1.5px solid var(--color-primary)'
                        : isCurrentMonth
                        ? '1.5px solid var(--color-ring)'
                        : '1px solid var(--color-border)',
                      background: isSelected
                        ? 'var(--color-primary)'
                        : isCurrentMonth
                        ? 'var(--color-primary-light)'
                        : 'transparent',
                      color: isSelected ? 'var(--color-primary-contrast)' : 'var(--color-text-primary)',
                      fontWeight: isSelected || isCurrentMonth ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transition: 'background 0.2s ease, border 0.2s ease, color 0.2s ease',
                    }}
                  >
                    {monthName}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer Shortcuts */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                className="btn btn-ghost btn-sm"
                onClick={handleResetToCurrent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={14} />
                {t('dashboard.currentMonth')} ({currentMonthNum}/{currentYearNum})
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
