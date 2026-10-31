import { DIMENSIONS } from './quizData'

export interface DimensionBreakdownItem {
  index: number
  label: string
  score: number
  poleTag: string
  comment: string
}

export interface PersonalProfile {
  id: string
  name: string
  badge: string
  tagline: string
  subtitle: string
  sceneCopy: string
  interactionStyle: string
  topDimIndex: number
  secondaryDimIndex: number
  breakdown: DimensionBreakdownItem[]
}

export interface RelationshipArchetype {
  id: string
  name: string
  kicker: string
  subtitle: string
  description: string
  roleHighTemplate: { title: string; desc: string }
  roleLowTemplate: { title: string; desc: string }
  interactionTip: string
  shareQuote: string
}

export interface PairMatchResult {
  archetype: RelationshipArchetype
  roleA: { title: string; desc: string; highlightAxis: string }
  roleB: { title: string; desc: string; highlightAxis: string }
  sharedAxis: { label: string; diff: number; summary: string }
  complementAxis: { label: string; diff: number; summary: string }
  dynamicSummary: string
  interactionTip: string
  shareQuote: string
}

const PERSONAL_ARCHETYPES: Record<
  number,
  {
    id: string
    name: string
    badge: string
    tagline: string
    subtitle: string
    sceneCopy: string
    interactionStyle: string
  }
> = {
  0: {
    id: 'navigator',
    name: '认真生活的掌舵者',
    badge: '主导向 · 破局推进',
    tagline: '“与其在原地犹豫半天，不如我先迈出第一步。”',
    subtitle: '你常常愿意先拿主意、把事情往前推。和你同行的人，很少会有迷路的时候。',
    sceneCopy:
      '群里没人拍板时，你往往是那个先把选项理清楚的人。你不一定非要所有人都听你的，只是比起悬着不决，你更习惯先把方向立住。',
    interactionStyle: '自带方向感，别人容易不知不觉把决定权交给你，但偶尔也可以放心把方向盘让出去歇一歇。'
  },
  1: {
    id: 'guardian',
    name: '温柔可靠的照看者',
    badge: '照顾向 · 细节兜底',
    tagline: '“那些没被说出口的小事，你总是第一个看见。”',
    subtitle: '你会自然留意身边人的状态变化。照顾对你不像是任务，而是本能的表达方式。',
    sceneCopy:
      '下雨时偏过去的半边伞、朋友沉默时恰到好处的一句问候——你习惯用行动而不是口号去接住别人。和你相处，人会觉得很踏实。',
    interactionStyle: '总是习惯先顾及别人的冷暖，记得把同样的体贴也留一份给自己。'
  },
  2: {
    id: 'connector',
    name: '带来热度的连接者',
    badge: '外放向 · 能量扩音',
    tagline: '“只要有你在场，沉默的空气就会重新流动起来。”',
    subtitle: '人与人的真实交流会给你充电。你擅长用坦率与热忱，把生疏变成熟络。',
    sceneCopy:
      '聚会里你往往是先抛梗或接住话头的人，心里有事也更愿意敞亮地说出来。你的鲜活感，常常能帮身边慢热的人卸下防备。',
    interactionStyle: '感染力十足的破冰高手，和安静型朋友相处时，留一点空白也能很默契。'
  },
  3: {
    id: 'architect',
    name: '把日子排出脉络的人',
    badge: '计划向 · 秩序笃定',
    tagline: '“心里有一张清楚的地图，脚下的步子才足够从容。”',
    subtitle: '你喜欢提前想好关键几步，把不确定的事变成稳妥的安排，给同行者满满确定感。',
    sceneCopy:
      '去陌生地方前先看好的动线、约会前敲定的时间节点，都是你制造安全感的方式。即使计划临时有变，你也能迅速切到备选方案。',
    interactionStyle: '靠谱指数拉满的定心丸，遇到随缘型搭子时，留出 20% 的空白会收获意外惊喜。'
  },
  4: {
    id: 'resonator',
    name: '感受很深的共鸣者',
    badge: '情绪向 · 细腻感知',
    tagline: '“你听得见弦外之音，也接得住最细微的情绪起伏。”',
    subtitle: '你对语气、氛围和细节有着高分辨率的感知力，经历过的美好与触动都会在心里留很久。',
    sceneCopy:
      '一句轻轻的语气变化、一段戳人的电影台词，都能在你心里泛起涟漪。你不喜欢敷衍的客套，更珍惜能听懂彼此潜台词的深度相处。',
    interactionStyle: '真诚而敏锐的倾听者，和大条型朋友相处时，直接说出需求比等对方猜更轻松。'
  }
}

