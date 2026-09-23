# merging

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/derive/merging>

The party menu shows the party's total health. Each member's health is its own Signal, and members join and leave at any time.

[combine](https://catnies.github.io/sparrow-ui-wiki/signal/derive/combine.md) fixes its sources at creation, at most three, so it cannot handle a party whose size changes. Listening yourself means subscribing to each new member's health when they join and unsubscribing when they leave, which is easy to get wrong.

## What merging does

`Signals.merging` watches two things at once: the member list itself, and each member's Signal. When the list changes, or any member's Signal changes, it notifies downstream.

New members are watched as soon as they join and dropped as soon as they leave.

It returns a `Signal<Long>`, a number that grows on every change. The number has no business meaning; it only says "something changed". Chain a `map` to compute the real result.

## Total party health

The party list is a [ListSignal](https://catnies.github.io/sparrow-ui-wiki/signal/collection/list.md), so members can be added and removed in place. The menu shows each member, with the total on the right.

```java
record Member(String name, MutableSignal<Integer> health) {}

Member alice = new Member("Alice", Signal.of(20));
Member bob = new Member("Bob", Signal.of(14));
Member carol = new Member("Carol", Signal.of(20));

MutableListSignal<Member> party = ListSignal.of();
party.addAll(List.of(alice, bob));

// The second argument tells merging how to get a member's Signal
Signal<Long> changed = Signals.merging(party, Member::health);
Signal<Integer> totalHealth = changed.map(ignored ->
        party.stream().mapToInt(member -> member.health().get()).sum()
);

Subscription subscription = totalHealth.onDirty(() -> {
    System.out.println("Party health: " + totalHealth.get());
});

System.out.println(totalHealth.get());  // 34
alice.health().set(15);  // prints "Party health: 29"
party.remove(bob);       // prints "Party health: 15"
bob.health().set(0);     // Bob left and is no longer watched, prints nothing
party.add(carol);        // prints "Party health: 35"

subscription.close();
```

1. **lines 1-8**: Alice and Bob form a party; Carol has not joined yet.
2. **lines 10-14**: merging watches the list plus Alice and Bob's health. The map adds the health up.
3. **lines 16-18**: Subscribe to the total.
4. **lines 20**: Prints 34.
5. **lines 21**: A member's Signal changed. Prints Party health: 29.
6. **lines 22**: The list changed. merging also stops watching Bob's health. Prints Party health: 15.
7. **lines 23**: Bob is no longer in the list, so his change has nothing to do with the party.
8. **lines 24**: Carol joins and merging starts watching her health. Prints Party health: 35.

The same pattern gives average health, the number of living members, or the member with the lowest health; just change the calculation inside `map`.

## Holding the list in a plain Signal

The member list can also be a `MutableSignal<List<Member>>`. Then publish a new list with `set`, such as `members.set(List.of(alice, carol))`. Changing the old list in place notifies nobody.

`ListSignal` and `SetSignal` support in-place changes and work directly as member sources, which is usually more convenient.

## Caveats

> **Warning: Members and iteration order**
>
> The function that gets a Signal should return the member's existing Signal, not create a new one on every call. The list's iteration order should be stable.

> **Warning: Do not put Player in members**
>
> The list is held long term. Identify players in member objects by UUID or name, never by storing a `Player`.

**Next**: [debounce](https://catnies.github.io/sparrow-ui-wiki/signal/time/debounce.md) — Wait until input settles, such as searching only after the player finishes typing.
