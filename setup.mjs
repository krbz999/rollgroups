import {
  createChatLogListeners,
  rollDamageGroup,
  variantDamageLabels
} from "./scripts/_rollDamage.mjs";
import {createDamageButtons} from "./scripts/_createDamageButtons.mjs";
import {createConfigButton} from "./scripts/_createConfigButton.mjs";

Hooks.once("setup", () => {
  Hooks.on(`${game.system.id}.preDisplayCard`, createDamageButtons);
  Hooks.on(`${game.system.id}.preRollDamage`, variantDamageLabels);
  Hooks.on("renderChatMessage", createChatLogListeners);
  Hooks.on("renderItemSheet", createConfigButton);
  Item.prototype.rollDamageGroup = rollDamageGroup;
});
