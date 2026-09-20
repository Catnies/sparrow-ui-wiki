# Sparrow UI Wiki 执行与接手文档

本文是 `sparrow-ui-wiki` 文档站的执行计划与接手说明。任何 Agent 或人接手其中一部分章节前，**先完整读完第 0~4 节**，再翻到第 5 节找自己负责的页面。

- 最后更新：2026-09-20
- 文档站仓库：`F:\IDEA Projects\MinecraftProject\sparrow-ui-wiki`
- 被文档化的库：`F:\IDEA Projects\MinecraftProject\sparrow-ui`（下文简称「库仓库」）

---

## 0. 现状

已完成：

- 全站 41 个页面的骨架文件已生成（英文占位 + 中文占位各一份）
- `sidebars/zh-hans.ts` 与 `sidebars/en.ts` 已按本文第 5 节的章节结构落好
- 第 4.1 节的**通用组件全部完成**并已全局注册，预览页挂在两个 sidebar 的根层级最后一项
- 根文档 `intro`（介绍）与 1.1 `getting-started/installation`（安装）已完成
- 1.2 `getting-started/quick-start`（快速开始）已完成，连带做出 `<CodeSteps>`

未开始：

- 41 页正文里剩下的 39 页
- 第 4.2 节余下的客制化组件（跟随各自章节执行）

下一页是 1.3 `getting-started/concepts`，要连带做 4.2 节的「核心概念层级交互图」。

**当前只做中文版。** 英文占位页保持原样，等中文全部完成后再统一翻译。

---

## 1. 目录约定

站点 `defaultLocale` 是 `en`，`docs/` 是英文源树，中文是 i18n 译文。因此：

| 写什么 | 写到哪 |
|---|---|
| 中文正文（现在唯一要写的） | `i18n/zh-Hans/docusaurus-plugin-content-docs/current/<路径>.mdx` |
| 英文正文（暂不动） | `docs/<路径>.mdx` |
| 侧边栏结构 | `sidebars/zh-hans.ts` 与 `sidebars/en.ts`（两份必须同步，只有 label 不同） |
| 组件 | `src/components/<Name>.js` + `<Name>.module.css` |
| 全站样式 | `src/css/custom.css` |
| 图片 | `static/img/` |

两棵树的文件路径必须一一对应，否则中文页会回退成英文占位页。**新增页面时必须同时建两份文件并同步改两个 sidebar。**

### 本地运行

```bash
npm run start-zhcn
```

这条命令直接以 `zh-Hans` 启动，是写中文时唯一该用的。`npm run start` 起的是英文占位站。

### 构建验证

```bash
npm run build
```

`onBrokenLinks` 配的是 `throw`，任何死链都会让构建失败。**提交前必须跑一次构建。**

---

## 2. 全站写作约定

这几条对每一页都生效，不要逐页重新决定。

### 2.1 内容取向

1. **教会用户怎么用，不解释背后怎么实现。** 内部机制只在「它会改变你怎么写代码」时提一句。例如订阅寿命只说「关窗后不用手动清理」，不讲 `AbstractSignal$Entry` 的弱引用结构。
2. **不把用户当新手教。** 依赖安装给配置就行，不解释 Gradle 是什么、Shadow 插件怎么工作。
   - **中立陈述，不用教学口吻。** 直接说事物是什么、怎么用，不写「这一页会带你…」「接下来我们来…」「在现在这份代码上动手，比读十页文档都快」这类话。标题同理：写「菜单布局」不写「你会做出什么」。
   - 开头那句话描述的是**页面里的东西**，不是页面本身。写「一个可以直接运行的最小菜单：三行箱子…」，不写「这一页从零写出一个能跑的菜单」。
   - 想让读者动手，用 `<Exercise>` 思考题，不要在正文里写「试试看改改」。
3. **注意事项优先于原理。** 每页的价值排序是：能跑的代码 > 用错了会怎样 > 为什么这么设计。
4. **不做与 InvUI 的对比或迁移指引。** 不在任何页面提 InvUI。
5. **用词**：Sparrow UI 是「UI 库」，不要写成「库存 UI 库」。说到容器时用「容器」或「库存」，不要把两个词叠起来当定语。

### 2.2 代码示例

- 每个 H2 至少要有一段可以直接粘贴运行的 Java 代码，这是硬要求。
- 代码风格照抄库仓库 `example` 模块：用 Paper 最新数据组件 API（`ItemStack#setData`、`DataComponentTypes`），**不用 `ItemMeta`**。
- 菜单构建**一律**用 `Pane.builder("行", "行", "行")` + `addIngredient` 的符号结构绑定写法。
- `setItem` / `setElement` / `fill*` / `SlotSequence` / `SlotPattern` / `project` 这些直接操作 Element 与 slot 的 API，只出现在 `pane/programmatic` 一页，且该页页首要写明「优先用结构绑定」。其它页面不得用这些写法做示例。
- 物品文本的颜色与排版约定见库仓库 `docs/EXAMPLE 模块开发规范.md` 的「物品文本与菜单排版」一节，文档示例沿用同一套约定。

