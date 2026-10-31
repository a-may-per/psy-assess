import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '../src')

// 内存版 Taro Storage Mock，用于端到端验证存储、配对闭环、流量主过渡保护、合规删除权与漏斗埋点
const memoryStore = new Map()
const taroMock = {
  getStorageSync(key) {
    return memoryStore.get(key)
  },
  setStorageSync(key, val) {
    memoryStore.set(key, structuredClone(val))
  },
  removeStorageSync(key) {
    memoryStore.delete(key)
  }
}

const moduleCache = new Map()

function loadTsModule(relPath) {
  const fullPath = path.resolve(srcDir, relPath)
  if (moduleCache.has(fullPath)) {
    return moduleCache.get(fullPath)
  }
  const source = fs.readFileSync(fullPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: fullPath
  })

  const mod = { exports: {} }
  moduleCache.set(fullPath, mod.exports)

  const customRequire = spec => {
    if (spec === '@tarojs/taro') {
      return { default: taroMock, ...taroMock }
    }
    if (spec.startsWith('.')) {
      const target = path.resolve(path.dirname(fullPath), spec + '.ts')
      const rel = path.relative(srcDir, target)
      return loadTsModule(rel)
    }
    throw new Error(`Unexpected import in verification suite: ${spec}`)
  }

  const wrapper = vm.runInThisContext(
    `(function(exports, require, module) {\n${transpiled.outputText}\n})`
  )
  wrapper(mod.exports, customRequire, mod)
  moduleCache.set(fullPath, mod.exports)
  return mod.exports
}

const quizData = loadTsModule('data/quizData.ts')
const matchingEngine = loadTsModule('data/matchingEngine.ts')
const analytics = loadTsModule('services/analytics.ts')
const storage = loadTsModule('services/storage.ts')

let passed = 0
function check(name, fn) {
  fn()
  passed++
  console.log(`  ✓ ${name}`)
}

console.log('=== [1/4] 校验 15 题盲测题库与计分逻辑 (quizData.ts) ===')

check('包含 5 个核心维度且正反极性完整', () => {
  assert.equal(quizData.DIMENSIONS.length, 5)
  const expectedLabels = ['主导', '照顾', '外放', '计划', '情绪']
  assert.deepEqual(
    quizData.DIMENSIONS.map(d => d.label),
    expectedLabels
  )
})

check('包含 15 道题目、五维穿插编排（每维恰好 3 题，相邻不重复维度）', () => {
  assert.equal(quizData.QUESTIONS.length, 15)
  const counts = [0, 0, 0, 0, 0]
  quizData.QUESTIONS.forEach((q, idx) => {
    assert.equal(q.id, idx + 1)
    assert.equal(q.options.length, 4)
    counts[q.dim]++
    if (idx > 0) {
      assert.notEqual(
        q.dim,
        quizData.QUESTIONS[idx - 1].dim,
        `第 ${idx} 题与上一题维度重复`
      )
    }
  })
  assert.deepEqual(counts, [3, 3, 3, 3, 3])
})

check('PERMS 乱序矩阵每题均为 [0,1,2,3] 的合法排列，且最高分(3分)均匀分布在 A/B/C/D', () => {
  assert.equal(quizData.PERMS.length, 15)
  const highScorePosCount = [0, 0, 0, 0]
  quizData.PERMS.forEach((perm, i) => {
    assert.equal(perm.length, 4)
    assert.deepEqual([...perm].sort(), [0, 1, 2, 3], `第 ${i + 1} 题 PERMS 非合法排列`)
    const displayPosOfMax = perm.indexOf(0)
    highScorePosCount[displayPosOfMax]++
  })
  // 每个选项位置出现最高分的次数应在 3~4 次之间
  highScorePosCount.forEach(cnt => {
    assert.ok(cnt >= 3 && cnt <= 4, `最高分位置分布不均: ${highScorePosCount}`)
  })
})

check('calculateDimensionScores 边界验证：全选最高分=100，全选最低分=0，未答默认=0', () => {
  const maxChoices = quizData.PERMS.map(p => p.indexOf(0))
  const minChoices = quizData.PERMS.map(p => p.indexOf(3))
  assert.deepEqual(quizData.calculateDimensionScores(maxChoices), [100, 100, 100, 100, 100])
  assert.deepEqual(quizData.calculateDimensionScores(minChoices), [0, 0, 0, 0, 0])
  assert.deepEqual(quizData.calculateDimensionScores(new Array(15).fill(null)), [0, 0, 0, 0, 0])
})

