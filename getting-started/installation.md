# Installation

Source: <https://catnies.github.io/sparrow-ui-wiki/getting-started/installation>

## Compatibility

| Item | Requirement |
| - | - |
| Server | Paper or Folia |
| Minecraft | `1.21.4` \~ `26.3`. **One artifact covers the whole range**, no per-version dependencies |
| Java | The library is compiled for Java 21; at runtime use the Java version your Paper or Folia build requires |

## Adding the dependency

First the repository:

**Gradle Kotlin**

```kotlin
repositories {
  maven("https://repo.momirealms.net/snapshots")
}
```

**Gradle Groovy**

```groovy
repositories {
  maven { url = 'https://repo.momirealms.net/snapshots' }
}
```

**Maven**

```xml
<repositories>
<repository>
  <id>momirealms</id>
  <url>https://repo.momirealms.net/snapshots</url>
</repository>
</repositories>
```

Then the dependency. Relocate the whole `net.momirealms.sparrow.ui` package under your own package name, replacing `com.example.myplugin.libraries.sparrow.ui` with a package unique to your plugin:

**Gradle Kotlin**

```kotlin
dependencies {
  implementation("net.momirealms:sparrow-ui:beta.33")
}

tasks.shadowJar {
  relocate("net.momirealms.sparrow.ui", "com.example.myplugin.libraries.sparrow.ui")
}
```

**Gradle Groovy**

```groovy
dependencies {
  implementation 'net.momirealms:sparrow-ui:beta.33'
}

shadowJar {
  relocate 'net.momirealms.sparrow.ui', 'com.example.myplugin.libraries.sparrow.ui'
}
```

**Maven**

```xml
<dependency>
<groupId>net.momirealms</groupId>
<artifactId>sparrow-ui</artifactId>
<version>beta.33</version>
</dependency>

<!-- inside <configuration> of maven-shade-plugin -->
<relocations>
<relocation>
  <pattern>net.momirealms.sparrow.ui</pattern>
  <shadedPattern>com.example.myplugin.libraries.sparrow.ui</shadedPattern>
</relocation>
</relocations>
```

> **Warning: Relocation is not optional**
>
> Sparrow UI installs a reflection proxy into the **server class loader**, and the proxy's package follows the library's runtime package. Without relocation, any two plugins that bundle Sparrow UI collide on identical class names in the server class loader.

## Initialization

Call `setUp` once in `onEnable` and hand the library your plugin instance:

```java
package com.example.myplugin;

import net.momirealms.sparrow.ui.SparrowUI;
import org.bukkit.plugin.java.JavaPlugin;

public final class MyPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        SparrowUI.getInstance().setUp(this);
    }
}
```

This installs the reflection proxies, creates the window and network managers, and binds the library's scheduler to your plugin.

**Your plugin has nothing to do on disable.** Sparrow UI listens for the plugin disable event itself: it shuts down the window and network managers and stops its scheduler.

> **Danger: Run setUp before touching any Sparrow UI class**
>
> Until `setUp` has finished, do not touch any Sparrow UI class and do not build Items, Panes, or Windows.

**Next**: [Quick start](https://catnies.github.io/sparrow-ui-wiki/getting-started/quick-start.md) — From an empty plugin to the first menu on screen
