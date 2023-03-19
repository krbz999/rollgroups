import {MODULE} from "./_constants.mjs";

export class GroupConfig extends FormApplication {
  constructor(item, options) {
    super(item, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE}/templates/group_config.hbs`,
      classes: [MODULE]
    });
  }

  get id() {
    return `${MODULE}-groupconfig-${this.object.id}`;
  }

  get parts() {
    return this.object.system.damage.parts.filter(([f]) => !!f);
  }

  get groups() {
    return this.columnHelper("dataGet");
  }

  async getData() {
    const data = await super.getData();

    const types = foundry.utils.mergeObject(
      foundry.utils.duplicate(CONFIG[game.system.id.toUpperCase()].damageTypes),
      foundry.utils.duplicate(CONFIG[game.system.id.toUpperCase()].healingTypes)
    );

    // construct the left column of formulas.
    data.parts = this.parts.reduce((acc, [formula, type]) => {
      let locale = types[type];
      if (!locale) locale = game.i18n.localize("None");
      acc.push({label: `${formula} (${locale})`});
      return acc;
    }, []);

    // construct the group columns.
    if (this.groups) {
      data.groups = this.groups;
    } else {
      // if no groups, then create a single group with all formulas unchecked.
      const group = this.columnHelper("empty");
      data.groups = [group];
    }
    return data;
  }

  async _updateObject() {
    const groupNodes = this.form.querySelectorAll(".group");
    const groups = [];
    for (const group of groupNodes) {
      let label = group.querySelector(".group-header > input").value;
      if (!label) label = game.i18n.localize("ROLLGROUPS.CONFIG.DAMAGE");
      const boxes = group.querySelectorAll(".group-row > input");
      const parts = Array.fromRange(boxes.length).filter(i => boxes[i].checked);
      if (!parts.length) continue;
      groups.push({label, parts});
    }
    return this.object.setFlag(MODULE, "config.groups", groups);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("[data-action='add']").forEach(n => n.addEventListener("click", this._onClickAdd.bind(this)));
    html[0].querySelectorAll("[data-action='delete']").forEach(n => n.addEventListener("click", this._onClickDelete.bind(this)));
    html[0].querySelectorAll(".group-header > input").forEach(n => n.addEventListener("focus", this._onFocusName.bind(this)));
  }

  /**
   * Handle adding a new column.
   * @param {PointerEvent} event      The initiating click event.
   */
  _onClickAdd(event) {
    const group = this.columnHelper("add");
    const div = document.createElement("DIV");
    div.classList.add("group");
    div.innerHTML = group;
    div.querySelector("[data-action='delete']").addEventListener("click", this._onClickDelete.bind(this));
    div.querySelector(".group-header > input").addEventListener("focus", this._onFocusName.bind(this));
    event.currentTarget.closest(".inputs").appendChild(div);
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
  }

  columnHelper(util = "add") {
    const length = this.parts.length;
    const placeholder = game.i18n.localize("ROLLGROUPS.CONFIG.PLACEHOLDER");

    if (["add", "empty"].includes(util)) {
      let group = `<div class="group-header"><input type="text" placeholder="${placeholder}"></div>`;
      const row = `<div class="group-row"><input type="checkbox"></div>`;
      const foot = `<a data-action="delete"><i class="fa-solid fa-trash"></i></a>`;
      group += Array.fromRange(length).fill(row).join("");

      if (util === "add") return group + foot;
      else if (util === "empty") return group;
    }

    if (util === "dataGet") {
      const flags = this.object.flags[MODULE]?.config?.groups;
      if (!flags?.length) return false;

      const groups = flags.map(({label, parts}) => {
        const head = `
        <div class="group-header">
          <input type="text" value="${label}" placeholder="${placeholder}">
        </div>`;
        const rows = Array.fromRange(length).reduce((acc, e) => {
          const checked = parts.includes(e) ? "checked" : "";
          return acc + `<div class="group-row"><input type="checkbox" ${checked}></div>`;
        }, "");
        return head + rows;
      });
      return groups;
    }

    return false;
  }
}
