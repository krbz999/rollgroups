import { createChatLogListeners } from "./scripts/_createChatLogListeners.mjs";
import { createDamageButtons } from "./scripts/_createDamageButtons.mjs";
import { createConfigButton } from "./scripts/_createConfigButton.mjs";
import { registerSettings } from "./scripts/_settings.mjs";

Hooks.once("init", () => { registerSettings(); });
Hooks.on("dnd5e.preDisplayCard", (item, data) => { createDamageButtons(item, data); });
Hooks.on("renderChatLog", (chatLog, html) => { createChatLogListeners(html); });
Hooks.on("renderItemSheet", (sheet, html) => { createConfigButton(sheet.object, html); });