### 2.3 页面结构

每页固定这个骨架：

```
（一句话：这页能让你做到什么）

## H2 小节
（说明 + 代码 + 必要的 admonition）

## 下一步
（<NextStep> 组件，指向下一页）
```

- 注意事项用 `:::warning`，经验提示用 `:::tip`，背景信息用 `:::info`。不要把警告混在正文段落里。
- 第 2~8 组的页面在结尾额外放一个 `<SignalHint>`，指向第 9 组。这些页面的**正文里不得出现 `dependsOn` 或接受 Signal 的 `addIngredient` 重载**——那是第 9 组的内容。

### 2.4 MDX 写法（踩过的坑，照抄即可）

这几条都是实际写 1.1 时撞出来的，不照做页面会静默渲染成错的样子：

1. **admonition 带标题必须写成 `:::warning[标题]`**，方括号不能省。
   空格写法 `:::warning 标题` 是 Docusaurus v2 的语法，在 v3 下整块会退化成纯文本原样显示，**构建不会报错**。不带标题的 `:::warning` 单独一行没问题。
2. **站内链接一律用绝对路径**，例如 `[窗口类型](/window/types)`、`<NextStep to="/getting-started/quick-start" />`。
   文档的 `routeBasePath` 是 `/`，而中文站的 baseUrl 是 `/sparrow-ui-wiki/zh-Hans/`。相对路径会因为当前页有没有尾斜杠而解析出两种结果，`slug: /` 的首页上尤其容易错。
3. **新加 emoji 前先确认字体里有这个字**。站点用 `src/fonts/seguiemj.woff2`（Segoe UI Emoji 子集），较新的 emoji 可能缺字，缺了会显示成方框且不报任何错。
   已知缺字：`🪟`。侧边栏「窗口 Window」因此用的是 `🖼`。
4. **admonition 只在文档树里生效。** `docs/` 与 `i18n/` 下一切正常；`src/pages` 下的 MDX 不走 admonition 插件，`:::warning` 会原样显示。组件预览页因此也放在文档树里，而不是 `src/pages`。

### 2.5 两遍教学（这是全站最重要的结构决定）

第 2~8 组用**静态写法**把菜单的每个零件讲完整，第 9 组 Signal 再统一把它们点亮。

这意味着：

- `item/render` 讲 `setItemProvider`、`updatePeriodically`，但不讲 `dependsOn`
- `pane/ingredients` 的对照表里**列出** Signal / Page / Scroll / Tab 这几种 ingredient，但只给一句话和跳转链接，不展开
- `pagination/page` 用「固定箭头按钮 + `page.advance(±1)`」讲完一个可用的翻页菜单；「首页末页时按钮变灰」需要读 `page()` / `count()` 这两个 Signal，明确留到 `signal/bind-ui`
- `signal/bind-ui` 是接缝页，负责回到前面每一章说明怎么接上

接手单页时请确认自己在哪一遍，不要越界。

---

## 3. 库的事实来源

**不要凭记忆写 API。** 每个 API 的签名、参数、行为都以库仓库源码为准。

| 主题 | 源码位置（相对库仓库） |
|---|---|
| 入口与全局 | `core/src/main/java/net/momirealms/sparrow/ui/`：`SparrowUI`、`Bindings`、`Observer`、`Subscription` |
| 物品 | `.../ui/item/`、`.../ui/item/click/`、`.../ui/item/guard/`、`.../ui/item/provider/` |
| 面板 | `.../ui/pane/`（`Pane`、`AbstractPaneBuilder`、`Structure`、`Element`、`SlotSequence`、`SlotPattern`、`SlotProjection`） |
| 翻页滚动标签 | `.../ui/pane/page/`（`Page`、`Scroll`、`Tab`） |
| 窗口 | `.../ui/window/`、`.../ui/window/click/`、`.../ui/window/handle/`、`.../ui/window/map/` |
| 响应式状态 | `.../ui/state/`（`Signal`、`Signals`、`MutableSignal`、`ListSignal`、`PlayerKeyedSignal` 等 39 个文件） |
| 容器 | `.../ui/inventory/`、`.../inventory/storage/`、`.../inventory/event/`、`.../inventory/transaction/`、`.../inventory/operation/`、`.../inventory/click/` |
| 视觉与动画 | `.../ui/visual/`、`.../ui/visual/animation/` |
| 网络 | `.../ui/network/`、`.../network/packet/`、`.../network/listener/` |
| 异常 | `.../ui/exception/` |

另外两份文档是行为约定的权威来源，写「注意事项」时必须查：

- 库仓库 `docs/CORE 模块项目约定.md` — 线程归属、默认 lower 的责任边界、两层订阅的寿命语义、GC 要求
- 库仓库 `docs/EXAMPLE 模块开发规范.md` — 示例代码与物品文本的排版约定

> 注意：库仓库的 `docs/` 目录不被 git 跟踪（见《CORE 模块项目约定》第 9 条），接手的机器上可能没有。没有时以源码注释为准。

