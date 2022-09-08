# Roll Groups

This module lets you configure multiple damage buttons for each item on an actor. For the formulas ('damage parts') in the item, you can group them in as many different combinations as you would like.

## How to use
On any item with at least two damage parts containing a formula, there is a configuration button next to the 'Damage Formula' header.

<p align="center">
    <img src="https://i.imgur.com/nurikBk.png">
</p>

Clicking this button opens the configuration menu. Create as many groups as you like, and give each a name. Tick any damage parts that should be included in the roll.

<p align="center">
    <img src="https://i.imgur.com/a8u6Wfw.png">
</p>

When using the item, the normal damage button is replaced with one button for each group. Configuring damage groups on an item will not affect any other attributes of the item. Specifically, the 'Versatile Damage' and 'Other Formula' fields will still be available and function identically to core system behavior.

<p align="center">
    <img src="https://i.imgur.com/cW0o2ie.png">
</p>

## Macros
The function `Item#rollDamageGroups` is added and works exactly as `Item#rollDamage`, and in addition accepts the key `rollgroup`, which is an integer denoting which group to roll (starting at zero).

## Spell Scaling
No special consideration needs to be kept in mind for spells. It works exactly as in core. A cantrip that scales with a scaling formula provided will add that formula at the appropriate levels, no matter the number of parts. A scaling cantrip with multiple formulas, and no specific scaling formula provided, will scale each formula that is rolled. Same as core system behavior. Leveled spells, as in core, will not scale unless a formula is provided. For more complex setups, consider using `@details.level` or `@item.level` in your formulas (for the character and spell level, respectively).

## Migrating from MRE to Roll Groups in v10
If you were using Minimal Rolling Enhancements in v9 and wish to migrate all actors in the world to using Roll Groups, this provided script will copy the roll group data of all the actors' items to the new format.

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

Similarly this script migrates all items in the item directory. If you replace the 'pack' attribute with the key of a compendium, it will migrate all items in that compendium instead.

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

### Complementary Modules
These modules have all been confirmed to work without issues and complement Roll Groups.
- Build-a-Bonus, for applying niche bonuses in situational circumstances.
- Effective Transferral, for applying effects through item usage and the chatlog.
