import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, View, Text } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import {
  DIMENSIONS,
  PERMS,
  QUESTIONS,
  calculateDimensionScores
} from '../../data/quizData'
import {
  SAMPLE_PARTNERS,
  SamplePartner,
  getPersonalProfile,
  matchPairProfile
} from '../../data/matchingEngine'
import {
  AppSettings,
  InvitePayload,
  PairRecord,
  UserIdentity,
  acceptConsent,
  buildShareQuery,
  createOrGetInvite,
  deleteAllUserData,
  getActivePersona,
  getAppSettings,
  getLatestAssessment,
  getUserAssessmentHistory,
  getUserPairRecords,
  hasAcceptedConsent,
  parseInviteFromParams,
  saveAssessmentRecord,
  saveOrUpdatePairRecord,
  setActivePersona,
  unlockPairRecord,
  updateAppSettings
} from '../../services/storage'
import {
  FunnelMetrics,
  computeFunnelMetrics,
  getAnalyticsEvents,
  trackEvent
} from '../../services/analytics'
import { RadarChart } from '../../components/RadarChart'
import './index.scss'

type Stage = 'intro' | 'quiz' | 'personal' | 'invite' | 'pair' | 'records'

export default function Index() {
  const router = useRouter()

  const [identity, setIdentity] = useState<UserIdentity>(() => getActivePersona())
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings())
  const [stage, setStage] = useState<Stage>('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Array<number | null>>(() =>
    QUESTIONS.map(() => null)
  )

  // 当前展示的个人五维分数（优先取刚测完的分数或历史最新记录）
  const [activeScores, setActiveScores] = useState<number[] | null>(() => {
    const latest = getLatestAssessment(getActivePersona().openid)
    return latest ? latest.scores : null
  })

  // 受邀配对上下文（当作为用户 B 通过分享卡片进入时持有）
  const [pendingInvite, setPendingInvite] = useState<InvitePayload | null>(null)
  // 当前生成的邀请卡
  const [currentInvite, setCurrentInvite] = useState<InvitePayload | null>(null)
  // 当前查看的配对记录
  const [activePair, setActivePair] = useState<PairRecord | null>(null)

  // 弹窗状态：测评前单独同意弹窗、隐私与删除权弹窗、MVP 漏斗与验真抽屉、激励视频模拟倒计时
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showDevDrawer, setShowDevDrawer] = useState(false)
  const [adPlayingCountdown, setAdPlayingCountdown] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoNextTimer = () => {
    if (autoNextTimerRef.current !== null) {
      clearTimeout(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearAutoNextTimer()
    }
  }, [])

  const latestRecord = useMemo(
    () => getLatestAssessment(identity.openid),
    [identity.openid, refreshTick]
  )
  const userHistory = useMemo(
    () => getUserAssessmentHistory(identity.openid),
    [identity.openid, refreshTick]
  )
  const pairHistory = useMemo(
    () => getUserPairRecords(identity.openid),
    [identity.openid, refreshTick]
  )
  const funnelMetrics: FunnelMetrics = useMemo(
    () => computeFunnelMetrics(),
    [refreshTick, stage, showDevDrawer]
  )
  const recentEvents = useMemo(
    () => getAnalyticsEvents().slice(0, 8),
    [refreshTick, stage, showDevDrawer]
  )

  // 解析小程序启动路由中的邀请参数（例如微信分享卡片进入 ?inviteId=...）
  useEffect(() => {
    const inviteFromUrl = parseInviteFromParams(router?.params)
    if (inviteFromUrl && inviteFromUrl.inviterOpenid !== identity.openid) {
      handlePartnerEntryWithInvite(inviteFromUrl, identity)
    }
  }, [router?.params])

  // 计算当前五维得分与个人画像
  const computedQuizScores = useMemo(
    () => calculateDimensionScores(answers),
    [answers]
  )
  const scores = useMemo(() => {
    if (activeScores && activeScores.length === 5) return activeScores
    if (latestRecord) return latestRecord.scores
    return computedQuizScores
  }, [activeScores, latestRecord, computedQuizScores])

  const personalProfile = useMemo(() => getPersonalProfile(scores), [scores])

  // 计算当前配对结果的完整画像与双方角色
  const pairMatch = useMemo(() => {
    if (!activePair) return null
    return matchPairProfile(
      activePair.userA.scores,
      activePair.userB.scores,
      activePair.userA.name,
      activePair.userB.name
    )
  }, [activePair])

  // 微信小程序原生转发卡片配置（自愿分享，绝不绑定强制解锁）
  useShareAppMessage(() => {
    if (stage === 'pair' && activePair && pairMatch) {
      trackEvent('pair_result_share', identity.openid, {
        pairId: activePair.pairId,
        archetype: pairMatch.archetype.name
      })
      return {
        title: `我们测出了「${pairMatch.archetype.name}」：${pairMatch.shareQuote}`,
        path: '/pages/index/index'
      }
    }

    const invite =
      currentInvite ||
      createOrGetInvite(
        identity.openid,
        identity.nickname,
        scores,
        personalProfile.name
      )
    trackEvent('invite_card_share', identity.openid, {
      inviteId: invite.inviteId,
      channel: 'weapp_native_share'
    })
    const query = buildShareQuery(invite)
    return {
      title: `我是「${personalProfile.name}」，测测我们会是什么关系画像？`,
      path: `/pages/index/index?${query}`
    }
  })

  // 处理受邀人 B 进入邀请链接
  const handlePartnerEntryWithInvite = (
    invite: InvitePayload,
    targetIdentity: UserIdentity
  ) => {
    setPendingInvite(invite)
    trackEvent('invite_link_click', targetIdentity.openid, {
      inviteId: invite.inviteId,
      inviterOpenid: invite.inviterOpenid
    })
    const existingBRecord = getLatestAssessment(targetIdentity.openid)
    trackEvent('partner_entry', targetIdentity.openid, {
      inviteId: invite.inviteId,
      isReturningUser: Boolean(existingBRecord)
    })
    if (existingBRecord) {
      setActiveScores(existingBRecord.scores)
    }
    setStage('intro')
  }

  // 点击开始测评：先检查敏感信息单独同意状态（compliance.md 第三节）
  const requestStartQuiz = () => {
    if (!hasAcceptedConsent(identity.openid)) {
      setShowConsentModal(true)
      return
    }
    startQuizFlow()
  }

  const handleConfirmConsent = () => {
    acceptConsent(identity.openid)
    setShowConsentModal(false)
    setRefreshTick(t => t + 1)
    startQuizFlow()
  }

  const startQuizFlow = () => {
    clearAutoNextTimer()
    setQuestionIndex(0)
    setAnswers(QUESTIONS.map(() => null))
    if (pendingInvite) {
      trackEvent('partner_test_start', identity.openid, {
        inviteId: pendingInvite.inviteId
      })
    } else {
      trackEvent('test_start', identity.openid)
    }
    setStage('quiz')
  }

  const selectedAnswer = answers[questionIndex]
  const progress = useMemo(
    () => Math.round(((questionIndex + 1) / QUESTIONS.length) * 100),
    [questionIndex]
  )

  const chooseAnswer = (answerIndex: number) => {
    clearAutoNextTimer()
    setAnswers(current =>
      current.map((ans, idx) => (idx === questionIndex ? answerIndex : ans))
    )
    if (questionIndex < QUESTIONS.length - 1) {
      const targetNextIdx = questionIndex + 1
      autoNextTimerRef.current = setTimeout(() => {
        autoNextTimerRef.current = null
        setQuestionIndex(targetNextIdx)
      }, 180)
    }
  }

  const goBackFromQuiz = () => {
    clearAutoNextTimer()
    if (questionIndex === 0) {
      if (pendingInvite) {
        trackEvent('pair_abandon', identity.openid, {
          inviteId: pendingInvite.inviteId,
          stage: 'quiz_exit'
        })
      }
      setStage('intro')
      return
    }
    setQuestionIndex(idx => idx - 1)
  }

  // 提交 15 题并生成个人结果
  const submitQuiz = () => {
    clearAutoNextTimer()
    if (selectedAnswer === null) return
    const firstUnansweredIdx = answers.findIndex(a => a === null)
    if (firstUnansweredIdx !== -1) {
      setQuestionIndex(firstUnansweredIdx)
      Taro.showToast({
        title: `第 ${firstUnansweredIdx + 1} 题尚未选择，请先完成`,
        icon: 'none',
        duration: 1800
      })
      return
    }
    const finalScores = calculateDimensionScores(answers)
    const profile = getPersonalProfile(finalScores)
    const cleanAnswers = answers.map(a => (a === null ? 0 : a))

    saveAssessmentRecord(
      identity.openid,
      identity.nickname,
      finalScores,
      cleanAnswers,
      profile.name
    )
    setActiveScores(finalScores)
    setRefreshTick(t => t + 1)

    if (pendingInvite) {
      trackEvent('partner_test_complete', identity.openid, {
        inviteId: pendingInvite.inviteId,
        profileName: profile.name
      })
    } else {
      trackEvent('test_complete', identity.openid, {
        profileName: profile.name
      })
    }
    trackEvent('personal_result_view', identity.openid, {
      profileName: profile.name
    })
    setStage('personal')
  }

  // 打开邀请页并生成长期有效邀请卡
  const openInvitePage = () => {
    const invite = createOrGetInvite(
      identity.openid,
      identity.nickname,
      scores,
      personalProfile.name
    )
    setCurrentInvite(invite)
    trackEvent('invite_card_generate', identity.openid, {
      inviteId: invite.inviteId
    })
    setRefreshTick(t => t + 1)
    setStage('invite')
  }

  // 生成并打开双人配对结果（支持从受邀链接生成，或与示例搭子试配）
  const generatePairWithInvite = (invite: InvitePayload, partnerScores: number[]) => {
    const bProfile = getPersonalProfile(partnerScores)
    const match = matchPairProfile(
      invite.inviterScores,
      partnerScores,
      invite.inviterName,
      identity.nickname
    )
    const pairRecord = saveOrUpdatePairRecord({
      inviteId: invite.inviteId,
      userA: {
        openid: invite.inviterOpenid,
        name: invite.inviterName,
        scores: invite.inviterScores,
        profileName: invite.inviterProfileName
      },
      userB: {
        openid: identity.openid,
        name: identity.nickname,
        scores: partnerScores,
        profileName: bProfile.name
      },
      archetypeId: match.archetype.id,
      archetypeName: match.archetype.name
    })

    setActivePair(pairRecord)
    setPendingInvite(null)
    setRefreshTick(t => t + 1)
    trackEvent('pair_result_generated', identity.openid, {
      pairId: pairRecord.pairId,
      inviteId: invite.inviteId,
      archetype: match.archetype.name
    })
    trackEvent('pair_result_view', identity.openid, {
      pairId: pairRecord.pairId,
      unlocked: pairRecord.unlocked
    })
    setStage('pair')
  }

  // 与示例搭子快速试配（不消耗真实好友邀请，方便单人先行体验 8 大关系画像）
  const trySamplePartner = (sample: SamplePartner) => {
    const match = matchPairProfile(
      scores,
      sample.scores,
      identity.nickname,
      sample.name
    )
    const pairRecord = saveOrUpdatePairRecord({
      inviteId: `sample_${sample.id}`,
      userA: {
        openid: identity.openid,
        name: identity.nickname,
        scores,
        profileName: personalProfile.name
      },
      userB: {
        openid: `openid_${sample.id}`,
        name: sample.name,
        scores: sample.scores,
        profileName: getPersonalProfile(sample.scores).name
      },
      archetypeId: match.archetype.id,
      archetypeName: match.archetype.name
    })
    setActivePair(pairRecord)
    setRefreshTick(t => t + 1)
    trackEvent('pair_result_generated', identity.openid, {
      pairId: pairRecord.pairId,
      isSample: true,
      archetype: match.archetype.name
    })
    trackEvent('pair_result_view', identity.openid, {
      pairId: pairRecord.pairId,
      unlocked: pairRecord.unlocked
    })
    setStage('pair')
  }

  // 核心验真功能：一键以「受邀好友 B（好友小鹿）」视角打开当前邀请卡，完整走通 A→B 配对闭环
  const simulateFriendBOpeningInvite = () => {
    const invite =
      currentInvite ||
      createOrGetInvite(
        identity.openid,
        identity.nickname,
        scores,
        personalProfile.name
      )
    trackEvent('invite_card_share', identity.openid, {
      inviteId: invite.inviteId,
      channel: 'simulate_partner_b'
    })
    const partnerPersona = setActivePersona('partner_sim')
    setIdentity(partnerPersona)
    const existingB = getLatestAssessment(partnerPersona.openid)
    setActiveScores(existingB ? existingB.scores : null)
    handlePartnerEntryWithInvite(invite, partnerPersona)
    Taro.showToast({
      title: '已切换为「好友小鹿」视角',
      icon: 'none',
      duration: 2000
    })
  }

  // 切换当前体验身份（发起人 A vs 好友小鹿 B）
  const switchPersona = (role: 'self' | 'partner_sim') => {
    const nextPersona = setActivePersona(role)
    setIdentity(nextPersona)
    const latest = getLatestAssessment(nextPersona.openid)
    setActiveScores(latest ? latest.scores : null)
    setPendingInvite(null)
    setRefreshTick(t => t + 1)
    setStage(latest ? 'personal' : 'intro')
    Taro.showToast({
      title: `当前身份：${nextPersona.nickname}`,
      icon: 'none',
      duration: 1500
    })
  }

  // 激励视频解锁配对结果（monetization.md：谁看配对谁看广告；支持微信原生激励视频与开通前模拟）
  const handleWatchRewardedAdToUnlock = () => {
    if (!activePair) return
    trackEvent('reward_ad_show', identity.openid, {
      pairId: activePair.pairId
    })

    // 若已配置真实微信小程序激励视频广告位 unit-id，则调用原生 API
    const wxObj = (globalThis as any).wx
    if (
      settings.rewardedVideoUnitId &&
      wxObj &&
      typeof wxObj.createRewardedVideoAd === 'function'
    ) {
      try {
        const videoAd = wxObj.createRewardedVideoAd({
          adUnitId: settings.rewardedVideoUnitId
        })
        videoAd.onClose((res: any) => {
          if ((res && res.isEnded) || res === undefined) {
            completeAdUnlock(activePair.pairId)
          } else {
            Taro.showToast({
              title: '完整观看视频后即可解锁关系画像',
              icon: 'none'
            })
          }
        })
        videoAd.show().catch(() => {
          videoAd.load().then(() => videoAd.show())
        })
        return
      } catch {
        // 降级到预览倒计时
      }
    }

    // 流量主未填写 unit-id 时的 3 秒激励视频预览体验
    setAdPlayingCountdown(3)
  }

  const completeAdUnlock = (pairId: string) => {
    const updated = unlockPairRecord(pairId, true)
    if (updated) {
      setActivePair(updated)
      setRefreshTick(t => t + 1)
      trackEvent('reward_ad_complete', identity.openid, { pairId })
      Taro.showToast({
        title: '已解锁完整关系画像',
        icon: 'success',
        duration: 1600
      })
    }
  }

  useEffect(() => {
    if (adPlayingCountdown === null) return
    if (adPlayingCountdown <= 0) {
      setAdPlayingCountdown(null)
      if (activePair) {
        completeAdUnlock(activePair.pairId)
      }
      return
    }
    const timer = setTimeout(() => {
      setAdPlayingCountdown(prev => (prev !== null ? prev - 1 : null))
    }, 800)
    return () => clearTimeout(timer)
  }, [adPlayingCountdown, activePair])

  // 复制分享摘要（兼容微信小程序剪贴板与 H5）
  const copyShareText = (text: string, eventType: 'invite' | 'pair') => {
    if (eventType === 'invite') {
      const invite =
        currentInvite ||
        createOrGetInvite(
          identity.openid,
          identity.nickname,
          scores,
          personalProfile.name
        )
      trackEvent('invite_card_share', identity.openid, {
        inviteId: invite.inviteId,
        channel: 'clipboard'
      })
    } else if (activePair && pairMatch) {
      trackEvent('pair_result_share', identity.openid, {
        pairId: activePair.pairId,
        archetype: pairMatch.archetype.name,
        channel: 'clipboard'
      })
    }
    setRefreshTick(t => t + 1)

    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({
          title: '分享文案已复制，快发给对方吧',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }

  // 切换流量主模式开关（用于测试 UV<1000 全免费期 vs UV>=1000 激励视频解锁墙）
  const toggleTrafficHost = () => {
    const next = updateAppSettings({
      trafficHostEnabled: !settings.trafficHostEnabled
    })
    setSettings(next)
    setRefreshTick(t => t + 1)
    Taro.showToast({
      title: next.trafficHostEnabled
        ? '已开启流量主：新配对需激励视频解锁'
        : '已切回冷启动期：配对结果直接免费展示',
      icon: 'none',
      duration: 2200
    })
  }

  // 一键删除全部个人数据（个保法删除权合规）
  const handleClearAllData = () => {
    deleteAllUserData()
    const resetPersona = getActivePersona()
    setIdentity(resetPersona)
    setActiveScores(null)
    setPendingInvite(null)
    setCurrentInvite(null)
    setActivePair(null)
    setShowPrivacyModal(false)
    setShowDevDrawer(false)
    setRefreshTick(t => t + 1)
    setStage('intro')
    Taro.showToast({
      title: '已彻底删除全部测评与配对记录',
      icon: 'none',
      duration: 2000
    })
  }

  // 顶部通用状态栏（身份指示 + 历史记录入口 + 验真漏斗抽屉）
  const renderTopUtilityBar = (dark = false) => (
    <View className={`utility-bar ${dark ? 'utility-dark' : ''}`}>
      <View
        className='brand-wrap'
        onClick={() => setStage('intro')}
      >
        <Text className='brand'>
          关系<Text className='brand-dot'>·</Text>雷达
        </Text>
        <Text className='persona-pill'>
          {identity.roleTag === 'partner_sim' ? '视角: 好友小鹿(B)' : '视角: 我(A)'}
        </Text>
      </View>
      <View className='utility-actions'>
        {(userHistory.length > 0 || pairHistory.length > 0) && (
          <Text
            className='utility-btn'
            onClick={() => setStage('records')}
          >
            记录({pairHistory.length})
          </Text>
        )}
        <Text
          className='utility-btn utility-btn-accent'
          onClick={() => setShowDevDrawer(true)}
        >
          闭环与漏斗
        </Text>
      </View>
    </View>
  )

  // 全局弹窗：测评前敏感个人信息单独同意弹窗（compliance.md 第三节）
  const renderModals = () => (
    <>
      {showConsentModal && (
        <View className='modal-mask'>
          <View className='modal-card'>
            <Text className='modal-kicker'>测评前单独知情同意</Text>
            <Text className='modal-title'>关于性格分数与双人配对说明</Text>
            <View className='modal-body'>
              <Text className='modal-p'>
                1. <Text className='bold'>娱乐与自我探索边界</Text>：本测评为原创日常行为偏好轻测，所有结果仅供娱乐与相处参考，不构成任何心理筛查、诊断或专业建议。
              </Text>
              <Text className='modal-p'>
                2. <Text className='bold'>双人配对数据关联规则</Text>：个人结果永久免费。仅当你主动发起配对或接受他人配对邀请时，系统会将双方的<Text className='bold'>五维汇总分数（0–100）</Text>进行叠加并生成关系画像，<Text className='bold'>绝不会向对方展示你每一道题的具体选项</Text>。
              </Text>
              <Text className='modal-p'>
                3. <Text className='bold'>匿名最小化与删除权</Text>：我们仅使用匿名标识保存你的测评记录，不收集手机号、真实姓名或地理位置。你可随时在页面底部点击「隐私与数据管理」一键永久删除所有记录。
              </Text>
            </View>
            <View className='modal-actions'>
              <Button
                className='modal-btn-secondary'
                onClick={() => setShowConsentModal(false)}
              >
                暂不开始
              </Button>
              <Button
                className='modal-btn-primary'
                onClick={handleConfirmConsent}
              >
                同意并开始测评
              </Button>
            </View>
          </View>
        </View>
      )}

      {showPrivacyModal && (
        <View className='modal-mask'>
          <View className='modal-card'>
            <Text className='modal-kicker'>PRIVACY & COMPLIANCE</Text>
            <Text className='modal-title'>隐私说明与数据删除权</Text>
            <View className='modal-body'>
              <Text className='modal-p'>
                • <Text className='bold'>当前匿名标识</Text>：{identity.openid}（{identity.nickname}）
              </Text>
              <Text className='modal-p'>
                • <Text className='bold'>已保存数据</Text>：个人测评记录 {userHistory.length} 条，双人配对画像 {pairHistory.length} 份。
              </Text>
              <Text className='modal-p'>
                • <Text className='bold'>免责声明</Text>：本小程序全部题目、五维雷达图及关系画像均基于日常行为场景原创设计，仅供娱乐与人际相处参考，不包含任何心理疾病筛查或医学诊断建议。
              </Text>
              <Text className='modal-p'>
                • <Text className='bold'>行使删除权</Text>：点击下方红色按钮可立即清空你在本小程序内的全部答题记录、配对关系与授权状态，不可恢复。
              </Text>
            </View>
            <Button
              className='danger-button'
              onClick={handleClearAllData}
            >
              一键删除我的全部测评与配对数据
            </Button>
            <Button
              className='modal-btn-secondary full-width-btn'
              onClick={() => setShowPrivacyModal(false)}
            >
              关闭返回
            </Button>
          </View>
        </View>
      )}

      {showDevDrawer && (
        <View className='modal-mask'>
          <View className='modal-card drawer-card'>
            <View className='drawer-head'>
              <View>
                <Text className='modal-kicker'>MVP 推进与验真面板</Text>
                <Text className='modal-title'>双人闭环 · 流量主 · 埋点漏斗</Text>
              </View>
              <Text
                className='drawer-close'
                onClick={() => setShowDevDrawer(false)}
              >
                ×
              </Text>
            </View>

            <View className='drawer-section'>
              <Text className='drawer-section-title'>1. 切换体验视角（单机实测 A 邀 B 闭环）</Text>
              <View className='persona-switch-row'>
                <View
                  className={`persona-option ${identity.roleTag === 'self' ? 'active' : ''}`}
                  onClick={() => switchPersona('self')}
                >
                  <Text className='persona-option-title'>发起人 A（我）</Text>
                  <Text className='persona-option-sub'>
                    {getLatestAssessment('wx_openid_user_a')
                      ? `已测：${getLatestAssessment('wx_openid_user_a')?.profileName}`
                      : '未测评'}
                  </Text>
                </View>
                <View
                  className={`persona-option ${identity.roleTag === 'partner_sim' ? 'active' : ''}`}
                  onClick={() => switchPersona('partner_sim')}
                >
                  <Text className='persona-option-title'>受邀好友 B（小鹿）</Text>
                  <Text className='persona-option-sub'>
                    {getLatestAssessment('wx_openid_partner_b')
                      ? `已测：${getLatestAssessment('wx_openid_partner_b')?.profileName}`
                      : '未测评'}
                  </Text>
                </View>
              </View>
            </View>

            <View className='drawer-section'>
              <Text className='drawer-section-title'>
                2. 流量主商业化开关（目标：UV ≥ 1000 开通）
              </Text>
              <View className='setting-row'>
                <View className='setting-copy'>
                  <Text className='setting-name'>
                    配对结果激励视频解锁墙：{settings.trafficHostEnabled ? '已开启' : '未开启（冷启动免费期）'}
                  </Text>
                  <Text className='setting-desc'>
                    已实现过渡保护：开启前已生成的老配对结果永久免费不追溯，仅新配对需看激励视频解锁。
                  </Text>
                </View>
                <Button
                  className='small-toggle-btn'
                  onClick={toggleTrafficHost}
                >
                  {settings.trafficHostEnabled ? '切回免费期' : '模拟开通流量主'}
                </Button>
              </View>
            </View>

            <View className='drawer-section'>
              <Text className='drawer-section-title'>
                3. 北极星与核心漏斗指标（实时统计）
              </Text>
              <View className='funnel-grid'>
                <View className='funnel-cell highlight'>
                  <Text className='funnel-val'>{funnelMetrics.pairGenerated}</Text>
                  <Text className='funnel-lbl'>★ 有效配对数</Text>
                </View>
                <View className='funnel-cell'>
                  <Text className='funnel-val'>{funnelMetrics.completionRate}</Text>
                  <Text className='funnel-lbl'>测评完成率 ({funnelMetrics.testCompletes}/{funnelMetrics.testStarts})</Text>
                </View>
                <View className='funnel-cell'>
                  <Text className='funnel-val'>{funnelMetrics.firstShareRate}</Text>
                  <Text className='funnel-lbl'>首次分享率 ({funnelMetrics.inviteShares}次)</Text>
                </View>
                <View className='funnel-cell'>
                  <Text className='funnel-val'>{funnelMetrics.secondPersonCompletionRate}</Text>
                  <Text className='funnel-lbl'>B 完成率 ({funnelMetrics.partnerEntries}人进)</Text>
                </View>
              </View>
              {recentEvents.length > 0 && (
                <View className='event-log-box'>
                  <Text className='event-log-title'>最近埋点事件流：</Text>
                  {recentEvents.slice(0, 4).map(ev => (
                    <Text key={ev.id} className='event-log-item'>
                      · [{new Date(ev.timestamp).toTimeString().slice(0, 8)}] {ev.event} ({ev.openid.slice(-6)})
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <Button
              className='modal-btn-primary full-width-btn'
              onClick={() => setShowDevDrawer(false)}
            >
              完成并关闭面板
            </Button>
          </View>
        </View>
      )}

      {adPlayingCountdown !== null && (
        <View className='modal-mask'>
          <View className='modal-card ad-sim-card'>
            <Text className='modal-kicker'>微信流量主激励视频预览</Text>
            <Text className='modal-title'>正在播放激励视频广告…</Text>
            <View className='ad-countdown-circle'>
              <Text className='ad-countdown-num'>{adPlayingCountdown}s</Text>
            </View>
            <Text className='modal-p centered'>
              流量主开通并填入 adUnitId 后将拉起微信原生激励视频组件。倒计时结束后自动解锁完整关系画像。
            </Text>
          </View>
        </View>
      )}
    </>
  )

  // ==================== STAGE: RECORDS（我的测评与配对记录页） ====================
  if (stage === 'records') {
    return (
      <View className='page-shell records-shell'>
        {renderModals()}
        {renderTopUtilityBar()}
        <View className='records-head'>
          <Text className='eyebrow'>MY ARCHIVE</Text>
          <Text className='result-title'>我的雷达与配对库</Text>
          <Text className='records-sub'>
            当前身份：{identity.nickname} · 个人结果永久免费保存
          </Text>
        </View>

        <View className='section-card'>
          <View className='section-card-head'>
            <Text className='section-card-title'>我的最新个人雷达</Text>
            <Text
              className='section-link'
              onClick={requestStartQuiz}
            >
              重新测一次 →
            </Text>
          </View>
          {latestRecord ? (
            <View
              className='record-item'
              onClick={() => {
                setActiveScores(latestRecord.scores)
                setStage('personal')
              }}
            >
              <View>
                <Text className='record-item-title'>{latestRecord.profileName}</Text>
                <Text className='record-item-meta'>
                  五维：{DIMENSIONS.map((d, i) => `${d.label}${latestRecord.scores[i]}`).join(' · ')}
                </Text>
              </View>
              <Text className='record-arrow'>查看 ›</Text>
            </View>
          ) : (
            <Text className='empty-tip'>还没有完成过个人测评，快去测一测吧</Text>
          )}
        </View>

        <View className='section-card'>
          <View className='section-card-head'>
            <Text className='section-card-title'>
              双人关系画像记录（{pairHistory.length}）
            </Text>
            {latestRecord && (
              <Text
                className='section-link'
                onClick={openInvitePage}
              >
                + 发起新配对
              </Text>
            )}
          </View>
          {pairHistory.length > 0 ? (
            pairHistory.map(item => (
              <View
                key={item.pairId}
                className='record-item'
                onClick={() => {
                  setActivePair(item)
                  setStage('pair')
                }}
              >
                <View>
                  <View className='record-badge-row'>
                    <Text className='record-item-title'>「{item.archetypeName}」</Text>
                    <Text className={`unlock-pill ${item.unlocked ? 'unlocked' : 'locked'}`}>
                      {item.unlocked ? '已解锁' : '待解锁'}
                    </Text>
                  </View>
                  <Text className='record-item-meta'>
                    {item.userA.name}（{item.userA.profileName}） × {item.userB.name}（{item.userB.profileName}）
                  </Text>
                </View>
                <Text className='record-arrow'>查看 ›</Text>
              </View>
            ))
          ) : (
            <Text className='empty-tip'>
              还没有生成过双人关系画像，测完个人雷达后可邀请好友或体验示例搭子。
            </Text>
          )}
        </View>

        <Button
          className='primary-button records-back-btn'
          onClick={() => setStage(latestRecord ? 'personal' : 'intro')}
        >
          返回{latestRecord ? '我的个人雷达' : '首页'}
        </Button>
        <Text
          className='fine-print clickable-print'
          onClick={() => setShowPrivacyModal(true)}
        >
          隐私说明与删除我的全部记录 ›
        </Text>
      </View>
    )
  }

  // ==================== STAGE: INTRO（首页 / 受邀进入欢迎页） ====================
  if (stage === 'intro') {
    return (
      <View className='page-shell intro-shell'>
        {renderModals()}
        {renderTopUtilityBar()}

        {/* 若通过好友邀请卡进入（用户 B 视角），优先展示受邀配对横幅 */}
        {pendingInvite && (
          <View className='partner-invite-banner'>
            <Text className='partner-banner-kicker'>收到一张关系配对邀请卡</Text>
            <Text className='partner-banner-title'>
              「{pendingInvite.inviterName}」测出了【{pendingInvite.inviterProfileName}】，邀你合拍关系雷达
            </Text>
            {latestRecord ? (
              <View className='partner-returning-box'>
                <Text className='partner-returning-text'>
                  ✦ 系统按 openid 识别到你已完成过测评（{latestRecord.profileName}），无需重复做题！
                </Text>
                <Button
                  className='partner-fast-btn'
                  onClick={() =>
                    generatePairWithInvite(pendingInvite, latestRecord.scores)
                  }
                >
                  免答题 · 直接揭晓我们的关系画像 →
                </Button>
                <Text
                  className='partner-retest-link'
                  onClick={requestStartQuiz}
                >
                  或者：重新做一遍 15 题再配对 ›
                </Text>
              </View>
            ) : (
              <Text className='partner-banner-desc'>
                先用 3 分钟完成同一套 15 道日常选择题，先得你自己的免费雷达图，再自动揭晓你们的关系画像。
              </Text>
            )}
          </View>
        )}

        <View className='intro-copy'>
          <Text className='eyebrow'>PERSONALITY & RELATIONSHIP RADAR</Text>
          <Text className='hero-title'>{`看见你的\n相处雷达`}</Text>
          <Text className='hero-description'>
            15 道日常情境题，画出你的五维性格轮廓。测完后还能邀请任何在意的人合拍，看看你们放在一起更像什么关系。
          </Text>
        </View>

        <View className='hero-orbit'>
          <View className='orbit-ring ring-one' />
          <View className='orbit-ring ring-two' />
          <View className='orbit-core'>
            <Text className='orbit-core-num'>5</Text>
            <Text className='orbit-core-lbl'>相处维度</Text>
          </View>
          <View className='orbit-chip chip-one'>主导 · 拿主意</View>
          <View className='orbit-chip chip-two'>外放 · 能量场</View>
          <View className='orbit-chip chip-three'>照顾 · 细节控</View>
          <View className='orbit-chip chip-four'>计划 × 情绪</View>
        </View>

        {latestRecord && !pendingInvite && (
          <View
            className='quick-resume-bar'
            onClick={() => {
              setActiveScores(latestRecord.scores)
              setStage('personal')
            }}
          >
            <View>
              <Text className='quick-resume-kicker'>上次测评已保存</Text>
              <Text className='quick-resume-title'>
                你是「{latestRecord.profileName}」
              </Text>
            </View>
            <Text className='quick-resume-action'>查看雷达与去配对 ›</Text>
          </View>
        )}

        <View className='intro-meta'>
          <View>
            <Text className='meta-value'>约 2</Text>
            <Text className='meta-label'>分钟盲测</Text>
          </View>
          <View>
            <Text className='meta-value'>15</Text>
            <Text className='meta-label'>日常情境题</Text>
          </View>
          <View>
            <Text className='meta-value'>免费</Text>
            <Text className='meta-label'>个人五维画像</Text>
          </View>
        </View>

        <Button className='primary-button' onClick={requestStartQuiz}>
          {pendingInvite
            ? '接受邀请 · 开始 15 题盲测'
            : latestRecord
            ? '重新测一次'
            : '开始测评'}{' '}
          <Text>→</Text>
        </Button>

        <View className='compliance-footer'>
          <Text className='fine-print'>
            仅供娱乐与自我了解，不构成任何专业建议
          </Text>
          <Text
            className='fine-print-link'
            onClick={() => setShowPrivacyModal(true)}
          >
            隐私与数据删除权 ›
          </Text>
        </View>
      </View>
    )
  }

  // ==================== STAGE: QUIZ（15 题盲测答题页，严禁暴露测量维度） ====================
  if (stage === 'quiz') {
    const question = QUESTIONS[questionIndex]
    return (
      <View className='page-shell quiz-shell'>
        {renderModals()}
        <View className='quiz-header'>
          <Text className='back' onClick={goBackFromQuiz}>
            ‹
          </Text>
          <View className='progress-track'>
            <View className='progress-value' style={{ width: `${progress}%` }} />
          </View>
          <Text className='counter'>
            {questionIndex + 1}
            <Text>/{QUESTIONS.length}</Text>
          </Text>
        </View>

        {pendingInvite && (
          <View className='quiz-partner-pill'>
            <Text>正在完成与「{pendingInvite.inviterName}」的同题测评</Text>
          </View>
        )}

        <View className='quiz-tag'>
          第 {questionIndex + 1} 题 · 共 {QUESTIONS.length} 题
        </View>
        <Text className='quiz-title'>{question.title}</Text>
        <Text className='quiz-hint'>选最像平时的你，不用想太久</Text>

        <View className='options'>
          {PERMS[questionIndex].map((originalOptionIdx, displayIdx) => {
            const optionText = question.options[originalOptionIdx]
            const isSelected = selectedAnswer === displayIdx
            return (
              <View
                key={`${question.id}_${displayIdx}`}
                className={`option ${isSelected ? 'selected' : ''}`}
                onClick={() => chooseAnswer(displayIdx)}
              >
                <View className='option-index'>
                  {String.fromCharCode(65 + displayIdx)}
                </View>
                <Text className='option-text'>{optionText}</Text>
                {isSelected && <Text className='check'>✓</Text>}
              </View>
            )
          })}
        </View>

        <View className='quiz-footer'>
          {questionIndex > 0 && (
            <Text className='previous-link' onClick={goBackFromQuiz}>
              ‹ 上一题
            </Text>
          )}
          {questionIndex === QUESTIONS.length - 1 && (
            <Button
              className={`next-button ${selectedAnswer === null ? 'disabled' : ''}`}
              onClick={submitQuiz}
            >
              提交并查看结果 <Text>→</Text>
            </Button>
          )}
        </View>
      </View>
    )
  }

  // ==================== STAGE: PERSONAL（个人结果页 — 产品本体，永久免费） ====================
  if (stage === 'personal') {
    return (
      <View className='page-shell result-shell'>
        {renderModals()}
        {renderTopUtilityBar()}

        {/* 若受邀人 B 刚测完自己的结果，展示醒目的配对揭晓横幅（先看个人结果，再进配对结果） */}
        {pendingInvite && (
          <View className='pair-ready-banner'>
            <View className='pair-ready-copy'>
              <Text className='pair-ready-kicker'>已完成受邀同题测评</Text>
              <Text className='pair-ready-title'>
                你的雷达已生成！快看看与「{pendingInvite.inviterName}」的关系画像
              </Text>
            </View>
            <Button
              className='pair-ready-btn'
              onClick={() => generatePairWithInvite(pendingInvite, scores)}
            >
              揭晓关系画像 →
            </Button>
          </View>
        )}

        <View className='result-head'>
          <View>
            <Text className='eyebrow'>YOUR PERSONAL RADAR</Text>
            <Text className='result-title'>这是你的相处雷达</Text>
          </View>
          <Text
            className='retest-link'
            onClick={requestStartQuiz}
          >
            复测 ↻
          </Text>
        </View>

        <View className='personal-card'>
          <View className='card-kicker-row'>
            <Text className='card-kicker'>个人相处原型</Text>
            <Text className='profile-badge'>{personalProfile.badge}</Text>
          </View>
          <Text className='profile-name'>{personalProfile.name}</Text>
          <Text className='profile-tagline'>{personalProfile.tagline}</Text>
          <Text className='profile-subtitle'>{personalProfile.subtitle}</Text>

          <RadarChart values={scores} />

          <View className='scene-box'>
            <Text className='scene-box-label'>日常相处切面</Text>
            <Text className='scene-box-copy'>{personalProfile.sceneCopy}</Text>
            <Text className='scene-box-tip'>
              ✦ 相处小贴士：{personalProfile.interactionStyle}
            </Text>
          </View>
        </View>

        {/* 五维详细分值与极性解读 */}
        <View className='dimension-detail-card'>
          <Text className='section-card-title'>五维倾向拆解（0–100）</Text>
          {personalProfile.breakdown.map(item => (
            <View key={item.label} className='dim-detail-row'>
              <View className='dim-detail-top'>
                <View className='dim-detail-left'>
                  <Text className='dim-name'>{item.label}</Text>
                  <Text className='dim-pole-tag'>{item.poleTag}</Text>
                </View>
                <Text className='dim-score-num'>{item.score}</Text>
              </View>
              <View className='dim-bar-track'>
                <View
                  className='dim-bar-fill'
                  style={{ width: `${Math.max(6, item.score)}%` }}
                />
              </View>
              <Text className='dim-comment'>{item.comment}</Text>
            </View>
          ))}
        </View>

        {/* 核心增长飞轮入口：发起双人配对 */}
        <View className='pair-cta'>
          <View>
            <Text className='pair-kicker'>想知道你们放在一起像什么？</Text>
            <Text className='pair-copy'>
              邀请一个朋友、伴侣或搭子完成同一套题，两份雷达图将自动叠出只属于你们的关系画像与双方角色。
            </Text>
          </View>
          <Button className='small-button' onClick={openInvitePage}>
            生成邀请卡 · 找人配对 <Text>→</Text>
          </Button>

          {/* 单人快速预览 8 大关系画像入口 */}
          <View className='sample-partner-box'>
            <Text className='sample-partner-label'>
              或先与不同性格的示例搭子试配（看看化学反应）：
            </Text>
            <View className='sample-partner-chips'>
              {SAMPLE_PARTNERS.map(sp => (
                <View
                  key={sp.id}
                  className='sample-chip'
                  onClick={() => trySamplePartner(sp)}
                >
                  <Text className='sample-chip-name'>{sp.name}</Text>
                  <Text className='sample-chip-tag'>{sp.tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 结果页底部常驻广告位预留（monetization.md） */}
        {settings.trafficHostEnabled && (
          <View className='banner-ad-slot'>
            <Text className='banner-ad-tag'>流量主 Banner 广告预留位</Text>
            <Text className='banner-ad-sub'>
              累计 UV ≥ 1000 开通流量主后展示原生横幅广告
            </Text>
          </View>
        )}

        <View className='compliance-footer'>
          <Text className='fine-print'>
            个人结果永久免费 · 仅供娱乐与自我了解
          </Text>
          <Text
            className='fine-print-link'
            onClick={() => setShowPrivacyModal(true)}
          >
            隐私与删除权 ›
          </Text>
        </View>
      </View>
    )
  }

  // ==================== STAGE: INVITE（邀请分享卡页） ====================
  if (stage === 'invite') {
    const invite =
      currentInvite ||
      createOrGetInvite(
        identity.openid,
        identity.nickname,
        scores,
        personalProfile.name
      )
    const shareText = `我刚测出了自己的相处雷达「${personalProfile.name}」（主导${scores[0]}/照顾${scores[1]}/外放${scores[2]}/计划${scores[3]}/情绪${scores[4]}），你猜我们合拍会是什么关系画像？快来测测！（邀请码：${invite.inviteId}）`

    return (
      <View className='page-shell invite-shell'>
        {renderModals()}
        <View className='invite-topbar'>
          <Text className='invite-back' onClick={() => setStage('personal')}>
            ‹ 返回个人雷达
          </Text>
          <Text
            className='invite-dev-link'
            onClick={() => setShowDevDrawer(true)}
          >
            闭环与漏斗
          </Text>
        </View>

        <View className='invite-art'>
          <View className='invite-dot dot-a'>
            <Text className='dot-label'>{identity.nickname.slice(0, 2)}</Text>
          </View>
          <View className='invite-line' />
          <Text className='invite-symbol'>＋</Text>
          <View className='invite-dot dot-b'>
            <Text className='dot-label'>TA</Text>
          </View>
        </View>

        <Text className='eyebrow centered'>A NEW CONNECTION</Text>
        <Text className='invite-title'>{`发给一个你\n好奇的人`}</Text>
        <Text className='invite-description'>
          对方完成同一套 15 题测评后（若已测过则免答题），系统会自动叠加两张雷达图，生成你们的关系画像与双方角色。
        </Text>

        <View className='invite-preview'>
          <Text className='preview-label'>微信分享卡片预览（长期有效）</Text>
          <View className='preview-card'>
            <Text className='preview-small'>
              {identity.nickname} 测出了「{personalProfile.name}」
            </Text>
            <Text className='preview-main'>
              你猜，<Text>我们放在一起</Text>会是什么关系画像？
            </Text>
            <Text className='preview-quote'>{personalProfile.tagline}</Text>
            <Text className='preview-arrow'>点击卡片 · 3 分钟合拍关系雷达 →</Text>
          </View>
        </View>

        {/* 微信小程序原生分享按钮 + 剪贴板复制 */}
        <Button
          openType='share'
          className='primary-button invite-share-btn'
          onClick={() => copyShareText(shareText, 'invite')}
        >
          转发邀请卡给微信好友 <Text>↗</Text>
        </Button>

        {/* 单机闭环验真：一键模拟好友 B 点击这张邀请卡进入 */}
        <Button
          className='simulate-b-button'
          onClick={simulateFriendBOpeningInvite}
        >
          ⚡ 模拟「受邀好友 B」打开此邀请卡（实测双人闭环）
        </Button>

        <Text className='fine-print invite-fine-print'>
          自愿分享 · 对方仅能看到关系画像与五维轮廓，绝不暴露你的单题答案
        </Text>
      </View>
    )
  }

  // ==================== STAGE: PAIR（双人配对结果页 — 增值层，支持流量主激励视频解锁） ====================
  const currentPair = activePair
  const match = pairMatch

  if (!currentPair || !match) {
    return (
      <View className='page-shell result-shell'>
        {renderModals()}
        {renderTopUtilityBar()}
        <Text className='result-title'>暂未选择配对记录</Text>
        <Button className='primary-button' onClick={() => setStage('personal')}>
          返回我的个人雷达
        </Button>
      </View>
    )
  }

  const isLocked = !currentPair.unlocked
  const isViewerUserB = currentPair.userB.openid === identity.openid
  const partnerDisplayName = isViewerUserB ? currentPair.userA.name : currentPair.userB.name
  const viewerRoleTitle = isViewerUserB ? match.roleB.title : match.roleA.title
  const partnerRoleTitle = isViewerUserB ? match.roleA.title : match.roleB.title
  const pairShareText = `我和「${partnerDisplayName}」测出了关系画像【${match.archetype.name}】——“${match.shareQuote}” 我是「${viewerRoleTitle}」，TA 是「${partnerRoleTitle}」，快来测测你们的相处雷达！`

  return (
    <View className='page-shell pair-shell'>
      {renderModals()}
      {renderTopUtilityBar()}

      <View className='pair-top'>
        <Text className='back-inline' onClick={() => setStage('personal')}>
          ‹ 我的个人雷达
        </Text>
        <Text className='eyebrow'>PAIR RELATIONSHIP RADAR</Text>
        <Text
          className='records-inline'
          onClick={() => setStage('records')}
        >
          全部配对({pairHistory.length})
        </Text>
      </View>

      <View className='pair-title-wrap'>
        <Text className='pair-members-pill'>
          {currentPair.userA.name} × {currentPair.userB.name}
        </Text>
        <Text className='pair-title'>
          {isLocked ? '你们的关系画像已生成' : `你们是「${match.archetype.name}」`}
        </Text>
        <Text className='pair-subtitle'>
          {isLocked
            ? '两张五维雷达图已完成同维叠加，解锁即可查看专属关系画像与双方角色分工。'
            : match.archetype.subtitle}
        </Text>
      </View>

      <View className='pair-card'>
        <View className='pair-card-head'>
          <Text>{isLocked ? '双人五维雷达叠加预览' : match.archetype.kicker}</Text>
          <Text className='spark'>✦</Text>
        </View>

        {/* 双人同维叠加雷达图（不展示契合度打分，遵循 product-spec.md） */}
        <RadarChart
          values={currentPair.userA.scores}
          compareValues={currentPair.userB.scores}
          selfLabel={`${currentPair.userA.name}（${currentPair.userA.profileName}）`}
          partnerLabel={`${currentPair.userB.name}（${currentPair.userB.profileName}）`}
        />

        {isLocked ? (
          /* 流量主开通后的激励视频解锁墙（monetization.md：谁看配对谁看广告，绝不强制分享解锁） */
          <View className='ad-lock-wall'>
            <Text className='lock-badge'>🔒 待解锁完整关系画像</Text>
            <Text className='lock-title'>
              包含：主关系画像 + 双方相处角色 + 同频与互补解析 + 分享金句
            </Text>
            <Text className='lock-desc'>
              个人结果永远免费；配对关系画像通过观看一段激励视频免费解锁（不做任何付费墙）。
            </Text>
            <Button
              className='unlock-ad-button'
              onClick={handleWatchRewardedAdToUnlock}
            >
              ▶ 看激励视频 · 免费解锁关系画像
            </Button>
          </View>
        ) : (
          /* 已解锁的完整双人关系画像与角色拆解 */
          <>
            <View className='pair-archetype-banner'>
              <Text className='pair-profile'>{match.archetype.name}</Text>
              <Text className='pair-dynamic-copy'>{match.dynamicSummary}</Text>
            </View>

            {/* 双方正向角色分配（主导度/照顾度双主轴确定性映射） */}
            <View className='dual-roles-box'>
              <View className='role-card role-card-a'>
                <View className='role-card-top'>
                  <Text className='role-owner'>{currentPair.userA.name}的角色</Text>
                  <Text className='role-axis-tag'>突出维度：{match.roleA.highlightAxis}</Text>
                </View>
                <Text className='role-title'>「{match.roleA.title}」</Text>
                <Text className='role-desc'>{match.roleA.desc}</Text>
              </View>

              <View className='role-card role-card-b'>
                <View className='role-card-top'>
                  <Text className='role-owner'>{currentPair.userB.name}的角色</Text>
                  <Text className='role-axis-tag'>突出维度：{match.roleB.highlightAxis}</Text>
                </View>
                <Text className='role-title'>「{match.roleB.title}」</Text>
                <Text className='role-desc'>{match.roleB.desc}</Text>
              </View>
            </View>

            {/* 同频共振点 & 互补化学反应 */}
            <View className='pair-axes-insights'>
              <View className='axis-insight-item'>
                <Text className='axis-insight-tag shared'>
                  同频共振 · {match.sharedAxis.label}
                </Text>
                <Text className='axis-insight-text'>
                  {match.sharedAxis.summary}
                </Text>
              </View>
              <View className='axis-insight-item'>
                <Text className='axis-insight-tag complement'>
                  互补切面 · {match.complementAxis.label}
                </Text>
                <Text className='axis-insight-text'>
                  {match.complementAxis.summary}
                </Text>
              </View>
            </View>

            {/* 温和相处锦囊 */}
            <View className='pair-tip-box'>
              <Text className='pair-tip-label'>💡 相处小锦囊</Text>
              <Text className='pair-tip-text'>{match.interactionTip}</Text>
            </View>

            {/* 截图级分享金句 */}
            <View className='pair-insight'>
              <Text className='insight-mark'>“</Text>
              <Text className='insight-quote'>{match.shareQuote}</Text>
            </View>
          </>
        )}
      </View>

      {!isLocked && (
        <View className='pair-bottom-actions'>
          <Button
            openType='share'
            className='primary-button'
            onClick={() => copyShareText(pairShareText, 'pair')}
          >
            分享这张关系画像卡 <Text>↗</Text>
          </Button>
          <Button className='secondary-action-btn' onClick={openInvitePage}>
            再邀请另一位朋友配对
          </Button>
        </View>
      )}

      {settings.trafficHostEnabled && (
        <View className='banner-ad-slot'>
          <Text className='banner-ad-tag'>流量主 Banner 广告预留位</Text>
          <Text className='banner-ad-sub'>
            配对结果页底部常驻广告位（UV ≥ 1000 开通后生效）
          </Text>
        </View>
      )}

      <View className='compliance-footer'>
        <Text className='fine-print'>
          结果仅供娱乐与自我了解，不构成任何专业建议
        </Text>
        <Text
          className='fine-print-link'
          onClick={() => setShowPrivacyModal(true)}
        >
          隐私与数据管理 ›
        </Text>
      </View>
    </View>
  )
}