### 可直接改写成文档示例的现成代码

库仓库 `example/src/main/java/net/momirealms/sparrow/ui/example/menu/` 下有 9 个生产级示例，正文示例优先从这里裁剪，不要另起炉灶：

| 目录 | 演示了什么 | 主要服务于 |
|---|---|---|
| `livesearch` | 铁砧输入框 + debounce + Page 分页 | 4.3、5.1、9.3、9.4 |
| `skilltree` | TREE 会话、多级菜单 | 8.1、8.2 |
| `anvilprompt` | 铁砧文本输入 | 4.3 |
| `cartographygallery` | 制图台地图渲染 | 4.3 |
| `customframes` | 自定义帧动画 | 7.2 |
| `animationpresets` | 内置动画预设 | 7.2 |
| `stoneappraisal` | 异步渲染 + 占位物 | 2.2 |
| `shulkerboxedit` | 引用外部容器 | 6.3 |
| `mountinventory` | 坐骑容器 | 6.3 |

---

## 4. 元素组件需求表

文档站要用到的展示组件在这里统一定义。**通用组件必须在正文开工前全部做完**，做完后建一个临时展示页把它们全放上去自查；客制化组件在对应章节执行时一起做。

### 4.1 通用组件（已完成）

全部组件已在 `src/theme/MDXComponents.js` 全局注册，**mdx 里直接写标签即可，不需要 import**。
新增通用组件时记得同步加进那个文件，并更新下表。

| 组件 | 用途 | 出现位置 | 主要 props | 状态 |
|---|---|---|---|---|
| `<BuildTabs>` | Gradle Kotlin / Gradle Groovy / Maven 三选一，同 `groupId` 下全站同步 | 1.1 | `kotlin` `groovy` `maven` `title` `groupId` | ✅ |
| `<ApiTable>` | 方法签名 + 说明 + 线程 + 版本的统一表格，每行自动带锚点 | 几乎每页 | `rows=[{name, summary, thread, since, beta, id}]` `idPrefix` | ✅ |
| `<MinecraftSlotGrid>` | Minecraft 容器风格的结构网格，支持标志符和物品贴图，图例在宽版面中位于容器右侧，窄版面中移到下方 | 菜单布局与分步示例 | `rows` `legend` `empty` `icons` `showSlots` `caption` `title` `scale` | ✅ |
| `<MinecraftWindow>` | 用**原版 GUI 贴图 + 原版物品图标**模拟一扇打开的容器，悬停显示跟随鼠标的 Minecraft 样式 Tooltip | 展示"玩家最终看到什么" | `type` `rows` `title` `layout` `items={{标志符: {icon, name, nameColor, lore}}}` `scale`（默认 2）`playerInventory`（默认 false） | ✅ |
| `<CodeSteps>` | 分步走读同一份代码：代码整份只出现一次，切步骤时移动高亮 | 1.2，以及任何"一个完整文件分段讲"的地方 | `code` `language` `title` `steps=[{title, lines, note, preview}]` | ✅ |
| `<Exercise>` | 三段式思考题：需求常驻，实现思路与参考实现默认收起 | 讲完一个功能之后 | `title`，children 里用 `<ExerciseApproach>` / `<ExerciseAnswer>` 分段，两个都可选 | ✅ |
| `<ThreadBadge>` | 行内徽章，标注调用必须在哪条线程 | 4.x 6.x 9.4 10.1 | `type="viewer\|any\|async\|main"`、children 可覆盖文案 | ✅ |
| `<VersionBadge>` | 标注 API 最低版本 / Beta 期变动风险 | 全站零散 | `since` `beta` | ✅ |
| `<NextStep>` | 每页结尾统一的「下一步 →」卡片 | 每页 | `to` `title` `description` `label` | ✅ |
| `<SignalHint>` | 静态章节末尾指向 Signal 章的统一卡片 | 2~8 组每页 | `to` `linkText`、children 为正文 | ✅ |
| `src/theme/MDXComponents.js` | 全局注册，免去逐页 import | — | — | ✅ |
| `<Details>` | 折叠「一般不需要」的内容 | 3.4 等 | `summary` `defaultOpen` `previewHeight` | 复用 |
| `<UrlCard>` / `<EmbedCard>` / `<Highlight>` | 外链卡片与行内强调 | 零散 | 见组件源码 | 复用 |
| 代码块 | Java 示例高亮 | 全站 | Prism 已配 `java`/`kotlin`/`groovy`/`yaml` | 复用 |

几条约定：

