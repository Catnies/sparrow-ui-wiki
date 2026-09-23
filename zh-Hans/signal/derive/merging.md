# merging 汇合成员

原文：<https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/merging>

队伍菜单要显示全队的总血量。每名队员的血量各是一个 Signal，队员还会随时加入和离开。

[combine](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/derive/combine.md) 的来源在创建时就定死了，最多三个，应付不了人数会变的队伍。自己监听又得在每次有人进队时订阅他的血量、离队时取消订阅，很容易漏掉。

## merging 做什么

`Signals.merging` 同时监听两样东西，成员名单本身，以及名单里每个成员的 Signal。名单变了，或者任何一个成员的 Signal 变了，它都会通知下游。

新成员加入后自动开始监听，离开后自动停止。

它的返回值是 `Signal<Long>`，一个每次变化都会增加的数字。这个数字没有业务含义，只表示「有东西变了」。真正的结果要接一个 `map` 自己算。

## 统计队伍总血量

队伍名单用 [ListSignal](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/collection/list.md) 保存，可以直接增删成员。菜单里显示每名队员，最右边是总血量。

```java
record Member(String name, MutableSignal<Integer> health) {}

Member alice = new Member("Alice", Signal.of(20));
Member bob = new Member("Bob", Signal.of(14));
Member carol = new Member("Carol", Signal.of(20));

MutableListSignal<Member> party = ListSignal.of();
party.addAll(List.of(alice, bob));

// 第二个参数告诉 merging 怎样从成员取出它的 Signal
Signal<Long> changed = Signals.merging(party, Member::health);
Signal<Integer> totalHealth = changed.map(ignored ->
        party.stream().mapToInt(member -> member.health().get()).sum()
);

Subscription subscription = totalHealth.onDirty(() -> {
    System.out.println("队伍总血量：" + totalHealth.get());
});

System.out.println(totalHealth.get());  // 34
alice.health().set(15);  // 打印「队伍总血量：29」
party.remove(bob);       // 打印「队伍总血量：15」
bob.health().set(0);     // Bob 已经离队，不再监听他，不打印
party.add(carol);        // 打印「队伍总血量：35」

subscription.close();
```

1. **第 1-8 行**：Alice 和 Bob 组成队伍，Carol 还没加入。
2. **第 10-14 行**：merging 监听名单，以及 Alice、Bob 两人的血量。map 负责把血量加起来。
3. **第 16-18 行**：订阅总血量。
4. **第 20 行**：输出「34」。
5. **第 21 行**：成员的 Signal 变了。输出「队伍总血量：29」。
6. **第 22 行**：名单变了。merging 同时取消了对 Bob 血量的监听。输出「队伍总血量：15」。
7. **第 23 行**：Bob 已经不在名单里，他的变化与队伍无关。
8. **第 24 行**：Carol 加入，merging 开始监听她的血量。输出「队伍总血量：35」。

同样的写法也能算平均血量、存活人数，或者找出血量最低的队员，只要换掉 `map` 里的计算。

## 用普通 Signal 保存名单

成员名单也可以是 `MutableSignal<List<Member>>`。这时要用 `set` 发布一个新列表，比如 `members.set(List.of(alice, carol))`。直接改旧列表不会通知任何人。

`ListSignal` 和 `SetSignal` 能就地增删，也能直接作为成员来源，一般更顺手。

## 注意事项

> **注意：成员与遍历顺序**
>
> 取 Signal 的函数应返回成员已有的那个 Signal，不要每次调用都新建一个。成员名单的遍历顺序要稳定。

> **注意：成员里不要放 Player**
>
> 名单会被长期持有。成员对象里用 UUID 或名字标识玩家，不要存 `Player`。

**下一步**：[debounce 防抖](https://catnies.github.io/sparrow-ui-wiki/zh-Hans/signal/time/debounce.md) — 等输入停下来再处理，例如玩家打完字之后才开始搜索。
