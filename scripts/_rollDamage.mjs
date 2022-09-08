export function createChatLogListeners(html){
    html[0].addEventListener("click", (event) => {
        
        const button = event.target.closest("button[data-action='rollgroup-damage']");
        if ( !button ) return;
        
        const item = findItem(button);
        if ( !item ) return;

        const parts = constructPartsFromCard(item, button);
        if ( !parts ) return;
        
        const clone = constructClone(item, parts);
        
        const {spellLevel} = button.closest(".dnd5e.chat-card.item-card").dataset;
        return clone.rollDamage({ spellLevel, event });
    });
}

export async function rollDamageGroup({rollgroup=0, critical=false, event=null, spellLevel=null, versatile=false, options={}} = {}){
    const group = this.getFlag("rollgroups", "config.groups");
    if ( !group?.length ) {
        ui.notifications.error(game.i18n.localize("ROLLGROUPS.WARN.NO_GROUPS"));
        return null;
    }
    const indices = group[rollgroup]?.parts;
    if ( !indices?.length ) {
        ui.notifications.error(game.i18n.localize("ROLLGROUPS.WARN.NO_FORMULAS"));
        return null;
    }
    const parts = constructParts(this, indices);
    const clone = constructClone(this, parts);
    return clone.rollDamage({ critical, event, spellLevel, versatile, options });
}

function constructClone(item, parts){
    const clone = item.clone({ "system.damage.parts": parts }, { keepId: true });
    if ( item._ammo ) {
        clone._ammo = item._ammo;
        delete item._ammo;
    }
    return clone;
}

// card's method to retrieve the array of integers to construct the parts from.
function constructPartsFromCard(item, button){
    const groupParts = button.dataset.groupParts?.split(";");
    const group = constructParts(item, groupParts);
    return group;
}

// general method to construct the PARTS for the clone, given an array of integers.
function constructParts(item, groupParts){
    const {parts} = item.system.damage;
    const group = groupParts.reduce((acc, i) => {
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

/*  
    Adjustments to 'damage' roll labels.
    Pure healing rolls show "Healing",
    Pure temphp rolls show "Healing (Temp)",
    Anything else shows "Damage (...types)"
*/
export function variantDamageLabels(item, config){
    const labels = new Set(item.getDerivedDamageLabel().map(i => {
        return i.damageType;
    }));
    const isTemp = labels.size === 1 && labels.first() === "temphp";
    const string = labels.every(t => {
        return t in CONFIG.DND5E.healingTypes;
    }) ? "DND5E.Healing" : "DND5E.DamageRoll";
    const actionFlavor = game.i18n.localize(string);
    const title = `${item.name} - ${actionFlavor}`;
    
    let flavor = title;
    if ( isTemp ) {
        flavor = `${title} (${game.i18n.localize("DND5E.Temp")})`;
    }
    else if ( item.labels.damageTypes.length ) {
        flavor = `${title} (${item.labels.damageTypes})`;
    }
    
    foundry.utils.mergeObject(config, { title, flavor });
}