- `<MinecraftSlotGrid>` 的模板解析与 `Structure.of(String...)` **完全一致**：一个 Unicode code point 占一格，反引号包起来的文本算一个多字符标志符，反引号内可用 `\`` 和 `\\` 转义。模板写错会就地渲染成红色错误框，不会静默画出一块错的网格。
- `<MinecraftSlotGrid>` 默认把 `#` 当留空位（保留标志符，不参与配色；指定 `icons` 时显示物品贴图）。需要让 `#` 参与配色时传 `empty={[]}`。
- 组件里的固定文案走 `translate()`，英文默认值写在组件里，中文写在 `i18n/zh-Hans/code.json`。**新增带文案的组件时两边都要加。**
- 写动画组件时有两个坑，做第 4.2 节那些客制化组件前先看一眼 `BuildTabs` 里的注释：
  - 需要裁剪动画溢出时用 `overflow: clip`，**不要用 `overflow: hidden`**。hidden 会让元素建立 BFC，内部的外边距不再穿透折叠，容器高度凭空变化、后面的正文被推走；动画前后来回切 hidden 就会看到"行距先变宽、结束再弹回来"。clip 只裁绘制，布局与 `visible` 完全一致。
  - 不要用 JS 往 prism 生成的 `.token-line` 上写自定义属性，React 重渲染会把它们抹掉。这类逐元素延迟用 CSS `nth-child` 写。
- 结构模板的解析在 `src/utils/parseStructure.js`，`<MinecraftWindow>` 与 `<MinecraftSlotGrid>` 共用。这段规则必须跟着库里的 `Structure.of(String...)` 走，**不要在组件里再写一份**。
- 两个容器组件分工不要搞混：**`<MinecraftSlotGrid>` 讲布局**（默认显示标志符，也可用 `icons` 展示已配置的物品），**`<MinecraftWindow>` 讲成品**（每格显示真实物品）。讲同一个菜单时两个都给，先布局后成品。
- 像素字体走 `--mc-font`：**Minecraft**（拉丁，Hypixel SkyBlock Wiki Team，CC BY-SA 4.0）+ **Unifont**（CJK，OFL 1.1 与 GPL+嵌入例外双许可，本站按 OFL 用，按文档里实际出现的汉字生成子集）。字体来源和许可证在 `src/fonts/` 下。
  - Unifont 子集由 `scripts/subset-font.mjs` 在每次构建前自动重算，**新加的汉字会自动进子集**，不需要手动维护。源字体 `src/fonts/unifont.full.otf` 要保留，删了就没法再生成子集。
  - Minecraft 自己的 CJK 就是 Unifont 渲染的，所以容器里的中文和游戏里长得一样。
- `<MinecraftWindow>` 的窗口类型、切片与槽位坐标在 `src/components/mcWindows.js`，目前有 `chest`（行数可变）、`crafting`、`anvil`、`hopper`。**加新窗口类型只要照着贴图量一遍坐标填进那张表，不用动组件。**
  - 窗口本体按原版 blit 的口径**分段贴**：箱子的下半段固定取自图集 `src y=126` 起的 96px。只画上半段的话**窗口没有底边**，看起来像被削掉一截。
  - Tooltip 使用 CSS 绘制深色底、紫色细边框与文字阴影，通过 Portal 挂到页面上，按浏览器视口避让，不受容器滚动区域裁切。
  - 组件里的物品 `<img>` 都带 `no-zoom` 类，`docusaurus.config.ts` 的 image-zoom 选择器已改成 `.markdown img:not(.no-zoom)`——否则点按钮会弹出图片预览。**以后新增界面类组件里的 `<img>` 记得也加这个类。**
  - 容器只展示外观和悬停说明，不模拟点击动作，也不显示点击提示条。
  - 两个组件的尺寸是对齐的：`<MinecraftSlotGrid>` 默认倍数下槽位步长 36px，`<MinecraftWindow>` 默认 `scale={2}` 也是 36px，两者外框都是 352px 宽。**改其中一个的默认倍数就会错位。**
- GUI 与物品贴图取自原版客户端（`PatchedMinecraft/Client-1.21.8/assets/minecraft/textures/`），存在 `static/img/mc/`。用到新物品时从那里按需再拷，不要整包搬。
- 预览页是 `components-preview`，挂在两个 sidebar 的**根层级最后一项**，方便随时打开提改进意见。它是临时页：**全部正文收口之后**才删——删的时候要同时删掉 `docs/components-preview.mdx`、`i18n/zh-Hans/.../components-preview.mdx`，并从两个 sidebar 里摘掉那一项。

`src/components/` 下还有一批从 craft-engine-wiki 继承来的组件（`AnnotatedYaml`、`ClickableYamlFragment`、`OverallYamlConfig`、`PluginFileTree`、`LayeredSteps`、`SkriptCard` 等）。Sparrow UI 不写 YAML 配置，这些大概率用不上，**不要为了复用而硬套**。（继承来的 `LayeredSteps` 评估过，和 `<CodeSteps>` 的思路不一样，没有复用。）

### 4.2 客制化组件（跟随章节执行）

