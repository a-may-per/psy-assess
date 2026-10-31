export interface DimensionMeta {
  index: number
  key: 'dominance' | 'care' | 'extraversion' | 'planning' | 'emotion'
  label: string
  fullLabel: string
  highPole: string
  highDesc: string
  lowPole: string
  lowDesc: string
  pairRoleHint: string
}

export interface QuizQuestion {
  id: number
  dim: number // 0..4
  title: string
  // Options ordered from 4 points (index 0) down to 1 point (index 3) before PERMS permutation
  options: [string, string, string, string]
}

export const DIMENSIONS: DimensionMeta[] = [
  {
    index: 0,
    key: 'dominance',
    label: '主导',
    fullLabel: '主导度',
    highPole: '拍板型',
    highDesc: '习惯先拿主意、把事情往前推',
    lowPole: '随和型',
    lowDesc: '好商量、重氛围，跟着节奏也很自在',
    pairRoleHint: '决定相处中谁更常先定方向'
  },
  {
    index: 1,
    key: 'care',
    label: '照顾',
    fullLabel: '照顾度',
    highPole: '操心型',
    highDesc: '很自然地留意别人没说出口的需要',
    lowPole: '放养型',
    lowDesc: '给彼此留足空间，相信对方能搞定',
    pairRoleHint: '决定相处中谁更常兜底细节与情绪'
  },
  {
    index: 2,
    key: 'extraversion',
    label: '外放',
    fullLabel: '外放度',
    highPole: '人群充电',
    highDesc: '在交流与热闹里更有能量，有话直说',
    lowPole: '独处回血',
    lowDesc: '安静内敛，喜欢留出自己消化的空间',
    pairRoleHint: '决定相处是热闹同频还是安静陪伴'
  },
  {
    index: 3,
    key: 'planning',
    label: '计划',
    fullLabel: '计划度',
    highPole: '行程表型',
    highDesc: '喜欢心里有底，提前把关键节点排好',
    lowPole: '随缘型',
    lowDesc: '享受说走就走的松弛，走到哪算哪',
    pairRoleHint: '决定共同行动时偏向秩序还是惊喜'
  },
  {
    index: 4,
    key: 'emotion',
    label: '情绪',
    fullLabel: '情绪浓度',
    highPole: '细腻型',
    highDesc: '对语气和气氛很敏锐，感受层次丰富',
    lowPole: '大条型',
    lowDesc: '心大松弛，不爱内耗，事情过去就翻篇',
    pairRoleHint: '决定情感共鸣的浓度与沟通直接度'
  }
]

/**
 * 15 道盲测题目（按「主导→照顾→外放→计划→情绪」3 轮交错排列）
 * 已完成 v1 终审精修：
 * - Q1 区分「直接拍板定一家(4分)」与「挑几家发起投票(3分)」的主动性梯度
 * - Q12（原雨伞题）D 选项改为「各自打车，到地方碰头」，消除歧义
 * - 全文无关系类型限定词（伴侣/男女朋友），朋友/情侣/同事/家人通用
 * - 全文遵循禁用词红线，无诊断、评判或负面定性词汇
 */
