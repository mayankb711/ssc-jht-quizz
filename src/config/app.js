export const VERSION = {
  app: '2.1.0',
  db: 3,
  backup: 2,
};

export const APP = {
  name: 'SSC JHT Quiz',
  subtitle: 'Paper 1 practice',
  defaultTheme: 'dark',
  defaultNeuronCap: 8000,
  negativeMarking: 0.25,
  maxErrorReports: 100,
  dbName: 'sscjht',
};

export const FEATURES = {
  cloudSync: true,
  aiExplanations: true,
  bookmarks: true,
  dailyGoal: true,
  mistakesReview: true,
  topicPractice: true,
};

export const KV_KEYS = {
  theme: 'theme',
  cfAccount: 'cf_account',
  cfToken: 'cf_token',
  cfModel: 'cf_model',
  neuronCap: 'neuron_cap',
  fbProjectId: 'fb_project_id',
  fbApiKey: 'fb_api_key',
  firebaseDeviceId: 'firebase_device_id',
  firebaseLastSyncTs: 'firebase_last_sync_ts',
  bookmarks: 'bookmarks',
  dailyGoal: 'daily_goal',
  errorReports: 'error_reports',
  lastScreen: 'last_screen',
  appFirstRun: 'app_first_run',
};

export const SCREEN_LABELS = {
  home: 'Home',
  quiz: 'Quiz',
  review: 'Review',
  progress: 'Progress',
  settings: 'Settings',
  diagnostics: 'Diagnostics',
};
