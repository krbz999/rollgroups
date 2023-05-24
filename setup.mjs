import {
  createChatLogListeners,
  rollDamageGroup,
  variantDamageLabels
} from "./scripts/_rollDamage.mjs";
import {manageCardButtons} from "./scripts/_createDamageButtons.mjs";
import {createConfigButton} from "./scripts/_createConfigButton.mjs";

Hooks.once("setup", () => {
  Hooks.on(`${game.system.id}.preDisplayCard`, manageCardButtons);
  Hooks.on(`${game.system.id}.preRollDamage`, variantDamageLabels);
  Hooks.on("renderChatMessage", createChatLogListeners);
  Hooks.on("renderItemSheet", createConfigButton);
  Item.prototype.rollDamageGroup = rollDamageGroup;
  loadTemplates(["modules/rollgroups/templates/column.hbs"]);
});
