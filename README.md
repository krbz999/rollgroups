# Roll Groups

This module lets you configure multiple damage buttons for each item on an actor. For the formulas ('damage parts') in the item, you can group them in as many different combinations as you would like.

## How to use
On any item with at least two well-defined damage parts, there is a configuration button next to the formulas. Clicking this button opens the configuration menu.

<p style="text-align: center;">
    <img src="https://i.imgur.com/l8nvcTk.png">
</p>

Create as many groups as you like, and give each a name. Tick off any parts that should be included in the roll.

<p style="text-align: center;">
    <img src="https://i.imgur.com/K1O67Uz.png">
</p>

When using the item, the normal damage button is replaced with a button for each of the groups. Configuring damage groupos will not any other attributes of the item. Specifically, the Versatile and Other fields will still be available.

<p style="text-align: center;">
    <img src="https://i.imgur.com/cW0o2ie.png">
</p>

## Macros
The function `Item#rollDamageGroups` is added and works exactly as `Item#rollDamage`, and in addition accepts the key `rollgroup`, which is an integer denoting which group to roll (starting at zero).

## Spell Scaling
No special consideration needs to be kept in mind for spells. It works exactly as in core. A cantrip that scales with a scaling formula provided will add that formula at the appropriate levels, no matter the number of parts. A scaling cantrip with multiple formulas, and no specific scaling formula provided, will scale each formula that is rolled. Same as core system behavior. Leveled spells, as in core, will not scale unless a formula is provided. For more complex setups, consider using `@details.level` or `@item.level` in your formulas (for the character and spell level, respectively).

## Migrating from Minimal Rolling Enhancements to Roll Groups in v10
If you wish to migrate all actors in the world from using MRE to using RG, this provided script will copy the roll group data of all their items into the new location.

```js
for ( const a of game.actors ) {
    console.log(`ROLLGROUPS: Migrating ${a.name}'s items.`);
    const items = a.items.filter(i => {
        return i.flags["mre-dnd5e"]?.formulaGroups?.length > 1;
    });
    const updates = items.map(i => {
        let string = JSON.stringify(i.flags["mre-dnd5e"].formulaGroups);
        string = string.replaceAll("formulaSet", "parts");
        const object = JSON.parse(string);
        return {_id: i.id, "flags.rollgroups.config.groups": object};
    });
    await a.updateEmbeddedDocuments("Item", updates);
    console.log(`ROLLGROUPS: Successfully migrated ${a.name}'s items.`);
}
```

Similarly this script migrates all items in the item directory. Replacing the 'pack' attribute with the key of a compendium will migrate all items in that compendium instead.

```js
console.log(`ROLLGROUPS: Migrating all items.`);
const updates = game.items.filter(i => {
    return i.flags["mre-dnd5e"]?.formulaGroups?.length > 1;
}).map(i => {
    let string = JSON.stringify(i.flags["mre-dnd5e"].formulaGroups);
    string = string.replaceAll("formulaSet", "parts");
    const object = JSON.parse(string);
    return {_id: i.id, "flags.rollgroups.config.groups": object};
});
const updated = await Item.updateDocuments(updates, {pack: undefined});
console.log(`ROLLGROUPS: Successfully mgirated ${updated.length} items.`);
```
