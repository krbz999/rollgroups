# Roll Groups
This module (for dnd5e and sw5e) lets you configure multiple damage buttons for each item on an actor. For the formulas ('damage parts') in the item, you can group them in as many different combinations as you would like.

## How to use
On any item containing a damage formula, there is a configuration button next to the 'Damage Formula' header.

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

### Complementary Modules
These modules have all been confirmed to work without issues and complement Roll Groups.
- [Build-a-Bonus](https://foundryvtt.com/packages/babonus), for applying niche bonuses in situational circumstances.
- [Effective Transferral](https://foundryvtt.com/packages/effective-transferral), for applying effects through item usage and the chatlog.
- [Faster Rolling By Default](https://foundryvtt.com/packages/faster-rolling-by-default-5e), for faster rolling of all the system's core rolls.
- [Visual Active Effects](https://foundryvtt.com/packages/visual-active-effects) combined with [Concentration Notifier](https://foundryvtt.com/packages/concentrationnotifier); the rollgroups buttons will display in the effects.

This module should not be used with RSR, WIRE, or MIDI.
