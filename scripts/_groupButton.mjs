import { GroupConfig } from "./_groupConfig.mjs";

export function createGroupButton(item, html){
    const length = item.system.damage?.parts.filter(([f]) => !!f).length;
    if ( !length || length < 2 ) return;
    const damageHeader = html[0].querySelector("h4.damage-header");
    if ( !damageHeader ) return;
    const editButton = document.createElement("A");
    editButton.classList.add("formula-group-config");
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    damageHeader.firstChild.after(editButton);

    // create listener.
    editButton.addEventListener("click", () => {
        new GroupConfig(item, {
            title: `Group Config: ${item.name}`
        }).render(true);
    });
}
