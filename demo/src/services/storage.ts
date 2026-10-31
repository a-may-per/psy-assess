import Taro from '@tarojs/taro'
import { clearAnalyticsEvents } from './analytics'

export interface AssessmentRecord {
  id: string
  openid: string
  nickname: string
  scores: number[]
  answers: number[]
  profileName: string
  createdAt: number
}

export interface InvitePayload {
  inviteId: string
  inviterOpenid: string
  inviterName: string
  inviterScores: number[]
  inviterProfileName: string
  createdAt: number
}

export interface PairRecord {
  pairId: string
  inviteId: string
  userA: {
    openid: string
    name: string
    scores: number[]
    profileName: string
  }
  userB: {
    openid: string
    name: string
    scores: number[]
    profileName: string
  }
  archetypeId: string
  archetypeName: string
  unlocked: boolean
  unlockedByAd: boolean
  createdAt: number
}

export interface UserIdentity {
  openid: string
  nickname: string
  roleTag: 'self' | 'partner_sim'
}

export interface AppSettings {
  trafficHostEnabled: boolean // 流量主开关（UV>=1000 后开启激励视频解锁配对结果）
  rewardedVideoUnitId: string // 微信激励视频广告位 unit-id 预留
  bannerUnitId: string // 结果页底部 Banner 广告位 unit-id 预留
}

const KEYS = {
  ACTIVE_PERSONA: 'psy_assess_active_persona_v2',
  USER_RECORDS: 'psy_assess_user_records_v2',
  INVITES: 'psy_assess_invites_v2',
  PAIRS: 'psy_assess_pairs_v2',
  CONSENT_MAP: 'psy_assess_consent_map_v2',
  SETTINGS: 'psy_assess_settings_v2'
}

const DEFAULT_IDENTITIES: Record<'self' | 'partner_sim', UserIdentity> = {
  self: {
    openid: 'wx_openid_user_a',
    nickname: '我',
    roleTag: 'self'
  },
  partner_sim: {
    openid: 'wx_openid_partner_b',
    nickname: '好友小鹿',
    roleTag: 'partner_sim'
  }
}

export function getActivePersona(): UserIdentity {
  try {
    const saved = Taro.getStorageSync(KEYS.ACTIVE_PERSONA) as 'self' | 'partner_sim'
    if (saved === 'partner_sim') return DEFAULT_IDENTITIES.partner_sim
    return DEFAULT_IDENTITIES.self
  } catch {
    return DEFAULT_IDENTITIES.self
  }
}

export function setActivePersona(role: 'self' | 'partner_sim'): UserIdentity {
  try {
    Taro.setStorageSync(KEYS.ACTIVE_PERSONA, role)
  } catch {
    // ignore
  }
  return DEFAULT_IDENTITIES[role]
}

export function getAppSettings(): AppSettings {
  const defaults: AppSettings = {
    trafficHostEnabled: false,
    rewardedVideoUnitId: '',
    bannerUnitId: ''
  }
  try {
    const saved = Taro.getStorageSync(KEYS.SETTINGS)
    if (saved && typeof saved === 'object') {
      return { ...defaults, ...saved }
    }
    return defaults
  } catch {
    return defaults
  }
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getAppSettings(), ...patch }
  try {
    Taro.setStorageSync(KEYS.SETTINGS, next)
  } catch {
    // ignore
  }
  return next
}

export function hasAcceptedConsent(openid: string): boolean {
  try {
    const map = Taro.getStorageSync(KEYS.CONSENT_MAP) || {}
    return Boolean(map[openid])
  } catch {
    return false
  }
}

export function acceptConsent(openid: string): void {
  try {
    const map = Taro.getStorageSync(KEYS.CONSENT_MAP) || {}
    map[openid] = Date.now()
    Taro.setStorageSync(KEYS.CONSENT_MAP, map)
  } catch {
    // ignore
  }
}