| 组件 | 章节 | 要做到什么 |
|---|---|---|
| 核心概念层级交互图 | 1.3 | 可交互：点 Window / Pane / Element / Item / Inventory 任一层，高亮它在层级中的位置、显示职责一句话、给出跳转链接。这是 1.3 的主体，不是配图 |
| ~~快速开始分步演示~~ ✅ 做成了 `<CodeSteps>` | 1.2 | 已完成，并已提升为通用组件登记在 4.1。代码整份只出现一次，切步骤时移动高亮；`preview` 接任意 ReactNode，1.2 里接的是 `<MinecraftSlotGrid>` |
| 窗口类型筛选卡片 | 4.3 | 17 种窗口的可筛选卡片（按有无特有 API / 容器尺寸 / 是否支持配方书） |
| 视觉层叠加演示 | 7.1 | 四层开关（Inventory / Pane / Window / Cursor），看最终渲染怎么叠出来 |
| 动画预览 | 7.2 | `frames` / `reveal` / `staggeredFrames` 的播放效果预览 |
| 三种会话结构演示 | 8.2 | 点「进入 / 返回」，看 STACK、RETAINED_STACK、TREE 三种结构各自怎么变化、谁被保留 |
| Signal 数据流演示 | 9.1 / 9.3 | 可交互：改动源 Signal，看派生节点依次亮起，直观表达「谁依赖谁」 |

---

## 5. 逐页大纲

下表的「路径」同时是 `docs/` 与 `i18n/zh-Hans/.../current/` 下的相对路径（省略 `.mdx`）。

根文档 `intro` 位于侧栏首项，不归入「入门」：介绍 Sparrow UI 的定位、能力与 Beta 状态，并引导到安装页。

### 5.1 入门（3 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 1.1 | `getting-started/installation` | 兼容性；Gradle / Maven 依赖；必须配置的 Shadow / Shade relocate；`SparrowUI.getInstance().setUp(plugin)` 初始化与生命周期要求。 |
| 1.2 | `getting-started/quick-start` | 一个完整、能直接跑的菜单，配分步演示组件。从空插件到玩家看见菜单为止，每一步都给代码 |
| 1.3 | `getting-started/concepts` | 核心组件与层级关系：`Window ← Pane ← Element(Item / 子 Pane / Inventory)`，Signal 横穿、Visual 叠加、Session 串联。主体是交互式层级图，配每个概念 2~3 句 + 一行代码。术语表放 `appendix/glossary`，这页只做概念图 |

### 5.2 物品 Item（3 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 2.1 | `item/create` | `Item.simple(ItemStack)`、`Item.simple(ItemProvider)`、`Item.builder()`、`setItemProviderConstant`、`Item.empty()` |
| 2.2 | `item/render` | `setItemProvider(RenderContext → ItemStack)`；`RenderContext` 能拿到什么（`player()`、`windowSlot`、`remember`）；`setItemProviderAsync` + 占位物（数据库来源菜单，参考 `stoneappraisal`）；`updatePeriodically`；`updateOnClick`。⚠️ 同步 Provider 不要阻塞 IO，异步 Provider 不要读 Bukkit 状态 |
| 2.3 | `item/click` | `addClickHandler` 与 `ItemClick` 的内容；`addDragHandler`；`addBundleSelectHandler`；`ItemGuards.permission` / `gameMode` / `throttle`；自定义 `ItemGuard`；`onRejected` 反馈。⚠️ handler 跑在哪个线程、里面能做什么 |

### 5.3 面板 Pane（4 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 3.1 | `pane/structure` | `Pane.builder("行","行","行")` 字符模板；单字符与多字符 identifier；`#` 空位约定；`PaneSize` 与 slot / xy 坐标；`Structure.of(size)`。用 `<MinecraftSlotGrid>` 把结构串画出来 |
| 3.2 | `pane/ingredients` | **`addIngredient` 全形态对照表**：`Item`、`ItemStack`、`ItemProvider`、`ItemBuilder`、`Supplier`、`Element`、`ElementSupplier`、`SparrowInventory`、子 `Pane`。`Signal` / `Page` / `Scroll` / `Tab` 在表里列出但只给一句话 + 跳转 |
| 3.3 | `pane/composition` | `setBackground`、`setFrozen`；嵌套 Pane 与 `offsetX/offsetY`；同一个 Pane 给多扇窗、多名玩家复用 |
| 3.4 | `pane/programmatic` | **页首写明「优先用 3.2 的结构绑定，这页是程序化批量布局时的下策」**。`setItem`、`setElement`、`fill` / `fillRow` / `fillColumn` / `fillBorders` / `fillRectangle`、`SlotSequence`、`SlotPatterns`、`project` |

