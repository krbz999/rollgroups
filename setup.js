import { createChatLogListeners, rollDamageGroup, variantDamageLabels } from "./scripts/_rollDamage.mjs";
import { createDamageButtons } from "./scripts/_createDamageButtons.mjs";
import { createConfigButton } from "./scripts/_createConfigButton.mjs";
import { registerSettings } from "./scripts/_settings.mjs";

Hooks.once("init", () => { registerSettings(); });
Hooks.on("dnd5e.preDisplayCard", createDamageButtons);
Hooks.on("dnd5e.preRollDamage", variantDamageLabels);
Hooks.on("renderChatLog", (chatLog, html) => { createChatLogListeners(html); });
Hooks.on("renderItemSheet", (sheet, html) => { createConfigButton(sheet.object, html); });
Hooks.once("setup", () => { Item.prototype.rollDamageGroup = rollDamageGroup; });
