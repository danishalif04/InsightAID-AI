/**
 * Notification toggle definitions — static app config (the set of things a
 * user CAN be notified about). Whether each is on is real per-user data,
 * stored in user_preferences.notifications (jsonb), never defaulting to
 * "on" for a toggle the user has never actually set.
 */
export const NOTIFICATION_PREFERENCE_DEFINITIONS = [
  { id: 'crisis_alerts', label: 'Crisis Alerts', description: 'Notify when crisis risk level changes.' },
  { id: 'weekly_digest', label: 'Weekly Digest', description: 'Weekly summary of sentiment and performance.' },
  { id: 'recommendation_updates', label: 'Recommendation Updates', description: 'New AI recommendations are generated.' },
  { id: 'product_updates', label: 'Product Updates', description: 'News about InsightAid AI features.' },
]