check('合规词扫描：题干、选项、个人画像、关系画像 0 禁用词（抑郁/焦虑症/人格障碍/PUA/星座/运势/契合度打分等）', () => {
  const forbidden = [
    '抑郁',
    '焦虑症',
    '精神障碍',
    '人格障碍',
    '心理疾病',
    '临床',
    '诊断',
    '治疗',
    '筛查',
    '病态',
    '控制狂',
    '冷血',
    '自私',
    '讨好型',
    '玻璃心',
    '矫情',
    '心机',
    '渣',
    'PUA',
    '星座',
    '塔罗',
    '占卜',
    '八字',
    '算命',
    '运势',
    '命理',
    '缘分天注定'
  ]
  const corpus = JSON.stringify({
    dims: quizData.DIMENSIONS,
    questions: quizData.QUESTIONS,
    archetypes: matchingEngine.RELATIONSHIP_ARCHETYPES,
    samples: matchingEngine.SAMPLE_PARTNERS
  })
  for (const word of forbidden) {
    assert.equal(corpus.includes(word), false, `发现合规禁用词: ${word}`)
  }
})

console.log('\n=== [2/4] 校验 7 大个人画像与 8 大双人关系画像算法 (matchingEngine.ts) ===')

check('7 大个人画像（5 主轴 + 平衡漫游者 + 随风漫游者）100% 可达且分类准确', () => {
  assert.equal(matchingEngine.getPersonalProfile([89, 56, 56, 56, 56]).id, 'navigator')
  assert.equal(matchingEngine.getPersonalProfile([56, 89, 56, 56, 56]).id, 'guardian')
  assert.equal(matchingEngine.getPersonalProfile([56, 56, 89, 56, 56]).id, 'connector')
  assert.equal(matchingEngine.getPersonalProfile([56, 56, 56, 89, 56]).id, 'architect')
  assert.equal(matchingEngine.getPersonalProfile([56, 56, 56, 56, 89]).id, 'resonator')
  assert.equal(matchingEngine.getPersonalProfile([56, 56, 44, 56, 56]).id, 'balancer')
  assert.equal(matchingEngine.getPersonalProfile([22, 44, 22, 22, 33]).id, 'breeze')
  assert.equal(matchingEngine.getPersonalProfile([0, 0, 0, 0, 0]).id, 'breeze')
})

check('8 大双人关系画像 100% 可达、确定性映射、双方角色不撞车且低分极性描述准确', () => {
  const cases = [
    { a: [89, 44, 56, 56, 44], b: [33, 89, 56, 44, 78], expected: 'helm-anchor' },
    { a: [56, 67, 44, 33, 56], b: [67, 78, 44, 100, 56], expected: 'blueprint-wonder' },
    { a: [56, 67, 56, 56, 56], b: [56, 56, 56, 67, 56], expected: 'mirror-resonance' },
    { a: [56, 56, 89, 44, 56], b: [67, 56, 89, 56, 44], expected: 'spark-makers' },
    { a: [33, 56, 22, 44, 56], b: [22, 44, 22, 22, 33], expected: 'quiet-sanctuary' },
    { a: [44, 89, 56, 56, 78], b: [33, 89, 56, 44, 78], expected: 'warm-greenhouse' },
    { a: [89, 56, 56, 67, 56], b: [89, 56, 56, 78, 44], expected: 'dual-engine' },
    { a: [89, 89, 89, 89, 22], b: [22, 22, 22, 22, 89], expected: 'gravity-balance' }
  ]

  const reached = new Set()
  for (const c of cases) {
    const res = matchingEngine.matchPairProfile(c.a, c.b, '用户A', '用户B')
    assert.equal(res.archetype.id, c.expected, `期望 ${c.expected}，实际得到 ${res.archetype.id}`)
    assert.notEqual(res.roleA.title, res.roleB.title, 'A 与 B 的双人角色名称不应相同')
    assert.notEqual(res.sharedAxis.label, res.complementAxis.label, '同频维度与互补维度不应重复')
    reached.add(res.archetype.id)
  }
  assert.equal(reached.size, 8)

  // 验证低分松弛型搭子（林屿 [22, 44, 22, 22, 33]）的角色描述使用低分极性（随和），而非把 44 分称为“表现突出”
  const chillPair = matchingEngine.matchPairProfile([67, 56, 56, 67, 56], [22, 44, 22, 22, 33], '我', '林屿')
  assert.ok(
    chillPair.roleB.highlightAxis.includes('随和'),
    `低分极性描述应包含“主导·随和”，实际为: ${chillPair.roleB.highlightAxis}`
  )
})

