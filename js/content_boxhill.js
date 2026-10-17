/* Box Hill 的 NPC、任务、道具、优惠券
 * 锚点 at: {poi:'名字正则'} / {building:'名字正则'} / {npc:'id'} / {xy:[x,y]}，可加 dx dy 偏移（米） */
window.AO = window.AO || {};
AO.CONTENT = {
  npcs: [
    { id: 'zhang', name: '老张', role: '车站志愿者', emoji: '👴', color: 0x3a6ea5, at: { xy: [118, 0] },
      idle: ['记得 touch on。', '这条街我扫了十二年，哪家好吃我都知道。', '今天一天四季，带伞。'] },
    { id: 'lin', name: '林姐', role: '中介 · 房产留学旅游都做', emoji: '👩‍💼', color: 0xc0392b, at: { poi: 'Grand City', dy: 6 },
      idle: ['房子看好了就赶紧，Box Hill 的房等不了人。', '留学、移民、旅游，姐都能办。'] },
    { id: 'wang', name: '王老板', role: 'Dragon Hot Pot 老板', emoji: '👨‍🍳', color: 0xd35400, at: { poi: 'Dragon Hot Pot', dy: 6 },
      idle: ['今天的毛肚很新鲜。', '周五排队两小时，别怪我没提醒。'] },
    { id: 'may', name: '阿May', role: '贡茶店员', emoji: '🧋', color: 0x8e44ad, at: { poi: 'Gong Cha', dy: 6 },
      idle: ['三分糖少冰，对吧？', '店长说今天要卖三百杯。'] },
    { id: 'chen', name: 'Chen 律师', role: '移民律师 · 银行楼上', emoji: '👨‍⚖️', color: 0x2c3e50, at: { poi: 'Commonwealth Bank', dy: 6 },
      idle: ['移民局昨晚又更新了政策。', '分数线只会涨不会跌。'] },
    { id: 'bob', name: 'Uncle Bob', role: '驾考教练', emoji: '🧔', color: 0xf39c12, at: { xy: [-125, -101] },
      idle: ['G’day! 今天练 Hook turn 吗？', 'No worries, mate.'] },
    { id: 'liu', name: '刘阿姨', role: '团购团长', emoji: '👩', color: 0x16a085, at: { poi: 'Asian Grocery Centre', dy: 6 },
      idle: ['车厘子今天到货，群里接龙。', '阿姨什么都能拼，榴莲也行。'] },
    { id: 'xiaoli', name: '小李', role: '留学生 · 老乡', emoji: '🧑‍🎓', color: 0x27ae60, at: { poi: 'Puzzle Coffee', dy: 6 },
      idle: ['老乡！今晚吃什么？', '作业做不完了，Monash 太卷。'] },
    { id: 'nguyen', name: 'Nguyen 药剂师', role: 'Chemist Warehouse', emoji: '👩‍⚕️', color: 0x1abc9c, at: { poi: 'Chemist Warehouse', dy: 6 },
      idle: ['花粉季到了，Telfast 卖疯了。', '多喝水，少熬夜。'] },
    { id: 'zhou', name: '老周', role: '象棋大爷', emoji: '🧓', color: 0x7f8c8d, at: { xy: [6, -120] },
      idle: ['将军。', '急什么，这里的日子慢。'] },
    { id: 'sam', name: 'Sam', role: '会计 · ATO 门口接活', emoji: '🧮', color: 0x34495e, at: { building: 'Australian Taxation Office', dy: 32 },
      idle: ['七月一号之后找我，能退的都给你退。', '收据留好，显示器也能算工作用途。'] },
  ],
  items: {
    myki: { name: 'Myki 卡', emoji: '🎫', desc: '上车 touch on，下车 touch off。' },
    lease: { name: '租房合同', emoji: '📄', desc: '十四页，你一页都没看懂，但签得很用力。' },
    payslip: { name: '工资单', emoji: '🧾', desc: '合规的证明，报税和凑分都用得上。' },
    income_proof: { name: '收入证明', emoji: '📑', desc: 'Sam 开的，盖了章。' },
    naati: { name: 'NAATI 成绩', emoji: '📘', desc: '社区语言加 5 分。' },
    work_ref: { name: '工作证明', emoji: '📝', desc: '阿May 替你写的，店长签的字。' },
    sign: { name: '火锅店招牌', emoji: '🪧', desc: '上面有三个鸟粪印。' },
    telfast: { name: 'Telfast', emoji: '💊', desc: '花粉季续命药。' },
    cherries: { name: '半斤车厘子', emoji: '🍒', desc: '刘阿姨分的，按公斤算钱的那种。' },
    licence: { name: 'P 牌驾照', emoji: '🪪', desc: '会 Hook turn 的证明。走路速度提升。' },
  },
  coupons: {
    hotpot_90: { merchant: 'Dragon Hot Pot', text: '全单九折', note: '线下核销即将开放 · 演示券' },
    gongcha_b1g1: { merchant: '贡茶', text: '买一送一', note: '线下核销即将开放 · 演示券' },
    grocery_5: { merchant: 'Box Hill Asian Grocery Centre', text: '满 50 减 5', note: '线下核销即将开放 · 演示券' },
  },
  quests: [
    /* ---------- 主线 ---------- */
    { id: 'arrive', title: '落地第一天', type: 'main', giver: 'zhang',
      intro: ['刚落地？看你拖着箱子就知道。Box Hill 欢迎你。', '先学会两件事：touch on，和在这条街上找到吃的。', '去 Woolworths 买张 Myki，回来找我。'],
      steps: [
        { type: 'goto', at: { poi: 'Woolworths', dy: 8 }, label: '去 Woolworths 买一张 Myki', radius: 12,
          onArrive: [{ who: 'sys', text: '你在 Woolworths 买了一张 Myki，充了 20 刀。店员说了句什么，你点了点头。' }], effects: { gold: -26, items: ['myki'] } },
        { type: 'talk', npc: 'zhang', requires: ['myki'], missing: '先去 Woolworths 买卡，就在 Station Street 那边。',
          lines: ['对，就是这张卡。上车 touch on，下车 touch off。', '火车不用 touch off，但你也别赌，查票的三百刀起步。', { who: 'me', text: '学到了。' }] },
      ],
      rewards: { exp: 30, net: 1, flags: ['tutorial'] },
      done: ['去找林姐吧，她什么都做，房子、留学、旅游，Box Hill 的万事通。', '她在 Grand City 旅行社门口，Whitehorse Road 北边。'] },

    { id: 'rent', title: '找房记', type: 'main', giver: 'lin', requires: { quests: ['arrive'] },
      intro: ['找房？来对人了。姐手上三套。', 'Sky One 高层景观房，Whitehorse Towers 精装两房，还有 Station Street 一套"温馨" share house。', '你自己去看看，看完回来告诉我。'],
      steps: [
        { type: 'collect', label: '去看三套房源', radius: 16, points: [
          { at: { building: 'Sky One', dx: 0, dy: 40 }, label: '看 Sky One', line: 'Sky One：电梯等了八分钟。景观很好，租金也很"好"。' },
          { at: { building: 'Whitehorse Towers', dy: 30 }, label: '看 Whitehorse Towers', line: 'Whitehorse Towers：精装修，但卧室的窗对着隔壁的窗。' },
          { at: { xy: [-40, 95] }, label: '看 Station Street 的 share house', line: 'share house：五个人一个厕所，但楼下就是火锅店。' },
        ] },
        { type: 'choice', npc: 'lin', prompt: '看完了？选一套吧。押金今天付能便宜五十。', options: [
          { text: 'Sky One，我要住高层', cost: 600, effects: { gold: -600, items: ['lease'], flags: ['home_sky'], mood: 1 }, result: '你签了合同。每周 550，你的存款开始自由落体，但朋友圈很好看。' },
          { text: 'share house，省钱要紧', cost: 250, effects: { gold: -250, items: ['lease'], flags: ['home_share'] }, result: '你搬进了 share house。第二天冰箱上多了五张名字贴。' },
          { text: '先付押金再看合同？我要先看合同', roll: { stat: 'luck', mod: 0.2,
            success: { text: '林姐笑了："行，你不好骗。"她给了你一份正规合同，还减了二十。', effects: { gold: -230, items: ['lease'], flags: ['home_share'], net: 1 } },
            fail: { text: '林姐说那你再想想。第二天房子没了，你最后住进了更远的 Clayton。', effects: { gold: -200, items: ['lease'], flags: ['home_far'], mood: -1 } } } },
        ] },
      ],
      rewards: { exp: 50 },
      done: ['安顿好了就去找工作。Main Street 的贡茶在招人，找阿May。'] },

    { id: 'job', title: '第一份工作', type: 'main', giver: 'may', requires: { quests: ['rent'] },
      intro: ['招人！时薪十五，现金，不打税。', '或者……你要合规的也行，二十四一小时，但要等店长批。'],
      steps: [
        { type: 'choice', npc: 'may', prompt: '你要哪种？', options: [
          { text: '现金工，先干着', effects: { gold: 300, flags: ['cash_job'], mood: -1 }, result: '两周后，你学会了三十种奶茶的做法，和在店长面前装忙的技巧。' },
          { text: '我要合规的', roll: { stat: 'eng', mod: 0.1,
            success: { text: '店长面试了你十分钟，批了。你有了人生第一张澳洲工资单。', effects: { gold: 380, flags: ['job'], items: ['payslip'] } },
            fail: { text: '店长说你英语还不够和顾客吵架。你先做了两周现金工练手。', effects: { gold: 200, flags: ['cash_job'] } } } },
        ] },
        { type: 'goto', at: { poi: 'Dragon Hot Pot', dy: 7 }, label: '下班去 Dragon Hot Pot 犒劳自己', radius: 10,
          onArrive: [{ who: 'sys', text: '你点了鸳鸯锅，一个人。老板王叔看了你三眼，第三眼的时候送了一盘虾滑。' }], effects: { gold: -45, flags: ['met_wang'], mood: 1 } },
      ],
      rewards: { exp: 60, net: 1, coupon: { id: 'gongcha_b1g1', merchant: '贡茶', text: '买一送一' } },
      done: ['对了，隔壁火锅店王老板好像在找人帮忙，去问问。'] },

    { id: 'eoi', title: '凑分', type: 'main', giver: 'chen', requires: { quests: ['job'] },
      intro: ['想留下？那就是 EOI 打分的事。你现在差十分。', '三样东西：收入证明、NAATI 成绩、工作证明。', 'Sam 会计在 ATO 楼下，NAATI 去 Whitehorse Road 北边的中文学校考，工作证明找你店长。'],
      steps: [
        { type: 'collect', label: '收集三份材料', radius: 10, points: [
          { at: { npc: 'sam' }, label: '找 Sam 开收入证明', line: 'Sam 看了一眼你的流水，盖了个章："下次记得留收据。"', effects: { items: ['income_proof'] } },
          { at: { building: 'Chinese Culture School', dy: 20 }, label: '去中文学校考 NAATI', line: '你把"社区语言"考了下来。考官问你周末做什么，你说学英语。', effects: { items: ['naati'], eng: 1 } },
          { at: { npc: 'may' }, label: '找阿May拿工作证明', line: '阿May 替你写了证明，店长签字的时候说："别走啊，谁来做奶茶？"', effects: { items: ['work_ref'] } },
        ] },
        { type: 'choice', npc: 'chen', prompt: '材料齐了。现在打分，你的英语是关键。', options: [
          { text: '直接递交', roll: { stat: 'eng', mod: 0.15,
            success: { text: '八十五分，获邀。你在群里发了"上岸"加二十个烟花。', effects: { flags: ['eoi_ok'], mood: 2 } },
            fail: { text: '差五分。Chen 律师说："要么去偏远地区，要么再考一次雅思。"', effects: { flags: ['eoi_wait'], mood: -1 } } } },
          { text: '交两千刀让律师包办', cost: 2000, effects: { gold: -2000 }, roll: { stat: 'luck', mod: 0.4,
            success: { text: '三个月后下签。你给了五星好评。', effects: { flags: ['eoi_ok'], mood: 2 } },
            fail: { text: '材料被退回，出生日期填错了。Chen 律师说免费再递一次。', effects: { flags: ['eoi_wait'], mood: -2 } } } },
        ] },
      ],
      rewards: { exp: 100, net: 1 },
      done: ['不管结果怎样，你已经比大部分人多走了一步。', '去 Main Street 吃顿火锅吧。'] },

    /* ---------- 支线 ---------- */
    { id: 'sign', title: '被喜鹊叼走的招牌', type: 'side', giver: 'wang', requires: { flags: ['met_wang'] },
      intro: ['我的招牌！昨天挂门口晾漆，今天没了。', '有人看见一只喜鹊往北边小公园飞。帮我找找，火锅管……打折。'],
      steps: [
        { type: 'goto', at: { xy: [12, -112] }, label: '去北边的小公园找招牌', radius: 14,
          onArrive: [{ who: 'sys', text: '你在树下找到了招牌，上面多了三个鸟粪印。旁边下棋的大爷头也不抬："那鸟每年春天都这样。"' }], effects: { items: ['sign'] } },
        { type: 'talk', npc: 'wang', requires: ['sign'], missing: '招牌呢？小公园在 Whitehorse Road 北边。', lines: ['找到了！你是好人。', '这张券拿着，下次九折。别告诉别人。'], effects: { removeItems: ['sign'] } },
      ],
      rewards: { exp: 40, net: 1, coupon: { id: 'hotpot_90', merchant: 'Dragon Hot Pot', text: '全单九折' } } },

    { id: 'hookturn', title: 'Hook turn', type: 'side', giver: 'bob', requires: { flags: ['tutorial'] },
      intro: ['G’day! 考驾照？墨尔本特产 Hook turn 懂吗？', '三个问题，答对就上路。'],
      steps: [
        { type: 'choice', npc: 'bob', prompt: '第一题：CBD 有电车的路口右转，你应该？', options: [
          { text: '靠右车道，等绿灯右转', result: '错。那是全世界的方法，不是墨尔本的。再想想。', retry: true, effects: { mood: -1 } },
          { text: '靠最左车道，等对面绿灯亮再右转', result: '对！这就是 Hook turn。第一次见的人都以为是在画八卦。' },
        ] },
        { type: 'choice', npc: 'bob', prompt: '第二题：路边的电车停下来上下客，你？', options: [
          { text: '慢慢从旁边绕过去', result: '错！罚款加扣分。电车门开着你就得停。', retry: true, effects: { mood: -1 } },
          { text: '停车，等所有人上下完', result: '对。墨尔本人开车像散步，就是这么练出来的。' },
        ] },
        { type: 'choice', npc: 'bob', prompt: '最后一项：倒车入库。上车。', options: [
          { text: '深呼吸，开始', roll: { stat: 'luck', mod: 0.2,
            success: { text: '过了！Bob 给了你一块 P 牌。你在停车场坐了十分钟没舍得走。', effects: { flags: ['car'], items: ['licence'] } },
            fail: { text: '压线了。Bob 说："No worries，再来。"重考费六十。', effects: { gold: -60, mood: -1 }, retry: true } } },
        ] },
      ],
      rewards: { exp: 60, luck: 1 },
      done: ['有了车，这地图你走得就快了。记住，Hook turn。'] },

    { id: 'cherries', title: '拼一箱车厘子', type: 'side', giver: 'liu', requires: { flags: ['tutorial'] },
      intro: ['群里拼了十箱车厘子，三个人还没给钱。', '帮阿姨收一下，三十五一份，分你半斤。'],
      steps: [
        { type: 'collect', label: '向三个人收车厘子钱', radius: 8, points: [
          { at: { npc: 'xiaoli' }, label: '找小李收钱', line: '小李转了三十五，备注"车厘子自由"。' },
          { at: { npc: 'may' }, label: '找阿May收钱', line: '阿May 说下次拼榴莲叫她。' },
          { at: { npc: 'zhou' }, label: '找老周收钱', line: '老周掏了半天现金，多给了五块："买糖吃。"' },
        ] },
        { type: 'talk', npc: 'liu', lines: ['齐了！你办事阿姨放心。', '这半斤拿着，再给你张亚超的券。'] },
      ],
      rewards: { exp: 40, net: 2, items: ['cherries'], coupon: { id: 'grocery_5', merchant: 'Box Hill Asian Grocery Centre', text: '满 50 减 5' } } },

    { id: 'fine', title: 'Myki 罚款', type: 'side', giver: 'xiaoli', requires: { flags: ['tutorial'] },
      intro: ['老乡！我被查票了，三百刀！', '我真不知道要 touch on，谁教过我啊。'],
      steps: [
        { type: 'choice', npc: 'xiaoli', prompt: '怎么办？', options: [
          { text: '帮他付一半', cost: 150, effects: { gold: -150, net: 2, mood: 1 }, result: '小李眼眶红了，说以后奶茶他包了。他包了一个月。' },
          { text: '教他写申诉信', roll: { stat: 'eng', mod: 0.1,
            success: { text: '申诉信写得很好，罚款减到七十五。小李请你喝了奶茶。', effects: { net: 2, eng: 1 } },
            fail: { text: '申诉被驳回。但小李还是请你喝了奶茶。', effects: { net: 1 } } } },
          { text: '自己的罚单自己扛', effects: { mood: -1 }, result: '小李沉默了一会儿，说也对。你们还是老乡。' },
        ] },
      ],
      rewards: { exp: 30 } },

    { id: 'hayfever', title: '花粉季', type: 'side', giver: 'nguyen', requires: { flags: ['tutorial'] },
      intro: ['春天到了，Telfast 卖疯了。', '老张刚才打喷嚏打得像放鞭炮，能帮我送一盒给他吗？'],
      steps: [
        { type: 'talk', npc: 'nguyen', lines: ['拿着，一天一片，别吃错。'], effects: { items: ['telfast'] } },
        { type: 'talk', npc: 'zhang', requires: ['telfast'], missing: '阿嚏！药呢？', lines: ['阿嚏！谢谢。', '墨尔本的春天是用来考验人的，花粉、大风、一天四季，缺一不可。'], effects: { removeItems: ['telfast'] } },
      ],
      rewards: { exp: 30, mood: 1 } },

    { id: 'chess', title: '下一盘', type: 'side', giver: 'zhou', requires: { flags: ['tutorial'] },
      intro: ['小伙子，会下棋吗？', '赢我一盘，教你一个在这里过日子的道理。'],
      steps: [
        { type: 'choice', npc: 'zhou', prompt: '来不来？', options: [
          { text: '来', roll: { stat: 'mood', mod: 0,
            success: { text: '你赢了。老周收起棋子："心态好的人，在哪都住得下去。"', effects: { mood: 2, net: 1 } },
            fail: { text: '三步被将死。老周说："急什么，这里的日子慢。"', effects: { mood: 1 } } } },
          { text: '我不会', result: '老周教了你一下午。你学会了马走日，和在公园里消磨一个下午。', effects: { mood: 1, net: 1 } },
        ] },
      ],
      rewards: { exp: 20 } },

    { id: 'tax', title: '第一次报税', type: 'side', giver: 'sam', requires: { anyFlags: ['job', 'cash_job'] },
      intro: ['财年结束了。有工资单吗？能退的都给你退。'],
      steps: [
        { type: 'choice', npc: 'sam', prompt: '你的情况？', options: [
          { text: '有工资单，正规报', roll: { stat: 'luck', mod: 0.1,
            success: { text: '退了一千二。你瞬间理解了为什么澳洲人一到七月就那么开心。', effects: { gold: 1200, mood: 1 } },
            fail: { text: 'ATO 让你补交材料。Sam 说："下次收据别扔。"', effects: { mood: -1 } } } },
          { text: '我是现金工……', result: 'Sam 叹了口气："那没法退。下次要工资单，为了你自己。"', effects: { mood: -1, eng: 1 } },
        ] },
      ],
      rewards: { exp: 30 } },
  ],
};
