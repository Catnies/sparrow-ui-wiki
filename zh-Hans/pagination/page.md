# 翻页 Page

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pagination/page>

商品太多，一页放不下时，可以用 `Page` 分页显示。给它一份列表和每页的数量，就能通过按钮切换上一页、下一页。
Page 管理页码和每页的数据，Pane 决定这些内容放在哪些格子。两者通过 `addIngredient` 关联后，翻页时会自动更新格子里的物品。

## 创建分页菜单

下面把 12 组钻石按每页 9 组显示，上面一行放内容，下面一行的两端放翻页按钮。每组钻石的数量对应它在列表中的序号，方便区分两页。

```text title="钻石目录"
MMMMMMMMM
P#######N
```

- `M`：当前页内容（`diamond`）
- `P`：上一页（`arrow`）
- `N`：下一页（`arrow`）

预览为第一页，第二页显示数量为 10、11、12 的三组钻石。

```java
// 准备 12 组钻石, 数量从 1 到 12, 用来区分列表中的各项
List<Item> items = IntStream.rangeClosed(1, 12)
        .mapToObj(amount -> Item.simple(new ItemStack(Material.DIAMOND, amount)))
        .toList();
// 每页放 9 组, 对应下面模板中的 9 个 M
Page<Item> page = Page.of(items, 9);

ItemStack previousArrow = new ItemStack(Material.ARROW);
previousArrow.setData(DataComponentTypes.CUSTOM_NAME,
        Component.text("上一页", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));
ItemStack nextArrow = new ItemStack(Material.ARROW);
nextArrow.setData(DataComponentTypes.CUSTOM_NAME,
        Component.text("下一页", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));

// M 随页码更新, P 和 N 始终留在底部两端
Pane pane = Pane.builder("MMMMMMMMM", "P#######N")
        .addIngredient('M', page)
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(previousArrow)
                // 负数向前翻, 在第一页点击时仍停在第一页
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(nextArrow)
                // 翻页后, M 对应的格子会自动换成新一页的内容
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("钻石目录").open(viewer);
```

`Page.of(items, 9)` 将列表按顺序分组。`addIngredient('M', page)` 把当前页依次填入 M 标记的格子，顺序与字符模板一致，从左到右、从上到下。第二页只有三条内容，其余六格会清空，不会留下第一页的钻石。

> **注意：每页条数与格子数量**
>
> 每页条数必须为正数，并且要有足够的格子显示这一页。上例每页 9 条，对应 9 个 M。若只绑定 8 格，第 9 条不会显示，也不会顺延到下一页。

### 翻页和跳页

| 调用 | 操作 |
| - | - |
| `page.advance(1)` | 下一页 |
| `page.advance(-1)` | 上一页 |
| `page.setPage(0)` | 跳到第一页 |
| `page.setPage(1)` | 跳到第二页 |

页码从 0 开始。超出范围会停在最近的一端，所以第一页点击上一页、最后一页点击下一页都不会越界。空列表也按一页处理，只是不显示内容。

这里的箭头始终保持原样。若需要显示页码，或在首页、末页将按钮变灰，可以用 `page()` 和 `count()` 提供的 Signal，看 [翻页按钮与页码](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/page.md)。

### 列表修改与刷新

`Page.of(List, pageSize)` 会复制列表。创建后再向原列表添加、删除或替换元素，分页内容不会跟着变化；列表中的 Item 对象本身仍是同一份，修改 Item 的显示内容依然有效。

`refresh()` 只对下文的异步分页生效，不会重新读取传给 `Page.of` 的普通 List。需要让分页跟随列表的增删变化时，看 [翻页按钮与页码](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal-ui/page.md)。

## 从数据库懒加载数据

商品保存在数据库中时，通常只需要查询总页数和当前页的商品。
`Page.async(...)` 会按需异步查询，玩家翻到哪一页，就加载哪一页。

下面每页查询 9 条商品。`repository` 是插件自己的数据库访问对象，`findPage(offset, limit)` 返回指定范围的商品，`count()` 返回商品总数。示例使用 Paper 的异步调度器执行这两种查询。

```java
public void openCatalog(Player viewer, Plugin plugin, ProductRepository repository) {
    int pageSize = 9;
    Executor executor = task -> Bukkit.getAsyncScheduler().runNow(plugin, ignored -> task.run());

    Page<Product> page = Page.async(
            executor,
            // 页码从 0 开始, 第一页从第 0 条取 9 条, 第二页从第 9 条取
            index -> repository.findPage(index * pageSize, pageSize),
            // 这里返回总页数, 商品总数需要按每页数量向上取整
            () -> (repository.count() + pageSize - 1) / pageSize
    );

    Pane pane = Pane.builder("MMMMMMMMM", "P###R###N")
            .addIngredient('M', page, product -> {
                // 查询完成后, 用返回的商品数据创建展示物品
                ItemStack icon = new ItemStack(product.icon());
                icon.setData(DataComponentTypes.CUSTOM_NAME,
                        Component.text(product.name(), NamedTextColor.WHITE)
                                .decoration(TextDecoration.ITALIC, false));
                return Element.item(Item.simple(icon));
            })
            .addIngredient('P', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.ARROW))
                    .addClickHandler(click -> page.advance(-1))
                    .build())
            .addIngredient('N', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.ARROW))
                    .addClickHandler(click -> {
                        page.advance(1);
                        // 玩家阅读当前页时, 提前查询它的下一页
                        page.prefetch(1);
                    })
                    .build())
            .addIngredient('R', Item.builder()
                    .setItemProviderConstant(new ItemStack(Material.CLOCK))
                    // 中间的时钟重新查询当前页和总页数
                    .addClickHandler(click -> page.refresh())
                    .build())
            .build();

    Window.builder(pane).setTitle("商品目录").open(viewer);
}
```