const BALANCED_PERSONAL_ARCHETYPE = {
  id: 'balancer',
  name: '收放自如的平衡漫游者',
  badge: '全频向 · 弹性适配',
  tagline: '“既能上场拿主意，也能退后半步安静看风景。”',
  subtitle: '你的五维轮廓舒展而均衡，不执着于单一角色，能根据身边的人自然切换相处频段。',
  sceneCopy:
    '需要有人推进时你能顶上，有人张罗时你也能舒服地当个捧场王；既享受热闹的聚会，也懂得独处回血的珍贵。',
  interactionStyle: '天然的万能拼图，几乎和任何性格的人都能找到舒服的相处切面。'
}

export function getDimensionBreakdown(scores: number[]): DimensionBreakdownItem[] {
  return DIMENSIONS.map((dim, idx) => {
    const score = scores[idx] ?? 50
    const isHigh = score >= 60
    const isLow = score <= 40
    let poleTag = '弹性适中'
    let comment = `在「${dim.highPole}」与「${dim.lowPole}」之间自如切换，看场景调整节奏`
    if (isHigh) {
      poleTag = dim.highPole
      comment = dim.highDesc
    } else if (isLow) {
      poleTag = dim.lowPole
      comment = dim.lowDesc
    }
    return {
      index: idx,
      label: dim.label,
      score,
      poleTag,
      comment
    }
  })
}

export function getPersonalProfile(scores: number[]): PersonalProfile {
  const breakdown = getDimensionBreakdown(scores)
  const indexed = scores.map((s, i) => ({ score: s, index: i })).sort((a, b) => b.score - a.score)
  const top = indexed[0]
  const second = indexed[1]
  const min = indexed[indexed.length - 1]
  const spread = top.score - min.score

  // 若所有维度均低于中位线（<= 44，倾向随和、放养、独处、随缘、松弛），展示松弛画像
  if (top.score <= 44) {
    return {
      id: 'breeze',
      name: '自在松弛的随风漫游者',
      badge: '松弛向 · 低内耗体质',
      tagline: '“不赶时间、不设条框，和你待在一起连呼吸都会慢下来。”',
      subtitle: '你很少给关系施加压力，随遇而安、翻篇极快，自带让人卸下紧绷感的松弛气场。',
      sceneCopy:
        '你不喜欢把日程排满，也不爱在细枝末节上反复纠结。无论是说走就走的散步，还是各自安静待一下午，你都能乐在其中。',
      interactionStyle: '天然的减压阀，和习惯操心或紧绷的人在一起时，你的松弛感是最好的解药。',
      topDimIndex: min.index,
      secondaryDimIndex: second.index,
      breakdown
    }
  }

  // 若五维在中段均衡舒展且极差很小（min >= 44, top <= 67, spread <= 18），展示均衡画像
  if (spread <= 18 && top.score <= 67 && min.score >= 44) {
    return {
      ...BALANCED_PERSONAL_ARCHETYPE,
      topDimIndex: top.index,
      secondaryDimIndex: second.index,
      breakdown
    }
  }

  const base = PERSONAL_ARCHETYPES[top.index] || PERSONAL_ARCHETYPES[0]
  return {
    ...base,
    topDimIndex: top.index,
    secondaryDimIndex: second.index,
    breakdown
  }
}

/**
 * 8 个原创关系画像（纯动力学比喻，不绑定情侣/同事/朋友身份，无贬损标签，不设契合度打分）
 */
