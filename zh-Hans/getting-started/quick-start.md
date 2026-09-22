# 快速开始

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/quick-start>

## 快速编写一个简单菜单

我们来写一个三行的欢迎菜单。四周铺上装饰背景，中间放两个按钮，分别用来打招呼和关闭菜单。

把鼠标放到物品上查看名称和说明：

```text title="欢迎菜单"
#########
###G#C###
#########
```

- `#`：`gray_stained_glass_pane`
- `G`：打个招呼（`lime_dye`），说明：点一下, 向自己问好。
- `C`：关闭（`barrier`），说明：点一下, 关掉这个菜单。

## 定义菜单的布局

布局由三行字符串声明，一个字符一格：

```java
Pane.builder(
        "#########",
        "###G#C###",
        "#########"
)
```

`#` 那一圈是不可点的装饰，`G` 和 `C` 是两个按钮。每个字符落在哪一格：

```text
#########
###G#C###
#########
```

- `#`：装饰背景
- `G`：打招呼
- `C`：关闭菜单

## 一步步写出来

完整菜单放在下面这个类里。点击步骤条，可以查看对应代码和说明。

```java
import io.papermc.paper.datacomponent.DataComponentTypes;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.momirealms.sparrow.ui.item.Item;
import net.momirealms.sparrow.ui.pane.NormalPane;
import net.momirealms.sparrow.ui.pane.Pane;
import net.momirealms.sparrow.ui.window.Window;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

public final class WelcomeMenu {

  private WelcomeMenu() {
  }

  /** 给一名玩家打开欢迎菜单。 */
  public static void open(Player viewer) {
      Window.builder(buildPane())
              .setTitle(Component.text("欢迎菜单"))
              .open(viewer);
  }

  /** 菜单的布局：一圈背景，中间两个按钮。 */
  private static NormalPane buildPane() {
      return Pane.builder(
                      "#########",
                      "###G#C###",
                      "#########"
              )
              .setBackground(background())
              .addIngredient('G', greetButton())
              .addIngredient('C', closeButton())
              .build();
  }

  /** 点一下向玩家问好。 */
  private static Item greetButton() {
      ItemStack itemStack = new ItemStack(Material.LIME_DYE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("打个招呼", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.player().sendMessage(
                      Component.text("你好, " + click.player().getName() + "!", NamedTextColor.GREEN)))
              .build();
  }

  /** 点一下关掉菜单。 */
  private static Item closeButton() {
      ItemStack itemStack = new ItemStack(Material.BARRIER);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("关闭", NamedTextColor.RED).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.window().close())
              .build();
  }

  /** 空槽位显示的装饰物品。 */
  private static ItemStack background() {
      ItemStack itemStack = new ItemStack(Material.GRAY_STAINED_GLASS_PANE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
      return itemStack;
  }
}
```

1. **画出布局**（第 27-31 行）：下面的模板对应一个三行箱子菜单。每个字符代表一个槽位，G 和 C 用于绑定两个按钮，# 留作背景。
2. **铺上背景**（第 32,64-68 行）：setBackground 为未绑定内容的槽位设置背景。本例用灰色玻璃板填充 # 区域，背景不响应点击。
3. **把按钮填进格子**（第 33-34 行）：addIngredient 为字符指定一个 Item，布局中相同字符的格子都会显示它。这里两个按钮的字符各出现一次，各占一格。
4. **设置物品外观**（第 40-42 行）：示例使用 Paper 数据组件 API 设置名称，并关闭默认斜体。
5. **处理点击**（第 46-47,59 行）：addClickHandler 注册点击处理器。问候按钮通过 click.player() 发送消息，关闭按钮通过 click.window().close() 关闭当前窗口。
6. **打开它**（第 19-23 行）：Window\.builder 接一块 Pane 作为上半部分，下半部分自动映射玩家自己的物品栏。open 把菜单发给玩家。

## 添加一个命令打开它

最后用 Paper Brigadier API 注册 `/welcome` 命令。玩家执行命令后，调用 WelcomeMenu.open 打开刚才的菜单。

```java
// 在你的 JavaPlugin#onEnable 里
this.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event ->
        event.registrar().register(
                Commands.literal("welcome")
                        .executes(context -> {
                            if (context.getSource().getExecutor() instanceof Player player) {
                                WelcomeMenu.open(player);
                            }
                            return Command.SINGLE_SUCCESS;
                        })
                        .build(),
                "打开欢迎菜单"));
```

> **提示：build 和 open 都允许异步调用**
>
> `build(viewer)` 与 `open()` 都可以在异步线程上调用 （任意线程），Sparrow UI 会将实际打开操作调度到玩家线程。
>
> 异步构建期间，业务状态可能发生变化，需要在打开前检查。例如玩家右键一个潜影盒物品，你异步读出里面的内容构建菜单，等菜单真正打开时，玩家手里拿的可能已经不是那个潜影盒了。

> **信息：open 的返回值**
>
> `open()` 返回 `CompletableFuture<Window.OpenResult>`，结果有三种：`OPENED`、`ALREADY_OPEN`、`VIEWER_UNAVAILABLE`。上面的示例没有使用返回值；需要确认是否打开成功时，可以检查这个结果。

**下一步**：[核心概念与层级](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/getting-started/concepts.md) — 了解 Window、Pane 和 Item 如何组成菜单