export const QUESTIONS: QuizQuestion[] = [
  // Round 1 (Q1 - Q5)
  {
    id: 1,
    dim: 0,
    title: '群里约饭选店，你一般……',
    options: [
      '直接选好一家靠谱的，发群里问大家行不行',
      '先挑两三家发出来，带动大家投票定下',
      '等大家先提，谁提得具体就附和谁',
      '都行，你们定好时间和位置叫我就好'
    ]
  },
  {
    id: 2,
    dim: 1,
    title: '朋友说感冒了躺着，你会……',
    options: [
      '直接点好热粥和常用药送到 TA 家门口',
      '叮嘱怎么吃药休息，隔一阵再问问好点没',
      '发条消息关心一句“好好休息，有事喊我”',
      '回个抱抱表情包，不打扰 TA 睡觉，等好了再约'
    ]
  },
  {
    id: 3,
    dim: 2,
    title: '一场热闹的聚会结束，回家路上你……',
    options: [
      '还很兴奋，想接着组下半场再去坐坐',
      '心情不错，到家还想在群里接梗聊两句',
      '觉得刚刚好，戴上耳机安安静静走回去',
      '电量见底了，今晚谁也别找我，独自回血中'
    ]
  },
  {
    id: 4,
    dim: 3,
    title: '周五有人约你周末出去玩，你的反应是……',
    options: [
      '当晚就把时间、地点和怎么去全都敲定好',
      '先把大方向和集合时间说好，细节到时候看',
      '先开心应下来，碰头之后再看心情随便逛',
      '回一句“周末看状态，出发前叫我”'
    ]
  },
  {
    id: 5,
    dim: 4,
    title: '朋友回消息语气好像有点冲，你会……',
    options: [
      '忍不住反复看聊天记录：是不是我哪句话说错了',
      '心里会多想一下，找个自然的机会问一句',
      '感觉稍微有点怪，但忙别的事转头就放下了',
      '完全没多想，按平时的节奏照常回消息'
    ]
  },

  // Round 2 (Q6 - Q10)
  {
    id: 6,
    dim: 0,
    title: '几个人一起出门玩要做攻略，你通常是……',
    options: [
      '我来做全套路线和时间表，大家跟着走就行',
      '我把车票住宿等大头定好，其余随大家发挥',
      '有人张罗我就配合，实在没人管我再出手',
      '完全放心交给同行的人安排，我负责捧场'
    ]
  },
  {
    id: 7,
    dim: 1,
    title: '朋友最近状态低落，连续几天没什么动静，你会……',
    options: [
      '直接约出来见一面或打个电话，陪在身边再说',
      '发一段认真的长消息，陪 TA 聊到心情松一点',
      '分享一点轻松的日常，让 TA 知道你一直都在',
      '觉得每个人都有想静静的时候，留足空间等 TA 找我'
    ]
  },
  {
    id: 8,
    dim: 2,
    title: '心里憋着一件烦心事的时候，你会……',
    options: [
      '马上找人倒出来，边说边理，说完就好了一大半',
      '找一两个最信任的人聊聊，但只挑重点说',
      '先自己待一会儿，散散步或听歌慢慢消化',
      '习惯自己扛过去，绝口不提，过两天就翻篇了'
    ]
  },
  {
    id: 9,
    dim: 3,
    title: '去一个陌生的城市或大商场，你的习惯是……',
    options: [
      '出发前把动线和必去清单排好，基本照着走',
      '提前收藏几个感兴趣的点，到了看顺路情况走',
      '到了现场再打开地图，看附近有什么就去哪',
      '完全不看攻略，走到哪算哪，偶遇什么都行'
    ]
  },
  {
    id: 10,
    dim: 4,
    title: '看到影视剧里特别戳人的情节，你通常……',
    options: [
      '当场眼眶发热，看完后劲很大还要回味好几天',
      '心里挺有触动，散场后想找人聊聊刚才的片段',
      '觉得拍得还不错，但走出屏幕很快就抽离了',
      '全程比较冷静，更留意剧情逻辑或顺手刷手机'
    ]
  },

  // Round 3 (Q11 - Q15)
  {
    id: 11,
    dim: 0,
    title: '大家商量一件事迟迟定不下来，你会……',
    options: [
      '直接拍板：“就选这个吧，有问题我来兜着”',
      '帮大家理出两条最可行的路，推动现场做决定',
      '继续听大家怎么说，等有人先表态再跟进',
      '既然僵住了就先放一放，换个轻松的话题缓一缓'
    ]
  },
  {
    id: 12,
    dim: 1,
    title: '出门突然下起大雨，同行的人没带伞，你会……',
    options: [
      '把伞大半边偏向对方，宁可自己肩膀淋湿一点',
      '两个人凑在一把伞下，一起商量怎么走最稳妥',
      '提议先到屋檐下避一避，等雨小一点再走',
      '干脆各自叫车，直接去目的地碰头更省事'
    ]
  },
  {
    id: 13,
    dim: 2,
    title: '在一个好几百人的热闹群里，你通常是……',
    options: [
      '气氛担当，经常主动抛梗，一开口大家就接话',
      '偶尔冒泡，碰到感兴趣的话题会连续聊几句',
      '潜水居多，看到好玩的发言就顺手点个赞或表情',
      '基本隐身免打扰，只看不说'
    ]
  },
  {
    id: 14,
    dim: 3,
    title: '原本约好的安排突然被临时取消，你会……',
    options: [
      '马上启用备选方案，把这一天重新安排充实',
      '稍微有点失落，很快换一件想做的事补上',
      '觉得正好，顺势在家躺平休息也挺舒服',
      '完全无所谓，本来也没把计划卡得那么死'
    ]
  },
  {
    id: 15,
    dim: 4,
    title: '有人当面直接指出你的一个疏忽，你会……',
    options: [
      '当场心里一紧，表面稳住但需要缓很久才能消化',
      '嘴上平静接下，回去路上还会忍不住复盘好几遍',
      '当下有一点不自在，不过睡一觉起来就过去了',
      '觉得说得有道理就改，说完当场就翻篇'
    ]
  }
]

/**
 * 固定选项打散排列（15 题 × 4 选项）
 * 数字 0,1,2,3 对应原始 options 下标（分别对应 4分, 3分, 2分, 1分）
 * 保证所有人看到同一套固定顺序，且 4 分位在 A/B/C/D 上均衡分布（4/4/4/3）
 */
export const PERMS: number[][] = [
  [0, 1, 2, 3],
  [3, 2, 1, 0],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
  [3, 0, 2, 1],
  [0, 3, 1, 2],
  [2, 1, 0, 3],
  [1, 2, 3, 0],
  [0, 2, 1, 3],
  [3, 1, 2, 0],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
  [3, 2, 0, 1],
  [0, 1, 3, 2],
  [2, 3, 1, 0]
]

export function calculateDimensionScores(answers: Array<number | null>): number[] {
  return DIMENSIONS.map((_, dimIndex) => {
    const rawScores: number[] = []
    QUESTIONS.forEach((q, qIndex) => {
      const pickedDisplayIndex = answers[qIndex]
      if (q.dim === dimIndex && pickedDisplayIndex !== null && pickedDisplayIndex !== undefined) {
        const originalOptionIndex = PERMS[qIndex][pickedDisplayIndex]
        const point = 4 - originalOptionIndex // index 0 -> 4 pts, index 3 -> 1 pt
        rawScores.push(point)
      }
    })
    if (rawScores.length === 0) return 0
    const avg = rawScores.reduce((sum, v) => sum + v, 0) / rawScores.length
    return Math.round(((avg - 1) / 3) * 100)
  })
}
