import {MODULE} from "./_constants.mjs";
import {GroupConfig} from "./config-damage.mjs";
import {SaveConfig} from "./config-save.mjs";

/**
 * Create the damage buttons on a chat card when an item is used.
 * Hooks on 'preDisplayCard'.
 * @param {Item} item       The item being displayed.
 * @param {object} data     The data object of the message to be created.
 */
export function manageCardButtons(item, data) {
  const el = document.createElement("DIV");
  el.innerHTML = data.content;
  const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
  const config = item.flags[MODULE]?.config ?? {};

  if (damageButton) {
    const buttons = createDamageButtons(item);
    if (buttons) {
      const div = document.createElement("DIV");
      div.innerHTML = buttons;
      damageButton.after(...div.children);
      damageButton.remove();
    }

    // Adjust the 'Versatile' button.
    if (buttons && Number.isNumeric(config.versatile) && item.isVersatile) {
      const vers = el.querySelector("[data-action='versatile']");
      vers.setAttribute("data-action", "rollgroup-damage-versatile");
      vers.setAttribute("data-group", config.versatile);
      vers.setAttribute("data-item-uuid", item.uuid);
      vers.setAttribute("data-actor-uuid", item.actor.uuid);
    }

    // Create Blade Cantrip buttons if eligible and is enabled.
    if (config.bladeCantrip && (item.type === "spell") && (item.system.level === 0) && item.hasDamage) {
      const div = document.createElement("DIV");
      div.innerHTML = `
      <hr>
      <button data-action="rollgroup-bladecantrip-attack" data-actor-uuid="${item.actor.uuid}">
        ${game.i18n.localize("ROLLGROUPS.BladeCantripAttack")}
      </button>
      <button data-action="rollgroup-bladecantrip-damage" data-actor-uuid="${item.actor.uuid}">
        ${game.i18n.localize("ROLLGROUPS.BladeCantripDamage")}
      </button>`;
      el.querySelector(".card-buttons").append(...div.children);
    }
  }

  // Add more saving throw buttons.
  const saveButtons = createSaveButtons(item);
  if (saveButtons) {
    const save = el.querySelector("button[data-action=save]");
    if (save) {
      const div = document.createElement("DIV");
      div.innerHTML = saveButtons;
      save.after(...div.children);
    }
  }

  data.content = el.innerHTML;
}

/**
 * Helper function to construct the html for the damage buttons. This function does not
 * mutate item data, cards, or anything else.
 * @param {Item} item         The item to retrieve data from.
 * @returns {string|null}     The constructed buttons, as a string, or null if there are no buttons to be made.
 */
export function createDamageButtons(item) {
  const config = item.flags[MODULE]?.config ?? {};
  const validParts = item.system.damage.parts.filter(([f]) => !!f);

  const hasGroups = config.groups?.length && (validParts.length > 1);
  if (!hasGroups) return null;

  // various labels.
  const damageLabel = game.i18n.localize("ROLLGROUPS.Damage");
  const healingLabel = game.i18n.localize("ROLLGROUPS.Healing");
  const mixedLabel = game.i18n.localize("ROLLGROUPS.Mixed");

  // the button html.
  const group = config.groups.reduce((acc, {label, parts}, idx) => {
    const btn = document.createElement("BUTTON");
    btn.setAttribute("data-action", "rollgroup-damage");
    btn.setAttribute("data-group", idx);
    btn.setAttribute("data-item-uuid", item.uuid);
    btn.setAttribute("data-actor-uuid", item.actor.uuid);

    const types = parts.map(t => validParts[t][1]);
    const isDamage = types.every(t => t in CONFIG[game.system.id.toUpperCase()].damageTypes);
    const isHealing = types.every(t => t in CONFIG[game.system.id.toUpperCase()].healingTypes);
    const lab = isDamage ? damageLabel : isHealing ? healingLabel : mixedLabel;
    btn.innerHTML = `${lab} (${label})`;

    acc.appendChild(btn);
    return acc;
  }, document.createElement("DIV"));

  return group.innerHTML;
}

/**
 * Helper function to construct the html for saving throw buttons.
 * @param {Item} item
 * @returns {string|null}
 */
export function createSaveButtons(item) {
  if (!item.hasSave) return null;
  const system = game.system.id.toUpperCase();
  const saves = (item.flags[MODULE]?.config?.saves ?? []).filter(abi => {
    return (abi !== item.system.save.ability) && (abi in CONFIG[system].abilities);
  });
  if (!saves.length) return null;

  const div = document.createElement("DIV");
  for (const abi of saves) {
    const btn = document.createElement("BUTTON");
    btn.setAttribute("data-action", "save");
    btn.setAttribute("data-ability", abi);
    const dc = item.getSaveDC();
    const ability = CONFIG[system].abilities[abi].label;
    btn.innerHTML = `${game.i18n.localize(`${system}.SavingThrow`)} ${game.i18n.format(`${system}.SaveDC`, {dc, ability})}`;
    div.appendChild(btn);
  }
  return div.innerHTML;
}

/**
 * Create the button in item sheets to open the roll groups config menu.
 * Hooks on 'renderItemSheet'.
 * @param {ItemSheet} sheet       The sheet of an item.
 * @param {HTMLElement} html      The element of the sheet.
 */
export function createConfigButton(sheet, html) {
  const addDamage = html[0].querySelector(".add-damage");
  if (addDamage) {
    const div = document.createElement("DIV");
    div.innerHTML = `
    <a class="${MODULE} config-button" data-tooltip="ROLLGROUPS.OpenConfig">
      ${game.i18n.localize("ROLLGROUPS.GroupConfig")} <i class="fa-solid fa-edit"></i>
    </a>`;
    if (sheet.isEditable) {
      div.querySelector("A").addEventListener("click", () => {
        new GroupConfig(sheet.document).render(true);
      });
    }
    addDamage.after(div.firstElementChild);
  }

  const saveScaling = html[0].querySelector("[name='system.save.scaling']");
  if (saveScaling) {
    const div = document.createElement("DIV");
    div.innerHTML = `
    <a class="${MODULE} save-config-button" data-tooltip="ROLLGROUPS.OpenSaveConfig">
      <i class="fa-solid fa-plus"></i>
    </a>`;
    if (sheet.isEditable) {
      div.querySelector("A").addEventListener("click", () => {
        new SaveConfig(sheet.document).render(true);
      });
    }
    saveScaling.after(div.firstElementChild);
  }
}
