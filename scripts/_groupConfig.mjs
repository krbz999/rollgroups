import { MODULE } from "./_constants.mjs";

export class GroupConfig extends FormApplication {
  constructor(item, options) {
    super(item, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      closeOnSubmit: true,
      width: "max-content",
      height: "auto",
      template: `/modules/${MODULE}/templates/group_config.html`,
      classes: [MODULE]
    });
  }

  get id() {
    return `${MODULE}-groupconfig-${this.object.id}`;
  }

  get parts() {
    return this.object.system.damage.parts.filter(([formula]) => {
      return !!formula;
    });
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
      const text = `${formula} (${locale})`;
      return acc + `<div class="damage-row" title="${text}">${text}</div>`;
    }, "");

    // construct the group columns.
    if (this.groups) {
      data.groups = this.groups;
    }
    else {
      // if no groups, then create a single group with all formulas checked.
      const group = this.columnHelper("empty");
      data.groups = [group];
    }
    return data;
  }

  async _updateObject(event) {
    event.stopPropagation();
    if (event.type !== "submit") return;
    const groupNodes = this.form.querySelectorAll("[name='rollgroup-groups']");
    const groups = [];
    for (const group of groupNodes) {
      let label = group.querySelector(".group-header > input").value;
      if (!label) label = game.i18n.localize("ROLLGROUPS.CONFIG.DAMAGE");
      const boxes = group.querySelectorAll(".group-row > input");
      const parts = Array.fromRange(boxes.length).filter(i => boxes[i].checked);
      if (!parts.length) continue;
      groups.push({ label, parts });
    }
    return this.object.setFlag(MODULE, "config.groups", groups);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html[0].addEventListener("click", (event) => {
      const button = event.target.closest(".trigger");
      const name = button?.getAttribute("name");
      const form = button?.closest(`.app.window-app.${MODULE}`);

      if (name === "add") {
        // create new column element.
        const group = this.columnHelper("add");
        const div = document.createElement("DIV");
        div.classList.add("flexcol");
        div.setAttribute("name", "rollgroup-groups");
        div.innerHTML = group;

        // insert it.
        const col = button.closest("div.flexcol");
        col.before(div);
      }
      else if (name === "delete") {
        const group = button.closest("[name='rollgroup-groups']");
        group.remove();
      }
      else return;

      // fix app size to fit columns.
      if (form) {
        form.style.width = "max-content";
        form.style.height = "auto";
        this.setPosition();
      }
    });
  }

  columnHelper(util = "add") {
    const length = this.parts.length;
    const placeholder = game.i18n.localize("ROLLGROUPS.CONFIG.PLACEHOLDER");

    if (["add", "empty"].includes(util)) {
      let group = `
      <div class="group-header">
        <input type="text" value="Name" placeholder="${placeholder}">
      </div>`;
      const row = `
      <div class="group-row">
        <input type="checkbox">
      </div>`;
      const foot = `
      <div class="group-delete trigger" name="delete">
        <a class="delete-button">
          <i class="fas fa-trash"></i>
        </a>
      </div>`;
      group += Array.fromRange(length).fill(row).join("");

      if (util === "add") return group + foot;
      else if (util === "empty") return group;
    }

    if (util === "dataGet") {
      const flags = this.object.getFlag(MODULE, "config.groups");
      if (!flags?.length) return false;

      const groups = flags.map(({ label, parts }) => {
        const head = `
        <div class="group-header">
          <input type="text" value="${label}" placeholder="${placeholder}">
        </div>`;
        const rows = Array.fromRange(length).reduce((acc, e) => {
          const checked = parts.includes(e) ? "checked" : "";
          return acc + `
          <div class="group-row">
            <input type="checkbox" ${checked}>
          </div>`;
        }, "");
        return head + rows;
      });
      return groups;
    }

    return false;
  }
}
