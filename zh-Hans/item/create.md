# 创建物品

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/create>

菜单中的图标可以只展示信息，也可以作为翻页、返回等按钮。Sparrow UI 用 **Item** 配置物品显示和交互行为，用 Pane 安排它的位置。

## Item 由什么组成

一个 Item 的配置包含显示来源、条件守卫和点击行为：

| 部分 | 职责 |
| - | - |
| 显示来源 `ItemProvider` | 提供显示的物品 |
| 条件守卫 `ItemGuard` | 检查是否允许执行点击行为 |
| 点击行为 | 接收 `ItemClick`，执行点击操作 |

`ItemProvider` 提供用于显示的 Bukkit `ItemStack`，支持固定物品和[动态渲染](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/render.md)。

点击处理器接收的 `ItemClick` 包含玩家、点击类型和所在窗口等信息。配置了条件守卫时，先检查守卫，全部通过后才执行点击处理器；任一守卫返回 `false`，本次点击行为就不会执行。

同一个 Item 可以放入多个槽位，也可以供多个窗口共用。

## 创建 Item 的常见入口

| API | 说明 |
| - | - |
| `Item.simple(ItemStack)` | 已有一个物品，只需要把它显示在菜单中。 |
| `Item.simple(ItemProvider)` | 已有显示来源，用它创建一个只负责显示的 Item。 |
| `Item.builder()` | 逐项配置显示与交互，最后调用 build() 创建 Item。 |
| `Item.empty()` | 需要一个不显示物品、也不执行交互动作的 Item。 |

### 从 ItemStack 创建

只需要显示物品时，可以用 `Item.simple(stack)`。下面创建一支用于展示的箭头，不添加点击行为。

```java
ItemStack stack = new ItemStack(Material.ARROW);
Item item = Item.simple(stack);
```

下面给箭头添加名称和说明，并关闭默认斜体。先设置 `ItemStack`，再传给 `Item.simple`。

```java
ItemStack stack = new ItemStack(Material.ARROW);
stack.setData(
        DataComponentTypes.CUSTOM_NAME,
        Component.text("方向指示", NamedTextColor.WHITE)
                .decoration(TextDecoration.ITALIC, false)
);
stack.setData(
        DataComponentTypes.LORE,
        ItemLore.lore(List.of(
                Component.text("标记菜单中的方向。", NamedTextColor.GRAY)
                        .decoration(TextDecoration.ITALIC, false)
        ))
);

Item item = Item.simple(stack);
```

> **信息：创建时保存物品副本**
>
> `Item.simple(stack)` 会复制传入的 `ItemStack`。创建后再修改原来的 `stack`，不会改变这个 Item 的显示内容，所以名称、数量和 Lore 都应在传入前设置好。

### 从 ItemProvider 创建

如果已经有一个 `ItemProvider`，用 `Item.simple(provider)` 将它作为显示来源：

```java
ItemStack stack = new ItemStack(Material.ARROW);
ItemProvider provider = ItemProvider.constant(stack);
Item item = Item.simple(provider);
```

`ItemProvider.constant(stack)` 在创建时复制物品；上例与 `Item.simple(stack)` 等效。

这个入口也接受按需生成物品的 Provider。`simple` 表示这里没有额外配置交互行为，并不要求 Provider 每次都提供相同的物品。

### 用 Builder 组合显示与交互

需要配置交互时，使用 `Item.builder()`。下面创建一个显示为屏障的关闭按钮，点击后关闭当前窗口。

```java
ItemStack stack = new ItemStack(Material.BARRIER);
stack.setData(
        DataComponentTypes.CUSTOM_NAME,
        Component.text("关闭菜单", NamedTextColor.YELLOW)
                .decoration(TextDecoration.ITALIC, false)
);

Item closeButton = Item.builder()
        .setItemProviderConstant(stack)
        .addClickHandler(click -> click.window().close())
        .build();
```

权限检查、节流和其他交互用法见 [点击与守卫](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/click.md)。

> **注意：一个 Builder 只能配置一次显示来源**
>
> 重复调用 `setItemProviderConstant`，或在配置后再调用其他显示来源方法，会抛出 `IllegalStateException`。它不会覆盖之前的配置。
>
> 固定物品在调用 `setItemProviderConstant` 时就已复制，修改原来的 `stack` 不会改变这份配置。

### 创建空 Item

`Item.empty()` 返回共享的空 Item，不显示物品，也不处理交互。

```java
Item empty = Item.empty();
```

> **信息：空 Item 与未安排内容的格子**
>
> 如果 Pane 设置了背景，未安排内容的格子会显示背景；放入 `Item.empty()` 的格子则不会回退到 Pane 背景。

## 把 Item 放进菜单

下面将展示箭头和关闭按钮放进同一个菜单，分别绑定到 `A`、`C`，其余槽位留空。`addIngredient` 负责绑定，Window 负责打开菜单。

```text title="物品示例"
##A###C##
```

- `#`：留空
- `A`：展示物品（`arrow`）
- `C`：关闭按钮（`barrier`）

完整代码如下。在已完成 [初始化](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/installation.md) 的插件中调用 `ItemMenu.open(viewer)` 就能打开：

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.ItemLore;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import net.momirealms.sparrow.ui.pane.Pane;
import net.momirealms.sparrow.ui.window.Window;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.List;

public final class ItemMenu {
    public static void open(Player viewer) {
        Pane pane = Pane.builder("##A###C##")
                .addIngredient('A', createArrow())
                .addIngredient('C', createCloseButton())
                .build();

        Window.builder(pane)
                .setTitle(Component.text("物品示例"))
                .open(viewer);
    }

    private static Item createArrow() {
        ItemStack arrowStack = new ItemStack(Material.ARROW);
        arrowStack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("方向指示", NamedTextColor.WHITE)
                        .decoration(TextDecoration.ITALIC, false)
        );
        arrowStack.setData(
                DataComponentTypes.LORE,
                ItemLore.lore(List.of(
                        Component.text("标记菜单中的方向。", NamedTextColor.GRAY)
                                .decoration(TextDecoration.ITALIC, false)
                ))
        );
        return Item.simple(arrowStack);
    }

    private static Item createCloseButton() {
        ItemStack closeStack = new ItemStack(Material.BARRIER);
        closeStack.setData(
                DataComponentTypes.CUSTOM_NAME,
                Component.text("关闭菜单", NamedTextColor.YELLOW)
                        .decoration(TextDecoration.ITALIC, false)
        );
        return Item.builder()
                .setItemProviderConstant(closeStack)
                .addClickHandler(click -> click.window().close())
                .build();
    }
}
```

**下一步**：[渲染与刷新](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/item/render.md) — 通过 ItemProvider 按玩家生成物品，配置异步加载与刷新时机。