console.log('\n=== [3/4] 校验双人邀请闭环、复测更新、流量主解锁与过渡保护 (storage.ts) ===')

check('完整走通 A 测评 -> 生成邀请参数 -> B 扫码解析 -> 配对生成 -> A 复测更新分数', () => {
  storage.deleteAllUserData()

  // 1. A 授权并保存测评
  assert.equal(storage.hasAcceptedConsent('wx_openid_user_a'), false)
  storage.acceptConsent('wx_openid_user_a')
  assert.equal(storage.hasAcceptedConsent('wx_openid_user_a'), true)

  const scoresA1 = [89, 44, 56, 67, 44]
  const profileA1 = matchingEngine.getPersonalProfile(scoresA1)
  storage.saveAssessmentRecord('wx_openid_user_a', '我', scoresA1, new Array(15).fill(0), profileA1.name)

  // 2. A 生成邀请卡并编码分享 Query
  const invite = storage.createOrGetInvite('wx_openid_user_a', '我', scoresA1, profileA1.name)
  const queryStr = storage.buildShareQuery(invite)
  const queryParams = Object.fromEntries(new URLSearchParams(queryStr))

  // 3. 模拟跨设备 B 仅凭 URL Query 解析邀请
  memoryStore.delete('psy_assess_invites_v2')
  const parsedInvite = storage.parseInviteFromParams(queryParams)
  assert.ok(parsedInvite)
  assert.equal(parsedInvite.inviteId, invite.inviteId)
  assert.deepEqual(parsedInvite.inviterScores, scoresA1)

  // 4. 冷启动免费期（trafficHostEnabled = false）生成配对，应直接 unlocked = true
  const scoresB = [33, 89, 56, 44, 78]
  const profileB = matchingEngine.getPersonalProfile(scoresB)
  const match1 = matchingEngine.matchPairProfile(scoresA1, scoresB, '我', '好友小鹿')
  const pair1 = storage.saveOrUpdatePairRecord({
    inviteId: parsedInvite.inviteId,
    userA: { openid: 'wx_openid_user_a', name: '我', scores: scoresA1, profileName: profileA1.name },
    userB: { openid: 'wx_openid_partner_b', name: '好友小鹿', scores: scoresB, profileName: profileB.name },
    archetypeId: match1.archetype.id,
    archetypeName: match1.archetype.name
  })
  assert.equal(pair1.unlocked, true)

  // 5. 开启流量主（trafficHostEnabled = true）：老配对 pair1 仍保持 unlocked = true（过渡保护），新配对需解锁
  storage.updateAppSettings({ trafficHostEnabled: true })
  const oldPairAfterToggle = storage.getUserPairRecords('wx_openid_user_a').find(p => p.pairId === pair1.pairId)
  assert.equal(oldPairAfterToggle.unlocked, true, '流量主开启前生成的老配对必须保持已解锁状态')

  // 6. A 复测获得全新分数 scoresA2，再次与同一示例搭子配对时不应返回旧分数的缓存记录
  const scoresA2 = [22, 44, 22, 22, 33]
  const profileA2 = matchingEngine.getPersonalProfile(scoresA2)
  const match2 = matchingEngine.matchPairProfile(scoresA2, scoresB, '我', '好友小鹿')
  const pair2 = storage.saveOrUpdatePairRecord({
    inviteId: parsedInvite.inviteId,
    userA: { openid: 'wx_openid_user_a', name: '我', scores: scoresA2, profileName: profileA2.name },
    userB: { openid: 'wx_openid_partner_b', name: '好友小鹿', scores: scoresB, profileName: profileB.name },
    archetypeId: match2.archetype.id,
    archetypeName: match2.archetype.name
  })
  assert.notEqual(pair2.pairId, pair1.pairId, 'A 复测分数变化后应生成新的配对记录而非返回旧缓存')
  assert.deepEqual(pair2.userA.scores, scoresA2)
  assert.equal(pair2.unlocked, false, '流量主开启后的新配对初始应为待解锁状态')

  // 7. 激励视频解锁 pair2
  const unlockedPair2 = storage.unlockPairRecord(pair2.pairId, true)
  assert.equal(unlockedPair2.unlocked, true)
  assert.equal(unlockedPair2.unlockedByAd, true)
})

