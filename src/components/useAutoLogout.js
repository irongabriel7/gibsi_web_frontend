// useAutoLogout.js
import { useEffect, useRef } from 'react';

export function useAutoLogout(onLogout, unlocked) {
  const timerRef = useRef();

  useEffect(() => {
    if (!unlocked) return;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLogout();
      }, 20 * 60 * 1000); // 20min
    };

    ['mousemove','mousedown','keypress','scroll','touchstart'].forEach(evt => {
      window.addEventListener(evt, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      ['mousemove','mousedown','keypress','scroll','touchstart'].forEach(evt => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [onLogout, unlocked]);
}
