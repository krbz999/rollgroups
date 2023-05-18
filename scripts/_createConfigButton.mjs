import {MODULE} from "./_constants.mjs";
import {GroupConfig} from "./_groupConfig.mjs";

/**
 * Create the button in item sheets to open the roll groups config menu.
 * Hooks on 'renderItemSheet'.
 * @param {ItemSheet} sheet       The sheet of an item.
 * @param {HTMLElement} html      The element of the sheet.
 */
export function createConfigButton(sheet, html) {
  const addDamage = html[0].querySelector(".add-damage");
  if (!addDamage) return;
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
