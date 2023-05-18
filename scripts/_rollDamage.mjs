import {MODULE} from "./_constants.mjs";

/**
 * Create the listener for each rollgroups button in a chat message.
 * Hooks on 'renderChatMessage'.
 * @param {ChatMessage} message     The message being rendered.
 * @param {HTMLElement} html        The element of the message.
 */
export function createChatLogListeners(message, html) {
  html[0].querySelectorAll("[data-action^='rollgroup']").forEach(n => n.addEventListener("click", (event) => {
    const item = findItem(event.currentTarget);
    if (!item) return;

    const idx = event.currentTarget.dataset.group;
    const parts = constructParts(item, idx);
    if (!parts) return;

    const clone = constructClone(item, parts);

    const spellLevel = event.currentTarget.closest("[data-spell-level]")?.dataset.spellLevel;
    const versatile = event.currentTarget.dataset.action.endsWith("versatile");
    return clone.rollDamage({spellLevel, event, versatile});
  }));
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
  const indices = group[rollgroup]?.parts;
  if (!indices?.length) {
    ui.notifications.error("ROLLGROUPS.RollGroupEmpty", {localize: true});
    return null;
  }
  const parts = constructParts(this, indices);
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
 * @param {HTMLElement} button      The button that was clicked.
 * @returns {Item}                  A found or constructed item.
 */
function findItem(button) {
  const message = game.messages.get(button.closest(".chat-message.message.flexcol").dataset.messageId);
  const itemData = message.flags[game.system.id]?.itemData;

  let item;
  if (!itemData) {
    item = fromUuidSync(button.dataset.itemUuid);
  } else {
    const actor = fromUuidSync(button.dataset.actorUuid);
    if (!actor) {
      ui.notifications.error("ROLLGROUPS.ItemOwnerMissing", {localize: true});
      return false;
    }
    item = new Item.implementation(itemData, {parent: actor});
  }
  return item;
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
