import { supabase } from '@/config/supabaseClient'
import { SOURCE_STATUS } from './sourceStatus'

/**
 * Sales Data adapter — our own database (Phase 4's raw_data, template_id
 * 'sales'). No external credentials needed; status is always genuinely
 * computed from what's actually been uploaded.
 */
export const salesDataAdapter = {
  id: 'sales',
  name: 'Sales Data',
  mode: 'database',
  modes: ['startup', 'ecommerce'],

  async checkStatus() {
    const { count, error: countError } = await supabase
      .from('raw_data')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', 'sales')
    if (countError) throw countError

    if (!count) {
      return { status: SOURCE_STATUS.NOT_CONFIGURED, lastSync: null, recordCount: 0 }
    }

    const { data, error: lastError } = await supabase
      .from('raw_data')
      .select('created_at')
      .eq('template_id', 'sales')
      .order('created_at', { ascending: false })
      .limit(1)
    if (lastError) throw lastError

    return { status: SOURCE_STATUS.CONNECTED, lastSync: data?.[0]?.created_at ?? null, recordCount: count }
  },

  async sync() {
    const status = await this.checkStatus()
    return {
      status: status.status,
      message:
        status.status === SOURCE_STATUS.CONNECTED
          ? `${status.recordCount} sales row(s) on record.`
          : 'No sales data uploaded yet — use Upload Dataset above.',
    }
  },
}
