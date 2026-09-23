# combine 组合

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine>

技能栏上的火球术按钮，能释放时是亮的，不能释放时是灰的。能不能释放看三件事，法力够不够、法力消耗是多少、有没有被沉默。

[map](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/map.md) 只能跟随一个 Signal。在它的函数里去读另外两个 Signal 不会建立依赖，玩家被沉默了按钮也不会变灰。

## combine 做什么

`Signals.combine` 把两个或三个 Signal 组合成一个结果。任何一个来源变化，组合结果都会通知下游。读取时，再拿各来源的当前值算出结果。

组合函数的参数顺序和传入 Signal 的顺序一致。

## 判断技能能否释放

菜单里的法力物品依赖 `mana`，火球术按钮依赖 `castable`。逐步执行，看哪一步会让哪个物品刷新。

```java
MutableSignal<Integer> mana = Signal.of(40);
MutableSignal<Integer> manaCost = Signal.of(30);
MutableSignal<Boolean> silenced = Signal.of(false);

Signal<Boolean> castable = Signals.combine(mana, manaCost, silenced,
        (current, cost, muted) -> !muted && current >= cost
);

System.out.println(castable.get());  // true
silenced.set(true);
System.out.println(castable.get());  // false，被沉默
silenced.set(false);
mana.update(value -> value - 30);
System.out.println(castable.get());  // false，只剩 10 点法力
```

1. **第 1-7 行**：法力 40 不少于消耗 30，也没被沉默，按钮是亮的。
2. **第 9 行**：输出「true」。
3. **第 10 行**：沉默变了，castable 收到通知，按钮变灰。法力物品不依赖沉默，不刷新。
4. **第 11 行**：输出「false」。
5. **第 12 行**：沉默解除。
6. **第 13 行**：释放一次后只剩 10 点法力。两个物品都依赖法力，都会刷新。
7. **第 14 行**：法力不足，按钮保持灰色。输出「false」。

下面的演示可以自己动手。点「切换沉默」时只有技能按钮重新显示，点「法力 +20」时两个物品都会重新显示。

## 两个来源的写法

两个来源时，组合函数接收两个参数。当前经验和升级所需经验决定进度百分比。

```java
MutableSignal<Integer> experience = Signal.of(30);
MutableSignal<Integer> required = Signal.of(120);

Signal<String> progress = Signals.combine(experience, required,
        (current, needed) -> current * 100 / needed + "%"
);

System.out.println(progress.get());  // 25%
experience.set(90);
System.out.println(progress.get());  // 75%

// 升级后经验清零，下一级需要更多经验
experience.set(0);
required.set(200);
System.out.println(progress.get());  // 0%
```

## 注意事项

> **注意：结果没变也会通知**
>
> `combine` 和 `map` 一样不比较前后结果。法力从 40 回复到 60，`castable` 还是 `true`，下游照样收到通知。按钮只关心能不能释放的话，在后面接一个 `mapDistinct`。
>
> ```java
> Signal<Boolean> castableDistinct = castable.mapDistinct(value -> value);
> ```

> **注意：多个来源是分别读取的**
>
> 组合结果读取来源时一个一个读，拿到的不是同一时刻的快照。先改 `mana` 再改 `manaCost`，别的线程可能恰好在两次写入之间读到新法力和旧消耗。
>
> 两项数据必须一起变时，放进同一个不可变对象，用一次 `update` 整体替换，再用 `map` 或 [lens](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/lens.md) 取字段。

> **注意：组合函数只做计算**
>
> 函数可能在任意读取线程执行，同一组输入也可能被算好几次。只根据参数算结果，不改状态，不查数据库。
>
> `combine` 最多接收三个来源。更多的话，先把其中几项组合成中间结果，或者把相关字段合并进一个 record。

**下一步**：[lens 字段读写](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/lens.md) — 从一个设置对象里取出单个字段，单独读写和订阅。