### 5.4 窗口 Window（4 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 4.1 | `window/lifecycle` | `Window.builder(pane)`、`build(viewer)`、`open()` 返回的 `CompletableFuture<OpenResult>`、`close()`；open / close handler；`WindowCloseReason`；`setCloseable`；`WindowManager.current` / `windows`；**异步构建 + 自动切回实体线程打开的标准写法**（照 `livesearch` 的 `Scheduling.async(...).thenCompose` 模式） |
| 4.2 | `window/layout` | `Window.builder` / `splitBuilder` / `mergedBuilder` 三者的区别与图解；upper 与 lower 区域；默认 lower（玩家背包）是什么、能不能改、改了会怎样（见《CORE 模块项目约定》第一节） |
| 4.3 | `window/types` | 17 种原版容器窗口全部收在这一页。页首一张总览表（窗口 × 特有能力 × Builder 类），然后按 H2 分类：<br>· 基础容器：箱子各尺寸、漏斗、发射器、投掷器<br>· 无特有 API 的工作台：砂轮、锻造台<br>· 带进度条：三种熔炉、酿造台（`setCookProgress` / `setFuelProgress` / `setBrewProgress`）<br>· 带原生输入：铁砧（`addRenameHandler`、`setTextFieldAlwaysEnabled`、`setResultAlwaysValid`、`setEnchantmentCost`）、切石机（`setSelectedRecipeIndex`）、附魔台（`setOption`、`setEnchantmentSeed`、选择事件）<br>· 带原生列表：村民交易（`setTrades`、`setLevel`、`setProgress`、`setRestockMessageEnabled`、选择事件）、配方书（`sendGhostRecipe`、选择事件）、合成器（`setSlotDisabled`、切换事件）<br>· 制图台与地图：`applyPatch`、`setIcons`、`setView`、`resetMap`<br>**不要拆成多页。** |
| 4.4 | `window/title-data` | `setTitle` / `setTitleSupplier`；`setData` 与 `data(Class)`；`setWindowState` 与 `addWindowStateChangeHandler`；`addOutsideClickHandler` |

### 5.5 翻页与滚动（2 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 5.1 | `pagination/page` | `Page.of(List, pageSize)`；`addIngredient('M', page, toElement)`；`advance` / `setPage` / `refresh` / `prefetch`；动态页大小 `IntUnaryOperator`。**用固定箭头按钮 + `advance(±1)` 讲完一个完整可用的翻页菜单。** 明确留一条：按钮要在首页末页变灰需要读 `page()` / `count()`，见 9.6 |
| 5.2 | `pagination/scroll-tab` | `Scroll.vertical` / `horizontal`、`advance`、`setLine`；`Tab.of` / `Tab.lazy` / `select`。同样只用静态数据源 |

### 5.6 容器与物品流动（4 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 6.1 | `inventory/basics` | `SparrowInventory` 不是 Bukkit `Inventory`；`addIngredient('#', inventory)`；`linkInventory`；背景物品；`frozen`；`operationPriority` 与 `includeObscuredSlots` |
| 6.2 | `inventory/virtual` | `new VirtualInventory(size)` / `(ItemStack[])`；`setMaxStackSize` / `setMaxStackSizes`；`setIterationOrder` / `reverseIterationOrder`；`serialize` / `deserialize` 持久化；放入取出、拖拽、Shift 转移、数字键交换开箱即用 |
| 6.3 | `inventory/referencing` | `fromContents` / `fromStorageContents` / `fromPlayerStorageContents` / `of(ExternalStorage)`；自定义 `ExternalStorage`；内置 `PlayerContainerStorage` / `BlockAnchor` / `HorseContainerStorage` / `MountContainerStorage` / `SplicedStorage`；`refresh` / `retire`。⚠️ **本页 warning 最重**：被引用容器的线程安全完全由调用方负责，Sparrow 不判断平台、不自动调度、不提供只读回退，平台异常原样抛出且不承诺零变更（《CORE 模块项目约定》第一节第 4~5 条） |
| 6.4 | `inventory/rules-events` | `AccessRule` 全局与槽级（**只读契约**：规则内不得修改库存或产生副作用，可能被重复调用）；`subscribeClick` / `subscribePreUpdate` / `subscribePostUpdate`；`UpdateReason` 与 `PlayerUpdateReason`；在 `InventoryPreUpdateEvent` 里改写 `setAfter` 或取消；`fireBukkitInventoryEvents` 与 Bukkit 事件共存 |

### 5.7 视觉与动画（2 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 7.1 | `visual/layers` | 四层（Inventory / Pane / Window / Cursor）与可见范围：设在 Inventory 或 Pane 上所有观察者都看得到，设在 Window 上只影响当前玩家；`setVisualizerItem` / `setVisualizerProvider`（整体与逐槽）；**视觉层不改真实库存内容**，这是本页要反复强调的心智模型 |
| 7.2 | `visual/animation` | `AnimationDefinition.frames` / `loop` / `reveal` / `staggeredFrames` / `of(FrameFunction)`；用 `SlotSequence` + `SlotPattern` 选槽位与播放顺序；`play` 返回的 `AnimationHandle`、`finishAnimations`；`playTitleAnimation` 与 `TitleAnimationDefinition`；多动画叠加 |

### 5.8 会话与导航（2 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 8.1 | `session/navigation` | 为什么需要会话；`navigate(Window)` / `navigate(Builder)` / `navigate(CompletionStage)`；`back` / `backOrClose`；`setBackOnPlayerClose`（ESC 返回）；`addSessionEndHandler`；用 `setData` 在窗口间传上下文 |
| 8.2 | `session/structures` | `WindowSession.Kind` 三种结构的选择对照表：`STACK`（不查重、弹出即丢引用）、`RETAINED_STACK`（结构同栈，弹出的窗保留到会话结束）、`TREE`（查重、走过的窗全部保留、`back` 回父节点）。重点讲各自保不保留页码与滚动位置、什么场景选哪个。源码里 `WindowSession.Kind` 的注释已经写得很清楚，直接翻译整理 |

