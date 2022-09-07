export function createChatLogListeners(html){
    html[0].addEventListener("click", (event) => {
        
        const button = event.target.closest("button[data-action='rollgroup-damage']");
        if ( !button ) return;
        
        const item = findItem(button);
        if ( !item ) return;

        const parts = constructParts(button, item);
        if ( !parts ) return;
        
        const clone = item.clone({ "system.damage.parts": parts }, { keepId: true });
        if ( item._ammo ) {
            clone._ammo = item._ammo;
            delete item._ammo;
        }
        
        const {spellLevel} = button.closest(".dnd5e.chat-card.item-card").dataset;
        return clone.rollDamage({ spellLevel, event });
    });
}

function constructParts(button, item){
    
    const {groupParts} = button.dataset;
    const {parts} = item.system.damage;
    
    // construct the group from the item's formulas.
    const group = groupParts?.split(";").reduce((acc, i) => {
        if ( i < parts.length ) acc.push( parts[i] );
        return acc;
    }, []);

    // there were no valid damage formulas.
    if ( !group?.length ) {
        ui.notifications.error(game.i18n.localize("ROLLGROUPS.WARN.NO_FORMULAS"));
        return false;
    }

    return group;
}

function findItem(button){

    const {itemUuid, actorUuid} = button.dataset;
    const {messageId} = button.closest(".chat-message.message.flexcol").dataset;
    const message = game.messages.get(messageId);
    const itemData = message.getFlag("dnd5e", "itemData");

    let item;
    if ( !itemData ) {
        item = fromUuidSync(itemUuid);
    } else {
        const actor = fromUuidSync(actorUuid);
        if ( !actor ) {
            ui.notifications.error(game.i18n.localize("ROLLGROUPS.WARN.NO_ACTOR"));
            return false;
        }
        item = new Item.implementation(itemData, { parent: actor });
    }

    return item;
}