**商品数据与数据库接口**

这里用接口表示已有的数据库查询方法，实现交给插件。分页查询应使用固定排序，例如按商品 ID 排序，让相邻页的顺序一致。

```java
record Product(String name, Material icon) {}

interface ProductRepository {
    /** 按固定顺序查询商品, offset 为起始位置, limit 为最多返回的条数. */
    List<Product> findPage(int offset, int limit);

    /** 查询商品总数, 查询条件与 findPage 保持一致. */
    int count();
}
```

创建 Page 时就会提交总页数查询，各页的商品则在首次读取时才查询。结果返回前，这一页暂时为空；查询完成后，Pane 自动显示商品。加载过的页会缓存下来，再翻回去会使用缓存。`Page.async` 的第三个参数是总页数，即使返回 0，Sparrow UI 也会按一页处理。

> **注意：查询在异步线程执行**
>
> 数据库访问对象需要支持异步调用，两种查询也可能同时执行。查询函数只返回商品数据，不要在里面读取玩家、世界或 Bukkit 容器状态。

### 预加载下一页

`page.prefetch(1)` 会提前加载当前页的下一页，当前页码保持不变。上例在点击下一页后调用它，玩家浏览这一页时，后面一页就可以开始查询。`prefetch(-1)` 则预加载上一页。

预加载同样使用异步 Executor，已经加载过的页不会重复查询。目标页超出范围时，按首页或末页处理。总页数尚未加载完成时暂按一页计算，此时调用 `prefetch(1)` 只能加载第一页。

### 重新查询当前页

数据库中的商品更新后，调用 `page.refresh()` 可以重新查询当前页和总页数。它不会刷新其他页的缓存，也不会把玩家送回第一页；如果总页数减少，超出范围的页码会回到最后一页。

## 把数据转换成物品

Page 的列表可以直接存商品等业务数据。给 `addIngredient` 传入转换函数后，Pane 会把当前页的数据转换成 `Element`，不需要提前为整个列表创建 Item。

下面按每页三种材料显示。传入的是 `Page<Material>`，转换函数为每种材料创建展示物品。

```java
// 列表里存材料类型, 显示当前页时再创建 Item
Page<Material> page = Page.of(List.of(
        Material.STONE, Material.OAK_LOG, Material.GLASS,
        Material.IRON_INGOT, Material.GOLD_INGOT, Material.DIAMOND
), 3);

Pane pane = Pane.builder("###MMM###", "P#######N")
        // 每条材料数据对应一个格子, 转换结果需要包装成 Element
        .addIngredient('M', page, material -> Element.item(Item.simple(new ItemStack(material))))
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("材料目录").open(viewer);
```

如果列表中已经是 Item，使用上一节的两参数写法就行，不需要再包一层转换函数。

> **注意：转换函数的线程**
>
> 初次转换在构建 Pane 的线程执行，后续翻页默认在异步线程转换。转换函数应只使用已经准备好的数据，不要在里面读取玩家、世界或 Bukkit 容器状态。物品的点击处理器仍在玩家线程执行。

## 进阶：不同页使用不同容量

`Page.of` 也接受 `IntUnaryOperator`，由页码决定这一页显示多少条。它收到的页码同样从 0 开始，返回值必须为正数。
例如第一页显示 3 条，其余页显示 6 条。内容仍然连续排列，不会因为页容量不同而跳过元素。

```java
List<Item> items = IntStream.rangeClosed(1, 12)
        .mapToObj(amount -> Item.simple(new ItemStack(Material.DIAMOND, amount)))
        .toList();
// 第 0 页放 3 条, 后面的页各放 6 条
IntUnaryOperator pageSizeOf = index -> index == 0 ? 3 : 6;
Page<Item> page = Page.of(items, pageSizeOf);

// 按最大页容量留 6 格, 条数不足的页会清空剩余格子
Pane pane = Pane.builder("#MMMMMM##", "P#######N")
        .addIngredient('M', page)
        .addIngredient('P', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(-1))
                .build())
        .addIngredient('N', Item.builder()
                .setItemProviderConstant(new ItemStack(Material.ARROW))
                .addClickHandler(click -> page.advance(1))
                .build())
        .build();

Window.builder(pane).setTitle("不同页容量").open(viewer);
```

这份列表分成三页，分别显示第 1～3、4～9、10～12 条。Pane 留出 6 个 M，能容纳最大的一页；第一页和最后一页只用前三格，其余格子为空。改变页容量不会改变 Pane 的形状，也不会自动居中。

`pageSizeOf` 会在计算页数和内容位置时多次调用，同一个页码应返回固定容量。若每页容量相同，直接传整数就行。

**下一步**：[滚动 Scroll](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/pagination/scroll.md) — 按行或按列移动内容，保留前后相邻的部分。
