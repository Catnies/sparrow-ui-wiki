"use strict";(self.webpackChunksparrow_ui_wiki=self.webpackChunksparrow_ui_wiki||[]).push([["6273"],{3393(e,t,n){n.r(t),n.d(t,{metadata:()=>a,default:()=>h,frontMatter:()=>r,contentTitle:()=>s,toc:()=>c,assets:()=>l});var a=JSON.parse('{"id":"getting-started/quick-start","title":"Quick start","description":"A simple welcome menu","source":"@site/docs/getting-started/quick-start.mdx","sourceDirName":"getting-started","slug":"/getting-started/quick-start","permalink":"/sparrow-ui-wiki/getting-started/quick-start","draft":false,"unlisted":false,"editUrl":"https://github.com/Catnies/sparrow-ui-wiki/edit/master/docs/getting-started/quick-start.mdx","tags":[],"version":"current","lastUpdatedBy":"Catnies","lastUpdatedAt":1790079168000,"frontMatter":{"title":"Quick start","sidebar_label":"Quick start"},"sidebar":"tutorialSidebar","previous":{"title":"Installation","permalink":"/sparrow-ui-wiki/getting-started/installation"},"next":{"title":"Core concepts and layers","permalink":"/sparrow-ui-wiki/getting-started/concepts"}}'),o=n(4848),i=n(8453);let r={title:"Quick start",sidebar_label:"Quick start"},s,l={},c=[{value:"A simple welcome menu",id:"a-simple-welcome-menu",level:2},{value:"Define the layout",id:"define-the-layout",level:2},{value:"Walk through the code",id:"walk-through-the-code",level:2},{value:"Add a command to open it",id:"add-a-command-to-open-it",level:2}];function d(e){let t={admonition:"admonition",code:"code",h2:"h2",p:"p",pre:"pre",...(0,i.R)(),...e.components},{CodeSteps:n,MinecraftSlotGrid:a,MinecraftWindow:r,NextStep:s,ThreadBadge:l}=t;return n||u("CodeSteps",!0),a||u("MinecraftSlotGrid",!0),r||u("MinecraftWindow",!0),s||u("NextStep",!0),l||u("ThreadBadge",!0),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(t.h2,{id:"a-simple-welcome-menu",children:"A simple welcome menu"}),"\n",(0,o.jsx)(t.p,{children:"Let's build a welcome menu: a three-row chest, a ring of decorative background, and two buttons in the middle. One greets the player, the other closes the menu."}),"\n",(0,o.jsx)(t.p,{children:"Hover over the items to see their names and lore:"}),"\n",(0,o.jsx)(r,{type:"chest",rows:3,title:"Welcome Menu",layout:["#########","###G#C###","#########"],items:{"#":{icon:"gray_stained_glass_pane"},G:{icon:"lime_dye",name:"Say hi",nameColor:"#ffff55",lore:["Click to greet yourself."]},C:{icon:"barrier",name:"Close",nameColor:"#ff5555",lore:["Click to close this menu."]}}}),"\n",(0,o.jsx)(t.h2,{id:"define-the-layout",children:"Define the layout"}),"\n",(0,o.jsx)(t.p,{children:"The layout is declared as three strings, one character per slot:"}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-java",children:'Pane.builder(\n        "#########",\n        "###G#C###",\n        "#########"\n)\n'})}),"\n",(0,o.jsxs)(t.p,{children:["The ring of ",(0,o.jsx)(t.code,{children:"#"})," is decoration players cannot click; ",(0,o.jsx)(t.code,{children:"G"})," and ",(0,o.jsx)(t.code,{children:"C"})," are the two buttons. Where each character lands:"]}),"\n",(0,o.jsx)(a,{rows:["#########","###G#C###","#########"],legend:{"#":"background",G:"greeting",C:"close menu"}}),"\n",(0,o.jsx)(t.h2,{id:"walk-through-the-code",children:"Walk through the code"}),"\n",(0,o.jsx)(t.p,{children:"The whole menu is the single class below. Step through the stepper to see what each part does; unselected lines dim, and the code stays the same."}),"\n",(0,o.jsx)(n,{language:"java",steps:[{title:"Draw the layout",lines:"27-31",note:"Three strings describe the shape of the menu: one character per slot. Three rows of nine makes a 27-slot chest. Pick any characters you like; they are just labels for naming which slots hold what in the next step.",preview:(0,o.jsx)(a,{rows:["#########","###G#C###","#########"],legend:{"#":"unassigned",G:"unassigned",C:"unassigned"}})},{title:"Lay the background",lines:"32,64-68",note:"setBackground fills every slot without a dedicated assignment, here the whole ring of #. Background items cannot be clicked; they hold space and split the menu into areas.",preview:(0,o.jsx)(a,{rows:["#########","###G#C###","#########"],icons:{"#":"gray_stained_glass_pane"},legend:{"#":"gray glass pane",G:"unassigned",C:"unassigned"}})},{title:"Fill in the buttons",lines:"33-34",note:"addIngredient binds a character to an Item. Bind once and every slot that character occupies in the layout uses it. Each button appears only once, so each takes one slot.",preview:(0,o.jsx)(a,{rows:["#########","###G#C###","#########"],icons:{"#":"gray_stained_glass_pane",G:"lime_dye",C:"barrier"},legend:{"#":"gray glass pane",G:"greeting button",C:"close button"}})},{title:"What the buttons look like",lines:"40-42",note:"The looks are just a plain ItemStack. Name and lore go through Paper's data component API; do not reach for ItemMeta. Turning off the default italic is a habit worth keeping, otherwise vanilla renders custom names in italics."},{title:"What a click does",lines:"46-47,59",note:"The click handed to addClickHandler carries the full context of this click: who clicked, which slot, what kind of click, what the cursor held, and which Window it belongs to. The close button uses window() from it."},{title:"Open it",lines:"19-23",note:"Window.builder takes a Pane as the top half; the bottom half maps to the player's own inventory. open() sends the menu to the player."}],code:`
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

  /** Opens the welcome menu for one player. */
  public static void open(Player viewer) {
      Window.builder(buildPane())
              .setTitle(Component.text("Welcome Menu"))
              .open(viewer);
  }

  /** The menu layout: a ring of background and two buttons in the middle. */
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

  /** Greets the player when clicked. */
  private static Item greetButton() {
      ItemStack itemStack = new ItemStack(Material.LIME_DYE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("Say hi", NamedTextColor.YELLOW).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.player().sendMessage(
                      Component.text("Hi, " + click.player().getName() + "!", NamedTextColor.GREEN)))
              .build();
  }

  /** Closes the menu when clicked. */
  private static Item closeButton() {
      ItemStack itemStack = new ItemStack(Material.BARRIER);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME,
              Component.text("Close", NamedTextColor.RED).decoration(TextDecoration.ITALIC, false));

      return Item.builder()
              .setItemProviderConstant(itemStack)
              .addClickHandler(click -> click.window().close())
              .build();
  }

  /** The decorative item shown in empty slots. */
  private static ItemStack background() {
      ItemStack itemStack = new ItemStack(Material.GRAY_STAINED_GLASS_PANE);
      itemStack.setData(DataComponentTypes.CUSTOM_NAME, Component.empty());
      return itemStack;
  }
}
`}),"\n",(0,o.jsx)(t.h2,{id:"add-a-command-to-open-it",children:"Add a command to open it"}),"\n",(0,o.jsxs)(t.p,{children:["The menu class is done; it just needs a caller. Register a ",(0,o.jsx)(t.code,{children:"/welcome"})," command with Paper's Brigadier API. Join the server, type ",(0,o.jsx)(t.code,{children:"/welcome"}),", and the menu appears."]}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-java",children:'// In your JavaPlugin#onEnable\nthis.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event ->\n        event.registrar().register(\n                Commands.literal("welcome")\n                        .executes(context -> {\n                            if (context.getSource().getExecutor() instanceof Player player) {\n                                WelcomeMenu.open(player);\n                            }\n                            return Command.SINGLE_SUCCESS;\n                        })\n                        .build(),\n                "Open the welcome menu"));\n'})}),"\n",(0,o.jsxs)(t.admonition,{title:"build() and open() may run off the main thread",type:"tip",children:[(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.code,{children:"build(viewer)"})," and ",(0,o.jsx)(t.code,{children:"open()"})," can both be called from any thread ",(0,o.jsx)(l,{type:"any"}),"; building a menu does not have to squeeze onto the main thread."]}),(0,o.jsx)(t.p,{children:"What you do have to own is the gap between starting the build and the menu actually opening, because state can change in between. Say a player right-clicks a shulker box item and you read its contents asynchronously to build the menu. By the time the menu opens, the item in their hand may no longer be that shulker box."})]}),"\n",(0,o.jsx)(t.admonition,{title:"The return value of open()",type:"info",children:(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.code,{children:"open()"})," returns a ",(0,o.jsx)(t.code,{children:"CompletableFuture<Window.OpenResult>"})," with three outcomes: ",(0,o.jsx)(t.code,{children:"OPENED"}),", ",(0,o.jsx)(t.code,{children:"ALREADY_OPEN"}),", and ",(0,o.jsx)(t.code,{children:"VIEWER_UNAVAILABLE"}),". The example above ignores the result, so it just drops the future."]})}),"\n",(0,o.jsx)(s,{to:"/getting-started/concepts",title:"Core concepts and layers",description:"How Window, Pane, and Item actually relate"})]})}function h(e={}){let{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,o.jsx)(t,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}function u(e,t){throw Error("Expected "+(t?"component":"object")+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}},8453(e,t,n){n.d(t,{R:()=>r,x:()=>s});var a=n(6540);let o={},i=a.createContext(o);function r(e){let t=a.useContext(i);return a.useMemo(function(){return"function"==typeof e?e(t):{...t,...e}},[t,e])}function s(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:r(e.components),a.createElement(i.Provider,{value:t},e.children)}}}]);