export const RELATIONSHIP_ARCHETYPES: RelationshipArchetype[] = [
  {
    id: 'helm-anchor',
    name: '掌舵与定心丸',
    kicker: '方向 × 兜底 · 黄金分工',
    subtitle: '一个负责把事情往前推，一个负责把沿途的细节妥帖接住。',
    description:
      '你们站在一起时有一种天然的分工感：当面对选择时，总有人愿意先定下方向；而在前行的路上，另一个人又会敏锐地照顾到彼此的感受与细节。不用刻意商量，就能把日子过得既有奔头又很踏实。',
    roleHighTemplate: {
      title: '破浪掌舵手',
      desc: '习惯先拿主意、定下大方向，带头把想法变成行动。'
    },
    roleLowTemplate: {
      title: '温柔定心丸',
      desc: '留意一路上的冷暖与节奏，让每次同行都稳妥舒服。'
    },
    interactionTip: '掌舵的人偶尔问一句“你真正想选哪个”，兜底的人也可以直接说出自己的小偏好。',
    shareQuote: '一个敢往前闯，一个稳稳接住，这就是我们最舒服的默契。'
  },
  {
    id: 'blueprint-wonder',
    name: '蓝图与奇遇记',
    kicker: '秩序 × 随性 · 奇妙化学反应',
    subtitle: '一个守住稳稳的确定感，一个负责带来意料之外的风景。',
    description:
      '你们一个习惯心里有张时间表，一个崇尚走到哪算哪的松弛。单看似乎节奏不同，放在一起却刚好中和：既不会因为完全没准备而手忙脚乱，也不会因为被计划绑得太紧而失去惊喜。',
    roleHighTemplate: {
      title: '秩序建筑师',
      desc: '提前排好关键节点与备选方案，是关系里的确定感来源。'
    },
    roleLowTemplate: {
      title: '奇遇捕手',
      desc: '自带随遇而安的松弛感，总能带对方拐进没见过的好风景。'
    },
    interactionTip: '不妨约定“大框架提前定，留出半天随便逛”，两边都能尽兴。',
    shareQuote: '你负责稳住航线，我负责制造惊喜，我们的故事从不按套路出牌。'
  },
  {
    id: 'mirror-resonance',
    name: '同频共振拍档',
    kicker: '镜像默契 · 低解释成本',
    subtitle: '不用把话说满，一个眼神就知道对方在想什么。',
    description:
      '你们的五维性格轮廓有着极高的重合度。无论是在热闹与独处的切换上，还是对待计划与情绪的方式上，你们都很容易理解对方的第一反应——因为换作是你，你大概也会这么选。',
    roleHighTemplate: {
      title: '先声同频者',
      desc: '往往先把两个人心照不宣的想法说出口，点燃共识。'
    },
    roleLowTemplate: {
      title: '默契接梗王',
      desc: '秒懂对方的潜台词与小习惯，永远让话不掉在地上。'
    },
    interactionTip: '高度同频的你们几乎没有沟通时差，遇到共同盲区时记得互相提醒跳出习惯。',
    shareQuote: '世上最省力的相处，就是我说上半句，你已经笑着接了下半句。'
  },
  {
    id: 'spark-makers',
    name: '灵感造浪搭子',
    kicker: '双倍热忱 · 永不冷场',
    subtitle: '凑在一起就有说不完的梗，普通日常也能过成热闹现场。',
    description:
      '你们都是能从交流与行动里汲取能量的人。只要待在一块，一个抛出的小念头很快就会被另一个接住放大，分分钟从“随便聊聊”变成“说干就干”的新计划。',
    roleHighTemplate: {
      title: '气氛点火器',
      desc: '主动抛出新话题和新点子，第一时间把场子热起来。'
    },
    roleLowTemplate: {
      title: '灵感扩音器',
      desc: '用满满的热情回应和延展，让好玩的想法真正落地。'
    },
    interactionTip: '热闹过后，记得留出安静相处的时刻，不用时刻制造话题也很棒。',
    shareQuote: '别人凑一起是消磨时间，我们凑一起是把日子过成连载喜剧。'
  },
  {
    id: 'quiet-sanctuary',
    name: '静音充电同盟',
    kicker: '松弛陪伴 · 零社交压力',
    subtitle: '待在一起不用硬找话题，各自安静也是最舒服的陪伴。',
    description:
      '你们都懂得独处与边界的珍贵。在这段关系里，没有人会被迫营业或过度寒暄——可以一起热络地聊喜欢的事，也可以并排坐着各自看手机、发呆，沉默在你们之间从来不是尴尬，而是安心。',
    roleHighTemplate: {
      title: '暖光守候者',
      desc: '在安静相处中保留恰到好处的关照，让空间温暖不冷清。'
    },
    roleLowTemplate: {
      title: '松弛漫游者',
      desc: '用不紧不慢的节奏卸下防备，让彼此都能做最真实的自己。'
    },
    interactionTip: '享受留白的同时，遇到重要心事别忘了主动敲敲对方的门。',
    shareQuote: '最好的关系，是我们在彼此身边什么都不说，也觉得满格电。'
  },
  {
    id: 'warm-greenhouse',
    name: '温室守护同盟',
    kicker: '双向体贴 · 细腻共情',
    subtitle: '彼此都能看见对方没说出口的小事，是互相兜底的避风港。',
    description:
      '你们在照顾与情绪感知上都有着很高的温度。别人容易忽略的语气起伏或小小疲惫，你们总是能第一时间察觉并递上一份体贴。这段关系就像一座恒温花房，充满了被认真对待的安全感。',
    roleHighTemplate: {
      title: '行动派暖炉',
      desc: '习惯先把关怀落到实处，用具体行动帮对方分担。'
    },
    roleLowTemplate: {
      title: '细腻共鸣箱',
      desc: '敏锐捕捉情绪的细微变化，给对方最真诚的倾听与陪伴。'
    },
    interactionTip: '你们都很怕给对方添麻烦，练习直接说出“我需要你帮个忙”会让关系更亲近。',
    shareQuote: '那些你习惯自己扛下的小情绪，在我这里都可以放心放下来。'
  },
  {
    id: 'dual-engine',
    name: '双核推进拍档',
    kicker: '强强联手 · 执行力拉满',
    subtitle: '两个人都有主见、有行动力，轮流当主驾驶就能所向披靡。',
    description:
      '你们都不喜欢拖泥带水，遇到问题第一反应都是怎么解决和推进。一起做事或出游时效率极高；只要提前分好谁管哪一块，你们就是最省心、最有战斗力的黄金组合。',
    roleHighTemplate: {
      title: '先锋破局者',
      desc: '果断锁定核心目标，在犹豫时刻率先拍板定调。'
    },
    roleLowTemplate: {
      title: '节奏统筹官',
      desc: '把控关键节点与推进脉络，让共同目标稳稳落地。'
    },
    interactionTip: '都有主见时，不妨按各自擅长领域分工拍板，“这题听你的，下题听我的”。',
    shareQuote: '不用谁迁就谁的脚步，我们并肩走的时候，风都是顺着的。'
  },
  {
    id: 'gravity-balance',
    name: '引力平衡搭子',
    kicker: '多维反差 · 拼图式互补',
    subtitle: '性格轮廓截然不同，却刚好拼出对方没见过的另一半世界。',
    description:
      '把你们的雷达图叠在一起，会看到非常有意思的互补形状：你擅长的恰好是 TA 放松的地方，TA 敏锐的恰好能补上你的盲区。这种反差不是距离，而是让彼此世界变宽的引力。',
    roleHighTemplate: {
      title: '破圈引力源',
      desc: '用鲜明的行动与表达，带对方体验不一样的节奏与热闹。'
    },
    roleLowTemplate: {
      title: '沉静平衡轴',
      desc: '用温和与松弛接住变化，让关系始终保持舒服的弹性。'
    },
    interactionTip: '把对方的不同当成“原来还可以这样”的说明书，而不是需要改正的偏差。',
    shareQuote: '我们像两块形状不同的拼图，合在一起才看清完整的风景。'
  }
]

