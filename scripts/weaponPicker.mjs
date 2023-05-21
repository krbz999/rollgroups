import {MODULE} from "./_constants.mjs";
import {createDamageButtons} from "./_createDamageButtons.mjs";

export class WeaponPicker extends Application {
  /**
   * @constructor
   * @param {PointerEvent} event      The initiating click event.
   */
  constructor(event) {
    super();
    this.actor = fromUuidSync(event.currentTarget.dataset.actorUuid);
    this.cantrip = this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId);
    this.equippedWeapons = this.actor.items.filter(item => {
      return (item.type === "weapon") && item.system.equipped && item.hasAttack && item.hasDamage;
    });
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE}/templates/weapon_picker.hbs`,
      classes: [MODULE, "weapon-picker"]
    });
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.PickWeapon", {name: this.cantrip.name});
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    data.weapons = this.equippedWeapons.map(w => ({weapon: w, context: createDamageButtons(w)}));
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("[data-action='attack']").forEach(n => {
      n.addEventListener("click", this._onClickAttack.bind(this));
    });
    html[0].querySelectorAll("[data-action='rollgroup-damage']").forEach(n => {
      n.addEventListener("click", this._onClickDamage.bind(this));
    });
    html[0].querySelector(".weapons").addEventListener("wheel", this._onScrollWeapons.bind(this));
    html[0].querySelectorAll("[data-action='roll']").forEach(n => {
      n.addEventListener("click", this._onQuickRoll.bind(this));
    });
  }

  /**
   * Handle quick-rolling by clicking a weapon's image.
   * @param {PointerEvent} event      The initiating click event.
   * @returns // See Item#rollAttack or Item#rollDamage.
   */
  async _onQuickRoll(event) {
    const weapon = this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId);
    const attack = await weapon.rollAttack({event});
    if (!attack) return null;
    this.close();
    return weapon.rollDamageGroup({options: {parts: this._scaleCantripDamage()}});
  }

  /**
   * Scroll horizontal rather than vertical on the weapons.
   * @param {PointerEvent} event      The initiating wheel event.
   */
  _onScrollWeapons(event) {
    event.preventDefault();
    event.currentTarget.scrollLeft += 1.5 * event.deltaY;
  }

  /**
   * Handle rolling an attack roll with a given weapon.
   * @param {PointerEvent} event      The initiating click event.
   * @returns // See Item#rollAttack.
   */
  async _onClickAttack(event) {
    return this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId).rollAttack({event});
  }

  /**
   * Handle rolling a damage roll with a given weapon.
   * @param {PointerEvent} event      The initiating click event.
   * @returns // See Item#rollDamage.
   */
  async _onClickDamage(event) {
    const weapon = this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId);
    this.close();

    const parts = this._scaleCantripDamage();
    const versatile = "versatile" in event.currentTarget.dataset; // Whether to roll versatile damage.
    const group = "group" in event.currentTarget.dataset; // Whether to roll a specific group.

    const config = {event, options: {parts}, versatile};
    if (versatile) config.rollgroup = weapon.flags[MODULE]?.config?.versatile ?? 0;
    else if (group) config.rollgroup = event.currentTarget.dataset.group;
    return weapon.rollDamageGroup(config);
  }

  /**
   * Get the formula to append to a damage roll from the blade cantrip.
   * @returns {string[]}      A 1-length array with the formula to append.
   */
  _scaleCantripDamage() {
    const part = this.cantrip.system.damage.parts[0];
    const level = this.actor.system.details.level ?? Math.floor(this.actor.system.details.cr);
    const add = Math.floor((level + 1) / 6);
    const formula = new Roll(part[0]).alter(0, add).formula;
    return [`${formula}[${part[1]}]`];
  }
}
