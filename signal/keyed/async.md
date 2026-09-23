# Async and polling partitions

Source: <https://catnies.github.io/sparrow-ui-wiki/signal/keyed/async>

The guild menu shows each guild's name and level, stored in a database. The server has hundreds of guilds, and a player looks at one or two at a time.

Writing a [Signal.async](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md) per guild is tedious, and each one queries as soon as it is created: hundreds of guilds, hundreds of queries. A network menu showing each server's player count has the same problem.

## What async partitions do

`KeyedSignal.async` and `KeyedSignal.polling` load each partition on its own in the background. They amount to an async or polling Signal per key, but **only partitions that are actually used get queried**.

They take a placeholder, an executor, and a query function. The query receives the partition's key and returns that partition's value.

| Moment | Queries? |
| - | - |
| Creating `KeyedSignal.async(...)` | No |
| Calling `at(key)` for a handle | No |
| First read of a partition | Submits that partition's query |

## Loading guild info by guild id

Suppose `guildRepository.load(String)` queries by guild id and returns a `GuildInfo`, and `ioExecutor` is a background I/O executor.

```java
record GuildInfo(String name, int level, int members) {}

KeyedSignal<String, GuildInfo> guilds = KeyedSignal.async(
        (GuildInfo) null, ioExecutor, guildRepository::load
);

Signal<GuildInfo> moon = guilds.at("moon");  // just a handle, no query yet
Signal<String> moonTitle = moon.map(info ->
        info == null ? "Loading…" : info.name() + " Lv." + info.level()
);

System.out.println(moonTitle.get());  // Loading…, the first read submits the query
// once the query finishes, the menu shows "Moonshade Lv.5"

guilds.dirty("moon");  // after the guild levels up, re-query only this guild
// the new result arrives and the menu shows "Moonshade Lv.6"
```

1. **lines 1-5**: Creating it queries no guild.
2. **lines 7-10**: Getting a handle and deriving text still queries nothing.
3. **lines 12**: The first read of the moon partition submits its query. The other hundreds of guilds are untouched. Prints Loading….
4. **lines 13**: The result arrives and the menu refreshes. Another menu calling at("moon") shares this result.
5. **lines 15**: The old result stays while re-querying, and repeated refreshes merge into one extra query.
6. **lines 16**

An async partition's value comes only from its query function, so the handle returned by `at(key)` is a read-only `Signal` with no `set`.

## Polling player counts by server id

A network menu shows each server's player count, which every server writes to Redis. Suppose `servers.onlineCount(String)` queries one server's count.

```java
KeyedSignal<String, Integer> serverOnline = KeyedSignal.polling(
        (Integer) null, ioExecutor, servers::onlineCount, 100L
);

Signal<Integer> survival = serverOnline.at("survival");
```

Each partition polls on its own, and only partitions whose handles have subscribers poll. When a player opens the menu to view the survival server, only `survival` queries every 100 ticks; servers nobody looks at are not queried. When all subscriptions to a partition close, it stops polling on its own without affecting the others.

To poll by real time, use `pollingMillis`.

```java
KeyedSignal<String, Integer> serverOnline = KeyedSignal.pollingMillis(
        (Integer) null, ioExecutor, servers::onlineCount, 5000L
);
```

## Caveats

> **Warning: Same rules as a single async or polling**
>
> The old result stays while re-querying, and repeated refreshes merge into one extra query; see [async](https://catnies.github.io/sparrow-ui-wiki/signal/source/async.md#repeated-refreshes-are-merged). Periods, shared clocks, and extra queries follow [polling](https://catnies.github.io/sparrow-ui-wiki/signal/source/polling.md#caveats).
>
> The query only touches the database, the network, or thread-safe data, and the loaded notification comes from the thread that ran it.

> **Warning: Removing partitions**
>
> Async and polling partitions support `remove(key)`, `clear()`, and `keys()` too, with the rules from [KeyedSignal](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/basics.md#removing-partitions). Reading after a removal submits a new query.

**Next**: [Player partitions](https://catnies.github.io/sparrow-ui-wiki/signal/keyed/player.md) — Keep state per player by UUID and clean it up automatically when they quit.
