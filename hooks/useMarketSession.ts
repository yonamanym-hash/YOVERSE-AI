// Powered by OnSpace.AI
import { useState, useEffect } from 'react';
import { getSessionStatuses, getEATTime, formatEATTime, getCurrentAdvice, SessionInfo } from '@/services/marketService';
import { MOTIVATIONAL_QUOTES } from '@/constants/config';

export function useMarketSession() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [advice, setAdvice] = useState('');
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  useEffect(() => {
    const update = () => {
      const s = getSessionStatuses();
      const eat = getEATTime();
      setSessions(s);
      setCurrentTime(formatEATTime(eat));
      setAdvice(getCurrentAdvice(s));
    };

    update();
    const interval = setInterval(update, 30000); // update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  return { sessions, currentTime, advice, quote };
}