function describeSalientTrait(scores: number[]) {
  let bestIdx = 0
  let bestDist = -1
  let bestScore = -1
  for (let i = 0; i < 5; i++) {
    const s = scores[i] ?? 50
    const dist = Math.abs(s - 50)
    if (dist > bestDist || (dist === bestDist && s > bestScore)) {
      bestDist = dist
      bestScore = s
      bestIdx = i
    }
  }
  const dim = DIMENSIONS[bestIdx] || DIMENSIONS[0]
  const val = scores[bestIdx] ?? 50
  if (val >= 56) {
    return {
      highlightAxis: `${dim.label}·${dim.highPole}`,
      phrase: `在「${dim.label}·${dim.highPole}」特点突出（${val}分）`
    }
  }
  if (val <= 44) {
    return {
      highlightAxis: `${dim.label}·${dim.lowPole}`,
      phrase: `在「${dim.label}·${dim.lowPole}」特质鲜明（${val}分）`
    }
  }
  return {
    highlightAxis: `${dim.label}·均衡`,
    phrase: `五维节奏舒展均衡（${dim.label}${val}分）`
  }
}

/**
 * 确定性配对画像与双方角色计算引擎
 * 输入两人五维分数（0-100），输出唯一关系画像 + 双方正向角色 + 共振/互补维度洞察
 */
