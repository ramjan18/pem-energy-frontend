// Storage helpers for localStorage

export const storage = {
  get: (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

export const KEYS = {
  RECORDS: 'energyRecords',
  DELETED: 'deletedRecords',
  ALLOWANCES: 'deletionAllowances',
};

export function initStorage() {
  if (!localStorage.getItem(KEYS.RECORDS)) storage.set(KEYS.RECORDS, []);
  if (!localStorage.getItem(KEYS.DELETED)) storage.set(KEYS.DELETED, []);
  if (!localStorage.getItem(KEYS.ALLOWANCES)) storage.set(KEYS.ALLOWANCES, []);
}

export const MANAGER_ID = 'PEM2026';
export const MANAGER_PWD = 'PEM123';
export const SHIFT_PASSWORDS = { '1': '111', '2': '222', '3': '333' };
export const SECTIONS = ['SMRT', 'SAPL', 'SMC-HT'];
export const COOLDOWN_MS = 18 * 60 * 60 * 1000;