### 5.9 响应式 Signal（7 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 9.1 | `signal/why` | **全章的钩子，写得好坏决定用户会不会继续读。** 三个场景开局：① 一扇菜单多人同时看着，后台数据变了 ② 一个按钮的外观取决于另外三个状态 ③ 数据在数据库里，异步取回来时玩家可能已经关了菜单。然后**并排对比**：不用 Signal 会写成什么样（手动刷新 / 全量重建 / 自己开定时器）vs 用 Signal 写成什么样。最后给一句话定义和心智模型（谁是数据源、谁是派生、谁是消费者）。配 Signal 数据流演示组件 |
| 9.2 | `signal/basics` | `Signal.of` / `get` / `set` / `update`；`map` / `mapDistinct` 与 `sameValue`（防无意义刷新）；`onDirty` + `Subscription` |
| 9.3 | `signal/derive` | `Signals.combine`（二元与三元）、`switching`、`merging`；`MutableSignal.lens`；`debounce` / `debounceMillis` / `throttle` / `throttleMillis`（搜索框场景，参考 `livesearch`）；`Signals.ticking` / `everyTicks` / `everyMillis`（倒计时、冷却场景） |
| 9.4 | `signal/async` | `Signal.async`、`polling` / `pollingMillis`；Executor 该传什么；占位值与过期结果丢弃；**没有观察者时轮询自动停止**（这条要突出，是重要保证）。⚠️ loader 里不要碰 Bukkit |
| 9.5 | `signal/collections` | `ListSignal` / `SetSignal` / `MapSignal`（`wrap`、`of`、`batch`、`beforeAdd`、`afterRemove`）；`KeyedSignal`；`PlayerKeyedSignal`（`of` / `async` / `polling` / `at` / `remove`）；什么时候用分区状态而不是「每个玩家建一个 Signal」 |
| 9.6 | `signal/bind-ui` | **接缝页，把前 8 组全部点亮。** 至少覆盖：`Item.builder().dependsOn(Signal...)` / `dependsOn(PlayerKeyedSignal)` / `dependsOn(KeyedSignal, keyOf)`；`Pane` 的 `addIngredient(identifier, Signal<List<T>>, toElement, executor)`；`Page.of(Signal)` / `Page.of(ListSignal)` / `Page.async` / `Page.of(KeyedSignal, pageCount)`；`Scroll.vertical(ListSignal, ...)`；`Tab` 与 Signal；`AbstractVisual.bind(Signal)`；`Window.setTitleSupplier` 做动态标题。回头补上 5.1 留的「按钮变灰」 |
| 9.7 | `signal/practices` | Signal 回调里不要写副作用；不要强引用 `Player`；`Bindings` 批量管理与 `suspendAll` / `resumeAll`；**把 Signal 用在 UI 之外**——让业务层直接暴露 Signal，菜单只负责消费，这是本库把响应式 API 开放出来的本意，要写足。订阅寿命的完整说明在 10.3，本页链接过去即可，不要重复 |

### 5.10 进阶（5 页）

这一组的定位是「加深对库的理解」，不是排错手册。

| 节 | 路径 | 内容 |
|---|---|---|
| 10.1 | `advanced/threading` | Paper 与 Folia 下谁拥有哪条线程；哪些调用必须在 viewer 实体线程、哪些可以在任意线程；异步构建菜单的完整范式；共享组件与虚拟容器允许的并发访问边界 |
| 10.2 | `advanced/sharing` | 同一个 Item / Pane / Inventory 服务多扇 Window、多名玩家；组件变化后所有观察者收到通知、每扇窗只刷新受影响槽位；什么状态能放进共享组件、什么不能（尤其是不要在 Provider 里缓存玩家状态） |
| 10.3 | `advanced/lifecycle` | 两套订阅的寿命语义**正好相反**（见《CORE 模块项目约定》「两层订阅的寿命语义相反」一节），但**只写用户视角**：哪些漏关会自愈、哪些必须 `close()`、关窗时库替你关掉了什么；UI 对象必须能在不显式关闭的情况下被完整 GC，不要持有 `Player` |
| 10.4 | `advanced/transaction` | 一次点击会被整理成一笔完整事务，要么全写要么不写；`TransactionResult` 怎么读；跨容器 Shift 转移；事件取消或并发冲突时用户会观察到什么。**不讲锁序和版本校验的实现** |
| 10.5 | `advanced/troubleshooting` | `setExceptionHandler`、`warningsEnabled` / `setWarningHandler`；常见异常含义（`ViewerUnavailableException`、`InventoryDecodeException`）；`addDisableHandler` 与关服 |

### 5.11 网络 Network（2 页）

**页首必须固定一段 admonition**：这不属于 UI 库的职责，是顺带暴露出来的能力；只写 UI 的话整章可以跳过。

