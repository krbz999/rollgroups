export function createDamageButtons(item, data){
    const el = document.createElement("DIV");
    el.innerHTML = data.content;
    const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
    if ( !damageButton ) return;

    const groups = item.getFlag("rollgroups", "config.groups");
    const validFormulas = item.system.damage?.parts.filter(([f]) => !!f).length;
    if ( !groups?.length || validFormulas < 2 ) return;

    const dmg = document.createElement("DIV");
    const group = groups.reduce((acc, {label, parts}) => {
        const r = "rollgroup-damage";
        const p = parts.join(";");
        const u = item.uuid;
        const a = item.parent.uuid;
        return acc + `
        <button data-action="${r}" data-group-parts="${p}" data-item-uuid="${u}" data-actor-uuid="${a}">
            ${label}
        </button>
        `;
    }, "");
    dmg.innerHTML = group;
    damageButton.after(...dmg.children);
    damageButton.remove();
    data.content = el.innerHTML;
}
