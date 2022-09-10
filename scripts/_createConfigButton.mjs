import { MODULE } from "./_constants.mjs";
import { GroupConfig } from "./_groupConfig.mjs";

export function createConfigButton(item, html){
    const length = item.system.damage?.parts.filter(([f]) => {
        return !!f;
    }).length ?? 0;
    const damageHeader = html[0].querySelector("h4.damage-header");
    if ( !damageHeader ) return;
    const editButton = document.createElement("A");
    const locale = game.i18n.localize("ROLLGROUPS.CONFIG.BUTTON");
    editButton.classList.add(MODULE, "config-button");
    editButton.innerHTML = `${locale} <i class='fas fa-edit'></i>`;
    editButton.title = game.i18n.localize("ROLLGROUPS.CONFIG.TITLE");
    damageHeader.firstChild.after(editButton);
    
    // disable it?
    const disabled = !item.sheet.isEditable || !(length > 1);
    if ( disabled ) editButton.classList.add("disabled");

    // create listener.
    editButton.addEventListener("click", () => {
        new GroupConfig(item, {
            title: `Group Config: ${item.name}`
        }).render(true);
    });
}
