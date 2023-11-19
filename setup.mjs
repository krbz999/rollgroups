import {createChatLogListeners, rollDamageGroup, variantDamageLabels} from "./scripts/_rollDamage.mjs";
import {manageCardButtons, createConfigButton} from "./scripts/_create-buttons.mjs";

Hooks.once("setup", () => {
  Hooks.on(`${game.system.id}.preDisplayCard`, manageCardButtons);
  Hooks.on(`${game.system.id}.preRollDamage`, variantDamageLabels);
  Hooks.on("renderChatMessage", createChatLogListeners);
  Hooks.on("renderItemSheet", createConfigButton);
  Item.implementation.prototype.rollDamageGroup = rollDamageGroup;
  loadTemplates(["modules/rollgroups/templates/column.hbs"]);
});
