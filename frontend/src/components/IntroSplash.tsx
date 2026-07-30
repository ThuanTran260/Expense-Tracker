import { useState, useEffect } from 'react';
import { Wallet, Sparkles } from 'lucide-react';

interface IntroSplashProps {
  onComplete?: () => void;
}

export default function IntroSplash({ onComplete }: IntroSplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Check if intro was already shown in this session
    const hasSeen = sessionStorage.getItem('expense_tracker_intro_seen');
    if (hasSeen) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem('expense_tracker_intro_seen', 'true');
        onComplete?.();
      }, 600); // fade out duration
    }, 1400); // splash display time

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`intro-splash-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="intro-splash-card">
        {/* Glow ambient background behind logo */}
        <div className="intro-logo-glow" />

        <div className="intro-logo-container">
          <Wallet size={40} className="intro-logo-icon" />
          <Sparkles size={20} className="intro-sparkle-icon" />
        </div>

        <h1 className="intro-title">
          Expense<span className="intro-title-accent">Tracker</span>
        </h1>

        <p className="intro-subtitle">
          Quản Lý Chi Tiêu Cá Nhân Smart & Intuitive
        </p>

        {/* Shimmer loading bar */}
        <div className="intro-progress-track">
          <div className="intro-progress-bar" />
        </div>
      </div>
    </div>
  );
}
