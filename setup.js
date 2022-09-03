import { createGroupButton } from "./scripts/_groupButton.mjs";

Hooks.on("dnd5e.preDisplayCard", (item, data) => {
    const el = document.createElement("DIV");
    el.innerHTML = data.content;
    const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
    if ( !damageButton ) return;

    const groups = item.getFlag("rollgroups", "config.groups");
    if ( !groups?.length ) return;

    const dmg = document.createElement("DIV");
    const group = groups.reduce(({label, parts}) => {
        return acc + `<button
        data-action="rollgroup-damage"
        data-group-parts="${parts.join(";")}"
        data-item-uuid="${item.uuid}"
        >${label}</button>`;
    });
    dmg.innerHTML = group;
    damageButton.after(...dmg.children);
    damageButton.remove();
    data.content = el.innerHTML;
});

Hooks.on("renderChatLog", (chatLog, html) => {
    html[0].addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action='rollgroup-damage']");
        if ( !button ) return;
        let {itemUuid, parts} = button.dataset;
        const {level, messageId} = button.closest(".item-card").dataset;
        const message = game.messages.get(messageId);
        const itemData = message.getFlag("dnd5e", "itemData");

        let item;
        if ( !itemData ) {
            item = fromUuidSync(itemUuid);
        } else {
            // create temporary item from itemData.
        }
        parts = parts.split(";").reduce((acc, i) => {
            acc.push( item.system.damage.parts[i] );
            return acc;
        }, []);
        const clone = item.clone({
            "system.damage.parts": parts,
            "system.level": level !== undefined ? Number(level) : undefined
        }, {keepId: true});
        return clone.rollDamage({event});
    });
});

Hooks.on("renderItemSheet", (sheet, html) => {
    createGroupButton(sheet.object, html);
});
