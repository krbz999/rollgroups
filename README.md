Interested in following along with development of any of my modules? Join the [Discord server](https://discord.gg/QAG8eWABGT).

This module lets you configure multiple damage buttons for each item on an actor. For the formulas ('damage parts') in the item, you can group them in as many different combinations as you would like. Additionally, you can add as many saving throw buttons as you like as well, for those rare items that have more than one type of saving throw.

## How to use
On any item containing a damage formula, there is a configuration button next to the 'Damage Formula' header. To configure additional saving throws, there is a '+' icon next to the regular save.

<p align="center">
  <img src="https://i.imgur.com/7Ff9qGk.png">
</p>

Clicking either of these buttons opens a configuration menu. Create as many groups as you like, and give each a name. Tick any damage parts that should be included in the roll. When using the item, the normal damage button is replaced with one button for each group. Configuring damage groups on an item will not affect any other attributes of the item. For saving throws, simply tick boxes in its separate menu.

<p align="center">
  <img src="https://i.imgur.com/nppIiu1.png">
  <img src="https://i.imgur.com/p3QEodD.png">
  <img src="https://i.imgur.com/AUNeJcJ.png">
</p>

## Versatile Damage
In the group config, when adjusting the roll groups of an item with a formula in 'Versatile', you can denote which group should be rolled when clicking that button in the chat log.

<p align="center">
  <img src="https://i.imgur.com/VY5gPul.png">
</p>

## Blade Cantrips
The module has additional support for blade cantrips such as 'Booming Blade' and 'Green-Flame Blade'. In the group config, when adjusting a cantrip that has a damage formula, you can check the box to denote this as a 'Blade Cantrip'. When the spell is cast, the caster will then be given a button in the item's message to let them quickly roll attack and damage (with the cantrip's damage added on top) with one of their equipped weapons.

<p align="center">
  <img src="https://i.imgur.com/wK724hF.png">
  <img src="https://i.imgur.com/8RK0ovM.png">
</p>

## Macros
The function `Item5e#rollDamageGroup` is added and works exactly as `Item5e#rollDamage`, and in addition accepts the key `rollgroup`, which is an integer denoting which group to roll (starting at zero).
