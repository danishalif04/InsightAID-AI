/** Mock fixtures for the Settings page (Phase 12). */

export const profileDefaults = {
  fullName: 'Admin User',
  email: 'admin@insightaid.ai',
  role: 'Founder',
  phone: '+60 12-345 6789',
}

export const companyDefaults = {
  name: 'InsightAid Sdn Bhd',
  industry: 'Data Analytics / SaaS',
  size: '1–10 employees',
  website: 'https://insightaid.ai',
}

export const notificationDefaults = [
  { id: 'email-alerts', label: 'Email alerts', description: 'Receive alerts by email as they happen', checked: true },
  { id: 'crisis-alerts', label: 'Crisis alerts', description: 'Immediate notification on crisis-level changes', checked: true },
  { id: 'weekly-report', label: 'Weekly report digest', description: 'A summary email every Monday morning', checked: true },
  { id: 'product-updates', label: 'Product updates', description: 'News about new InsightAid features', checked: false },
]

export const apiKeys = [
  { id: 'tiktok', name: 'TikTok API Key', masked: 'tk_live_••••••••••••4f2a' },
  { id: 'x', name: 'X API Key', masked: 'x_live_•••••••••••••9c1e' },
  { id: 'internal', name: 'Internal Database Key', masked: 'idb_•••••••••••••••7b3d' },
]

export const modelConfigDefaults = {
  sentimentModel: 'XLM-RoBERTa v2.1',
  confidenceThreshold: 75,
  crisisSensitivity: 'medium',
}

export const databaseDefaults = {
  connectionString: 'postgresql://insightaid_prod:••••••@db.insightaid.ai:5432/analytics',
  backupFrequency: 'daily',
  lastBackup: '2026-07-10T03:00:00+08:00',
}

export const aboutInfo = {
  appName: 'InsightAid AI',
  version: '0.1.0',
  fullTitle: 'An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups',
  student: 'Muhammad Danish Alif Bin Azrul (22006390)',
  supervisor: 'Ts Dr. Ahmad Izuddin Bin Zainal Abidin',
  institution: 'Universiti Teknologi PETRONAS — Faculty of Science, Management & Computing',
}
