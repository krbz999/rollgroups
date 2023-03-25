import {MODULE} from "./_constants.mjs";
import {GroupConfig} from "./_groupConfig.mjs";

export function createConfigButton(sheet, html) {
  const item = sheet.object;
  const length = item.system.damage?.parts?.length;
  const damageHeader = html[0].querySelector("h4.damage-header");
  if (!damageHeader) return;
  const editButton = document.createElement("A");
  const locale = game.i18n.localize("ROLLGROUPS.CONFIG.BUTTON");
  editButton.classList.add(MODULE, "config-button");
  editButton.innerHTML = `${locale} <i class='fa-solid fa-edit'></i>`;
  editButton.setAttribute("data-tooltip", "ROLLGROUPS.CONFIG.TITLE");
  damageHeader.firstChild.after(editButton);

  // create listener.
  if (!sheet.isEditable || !length) return;
  editButton.addEventListener("click", () => {
    new GroupConfig(item).render(true);
  });
}
