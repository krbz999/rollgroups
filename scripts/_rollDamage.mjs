import {MODULE} from "./_constants.mjs";

export function createChatLogListeners(message, html) {
  html[0].querySelectorAll("[data-action^='rollgroup']").forEach(n => n.addEventListener("click", (event) => {
    const item = findItem(event.currentTarget);
    if (!item) return;

    const parts = constructPartsFromCard(item, event.currentTarget);
    if (!parts) return;

    const clone = constructClone(item, parts);

    const spellLevel = event.currentTarget.closest("[data-spell-level]")?.dataset.spellLevel;
    const versatile = event.currentTarget.dataset.action.endsWith("versatile");
    return clone.rollDamage({spellLevel, event, versatile});
  }));
}

export async function rollDamageGroup({rollgroup = 0, critical = false, event = null, spellLevel = null, versatile = false, options = {}} = {}) {
  const group = this.getFlag(MODULE, "config.groups");
  if (!group?.length) {
    return this.rollDamage({critical, event, spellLevel, versatile, options});
  }
  const indices = group[rollgroup]?.parts;
  if (!indices?.length) {
    ui.notifications.error("ROLLGROUPS.WARN.NO_FORMULAS", {localize: true});
    return null;
  }
  const parts = constructParts(this, indices);
  const clone = constructClone(this, parts);
  return clone.rollDamage({critical, event, spellLevel, versatile, options});
}

function constructClone(item, parts) {
  const clone = item.clone({"system.damage.parts": parts}, {keepId: true});
  if (item._ammo) {
    clone._ammo = item._ammo;
    delete item._ammo;
  }
  return clone;
}

// card's method to retrieve the array of integers to construct the parts from.
function constructPartsFromCard(item, button) {
  const idx = button.dataset.group;
  const group = constructParts(item, idx);
  return group;
}

// general method to construct the PARTS for the clone, given an array of integers.
function constructParts(item, idx) {
  const {parts} = item.system.damage;
  const indices = item.flags[MODULE].config.groups[idx]?.parts ?? [];
  const group = parts.reduce((acc, part, i) => {
    if (indices.includes(i)) acc.push(part);
    return acc;
  }, []);
  // there were no valid damage formulas.
  if (!group.length) {
    ui.notifications.error("ROLLGROUPS.WARN.NO_FORMULAS", {localize: true});
    return false;
  }
  return group;
}

function findItem(button) {
  const {itemUuid, actorUuid} = button.dataset;
  const {messageId} = button.closest(".chat-message.message.flexcol").dataset;
  const message = game.messages.get(messageId);
  const itemData = message.getFlag(game.system.id, "itemData");

  let item;
  if (!itemData) {
    item = fromUuidSync(itemUuid);
  } else {
    const actor = fromUuidSync(actorUuid);
    if (!actor) {
      ui.notifications.error("ROLLGROUPS.WARN.NO_ACTOR", {localize: true});
      return false;
    }
    item = new Item.implementation(itemData, {parent: actor});
  }
  return item;
}

/*
  Adjustments to 'damage' roll labels.
  Pure healing rolls show "Healing",
  Pure temphp rolls show "Healing (Temp)",
  Anything else shows "Damage (...types)"
*/
export function variantDamageLabels(item, config) {
  const labels = new Set(item.getDerivedDamageLabel().map(i => {
    return i.damageType;
  }));
  const isTemp = labels.size === 1 && labels.first() === "temphp";
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
