import Taro from '@tarojs/taro'

export type AnalyticsEventName =
  | 'test_start'
  | 'test_complete'
  | 'personal_result_view'
  | 'invite_card_generate'
  | 'invite_card_share'
  | 'invite_link_click'
  | 'partner_entry'
  | 'partner_test_start'
  | 'partner_test_complete'
  | 'pair_result_generated'
  | 'pair_result_view'
  | 'reward_ad_show'
  | 'reward_ad_complete'
  | 'pair_result_share'
  | 'pair_abandon'

export interface AnalyticsEventRecord {
  id: string
  event: AnalyticsEventName
  timestamp: number
  openid: string
  props?: Record<string, any>
}

const ANALYTICS_STORAGE_KEY = 'psy_assess_analytics_events_v2'

export function getAnalyticsEvents(): AnalyticsEventRecord[] {
  try {
    const raw = Taro.getStorageSync(ANALYTICS_STORAGE_KEY)
    if (Array.isArray(raw)) return raw
    return []
  } catch {
    return []
  }
}

export function trackEvent(
  event: AnalyticsEventName,
  openid: string,
  props?: Record<string, any>
): void {
  const record: AnalyticsEventRecord = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    event,
    timestamp: Date.now(),
    openid,
    props
  }

  try {
    const list = getAnalyticsEvents()
    const next = [record, ...list].slice(0, 200)
    Taro.setStorageSync(ANALYTICS_STORAGE_KEY, next)
  } catch {
    // ignore storage errors
  }

  // 微信小程序原生数据上报预留（若支持 wx.reportEvent）
  try {
    const wxObj = (globalThis as any).wx
    if (wxObj && typeof wxObj.reportEvent === 'function') {
      wxObj.reportEvent(event, { openid, ...(props || {}) })
    }
  } catch {
    // ignore
  }
}

export function clearAnalyticsEvents(): void {
  try {
    Taro.removeStorageSync(ANALYTICS_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export interface FunnelMetrics {
  totalUV: number
  testStarts: number
  testCompletes: number
  completionRate: string
  inviteShares: number
  firstShareRate: string
  partnerEntries: number
  returningPartnerEntries: number
  newPartnerEntries: number
  pairGenerated: number
  secondPersonCompletionRate: string
  rewardAdShows: number
  rewardAdCompletes: number
  adUnlockRate: string
}

function pct(num: number, den: number): string {
  if (!den || den <= 0) return '0%'
  return `${Math.min(100, Math.round((num / den) * 100))}%`
}

export function computeFunnelMetrics(): FunnelMetrics {
  const events = getAnalyticsEvents()
  const uniqueOpenids = new Set(events.map(e => e.openid).filter(Boolean))

  const count = (name: AnalyticsEventName) => events.filter(e => e.event === name).length
  const initiatorCompletes = count('test_complete')
  const testStarts = count('test_start') + count('partner_test_start')
  const testCompletes = initiatorCompletes + count('partner_test_complete')
  const inviteShares = count('invite_card_share')
  const firstShareDenominator = initiatorCompletes > 0 ? initiatorCompletes : testCompletes
  const partnerEntriesEvents = events.filter(e => e.event === 'partner_entry')
  const partnerEntries = partnerEntriesEvents.length
  const returningPartnerEntries = partnerEntriesEvents.filter(
    e => e.props && e.props.isReturningUser
  ).length
  const newPartnerEntries = partnerEntries - returningPartnerEntries
  const pairGenerated = count('pair_result_generated')
  const rewardAdShows = count('reward_ad_show')
  const rewardAdCompletes = count('reward_ad_complete')

  return {
    totalUV: Math.max(uniqueOpenids.size, 1),
    testStarts,
    testCompletes,
    completionRate: pct(testCompletes, testStarts),
    inviteShares,
    firstShareRate: pct(inviteShares, firstShareDenominator),
    partnerEntries,
    returningPartnerEntries,
    newPartnerEntries,
    pairGenerated,
    secondPersonCompletionRate: pct(pairGenerated, partnerEntries),
    rewardAdShows,
    rewardAdCompletes,
    adUnlockRate: pct(rewardAdCompletes, rewardAdShows)
  }
}
