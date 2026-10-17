# 澳漂世界 · Aussie Life（阶段一原型）

基于真实地图的 2.5D 澳洲华人生活游戏原型。当前里程碑：把墨尔本 Box Hill 中心按 OpenStreetMap 的真实街道、建筑和商家渲染成等距视角地图，角色可以点击走动。

纯前端，Phaser 3 从 CDN 加载，无需构建。

## 本地运行

```bash
python3 -m http.server 8766
```

打开 http://localhost:8766 。必须通过 http 访问，直接双击 index.html 会因为浏览器限制读不到地图数据。

## 目录

```
index.html           页面与 HUD、商家弹窗
css/style.css        样式
js/boot.js           顺序加载 Phaser 与游戏脚本
js/main.js           Phaser 配置与场景注册
js/iso.js            等距投影、几何工具、调色板、类型中文名
js/pathfind.js       2 米网格与 A* 寻路
js/scene_select.js   起始地选择：澳洲地图、城市投票
js/scene_world.js    世界场景：地面、建筑、商家、角色、NPC、任务流程、相机与输入
js/quests.js         任务引擎：存档、任务状态、步骤推进、效果结算、锚点解析
js/content_boxhill.js Box Hill 的 NPC、任务、道具、优惠券
js/ui.js             对话面板、任务面板、背包、HUD
data/boxhill.json    预处理好的 Box Hill 地图数据
tools/fetch_osm.js   从 Overpass API 拉取并预处理一个街区
```

## 地图数据管线

```bash
node tools/fetch_osm.js boxhill
```

脚本从 OpenStreetMap 拉取道路、建筑、铁路、公园、停车场和有名字的商家，换算成以车站为原点的本地米坐标，写入 `data/<区域>.json`。
要开新城区，在 `tools/fetch_osm.js` 的 `AREAS` 里加一条中心点和范围即可。

地图数据 © OpenStreetMap contributors，ODbL 许可，页面内已署名。

## 渲染与交互

- 等距投影：每米 4 像素，建筑按层数或高度标签挤出，逐栋生成贴图并按脚底深度排序，角色可以被前方建筑遮挡。
- 地面：公园、停车场、站台、各等级道路、铁路和路名。
- 商家：按餐饮、咖啡、零售、医疗、车站分色标记，标签按优先级避让，缩小时只显示地标。
- 角色：点地面走路，A* 寻路后拉直；拖动看地图；滚轮或双指缩放。
- 起始地页：点其他城市投票，票数存本机。

## 任务系统

- NPC 站在真实地点旁边：贡茶店员在贡茶门口，火锅店老板在 Dragon Hot Pot，会计在 ATO 楼下。锚点写在内容文件里，运行时解析成坐标并挪到最近可走的格子。
- 头顶 `!` 表示有任务可接，`?` 表示当前任务要找他。点 NPC 自动走过去再对话。
- 步骤类型：`talk` 找人说话（可要求携带物品）、`choice` 选项（可带属性判定和花费）、`goto` 到达某点、`collect` 按任意顺序到达多个点。
- 奖励：经验、金币、属性、道具、flag、优惠券。优惠券进背包，核销功能待做。
- 存档在本机 localStorage，任务面板底部可以清空重来。
- 首批内容：11 个 NPC，4 个主线任务（落地、找房、找工、凑分），7 个支线。

调试：`?loop=timeout` 让游戏在页面不可见时也运行；控制台 `AO.Quest.state()` 看存档。

## 下一步

商家优惠券的二维码与核销、商场内景、更多城区、账号与云存档。
