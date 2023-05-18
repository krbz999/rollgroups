import {MODULE} from "./_constants.mjs";
import {GroupConfig} from "./_groupConfig.mjs";

export function createConfigButton(sheet, html) {
  const addDamage = html[0].querySelector(".add-damage");
  if (!addDamage) return;
  const div = document.createElement("DIV");
  div.innerHTML = `
  <a class="${MODULE} config-button" data-tooltip="ROLLGROUPS.CONFIG.TITLE">
    ${game.i18n.localize("ROLLGROUPS.CONFIG.BUTTON")} <i class="fa-solid fa-edit"></i>
  </a>`;
  if (sheet.isEditable) {
    div.querySelector("A").addEventListener("click", () => {
      new GroupConfig(sheet.document).render(true);
    });
  }
  addDamage.after(div.firstElementChild);
}
