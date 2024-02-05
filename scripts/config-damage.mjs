import {MODULE} from "./_constants.mjs";

export class GroupConfig extends FormApplication {
  /**
   * @constructor
   * @param {Item} item     The item to whom this config belongs.
   */
  constructor(item) {
    super(item);
    this.item = item;
    this.clone = item.clone({}, {keepId: true});
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE}/templates/group_config.hbs`,
      classes: [MODULE, "group-config"],
      height: "auto",
      wdith: "auto"
    });
  }

  /** @override */
  get id() {
    return `${MODULE}-groupconfig-${this.item.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.GroupConfigName", {name: this.item.name});
  }

  /**
   * Get the damage parts of an item, filtered for valid ones only.
   * @returns {array[]}     The array of array of formulas and types.
   */
  get parts() {
    return this.clone.system.damage.parts;
  }

  /** @override */
  getData() {
    const data = {};

    const types = foundry.utils.mergeObject(
      CONFIG[game.system.id.toUpperCase()].damageTypes,
      CONFIG[game.system.id.toUpperCase()].healingTypes,
      {inplace: false}
    );

    // construct the left column of formulas.
    data.parts = this.parts.reduce((acc, [formula, type]) => {
      const locale = types[type]?.label ?? game.i18n.localize("None");
      acc.push({label: `${formula} (${locale})`});
      return acc;
    }, []);

    // construct the group columns.
    data.groups = this.columnHelper();

    // Values and labels for 'Versatile' select.
    data.versatile = this.item.isVersatile;
    data.choices = this.clone.flags[MODULE]?.config?.groups?.map((g, n) => ({
      value: n,
      label: g.label || "ROLLGROUPS.GroupPlaceholder"
    })) ?? [];
    data.selected = this.clone.flags[MODULE]?.config?.versatile;

    // If it can be and is a blade cantrip.
    data.eligibleBladeCantrip = (this.item.type === "spell") && (this.item.system.level === 0) && this.item.hasDamage;
    data.isBladeCantrip = this.clone.flags[MODULE]?.config?.bladeCantrip;

    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    const data = new this.model(foundry.utils.expandObject(formData ?? {})?.flags?.rollgroups?.config ?? {}).toObject();
    for (const group of data.groups) group.parts = group.parts.filter(p => p !== null);
    data.groups = data.groups.filter(g => g.parts.length > 0);
    return this.item.setFlag(MODULE, "config", data);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("[data-action='add']").forEach(n => {
      n.addEventListener("click", this._onClickAdd.bind(this));
    });
    html[0].querySelectorAll("[data-action='delete']").forEach(n => {
      n.addEventListener("click", this._onClickDelete.bind(this));
    });
    html[0].querySelectorAll(".focus").forEach(n => {
      n.addEventListener("focus", this._onFocusName.bind(this));
    });
  }

  /**
   * Handle adding a new column.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickAdd(event) {
    const groups = this.clone.flags.rollgroups?.config?.groups ?? [];
    this.clone.updateSource({"flags.rollgroups.config.groups": groups.concat([{label: "", parts: []}])});
    this.render();
  }

  /** @override */
  setPosition(pos = {}) {
    pos.width = pos.height = "auto";
    return super.setPosition(pos);
  }

  /**
   * Change the presented labels in the 'Versatile' select when a group label changes.
   * @override
   */
  _onChangeInput(event) {
    const formData = new FormDataExtended(this.element[0].querySelector("FORM")).object;
    const data = new this.model(foundry.utils.expandObject(formData).flags?.rollgroups?.config ?? {}).toObject();
    for (const group of data.groups) group.parts = group.parts.filter(p => p !== null);
    this.clone.updateSource({"flags.rollgroups.config": data});
    this.render();
  }

  /**
   * The data model used for rendering and saving data.
   * @type {DataModel}
   */
  get model() {
    return class extends foundry.abstract.DataModel {
      static defineSchema() {
        return {
          bladeCantrip: new foundry.data.fields.BooleanField({nullable: true, initial: null}),
          versatile: new foundry.data.fields.NumberField({nullable: true, initial: null}),
          groups: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
            label: new foundry.data.fields.StringField({required: true}),
            parts: new foundry.data.fields.ArrayField(new foundry.data.fields.NumberField())
          }))
        };
      }
    };
  }

  /**
   * Focus a selected name element.
   * @param {FocusEvent} event      The initiating focus event.
   */
  _onFocusName(event) {
    event.currentTarget.select();
  }

  /**
   * Handle deleting a column.
   * @param {PointerEvent} event      The initiating click event.
   */
  _onClickDelete(event) {
    const groups = foundry.utils.deepClone(this.clone.flags.rollgroups?.config?.groups ?? []);
    groups.splice(event.currentTarget.dataset.idx, 1);
    this.clone.updateSource({"flags.rollgroups.config.groups": groups});
    this.render();
  }

  /**
   * Create the data for the existing column(s), or a new empty column if none exist.
   * @returns {object[]}      An array of data objects for one or more columns.
   */
  columnHelper() {
    // Get the columns for initial rendering when any exist.
    const flags = this.clone.flags[MODULE]?.config?.groups ?? [];
    return flags.map(({label, parts}) => ({
      label: label,
      rows: Array.fromRange(this.parts.length).map(n => ({checked: parts.includes(n)}))
    }));
  }
}