| 节 | 路径 | 内容 |
|---|---|---|
| 11.1 | `network/listen` | `NetworkManager.listenNMS` / `listenByteBuf`；`PacketType`、`ConnectionState`、`PacketFlow`；返回的 `Subscription` 怎么管 |
| 11.2 | `network/send-receive` | `NetworkUser` 的 `sendPacket` / `sendByteBuf` / `receivePacket` / `receiveByteBuf` 及各自的 `Silently` 变体；`PacketBuf` 写包；按玩家取 `NetworkUser`。⚠️ 跨版本风险、与其它数据包库共存 |

### 5.12 实战示例（页数待定）

| 节 | 路径 | 内容 |
|---|---|---|
| 12.1 | `examples/overview` | 先只做总览页。具体做哪几个示例**等前 11 组写完后再定**。候选：确认框、分页商店、铁砧实时搜索、技能树、数据库背包、编辑潜影盒、坐骑背包、自定义帧动画、制图台画廊、石头鉴定 |

**示例菜单的选题思路**：前面每一章讲完一个功能后，可以配一个**充分用上该功能**的示例菜单。第 12 组的清单优先从这些地方长出来，而不是另想一批需求。同理，章节里想让读者自己过一遍的地方用 `<Exercise>`，思考题的需求也可以从这些示例里裁。

### 5.13 附录（2 页）

| 节 | 路径 | 内容 |
|---|---|---|
| 13.1 | `appendix/faq` | 常见问题。前 11 组写完后回收各页反复出现的疑问，不要提前编 |
| 13.2 | `appendix/glossary` | 术语表：Pane、Element、Ingredient、Structure、identifier、Viewer、Observer、Signal、派生 Signal、Visual、Session、事务 |

---

## 6. 推荐执行顺序

1. ~~第 4.1 节的通用组件~~ — 已完成，预览页见 sidebar 最后一项「组件预览（临时）」，**全部正文收口后**才删
2. 1.1 → 1.2 → 1.3（1.3 的交互层级图跟着做）
3. 第 2 组 → 第 3 组 → 第 4 组（4.3 的窗口筛选卡片跟着做）
4. 第 5 组 → 第 6 组 → 第 7 组（视觉与动画的两个演示组件跟着做）→ 第 8 组（会话结构演示跟着做）
5. 第 9 组（Signal 数据流演示跟着做）——写 9.6 时回头检查第 2~8 组留的钩子是否都接上了
6. 第 10 组 → 第 11 组
7. 回收 13.1 FAQ、补 13.2 术语表
8. 最后定第 12 组的示例清单并写
9. 全部完成后再统一做英文翻译

单章节接手时，按这个顺序确认前置章节是否已完成；如果前置还没写，不要临时在自己这页补讲前置概念，改为留 TODO 并在交付时说明。

---

## 7. 交付检查清单

每完成一页，交付前逐条确认：

- [ ] 中文文件写在 `i18n/zh-Hans/docusaurus-plugin-content-docs/current/` 下，对应的 `docs/` 英文占位页仍在
- [ ] 每个 H2 都有可直接粘贴运行的 Java 代码
- [ ] 代码用 Paper 数据组件 API，没有 `ItemMeta`
- [ ] 菜单构建用 `Pane.builder` + `addIngredient`，没有裸 `setItem` / `setElement`（`pane/programmatic` 除外）
- [ ] 第 2~8 组的页面正文里没有出现 `dependsOn` 或 Signal 版 `addIngredient`
- [ ] 注意事项用了 `:::warning`，没有混在正文段落
- [ ] 页面结尾有 `<NextStep>`；第 2~8 组还有 `<SignalHint>`
- [ ] 全文没有提到 InvUI
- [ ] 所有 API 签名对着源码核过，不是凭记忆写的
- [ ] `npm run build` 通过

---

## 8. 未决事项

| 事项 | 状态 |
|---|---|
| 第 12 组具体做哪几个实战示例 | 等前 11 组完成后定 |
| 英文翻译的启动时机 | 中文全部完成后 |
| 是否需要 API 速查页（独立于 Javadoc） | 未讨论 |
| 示例菜单要不要配 GIF / 截图 | 未讨论。库仓库 `assets/readme/` 下已有 5 个 GIF 可直接用 |

---

## 9. 建议启用的 Skill

接手章节的 Agent 建议按需启用：

- `coding-standards` — 写示例 Java 代码时，保证与库仓库的代码风格一致
- `java-comment-style` — 示例代码里的中文注释格式
- `codebase-onboarding` — 首次接触 `sparrow-ui` 库仓库、需要先建立整体认识时
- `zoom-out` — 某个 API 看不懂它在系统里的位置时
- `humanizer` — 正文写完后去掉 AI 腔，文档是给人读的
- `artifact-design` / `artifact-diagramming` — 设计第 4.2 节那些客制化交互组件前

不建议启用 `project-walkthrough` 和 `old-code`：文档的目标是教用法，不是带读者重建这个库。