console.log('\n=== [4/4] 校验 15 个核心埋点事件流与漏斗指标计算 + 一键删除权 (analytics.ts) ===')

check('模拟全链路埋点并校验完成率、首次分享率、B 完成率、北极星指标与一键彻底删除', () => {
  storage.deleteAllUserData()
  analytics.trackEvent('test_start', 'wx_openid_user_a')
  analytics.trackEvent('test_complete', 'wx_openid_user_a')
  analytics.trackEvent('personal_result_view', 'wx_openid_user_a')
  analytics.trackEvent('invite_card_generate', 'wx_openid_user_a')
  analytics.trackEvent('invite_card_share', 'wx_openid_user_a')
  analytics.trackEvent('invite_link_click', 'wx_openid_partner_b')
  analytics.trackEvent('partner_entry', 'wx_openid_partner_b')
  analytics.trackEvent('partner_test_start', 'wx_openid_partner_b')
  analytics.trackEvent('partner_test_complete', 'wx_openid_partner_b')
  analytics.trackEvent('pair_result_generated', 'wx_openid_partner_b')
  analytics.trackEvent('pair_result_view', 'wx_openid_partner_b')
  analytics.trackEvent('reward_ad_show', 'wx_openid_partner_b')
  analytics.trackEvent('reward_ad_complete', 'wx_openid_partner_b')
  analytics.trackEvent('pair_result_share', 'wx_openid_partner_b')

  const metrics = analytics.computeFunnelMetrics()
  assert.equal(metrics.pairGenerated, 1)
  assert.equal(metrics.completionRate, '100%')
  assert.equal(metrics.firstShareRate, '100%')
  assert.equal(metrics.secondPersonCompletionRate, '100%')
  assert.equal(metrics.adUnlockRate, '100%')

  // 行使个保法删除权后，所有记录与埋点清零
  storage.deleteAllUserData()
  assert.equal(storage.getAllAssessmentRecords().length, 0)
  assert.equal(storage.getAllPairRecords().length, 0)
  assert.equal(analytics.getAnalyticsEvents().length, 0)
})

check('校验 Taro 4 H5 入口模板 src/index.html 与构建产物完整性（防白屏回归）', () => {
  const srcHtmlPath = path.join(srcDir, 'index.html')
  assert.ok(fs.existsSync(srcHtmlPath), 'Taro 4 H5 必须在 src/index.html 提供入口模板，否则 HtmlWebpackPlugin 不会生成 index.html')
  const srcHtml = fs.readFileSync(srcHtmlPath, 'utf8')
  assert.ok(srcHtml.includes('<div id="app"></div>'), 'src/index.html 必须包含 <div id="app"></div> 挂载节点')
  assert.ok(srcHtml.includes('htmlWebpackPlugin.options.script'), 'src/index.html 必须注入 pxtransform 响应式脚本')

  const distH5HtmlPath = path.resolve(__dirname, '../dist-h5/index.html')
  if (fs.existsSync(distH5HtmlPath)) {
    const distHtml = fs.readFileSync(distH5HtmlPath, 'utf8')
    assert.ok(distHtml.includes('<div id="app"></div>'), 'dist-h5/index.html 必须包含挂载节点')
    assert.ok(distHtml.includes('/js/app.js'), 'dist-h5/index.html 必须注入编译后的 /js/app.js')
  }
})


console.log(`\n🎉 全部 ${passed} 项核心业务逻辑与合规断言验证通过！`)
