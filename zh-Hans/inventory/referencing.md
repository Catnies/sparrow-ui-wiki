# 映射容器

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing>

`ReferencingInventory` 把箱子、玩家背包等已有的容器映射进菜单。菜单中的读取和写入都直接访问原容器，映射本身不另存一份物品。

## 映射 Bukkit 容器

下面用菜单打开一个木桶，玩家在菜单中存取的物品直接写进木桶：

```java
public static void openBarrel(Player viewer, Barrel barrel) {
    // 映射木桶的 27 格, 读写都直接落到木桶里
    ReferencingInventory contents = ReferencingInventory.fromContents(barrel.getInventory());

    Pane pane = Pane.builder(
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS"
            )
            .addIngredient('S', contents)
            .build();

    Window.builder(pane).setTitle("木桶").open(viewer);
}
```

这个方法一般在玩家右键木桶的事件处理器中调用，线程方面的要求看 [线程要求](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md#线程要求)。窗口下方默认显示玩家背包，玩家可以在木桶与背包之间 Shift 转移、双击收集。

创建映射有三种写法，区别在于映射容器的哪些格子：

| 方法 | 映射的格子 |
| - | - |
| `fromContents(inventory)` | 全部格子，与 `getContents()` 相同。玩家背包包括盔甲栏和副手 |
| `fromStorageContents(inventory)` | 只含存储格，与 `getStorageContents()` 相同。玩家背包为 36 格 |
| `fromPlayerStorageContents(playerInventory)` | 玩家背包的 36 格，重新排成主背包 27 格在前、快捷栏 9 格在后 |

Sparrow UI 会按容器的种类选择读写方式，下列容器可以直接映射：

| 被映射的容器 | 映射对应的对象 | 自动退役的时机 |
| - | - | - |
| 箱子、木桶、漏斗、熔炉等方块的容器 | 方块所在的位置，大箱子的两半各自对应自己的方块 | 方块被破坏，或所在区块卸载 |
| 运输矿车、运输船等实体的容器 | 这个实体 | 实体被移除或卸载 |
| 马、驴、羊驼等坐骑的背包 | 这只坐骑。第 0 格为鞍，第 1 格为护甲，之后是储物格 | 坐骑被移除或卸载 |
| 玩家背包 | 这名玩家，重生后仍对应这名玩家当前的背包 | 玩家离线 |
| `Bukkit.createInventory` 创建的容器 | 这个容器 | 不会自动退役 |

其他插件自己实现的 `Inventory` 通过 Bukkit 的 `getItem`、`setItem` 读写，不会自动退役。退役的含义看 [退役](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md#退役)。

同一个位置被映射多次时，例如大箱子和其中一半，Sparrow UI 会识别出这些映射指向同一格。一个窗口同时显示这两份映射时，Shift 转移和双击收集不会把同一格处理两次。

映射容器的每格上限来自被映射的容器，遍历顺序也由 Sparrow UI 决定，没有 `setMaxStackSize` 和 `setIterationOrder`。访问规则、背景、冻结、优先级和事件订阅的用法与虚拟容器相同。`referencedInventory()` 返回被映射的 Bukkit 容器，退役后返回 `null`。

### 玩家背包

`fromPlayerStorageContents` 把快捷栏排到最后，与窗口下方玩家物品栏的排列相同：主背包 3 行在上，快捷栏 1 行在下。下面在菜单上方显示另一名玩家的背包：

```java
public static void openBackpackOf(Player viewer, Player target) {
    // 主背包的 27 格在前, 快捷栏的 9 格在后
    ReferencingInventory backpack = ReferencingInventory.fromPlayerStorageContents(target.getInventory());

    Pane pane = Pane.builder(
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS",
                    "SSSSSSSSS"
            )
            .addIngredient('S', backpack)
            .build();

    Window.builder(pane).setTitle(target.getName() + " 的背包").open(viewer);
}
```

前 3 行是 `target` 的主背包，第 4 行是快捷栏。`target` 离线后映射退役，这 36 格变为空格。

物品通过 Shift 转入这个映射时，和原版一样按反向顺序放入：从快捷栏的最后一格开始，经过快捷栏，再到主背包。窗口默认的下部 Pane 也是这样映射查看者自己的背包，可以用 `window.defaultLowerInventory()` 取得，看 [窗口布局](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/window/layout.md)。

> **注意：Folia 上不能这样映射其他玩家**
>
> 查看者和 `target` 在 Folia 上由不同的线程管理，窗口在查看者的线程上读写 `target` 的背包，不满足 [线程要求](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md#线程要求)。上例只适用于 Paper。

## 线程要求

映射容器不会替你切换线程。`refresh()`、读取和写入都会直接访问被映射的容器，必须在这个容器所属的线程调用：

- Paper：服务器主线程
- Folia：方块容器所在区域的线程；实体、坐骑和玩家背包所属实体的线程

创建映射不受这条限制，可以在异步任务中和菜单一起构建。创建时会读取一次容器内容，Paper 和 Folia 目前都允许这样的异步读取，窗口打开后也会在查看者的线程上重新同步。不过，部分 Fork 服务端会给某些方法加上访问检查，请以实际运行环境为准。

窗口在查看者的线程上刷新和写入它显示的映射容器。Paper 上这就是主线程，不需要额外处理。Folia 上，只有查看者与被映射的容器属于同一个区域时才安全：玩家自己的背包始终满足；映射身边的箱子时，玩家走远后可能进入另一个区域。

在异步任务或其他线程中读写映射容器时，先调度到所属的线程：

```java
// 映射木桶的容器, 在木桶所在区域的线程读写
Bukkit.getRegionScheduler().run(plugin, barrel.getLocation(), task -> contents.add(reward));

// 映射玩家背包的容器, 在这名玩家的线程读写
target.getScheduler().run(plugin, task -> backpack.add(reward), null);
```

两个调度器在 Paper 上都会回到主线程执行，同一份代码可以同时用于 Paper 和 Folia。

> **注意：线程安全由调用方负责**
>
> Sparrow UI 不检查当前线程，在错误的线程访问时，服务端抛出的异常原样传出，不会转换成事务结果。一次写入涉及多格时，异常发生前已经写进容器的部分不会回滚。
>
> 映射容器也没有写锁，同一个映射只能在一个线程上依次访问。两个线程同时写入时，其中一次修改可能丢失，而且不会报错。

## 同步外部改动

被映射的容器也可能在菜单之外被修改，例如漏斗向木桶输送物品、另一名玩家直接打开这个木桶，或者其他插件改动了它。

窗口显示映射容器期间，每 tick 在查看者的线程上调用一次 `refresh()`：发现改动后更新窗口，并派发来源为 `UpdateReason.External` 的更新事件。外部改动已经发生，所以不经过访问规则，也不能取消，事件的用法看 [访问规则与事件](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/rules-events.md)。通过 [`linkInventory`](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/basics.md#没有显示的容器) 声明的映射容器同样会刷新。每次写入前，映射容器也会先刷新一次，按最新内容计算。

读取总是读到被映射容器的当前内容，不需要先刷新。没有窗口显示这个映射、又订阅了它的更新事件时，需要自己调用 `refresh()`：

```java
// 没有窗口显示这个映射时, 手动检查外部改动
contents.refresh();
```

## 退役

被映射的容器不在了，例如方块被破坏、玩家离线，映射会在下一次刷新或写入时退役。退役后：

- 读取为空，窗口中对应的格子显示为空格，设置了容器背景时显示背景
- 在代码中调用 `setItem`、`add` 等方法抛出 `IllegalStateException`；以 `try` 开头的方法返回冲突结果，不写入任何内容
- 不再参与 Shift 转移和双击收集，也不再同步外部改动

退役不会关闭窗口，也不能恢复。区块卸载后重新加载，已经退役的映射仍然是空的，需要重新创建。

`retire()` 手动退役一个映射，同时释放它对被映射容器的引用。需要立刻切断玩家对容器的访问时，例如箱子被其他插件上锁，可以调用它：

```java
// 断开映射: 之后读取为空, 写入失败, 菜单中对应的格子变为空格
contents.retire();

// 查询是否已经退役
boolean retired = contents.retired();
```

重复调用 `retire()` 没有效果。

## 自定义存储

内容不在 Bukkit 容器中时，实现 `ExternalStorage` 接口，再用 `ReferencingInventory.of(storage)` 创建映射。`ExternalStorage` 是实验性 API。

下面映射盔甲架的 6 个装备栏位，做成一个编辑盔甲架的菜单：

```java
public final class ArmorStandStorage implements ExternalStorage {
    // 存储的第 n 格对应的装备栏位
    private static final EquipmentSlot[] SLOTS = {
            EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS,
            EquipmentSlot.FEET, EquipmentSlot.HAND, EquipmentSlot.OFF_HAND
    };

    private final ArmorStand stand;

    public ArmorStandStorage(ArmorStand stand) {
        this.stand = stand;
    }

    @Override
    public int size() {
        return SLOTS.length;
    }

    @Override
    public @Nullable ItemStack read(int slot) {
        ItemStack item = this.stand.getEquipment().getItem(SLOTS[slot]);
        // 空格返回 null
        return item.isEmpty() ? null : item;
    }

    @Override
    public void write(int slot, @Nullable ItemStack item) {
        this.stand.getEquipment().setItem(SLOTS[slot], item);
    }

    @Override
    public int maxStackSize(int slot) {
        // 每个栏位只放 1 件
        return 1;
    }

    @Override
    public @NotNull SlotKey keyOf(int slot) {
        // 用盔甲架的 UUID 标识每一格, 同一个盔甲架被映射多次时能认出是同一格
        return new SlotKey(this.stand.getUniqueId(), slot);
    }

    @Override
    public boolean alive() {
        // 盔甲架被破坏或卸载后, 映射在下一次刷新时退役
        return this.stand.isValid();
    }
}
```

```java
public static void openArmorStand(Player viewer, ArmorStand stand) {
    ReferencingInventory equipment = ReferencingInventory.of(new ArmorStandStorage(stand));

    Pane pane = Pane.builder("#EEEE#EE#")
            // 前 4 个 E 是头盔到靴子, 后 2 个是主手和副手
            .addIngredient('E', equipment)
            .build();

    Window.builder(pane).setTitle("编辑盔甲架").open(viewer);
}
```

`ExternalStorage` 的方法如下，存储自己的格子从 0 开始编号：

| 方法 | 作用 |
| - | - |
| `size()` | 格子数，创建后不能变化 |
| `read(slot)` | 读取一格，空格返回 `null`。可以直接返回内部的物品，Sparrow UI 只读取，不会修改或保存它 |
| `write(slot, item)` | 写入一格，`null` 表示清空。传入的物品交给存储，Sparrow UI 之后不会再修改它 |
| `maxStackSize(slot)` | 这一格的堆叠上限，与物品自身的上限取较小值 |
| `alive()` | 内容所在的位置是否还在，返回 `false` 后映射退役。默认返回 `true` |
| `keyOf(slot)` | 这一格的身份，两格返回相等的 `SlotKey` 表示同一个位置。默认按存储对象区分 |
| `readAll()`、`contentEquals(slot, item)` | 读取全部格子、比较一格的内容。默认逐格调用 `read`，需要时可以重写以减少开销 |

这些方法在映射容器被访问的线程上调用，同样遵守 [线程要求](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/referencing.md#线程要求)。

已经持有原版的 `net.minecraft.world.Container` 时，可以用 `ExternalStorage.ofContainer(container)` 包装它，不必自己实现。

**下一步**：[访问规则与事件](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/inventory/rules-events.md) — 限制玩家能放入、取出什么，并在容器内容变化时执行自己的逻辑。
