import { GroupConfig } from "./_groupConfig.mjs";

export function createConfigButton(item, html){
    if ( !item.sheet.isEditable ) return;
    const length = item.system.damage?.parts.filter(([f]) => !!f).length;
    if ( !length || length < 2 ) return;
    const damageHeader = html[0].querySelector("h4.damage-header");
    if ( !damageHeader ) return;
    const editButton = document.createElement("A");
    const locale = game.i18n.localize("ROLLGROUPS.CONFIG.BUTTON");
    editButton.classList.add("rollgroups", "config-button");
    editButton.innerHTML = `${locale} <i class='fas fa-edit'></i>`;
    damageHeader.firstChild.after(editButton);

    // create listener.
    editButton.addEventListener("click", () => {
        new GroupConfig(item, {
            title: `Group Config: ${item.name}`
        }).render(true);
    });
}
