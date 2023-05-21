import {MODULE} from "./_constants.mjs";

export class GroupConfig extends FormApplication {
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
      template: `modules/${MODULE}/templates/group_config.hbs`,
      classes: [MODULE, "group-config"]
    });
  }

  /** @override */
  get id() {
    return `${MODULE}-groupconfig-${this.item.id}`;
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
    return this.item.system.damage.parts.filter(([f]) => !!f);
  }

  /** @override */
  async getData() {
    const data = await super.getData();

    const types = foundry.utils.mergeObject(
      foundry.utils.deepClone(CONFIG[game.system.id.toUpperCase()].damageTypes),
      foundry.utils.deepClone(CONFIG[game.system.id.toUpperCase()].healingTypes)
    );

    // construct the left column of formulas.
    data.parts = this.parts.reduce((acc, [formula, type]) => {
      let locale = types[type];
      if (!locale) locale = game.i18n.localize("None");
      acc.push({label: `${formula} (${locale})`});
      return acc;
    }, []);

    // construct the group columns.
    data.groups = this.columnHelper("data");

    // Values and labels for 'Versatile' select.
    data.versatile = this.item.isVersatile;
    data.choices = this.item.flags[MODULE]?.config?.groups?.map((g, n) => ({value: n, label: g.label})) ?? [];
    data.selected = this.item.flags[MODULE]?.config?.versatile;

    // If it can be and is a blade cantrip.
    data.eligibleBladeCantrip = (this.item.type === "spell") && (this.item.system.level === 0) && this.item.hasDamage;
    data.isBladeCantrip = this.item.flags[MODULE]?.config?.bladeCantrip;

    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    const groupNodes = this.form.querySelectorAll(".group");
    const groups = [];
    let idx = 0;
    for (const group of groupNodes) {
      idx++;
      let label = group.querySelector("[type='text']").value;
      if (!label) label = game.i18n.format("ROLLGROUPS.RollGroupIdx", {idx});
      const boxes = group.querySelectorAll("[type='checkbox']");
      const parts = Array.fromRange(boxes.length).filter(i => boxes[i].checked);
      if (!parts.length) continue;
      groups.push({label, parts});
    }
    const versatile = formData.versatile ?? null;
    const bladeCantrip = formData.bladeCantrip ?? null;
    return this.item.setFlag(MODULE, "config", {groups, versatile, bladeCantrip});
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
    html[0].querySelectorAll("[data-focus='focus']").forEach(n => {
      n.addEventListener("focus", this._onFocusName.bind(this));
    });
  }

  /**
   * Handle adding a new column.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickAdd(event) {
    const group = this.columnHelper("empty");
    const div = document.createElement("DIV");
    div.classList.add("group");
    div.innerHTML = await renderTemplate("modules/rollgroups/templates/column.hbs", group[0]);
    div.querySelector("[data-action='delete']").addEventListener("click", this._onClickDelete.bind(this));
    div.querySelector("[data-focus='focus']").addEventListener("focus", this._onFocusName.bind(this));
    event.currentTarget.closest(".inputs").appendChild(div);
    this._refreshVersatileOptions();
  }

  /**
   * Refresh the options available in the 'Versatile' select, keeping the selected option if its group still exists.
   */
  _refreshVersatileOptions() {
    const vers = this.element[0].querySelector("[name='versatile']");
    if (!vers) return;
    const selectedIndex = vers.selectedIndex;
    const ph = game.i18n.localize("ROLLGROUPS.GroupPlaceholder");
    const headers = this.element[0].querySelectorAll("[data-focus='focus']");
    vers.innerHTML = Array.from(headers).reduce((acc, group, idx) => {
      const label = group.value || ph;
      const value = idx;
      return acc + `<option value="${value}">${label}</option>`;
    }, "<option value></option>");
    vers.selectedIndex = selectedIndex;
  }

  /**
   * Change the presented labels in the 'Versatile' select when a group label changes.
   * @override
   */
  _onChangeInput(event) {
    super._onChangeInput(event);
    if (event.target.type === "text") this._refreshVersatileOptions();
  }

  /**
   * Focus a selected name element.
   * @param {FocusEvent} event      The initiating click event.
   */
  _onFocusName(event) {
    event.currentTarget.select();
  }

  /**
   * Handle deleting a column.
   * @param {PointerEvent} event      The initiating click event.
   */
  _onClickDelete(event) {
    event.currentTarget.closest(".group").remove();
    this._refreshVersatileOptions();
  }

  /**
   * Create the data for the existing column(s), or a new empty column if none exist.
   * @param {string} util     The type of data to retrieve. 'data' for the initial data and 'empty' for an empty column.
   * @returns {object[]}      An array of data objects for one or more columns.
   */
  columnHelper(util) {
    const length = this.parts.length;

    // Create one empty column's data.
    if (util === "empty") {
      return [{rows: Array(length).fill({checked: false})}];
    }

    // Get the columns for initial rendering when any exist. If none exist, return an empty column.
    else if (util === "data") {
      const flags = this.item.flags[MODULE]?.config?.groups;
      if (!flags?.length) return this.columnHelper("empty");

      const groups = flags.map(({label, parts}) => {
        const rows = Array.fromRange(length).map(n => {
          return {checked: parts.includes(n)};
        });
        return {label, rows};
      });
      return groups;
    }
  }
}
