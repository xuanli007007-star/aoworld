# 澳漂世界 · Aussie Life

我的世界风格的方块 3D 游戏，地图是按 OpenStreetMap 真实数据还原的墨尔本 Box Hill。玩家在街头做任务、开每日宝箱、给商家打卡，商家获得曝光，玩家获得金币、装扮和优惠券。

在线试玩：https://xuanli007007-star.github.io/aoworld/
商家核销：https://xuanli007007-star.github.io/aoworld/merchant.html

纯前端，Three.js 从 CDN 加载，无需构建。

## 本地运行

```bash
python3 -m http.server 8766
```

打开 http://localhost:8766 。必须通过 http 访问。

## 玩法

- **街坊任务**：11 个街坊站在真实地点旁边，头顶 ❗ 有任务，❓ 表示当前任务找他。4 个主线（落地、找房、找工作、凑分）和 7 个支线。走近点"说话"，对话里有选择和属性判定。金色箭头和金色光柱指向当前任务目标。
- **每日宝箱**：每天按日期刷新 13 个，所有人当天位置一样。赞助商家门口附近各 3 个，开箱弹出广告卡（3 秒后可关闭）并给金币，集齐一家店的 3 个得到优惠券。黄色箭头指最近的宝箱。
- **信标打卡**：赞助商家门口有彩色光柱，走进去打卡加金币。
- **装扮**：金币换卫衣和帽子。学会 Hook turn 拿到驾照后走路变快。
- **优惠券**：背包里出示动态二维码，60 秒刷新，3 分钟失效。店员用手机相机扫码打开核销页。
- **小地图、等级、设置**（音效、阴影、街上的车和行人、重置存档）。

## 目录

```
index.html              游戏页面与界面
merchant.html           商家核销页
css/style.css           弹窗、对话、背包、优惠券的通用样式
css/game3d.css          游戏界面样式
css/merchant.css        核销页样式
js3d/atlas.js           程序生成的像素方块贴图
js3d/world.js           地图方块化、阶梯屋顶、树、网格合并
js3d/props.js           方块人、店招、商家信标与广告牌、宝箱、粒子、云、车、行人
js3d/player.js          操控与第三人称相机
js3d/npc.js             街坊和任务流程
js3d/minimap.js         小地图
js3d/main.js            入口、每日宝箱、广告卡、装扮、设置、主循环
js/content_boxhill.js   Box Hill 的街坊、任务、道具、赞助商家、优惠券
js/quests.js            任务引擎与存档
js/ui.js                对话框、任务面板、背包、出示优惠券
js/coupon.js            券码签名与校验
js/merchant.js          核销页逻辑
data/boxhill.json       预处理好的地图数据
tools/fetch_osm.js      从 Overpass API 拉取并预处理一个街区
```

## 加内容

任务、街坊、赞助商家都在 `js/content_boxhill.js`。街坊和任务地点用锚点写：`{poi: '店名'}`、`{building: '楼名'}`、`{npc: 'id'}` 或 `{xy: [x, y]}`，运行时自动挪到最近的店门口或可以站人的地面。

任务步骤类型：`talk` 找人说话（可要求携带物品）、`choice` 选项（可带属性判定和花费）、`goto` 到达某点、`collect` 按任意顺序到达多个点。

赞助商家字段：`poi` 对应地图上的店，`logo`、`color`、`offer`、`slogan` 用在广告牌和广告卡上，`coupon` 是集齐宝箱给的券种，`pin` 是演示用的核销口令。

## 开新城区

```bash
node tools/fetch_osm.js boxhill
```

在脚本的 `AREAS` 里加中心点和范围即可。地图数据 © OpenStreetMap contributors，ODbL 许可。

## 正式上线前要做的

- 所有商家广告和优惠券目前是演示，商家未参与，页面上已标注。
- 签名密钥在前端、核销记录存在商家手机本地、存档存在玩家手机本地，需要接后端（账号、云存档、券的签发与核销）。
- 曝光数据（广告展示、开箱、打卡次数）按商家记在玩家存档的 `adStats` 里，接后端后汇总给商家。

调试：网址加 `?loop=timeout` 让游戏在页面不可见时也运行；控制台 `G` 是游戏对象，`AO.Quest.state()` 是存档。
