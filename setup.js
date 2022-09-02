import { createGroupButton } from "./scripts/_groupButton.mjs";

Hooks.on("setup", () => {
    Handlebars.registerHelper("checkgroup", (parts, index) => {
        if ( parts.includes(index) ) return "checked";
        return "";
    });
});

Hooks.on("dnd5e.preDisplayCard", (item, data) => {
    const el = document.createElement("DIV");
    el.innerHTML = data.content;
    const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
    if ( !damageButton ) return;

    const groups = item.getFlag("rollgroups", "config.groups");
    if ( !groups?.length ) return;
    for ( let {label, parts} of groups ){
        const dmg = document.createElement("BUTTON");
        dmg.setAttribute("data-action", "damage-group");
        dmg.setAttribute("data-group-index", label.slugify());
        dmg.setAttribute("data-item-uuid", item.uuid);
        dmg.innerText = `Roll Damage (${label})`;
        damageButton.after(dmg);
    }
    damageButton.remove();
    data.content = el.innerHTML;
});

Hooks.on("renderChatLog", (chatLog, html) => {
    html[0].addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action='damage-group']");
        if ( !button ) return;
        const {groupIndex, itemUuid} = button.dataset;
        const item = fromUuidSync(itemUuid);
        const indices = item.getFlag("rollgroups", "config.groups").find(({label}) => {
            return label.slugify() === groupIndex;
        });
        const parts = indices?.parts.map(i => item.system.damage.parts[i]);
        const clone = item.clone({"system.damage.parts": parts}, {keepId: true});
        return clone.rollDamage({event});
    });
});

Hooks.on("renderItemSheet", (sheet, html) => {
    createGroupButton(sheet.object, html);
});


/* .......... */ 
export function createGroupButton(item, html){
    const length = item.system.damage?.parts.length;
    if ( !length || length < 2 ) return;
    const damageHeader = html[0].querySelector("h4.damage-header");
    if ( !damageHeader ) return;
    const editButton = document.createElement("A");
    editButton.classList.add("formula-group-config");
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    damageHeader.firstChild.after(editButton);

    // create listener.
    editButton.addEventListener("click", (event) => {
        new GroupConfig(item, {
            title: `Group Config: ${item.name}`
        }).render(true);
    });
}
