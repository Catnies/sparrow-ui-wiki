# lens 字段读写

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/lens>

玩家的 HUD 设置存在一个 record 里，有「显示坐标」和「界面缩放」两个字段。设置菜单上一个按钮切换坐标显示，另一个按钮调缩放。

每个按钮都得写 `hud.update(current -> new HudSettings(...))`，把另一个字段原样抄一遍。字段一多，抄漏一个就把玩家的设置改乱了。更麻烦的是，只调了缩放，显示坐标开关的那个按钮也会跟着刷新，因为它们依赖同一个 `hud`。

## lens 做什么

`MutableSignal.lens` 从对象状态里取出一个字段，得到一个可以单独读写的 `MutableSignal`。

它需要两个函数。

| 参数 | 作用 |
| - | - |
| 读取函数 | 从完整对象里取出字段 |
| 写入函数 | 拿到当前的完整对象和新的字段值，返回新的完整对象 |

往 lens 里写值，它会用写入函数造出新对象，写回原来的 Signal。字段值没变时，lens 不通知，所以只调缩放不会惊动坐标按钮。

## 每个按钮只管一个字段

坐标按钮依赖 `showCoords`，缩放按钮依赖 `scale`。逐步执行，看每次点击只刷新哪个按钮。

```java
record HudSettings(boolean showCoords, int scale) {}

MutableSignal<HudSettings> hud = Signal.of(new HudSettings(true, 2));

MutableSignal<Boolean> showCoords = hud.lens(
        HudSettings::showCoords,
        (current, value) -> new HudSettings(value, current.scale())
);
MutableSignal<Integer> scale = hud.lens(
        HudSettings::scale,
        (current, value) -> new HudSettings(current.showCoords(), value)
);

showCoords.update(value -> !value);             // 坐标按钮刷新，缩放按钮不动
scale.update(value -> Math.min(value + 1, 4));  // 缩放变成 3
scale.update(value -> Math.min(value + 1, 4));  // 缩放变成 4
scale.update(value -> Math.min(value + 1, 4));  // 已经是 4，写入被跳过

System.out.println(hud.get());  // HudSettings[showCoords=false, scale=4]
```

1. **第 1-3 行**：完整的设置对象只有这一份。
2. **第 5-12 行**：给两个字段各建一个 lens，两个按钮分别依赖它们。
3. **第 14 行**：hud 换成了新对象，但缩放字段没变，缩放按钮不刷新。
4. **第 15 行**：lens 用写入函数造出新对象写回 hud，坐标字段原样保留。
5. **第 16 行**
6. **第 17 行**：已经到上限 4，新值与旧值相同，什么都没发生。
7. **第 19 行**：保存到数据库时，直接取 hud.get()。输出「HudSettings\[showCoords=false, scale=4]」。

## 注意事项

> **注意：两个函数都可能重试**
>
> 写入 lens 时会调用原 Signal 的 `update`，并发时写入函数可能被执行多次。两个函数都不要有副作用。写入函数返回新对象，保留当前对象的其他字段，也不要修改传进来的对象。
>
> 函数里不要捕获玩家、世界或窗口对象。

> **提示：自定义字段的比较方式**
>
> 字段是否变化默认用 `Objects.equals` 判断。需要其他规则时，把比较函数作为第三个参数传入，规则与 [Signal.of](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/basics/mutable.md#注意事项) 相同。

**下一步**：[switching 切换来源](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/switching.md) — 根据当前选择读取不同的 Signal，例如切换职业后显示对应职业的技能点。