export function getAllAssessmentRecords(): AssessmentRecord[] {
  try {
    const list = Taro.getStorageSync(KEYS.USER_RECORDS)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function getLatestAssessment(openid: string): AssessmentRecord | null {
  const list = getAllAssessmentRecords().filter(item => item.openid === openid)
  if (list.length === 0) return null
  return list.sort((a, b) => b.createdAt - a.createdAt)[0]
}

export function getUserAssessmentHistory(openid: string): AssessmentRecord[] {
  return getAllAssessmentRecords()
    .filter(item => item.openid === openid)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function saveAssessmentRecord(
  openid: string,
  nickname: string,
  scores: number[],
  answers: number[],
  profileName: string
): AssessmentRecord {
  const record: AssessmentRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    openid,
    nickname,
    scores,
    answers,
    profileName,
    createdAt: Date.now()
  }
  try {
    const list = getAllAssessmentRecords()
    const next = [record, ...list].slice(0, 50)
    Taro.setStorageSync(KEYS.USER_RECORDS, next)
  } catch {
    // ignore
  }
  return record
}

export function getAllInvites(): InvitePayload[] {
  try {
    const list = Taro.getStorageSync(KEYS.INVITES)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function createOrGetInvite(
  inviterOpenid: string,
  inviterName: string,
  inviterScores: number[],
  inviterProfileName: string
): InvitePayload {
  const existing = getAllInvites().find(
    inv =>
      inv.inviterOpenid === inviterOpenid &&
      inv.inviterScores.join(',') === inviterScores.join(',')
  )
  if (existing) return existing

  const invite: InvitePayload = {
    inviteId: `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    inviterOpenid,
    inviterName,
    inviterScores,
    inviterProfileName,
    createdAt: Date.now()
  }

  try {
    const list = getAllInvites()
    Taro.setStorageSync(KEYS.INVITES, [invite, ...list].slice(0, 40))
  } catch {
    // ignore
  }
  return invite
}

export function getInviteById(inviteId: string): InvitePayload | null {
  return getAllInvites().find(item => item.inviteId === inviteId) || null
}

/**
 * 将邀请信息编码为小程序分享 Path 参数，使跨设备真实微信好友无需依赖重后端也能直接解析配对
 */
export function buildShareQuery(invite: InvitePayload): string {
  const scoresParam = invite.inviterScores.join('-')
  const nameParam = encodeURIComponent(invite.inviterName)
  const profileParam = encodeURIComponent(invite.inviterProfileName)
  return `inviteId=${invite.inviteId}&fromOpenid=${invite.inviterOpenid}&fromName=${nameParam}&fromScores=${scoresParam}&fromProfile=${profileParam}`
}

export function parseInviteFromParams(params: Record<string, any> | undefined): InvitePayload | null {
  if (!params || !params.inviteId) return null
  const local = getInviteById(String(params.inviteId))
  if (local) return local

  if (params.fromScores) {
    const parsedScores = String(params.fromScores)
      .split('-')
      .map(n => Number(n))
      .filter(n => !Number.isNaN(n))
    if (parsedScores.length === 5) {
      const reconstructed: InvitePayload = {
        inviteId: String(params.inviteId),
        inviterOpenid: String(params.fromOpenid || 'wx_openid_remote_inviter'),
        inviterName: params.fromName ? decodeURIComponent(String(params.fromName)) : '邀请你的朋友',
        inviterScores: parsedScores,
        inviterProfileName: params.fromProfile
          ? decodeURIComponent(String(params.fromProfile))
          : '认真生活的掌舵者',
        createdAt: Date.now()
      }
      try {
        const list = getAllInvites()
        Taro.setStorageSync(KEYS.INVITES, [reconstructed, ...list].slice(0, 40))
      } catch {
        // ignore
      }
      return reconstructed
    }
  }
  return null
}

export function getAllPairRecords(): PairRecord[] {
  try {
    const list = Taro.getStorageSync(KEYS.PAIRS)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function getUserPairRecords(openid: string): PairRecord[] {
  return getAllPairRecords()
    .filter(item => item.userA.openid === openid || item.userB.openid === openid)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function saveOrUpdatePairRecord(params: {
  inviteId: string
  userA: { openid: string; name: string; scores: number[]; profileName: string }
  userB: { openid: string; name: string; scores: number[]; profileName: string }
  archetypeId: string
  archetypeName: string
}): PairRecord {
  const all = getAllPairRecords()
  const existing = all.find(
    p =>
      p.inviteId === params.inviteId &&
      p.userA.openid === params.userA.openid &&
      p.userB.openid === params.userB.openid &&
      p.userA.scores.join(',') === params.userA.scores.join(',') &&
      p.userB.scores.join(',') === params.userB.scores.join(',')
  )
  if (existing) {
    return existing
  }

  const settings = getAppSettings()
  // 核心商业规则（monetization.md）：
  // 1. 流量主未开通（trafficHostEnabled = false）时生成的配对直接 unlocked = true
  // 2. 达标后开启流量主时，历史已生成的配对结果不追溯（仍保持 unlocked = true），仅新配对需激励视频解锁
  const pair: PairRecord = {
    pairId: `pair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    inviteId: params.inviteId,
    userA: params.userA,
    userB: params.userB,
    archetypeId: params.archetypeId,
    archetypeName: params.archetypeName,
    unlocked: !settings.trafficHostEnabled,
    unlockedByAd: false,
    createdAt: Date.now()
  }

  try {
    Taro.setStorageSync(KEYS.PAIRS, [pair, ...all].slice(0, 50))
  } catch {
    // ignore
  }
  return pair
}

export function unlockPairRecord(pairId: string, byAd = true): PairRecord | null {
  const all = getAllPairRecords()
  let updated: PairRecord | null = null
  const next = all.map(item => {
    if (item.pairId === pairId) {
      updated = { ...item, unlocked: true, unlockedByAd: byAd }
      return updated
    }
    return item
  })
  if (updated) {
    try {
      Taro.setStorageSync(KEYS.PAIRS, next)
    } catch {
      // ignore
    }
  }
  return updated
}

/**
 * 合规删除权（compliance.md 第三节）：一键彻底清除当前设备上的测评记录、配对关联、隐私授权与埋点数据
 */
export function deleteAllUserData(): void {
  try {
    Taro.removeStorageSync(KEYS.USER_RECORDS)
    Taro.removeStorageSync(KEYS.INVITES)
    Taro.removeStorageSync(KEYS.PAIRS)
    Taro.removeStorageSync(KEYS.CONSENT_MAP)
    Taro.removeStorageSync(KEYS.ACTIVE_PERSONA)
    clearAnalyticsEvents()
  } catch {
    // ignore
  }
}
