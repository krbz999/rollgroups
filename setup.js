import { createGroupButton } from "./scripts/_groupButton.mjs";

Hooks.on("dnd5e.preDisplayCard", (item, data) => {
    const el = document.createElement("DIV");
    el.innerHTML = data.content;
    const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
    if ( !damageButton ) return;

    const groups = item.getFlag("rollgroups", "config.groups");
    if ( !groups?.length ) return;

    const dmg = document.createElement("DIV");
    const group = groups.reduce((acc, {label, parts}) => {
        const r = "rollgroup-damage";
        const p = parts.join(";");
        const u = item.uuid;
        return acc + `
        <button data-action="${r}" data-group-parts="${p}" data-item-uuid="${u}">
            ${label}
        </button>
        `;
    }, "");
    dmg.innerHTML = group;
    damageButton.after(...dmg.children);
    damageButton.remove();
    data.content = el.innerHTML;
});

Hooks.on("renderChatLog", (chatLog, html) => {
    html[0].addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action='rollgroup-damage']");
        if ( !button ) return;
        let {itemUuid, groupParts} = button.dataset;
        const {messageId} = button.closest(".chat-message.message.flexcol").dataset;
        const {spellLevel} = button.closest(".dnd5e.chat-card.item-card").dataset;
        const message = game.messages.get(messageId);
        const itemData = message.getFlag("dnd5e", "itemData");

        let item;
        if ( !itemData ) {
            item = fromUuidSync(itemUuid);
        } else {
            // create temporary item from itemData.
        }
        const parts = item.system.damage.parts;
        groupParts = groupParts.split(";").reduce((acc, i) => {
            if ( i < parts.length ) acc.push( parts[i] );
            return acc;
        }, []);
        if ( !groupParts.length ) {
            ui.notifications.error(game.i18n.localize("ROLLGROUPS.WARN.NO_FORMULAS"));
            return;
        }
        const clone = item.clone({ "system.damage.parts": groupParts }, {keepId: true});
        clone.prepareData();
        return clone.rollDamage({spellLevel, event});
    });
});

Hooks.on("renderItemSheet", (sheet, html) => {
    createGroupButton(sheet.object, html);
});
