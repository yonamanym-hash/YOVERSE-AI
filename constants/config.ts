// Powered by OnSpace.AI

export const APP_NAME = 'Digital Twin';
export const YONAS_EMAIL = 'yonamanym@gmail.com'; // Owner: Yonas
export const YONAS_NAME = 'Yonas';

// Ethiopia Time is UTC+3
export const EAT_OFFSET_HOURS = 3;

// Key trading sessions in EAT (UTC+3)
export const SESSIONS = {
  LONDON_OPEN: { label: 'London Open', hour: 11, minute: 0 },
  LONDON_CLOSE: { label: 'London Close', hour: 19, minute: 0 },
  NY_OPEN: { label: 'New York Open', hour: 15, minute: 30 },
  NY_CLOSE: { label: 'New York Close', hour: 23, minute: 0 },
  ASIA_OPEN: { label: 'Asia Open', hour: 3, minute: 0 },
};

export const QUICK_PROMPTS = [
  { label: 'XAUUSD Setup?', emoji: '📊', query: 'Give me the current XAUUSD CRT setup on the 5m chart.' },
  { label: 'Prop Firms', emoji: '🏦', query: 'What are the best prop firms I can apply to right now?' },
  { label: 'Market Sessions', emoji: '🕐', query: 'What sessions should I focus on today and why?' },
  { label: 'Motivation', emoji: '🔥', query: 'Yonas needs a push today. Give me something real.' },
];

export const MOTIVATIONAL_QUOTES = [
  { en: 'Patience is the weapon of the funded trader.', am: 'ትዕግስት የፈንዲ ነጋዴ ጦር ነው።' },
  { en: 'Track liquidity. Let the market come to you.', am: 'ሊኩዊዲቲን ተከታተል። ገበያው ወደ አንተ ይምጣ።' },
  { en: 'Your mother is watching. Make her proud.', am: 'እናቴ እያዩ ናቸው። ኩራት አሳያቸው።' },
  { en: "School + Trading + Vision = Your future. Don't quit.", am: 'ትምህርት + ንግድ + ራዕይ = ወደፊትህ። አትተው።' },
  { en: 'One good setup a week beats 20 bad trades.', am: 'በሳምንት አንድ ጥሩ ሴትአፕ ከ20 መጥፎ ትሬዶች ይሻላል።' },
];
