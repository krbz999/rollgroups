import {MODULE} from "./_constants.mjs";

export class SaveConfig extends FormApplication {
  /**
   * @constructor
   * @param {Item} item           The item to whom this config belongs.
   */
  constructor(item) {
    super(item);
    this.item = item;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE}/templates/save_config.hbs`,
      classes: [MODULE, "save-config"]
    });
  }

  /** @override */
  get id() {
    return `${MODULE}-saveconfig-${this.item.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.SaveConfigName", {name: this.item.name});
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    const config = this.item.flags[MODULE]?.config?.saves ?? [];
    data.abilities = Object.entries(CONFIG[game.system.id.toUpperCase()].abilities).reduce((acc, [key, data]) => {
      const disabled = key === this.item.system.save.ability;
      const checked = !disabled && config.includes(key);
      acc.push({key, checked, label: data.label, disabled});
      return acc;
    }, []);
    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    return this.item.setFlag(MODULE, "config.saves", formData.saves.filter(u => u));
  }
}