export function matchPairProfile(
  scoresA: number[],
  scoresB: number[],
  nameA = '你',
  nameB = '对方'
): PairMatchResult {
  const diffs = DIMENSIONS.map((_, i) => Math.abs((scoresA[i] ?? 50) - (scoresB[i] ?? 50)))
  const avgs = DIMENSIONS.map((_, i) => Math.round(((scoresA[i] ?? 50) + (scoresB[i] ?? 50)) / 2))
  const avgDiff = diffs.reduce((s, v) => s + v, 0) / diffs.length

  // 找出最同频维度（分差最小，若并列取均值更高的维度）
  let sharedIdx = 0
  for (let i = 1; i < 5; i++) {
    if (diffs[i] < diffs[sharedIdx] || (diffs[i] === diffs[sharedIdx] && avgs[i] > avgs[sharedIdx])) {
      sharedIdx = i
    }
  }

  // 找出最互补维度（分差最大）
  let complementIdx = 0
  for (let i = 1; i < 5; i++) {
    if (diffs[i] > diffs[complementIdx]) {
      complementIdx = i
    }
  }
  if (complementIdx === sharedIdx) {
    complementIdx = (sharedIdx + 1) % 5
  }

  const domA = scoresA[0] ?? 50
  const domB = scoresB[0] ?? 50
  const careA = scoresA[1] ?? 50
  const careB = scoresB[1] ?? 50
  const extA = scoresA[2] ?? 50
  const extB = scoresB[2] ?? 50
  const planA = scoresA[3] ?? 50
  const planB = scoresB[3] ?? 50
  const emoA = scoresA[4] ?? 50
  const emoB = scoresB[4] ?? 50
  const largeDiffAxesCount = diffs.filter(d => d >= 30).length

  // 确定性选择 8 大关系画像之一（先匹配鲜明双高/双低共振与多维大反差，再匹配单轴互补与整体镜像）
  let archetypeId = 'helm-anchor'
  let primaryAxisForRole = 0

  if (largeDiffAxesCount >= 4 && avgDiff >= 34) {
    // 4 个及以上维度均呈现大跨度反差 -> 引力平衡搭子
    archetypeId = 'gravity-balance'
    primaryAxisForRole = complementIdx
  } else if (domA >= 67 && domB >= 67 && diffs[0] <= 22 && diffs[3] < 40) {
    // 双方主导度都高 -> 双核推进拍档
    archetypeId = 'dual-engine'
    primaryAxisForRole = 3
  } else if (
    careA >= 67 &&
    careB >= 67 &&
    Math.max(emoA, emoB) >= 56 &&
    diffs[1] <= 22 &&
    diffs[0] < 35 &&
    diffs[3] < 35
  ) {
    // 双方照顾度与情绪细腻度都高 -> 温室守护同盟
    archetypeId = 'warm-greenhouse'
    primaryAxisForRole = 1
  } else if (extA >= 67 && extB >= 67 && diffs[2] <= 22 && diffs[0] < 35 && diffs[3] < 35) {
    // 双方外放度都高 -> 灵感造浪搭子
    archetypeId = 'spark-makers'
    primaryAxisForRole = 2
  } else if (extA <= 44 && extB <= 44 && diffs[0] < 30 && diffs[3] < 30) {
    // 双方外放度都偏内敛且无剧烈主导/计划冲撞 -> 静音充电同盟
    archetypeId = 'quiet-sanctuary'
    primaryAxisForRole = 1
  } else if (
    (domA >= 62 && careB >= 62 && domA - domB >= 15) ||
    (domB >= 62 && careA >= 62 && domB - domA >= 15) ||
    (diffs[0] >= 30 && diffs[0] >= diffs[3])
  ) {
    // 主导与照顾形成天然分工，或主导度明显互补 -> 掌舵与定心丸
    archetypeId = 'helm-anchor'
    primaryAxisForRole = 0
  } else if (diffs[3] >= 30 || (Math.max(planA, planB) >= 67 && Math.min(planA, planB) <= 44)) {
    // 计划度鲜明互补 -> 蓝图与奇遇记
    archetypeId = 'blueprint-wonder'
    primaryAxisForRole = 3
  } else if (avgDiff <= 18) {
    // 整体高度接近 -> 同频共振拍档
    archetypeId = 'mirror-resonance'
    primaryAxisForRole = 0
  } else if (avgDiff >= 26) {
    // 多维互补 -> 引力平衡搭子
    archetypeId = 'gravity-balance'
    primaryAxisForRole = complementIdx
  } else {
    archetypeId = 'helm-anchor'
    primaryAxisForRole = 0
  }

  const archetype =
    RELATIONSHIP_ARCHETYPES.find(item => item.id === archetypeId) || RELATIONSHIP_ARCHETYPES[0]

  // 确定性分配 A 与 B 的双方角色（若在主轴上分值相同，则以主导+计划总分区分，确保两人角色不同且互补）
  const scoreAOnAxis = scoresA[primaryAxisForRole] ?? 50
  const scoreBOnAxis = scoresB[primaryAxisForRole] ?? 50
  const aIsHighRole =
    scoreAOnAxis > scoreBOnAxis ||
    (scoreAOnAxis === scoreBOnAxis &&
      (scoresA[0] ?? 50) + (scoresA[3] ?? 50) >= (scoresB[0] ?? 50) + (scoresB[3] ?? 50))

  const traitA = describeSalientTrait(scoresA)
  const traitB = describeSalientTrait(scoresB)

  const roleA = aIsHighRole
    ? {
        title: archetype.roleHighTemplate.title,
        desc: `${nameA}${traitA.phrase}，${archetype.roleHighTemplate.desc}`,
        highlightAxis: traitA.highlightAxis
      }
    : {
        title: archetype.roleLowTemplate.title,
        desc: `${nameA}${traitA.phrase}，${archetype.roleLowTemplate.desc}`,
        highlightAxis: traitA.highlightAxis
      }

  const roleB = aIsHighRole
    ? {
        title: archetype.roleLowTemplate.title,
        desc: `${nameB}${traitB.phrase}，${archetype.roleLowTemplate.desc}`,
        highlightAxis: traitB.highlightAxis
      }
    : {
        title: archetype.roleHighTemplate.title,
        desc: `${nameB}${traitB.phrase}，${archetype.roleHighTemplate.desc}`,
        highlightAxis: traitB.highlightAxis
      }

  const sharedDim = DIMENSIONS[sharedIdx]
  const complementDim = DIMENSIONS[complementIdx]

  const sharedSummary =
    avgs[sharedIdx] >= 60
      ? `你们在「${sharedDim.fullLabel}」上都很充沛（均值 ${avgs[sharedIdx]}），不用多解释就能接住彼此的节奏。`
      : avgs[sharedIdx] <= 40
      ? `你们在「${sharedDim.fullLabel}」上都保持着舒服的松弛感，不会给对方制造额外压力。`
      : `你们在「${sharedDim.fullLabel}」上的分寸感高度一致（相差仅 ${diffs[sharedIdx]} 分），相处起来很自然。`

  const complementSummary =
    diffs[complementIdx] >= 22
      ? `在「${complementDim.fullLabel}」上，一个偏向${complementDim.highPole}，一个偏向${complementDim.lowPole}，刚好拼出彼此没有的视角。`
      : `在「${complementDim.fullLabel}」上你们各有侧重，既有共同语言又保留了新鲜感。`

  return {
    archetype,
    roleA,
    roleB,
    sharedAxis: {
      label: sharedDim.label,
      diff: diffs[sharedIdx],
      summary: sharedSummary
    },
    complementAxis: {
      label: complementDim.label,
      diff: diffs[complementIdx],
      summary: complementSummary
    },
    dynamicSummary: archetype.description,
    interactionTip: archetype.interactionTip,
    shareQuote: archetype.shareQuote
  }
}

export interface SamplePartner {
  id: string
  name: string
  tag: string
  scores: number[]
}

export const SAMPLE_PARTNERS: SamplePartner[] = [
  {
    id: 'sample_warm',
    name: '阿温（暖心搭子）',
    tag: '高照顾 · 细腻陪伴',
    scores: [33, 89, 56, 44, 78]
  },
  {
    id: 'sample_spark',
    name: '小燃（行动派朋友）',
    tag: '高主导 · 热闹外放',
    scores: [89, 56, 89, 78, 33]
  },
  {
    id: 'sample_chill',
    name: '林屿（松弛漫游者）',
    tag: '随缘派 · 安静回血',
    scores: [22, 44, 22, 22, 33]
  },
  {
    id: 'sample_plan',
    name: '周叙（秩序控拍档）',
    tag: '高计划 · 稳妥靠谱',
    scores: [67, 78, 44, 100, 56]
  }
]
