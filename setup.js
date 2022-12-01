import { createChatLogListeners, rollDamageGroup, variantDamageLabels } from "./scripts/_rollDamage.mjs";
import { createDamageButtons } from "./scripts/_createDamageButtons.mjs";
import { createConfigButton } from "./scripts/_createConfigButton.mjs";

Hooks.once("setup", () => {
  Hooks.on(`${game.system.id}.preDisplayCard`, createDamageButtons);
  Hooks.on(`${game.system.id}.preRollDamage`, variantDamageLabels);
  Hooks.on("renderChatLog", (chatLog, html) => { createChatLogListeners(html); });
  Hooks.on("renderChatPopout", (chatLog, html) => { createChatLogListeners(html); })
  Hooks.on("renderItemSheet", (sheet, html) => { createConfigButton(sheet.object, html); });
  Item.prototype.rollDamageGroup = rollDamageGroup;
});
