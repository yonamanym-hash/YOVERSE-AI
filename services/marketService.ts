// Powered by OnSpace.AI
import { SESSIONS, EAT_OFFSET_HOURS } from '@/constants/config';

export interface SessionInfo {
  name: string;
  label: string;
  isActive: boolean;
  timeUntil: string;
  statusColor: string;
  emoji: string;
}

export function getEATTime(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + EAT_OFFSET_HOURS * 3600000);
}

export function formatEATTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} EAT`;
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function sessionMinutes(session: { hour: number; minute: number }): number {
  return session.hour * 60 + session.minute;
}

function minsToHHMM(mins: number): string {
  if (mins <= 0) return 'Now';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function getSessionStatuses(): SessionInfo[] {
  const eat = getEATTime();
  const currentMins = minutesFromMidnight(eat);

  const londonOpen = sessionMinutes(SESSIONS.LONDON_OPEN);
  const londonClose = sessionMinutes(SESSIONS.LONDON_CLOSE);
  const nyOpen = sessionMinutes(SESSIONS.NY_OPEN);
  const nyClose = sessionMinutes(SESSIONS.NY_CLOSE);
  const asiaOpen = sessionMinutes(SESSIONS.ASIA_OPEN);

  const isLondonActive = currentMins >= londonOpen && currentMins < londonClose;
  const isNYActive = currentMins >= nyOpen && currentMins < nyClose;
  const isAsiaActive = currentMins >= asiaOpen && currentMins < londonOpen;

  const minsUntil = (target: number) => {
    let diff = target - currentMins;
    if (diff < 0) diff += 1440;
    return diff;
  };

  return [
    {
      name: 'london',
      label: 'London Open',
      isActive: isLondonActive,
      timeUntil: isLondonActive ? 'LIVE' : minsToHHMM(minsUntil(londonOpen)),
      statusColor: isLondonActive ? '#22C55E' : '#FFD700',
      emoji: '🇬🇧',
    },
    {
      name: 'newyork',
      label: 'New York',
      isActive: isNYActive,
      timeUntil: isNYActive ? 'LIVE' : minsToHHMM(minsUntil(nyOpen)),
      statusColor: isNYActive ? '#22C55E' : '#3B82F6',
      emoji: '🇺🇸',
    },
    {
      name: 'asia',
      label: 'Asia Session',
      isActive: isAsiaActive,
      timeUntil: isAsiaActive ? 'LIVE' : minsToHHMM(minsUntil(asiaOpen)),
      statusColor: isAsiaActive ? '#22C55E' : '#A78BFA',
      emoji: '🌏',
    },
  ];
}

export function getCurrentAdvice(sessions: SessionInfo[]): string {
  const london = sessions.find((s) => s.name === 'london');
  const ny = sessions.find((s) => s.name === 'newyork');

  if (london?.isActive && ny?.isActive) {
    return 'London-NY overlap ACTIVE — highest liquidity window. Hunt for CRT on 5m.';
  }
  if (london?.isActive) {
    return 'London session LIVE. Watch for sweeps on key HTF levels. TBS setups forming.';
  }
  if (ny?.isActive) {
    return 'New York expansion ACTIVE. Continuation moves are in play. Protect your SL.';
  }
  return 'Off-session. No high-probability setups. Study charts or rest. Patience wins.';
}
