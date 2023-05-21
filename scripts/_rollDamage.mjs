import {MODULE} from "./_constants.mjs";
import {createDamageButtons} from "./_createDamageButtons.mjs";
import {WeaponPicker} from "./weaponPicker.mjs";

/**
 * Create the listener for each rollgroups button in a chat message.
 * Hooks on 'renderChatMessage'.
 * @param {ChatMessage} message     The message being rendered.
 * @param {HTMLElement} html        The element of the message.
 */
export function createChatLogListeners(message, html) {
  html[0].querySelectorAll("[data-action^='rollgroup-damage']").forEach(n => {
    n.addEventListener("click", rollDamageFromChat);
  });

  html[0].querySelectorAll("[data-action^='rollgroup-bladecantrip']").forEach(n => {
    n.addEventListener("click", pickEquippedWeapon);
  });
}

/**
 * Make a damage roll using one of the buttons created in the chatlog.
 * @param {PointerEvent} event      The initiating click event.
 * @returns // see Item#rollDamage.
 */
function rollDamageFromChat(event) {
  const item = findItem(event);
  if (!item) return;

  // The array index of the group to roll, and the parts that belong to it.
  const idx = event.currentTarget.dataset.group;
  const parts = constructParts(item, idx);
  if (!parts) return;

  // A clone of the item with different damage parts.
  const clone = constructClone(item, parts);

  // Additional configurations for the damage roll.
  const spellLevel = event.currentTarget.closest("[data-spell-level]")?.dataset.spellLevel;
  const versatile = event.currentTarget.dataset.action.endsWith("versatile");

  // Return the damage roll.
  return clone.rollDamage({event, spellLevel, versatile});
}

/**
 * Roll a damage group from an item. Added to the item class.
 * @param {number} rollgroup      The index of the rollgroup to roll.
 * @params See Item5e#rollDamage for the remaining params and return value.
 */
export async function rollDamageGroup({
  rollgroup = 0,
  critical = false,
  event = null,
  spellLevel = null,
  versatile = false,
  options = {}
} = {}) {
  const group = this.getFlag(MODULE, "config.groups");
  if (!group?.length) {
    return this.rollDamage({critical, event, spellLevel, versatile, options});
  }

  // Bail out prematurely if the given rollgroup is empty or does not exist.
  const indices = group[rollgroup]?.parts;
  if (!indices?.length) {
    ui.notifications.error("ROLLGROUPS.RollGroupEmpty", {localize: true});
    return null;
  }

  // Construct the damage parts and the clone.
  const parts = constructParts(this, rollgroup);
  if (!parts) return null;
  const clone = constructClone(this, parts);
  return clone.rollDamage({critical, event, spellLevel, versatile, options});
}

/**
 * Construct a clone of an item using a subset of its damage parts.
 * @param {Item} item         The original item.
 * @param {array[]} parts     The damage parts to use.
 * @returns  {Item}           The clone of the item.
 */
function constructClone(item, parts) {
  const clone = item.clone({"system.damage.parts": parts}, {keepId: true});
  if (item._ammo) {
    clone._ammo = item._ammo;
    delete item._ammo;
  }
  return clone;
}

/**
 * General method to construct the damage parts for the clone, given an integer denoting the rollgroup.
 * @param {Item} item       The item or clone.
 * @param {number} idx      The index of the rollgroup, as found in its flag data.
 * @returns {array[]}       The array of damage parts.
 */
function constructParts(item, idx) {
  const indices = item.flags[MODULE].config.groups[idx]?.parts ?? [];
  const group = item.system.damage.parts.reduce((acc, part, i) => {
    if (indices.includes(i)) acc.push(part);
    return acc;
  }, []);
  // there were no valid damage formulas.
  if (!group.length) {
    ui.notifications.error("ROLLGROUPS.RollGroupEmpty", {localize: true});
    return false;
  }
  return group;
}

/**
 * Find or create an item. If the message has embedded itemData, prefer that.
 * @param {PointerEvent} event      The initiating click event.
 * @returns {Item|null}             A found or constructed item, otherwise null.
 */
function findItem(event) {
  const button = event.currentTarget;
  const message = game.messages.get(button.closest("[data-message-id]").dataset.messageId);
  const itemData = message.flags[game.system.id]?.itemData;

  // Case 1: Embedded item data in the message, construct a temporary item.
  if (itemData) {
    const actor = fromUuidSync(button.dataset.actorUuid);
    if (!actor) {
      ui.notifications.error("ROLLGROUPS.ItemOwnerMissing", {localize: true});
      return null;
    }
    return new Item.implementation(itemData, {parent: actor});
  }

  // Case 2: No item data, find the existing item.
  else if (!itemData) {
    return fromUuidSync(button.dataset.itemUuid);
  }
}

/**
 * Adjust the flavor of damage rolls depending on the damage or healing types being used. If it is a pure
 * healing roll, label it as 'Healing'. If it is purely temp hp, label it 'Healing (Temp)', and if it is
 * anything else, label it as Damage (... the types).
 * Hooks on 'preRollDamage'.
 * @param {Item} item         The item being used.
 * @param {object} config     The configuration options for the damage roll.
 */
export function variantDamageLabels(item, config) {
  const labels = new Set(item.getDerivedDamageLabel().map(i => i.damageType));
  const isTemp = (labels.size === 1) && labels.has("temphp");
  const string = labels.every(t => {
    return t in CONFIG[game.system.id.toUpperCase()].healingTypes;
  }) ? `${game.system.id.toUpperCase()}.Healing` : `${game.system.id.toUpperCase()}.DamageRoll`;
  const actionFlavor = game.i18n.localize(string);
  const title = `${item.name} - ${actionFlavor}`;

  let flavor = title;
  if (isTemp) {
    flavor = `${title} (${game.i18n.localize(`${game.system.id.toUpperCase()}.Temp`)})`;
  } else if (item.labels.damageTypes.length) {
    flavor = `${title} (${item.labels.damageTypes})`;
  }
  foundry.utils.mergeObject(config, {title, flavor});
}

/**
 * Helper function to pick one of the actor's equipped melee weapons.
 * @param {PointerEvent} event      The initiating click event.
 * @returns // an attack roll, damage roll, or null.
 */
async function pickEquippedWeapon(event) {
  const picker = new WeaponPicker(event);
  const weps = picker.equippedWeapons;

  // Case 1: No equipped weapons. Bail out.
  if (!weps.length) {
    ui.notifications.warn(game.i18n.format("ROLLGROUPS.NoEquippedWeapons", {actor: picker.actor.name}));
    return null;
  }

  // Case 2: More than one weapon. Select one.
  else if (weps.length > 1) {
    return picker.render(true);
  }

  // Case 3: There is one weapon, and we want to roll attack.
  else if (event.currentTarget.dataset.action.endsWith("attack")) {
    return weps[0].rollAttack({event});
  }

  // Case 4: There is one weapon, and we want to roll damage - but it has rollgroups or is versatile.
  else if (weps[0].isVersatile || createDamageButtons(weps[0])) {
    return picker.render(true);
  }

  // Case 5: There is one weapon, and we want to roll damage, and it has only one formula.
  else {
    return weps[0].rollDamage({event, options: {parts: picker._scaleCantripDamage()}});
  }
}
