class Module {
  static ID = "rollgroups";
  static get system() {return game.system.id;}

  /** Initialize module. */
  static setup() {
    Hooks.on(`${this.system}.preDisplayCard`, this.manageCardButtons);
    Hooks.on(`${this.system}.preRollDamage`, this.variantDamageLabels);
    Hooks.on("renderChatMessage", this.createChatLogListeners);
    Hooks.on("renderItemSheet", this.createConfigButton);
    Item.implementation.prototype.rollDamageGroup = this.rollDamageGroup;
    loadTemplates(["modules/rollgroups/templates/column.hbs"]);
  }

  /**
   * Create the damage buttons on a chat card when an item is used. Hooks on 'preDisplayCard'.
   * @param {Item5e} item     The item being displayed.
   * @param {object} data     The data object of the message to be created.
   */
  static manageCardButtons(item, data) {
    const el = document.createElement("DIV");
    el.innerHTML = data.content;
    const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
    const config = item.flags[Module.ID]?.config ?? {};

    if (damageButton) {
      const buttons = Module.createDamageButtons(item);
      if (buttons) {
        const div = document.createElement("DIV");
        div.innerHTML = buttons;
        damageButton.after(...div.children);
        damageButton.remove();
      }

      // Adjust the 'Versatile' button.
      if (buttons && Number.isNumeric(config.versatile) && item.isVersatile) {
        const vers = el.querySelector("[data-action='versatile']");
        vers.setAttribute("data-action", "rollgroup-damage-versatile");
        vers.setAttribute("data-group", config.versatile);
        vers.setAttribute("data-item-uuid", item.uuid);
        vers.setAttribute("data-actor-uuid", item.actor.uuid);
      }

      // Create Blade Cantrip buttons if eligible and is enabled.
      if (config.bladeCantrip && (item.type === "spell") && (item.system.level === 0) && item.hasDamage) {
        const div = document.createElement("DIV");
        div.innerHTML = `
        <hr>
        <button data-action="rollgroup-bladecantrip-attack" data-actor-uuid="${item.actor.uuid}">
          ${game.i18n.localize("ROLLGROUPS.BladeCantripAttack")}
        </button>
        <button data-action="rollgroup-bladecantrip-damage" data-actor-uuid="${item.actor.uuid}">
          ${game.i18n.localize("ROLLGROUPS.BladeCantripDamage")}
        </button>`;
        el.querySelector(".card-buttons").append(...div.children);
      }
    }

    // Add more saving throw buttons.
    const saveButtons = Module.createSaveButtons(item);
    if (saveButtons) {
      const save = el.querySelector("button[data-action=save]");
      if (save) {
        const div = document.createElement("DIV");
        div.innerHTML = saveButtons;
        save.after(...div.children);
      }
    }

    data.content = el.innerHTML;
  }

  /**
   * Helper function to construct the html for the damage buttons.
   * @param {Item5e} item       The item to retrieve data from.
   * @returns {string|null}     The constructed buttons, as a string, or null if there are no buttons to be made.
   */
  static createDamageButtons(item) {
    const config = item.flags[Module.ID]?.config ?? {};
    const validParts = item.system.damage.parts.filter(([f]) => !!f);

    const hasGroups = config.groups?.length && (validParts.length > 1);
    if (!hasGroups) return null;

    // various labels.
    const damageLabel = `<i class="fa-solid fa-burst"></i> ${game.i18n.localize("ROLLGROUPS.Damage")}`;
    const healingLabel = game.i18n.localize("ROLLGROUPS.Healing");
    const mixedLabel = game.i18n.localize("ROLLGROUPS.Mixed");

    // the button html.
    const group = config.groups.reduce((acc, {label, parts}, idx) => {
      const btn = document.createElement("BUTTON");
      btn.setAttribute("data-action", "rollgroup-damage");
      btn.setAttribute("data-group", idx);
      btn.setAttribute("data-item-uuid", item.uuid);
      btn.setAttribute("data-actor-uuid", item.actor.uuid);

      const types = parts.map(t => validParts[t][1]);
      const isDamage = types.every(t => t in CONFIG[Module.system.toUpperCase()].damageTypes);
      const isHealing = types.every(t => t in CONFIG[Module.system.toUpperCase()].healingTypes);
      const lab = isDamage ? damageLabel : isHealing ? healingLabel : mixedLabel;
      btn.innerHTML = `${lab} (${label})`;

      acc.appendChild(btn);
      return acc;
    }, document.createElement("DIV"));

    return group.innerHTML;
  }

  /**
   * Helper function to construct the html for saving throw buttons.
   * @param {Item5e} item     The item to add buttons to.
   * @returns {string|null}
   */
  static createSaveButtons(item) {
    if (!item.hasSave) return null;
    const system = Module.system.toUpperCase();
    const saves = (item.flags[Module.ID]?.config?.saves ?? []).filter(abi => {
      return (abi !== item.system.save.ability) && (abi in CONFIG[system].abilities);
    });
    if (!saves.length) return null;

    const div = document.createElement("DIV");
    for (const abi of saves) {
      const btn = document.createElement("BUTTON");
      btn.setAttribute("type", "button");
      btn.setAttribute("data-action", "save");
      btn.setAttribute("data-ability", abi);
      const dc = item.getSaveDC();
      btn.setAttribute("data-dc", dc);
      const ability = CONFIG[system].abilities[abi].label;
      btn.innerHTML = `<i class="fa-solid fa-shield-heart"></i> ${game.i18n.format(`${system}.SavingThrowDC`, {dc, ability})}`;
      div.appendChild(btn);
    }
    return div.innerHTML;
  }

  /**
   * Create the button in item sheets to open the roll groups config menu.
   * Hooks on 'renderItemSheet'.
   * @param {ItemSheet5e} sheet     The sheet of an item.
   * @param {HTMLElement} html      The element of the sheet.
   */
  static createConfigButton(sheet, [html]) {
    const addDamage = html.querySelector(".add-damage");
    if (addDamage) {
      const div = document.createElement("DIV");
      div.innerHTML = `
      <a class="${Module.ID} config-button" data-tooltip="ROLLGROUPS.OpenConfig">
        ${game.i18n.localize("ROLLGROUPS.GroupConfig")} <i class="fa-solid fa-edit"></i>
      </a>`;
      if (sheet.isEditable) {
        div.querySelector("A").addEventListener("click", () => new GroupConfig(sheet.document).render(true));
      }
      addDamage.after(div.firstElementChild);
    }

    const saveScaling = html.querySelector("[name='system.save.scaling']");
    if (saveScaling) {
      const div = document.createElement("DIV");
      div.innerHTML = `
      <a class="${Module.ID} save-config-button" data-tooltip="ROLLGROUPS.OpenSaveConfig">
        <i class="fa-solid fa-plus"></i>
      </a>`;
      if (sheet.isEditable) {
        div.querySelector("A").addEventListener("click", () => new SaveConfig(sheet.document).render(true));
      }
      saveScaling.after(div.firstElementChild);
    }
  }

  /**
   * Create the listener for each rollgroups button in a chat message.
   * Hooks on 'renderChatMessage'.
   * @param {ChatMessage} message     The message being rendered.
   * @param {HTMLElement} html        The element of the message.
   */
  static createChatLogListeners(message, [html]) {
    html.querySelectorAll("[data-action^='rollgroup-damage']").forEach(n => {
      n.addEventListener("click", Module.rollDamageFromChat);
    });

    html.querySelectorAll("[data-action^='rollgroup-bladecantrip']").forEach(n => {
      n.addEventListener("click", Module.pickEquippedWeapon);
    });
  }

  /**
   * Make a damage roll using one of the buttons created in the chatlog.
   * @param {PointerEvent} event              The initiating click event.
   * @returns {Promise<DamageRoll|void>}      The damage roll.
   */
  static rollDamageFromChat(event) {
    const item = Module.findItem(event);
    if (!item) return;

    // The array index of the group to roll, and the parts that belong to it.
    const idx = event.currentTarget.dataset.group;
    const parts = Module.constructParts(item, idx);
    if (!parts) return;

    // A clone of the item with different damage parts.
    const clone = Module.constructClone(item, parts);

    // Additional configurations for the damage roll.
    const spellLevel = event.currentTarget.closest("[data-spell-level]")?.dataset.spellLevel;

    // Return the damage roll.
    return clone.rollDamage({
      event: event,
      spellLevel: Number.isNumeric(spellLevel) ? Number(spellLevel) : item.system.level,
      versatile: event.currentTarget.dataset.action.endsWith("versatile")
    });
  }

  /**
   * Roll a damage group from an item. Added to the item class.
   * @param {number} rollgroup      The index of the rollgroup to roll.
   * @params See Item5e#rollDamage for the remaining params and return value.
   */
  static async rollDamageGroup({
    rollgroup = 0,
    critical = false,
    event = null,
    spellLevel = null,
    versatile = false,
    options = {}
  } = {}) {
    const group = this.flags[Module.ID]?.config?.groups ?? [];
    if (!group.length) {
      return this.rollDamage({critical, event, spellLevel, versatile, options});
    }

    // Bail out prematurely if the given rollgroup is empty or does not exist.
    const indices = group[rollgroup]?.parts;
    if (!indices?.length) {
      ui.notifications.error("ROLLGROUPS.RollGroupEmpty", {localize: true});
      return null;
    }

    // Construct the damage parts and the clone.
    const parts = Module.constructParts(this, rollgroup);
    if (!parts) return null;
    const clone = Module.constructClone(this, parts);
    return clone.rollDamage({critical, event, spellLevel, versatile, options});
  }

  /**
   * Construct a clone of an item using a subset of its damage parts.
   * @param {Item5e} item           The original item.
   * @param {string[][]} parts      The damage parts to use.
   * @returns {Item5e}              The clone of the item.
   */
  static constructClone(item, parts) {
    const clone = item.clone({"system.damage.parts": parts}, {keepId: true});
    clone.prepareData();
    clone.prepareFinalAttributes();
    return clone;
  }

  /**
   * General method to construct the damage parts for the clone, given an integer denoting the rollgroup.
   * @param {Item5e} item               The item or clone.
   * @param {number} idx                The index of the rollgroup, as found in its flag data.
   * @returns {string[][]|boolean}      The array of damage parts, or false if no valid parts found.
   */
  static constructParts(item, idx) {
    const indices = new Set(item.flags[Module.ID]?.config?.groups[idx]?.parts ?? []);
    const group = item.system.damage.parts.reduce((acc, part, i) => {
      if (indices.has(i)) acc.push(part);
      return acc;
    }, []);
    // there were no valid damage formulas.
    if (!group.length) {
      ui.notifications.error("ROLLGROUPS.RollGroupEmpty", {localize: true});
      return false;
    }
    return group;
  }

  /**
   * Find or create an item. If the message has embedded itemData, prefer that.
   * @param {Event} event       The initiating click event.
   * @returns {Item5e|null}     A found or constructed item, otherwise null.
   */
  static findItem(event) {
    const button = event.currentTarget;
    const message = game.messages.get(button.closest("[data-message-id]").dataset.messageId);
    const itemData = message.flags[Module.system]?.itemData;

    // Case 1: Embedded item data in the message, construct a temporary item.
    if (itemData) {
      const actor = fromUuidSync(button.dataset.actorUuid);
      if (!actor) {
        ui.notifications.error("ROLLGROUPS.ItemOwnerMissing", {localize: true});
        return null;
      }
      const item = new Item.implementation(itemData, {parent: actor});
      item.prepareData();
      item.prepareFinalAttributes();
      return item;
    }

    // Case 2: No item data, find the existing item.
    else if (!itemData) {
      return fromUuidSync(button.dataset.itemUuid);
    }
  }

  /**
   * Adjust the flavor of damage rolls depending on the damage or healing types being used. If it is a pure
   * healing roll, label it as 'Healing'. If it is purely temp hp, label it 'Healing (Temp)', and if it is
   * anything else, label it as Damage (... the types).
   * Hooks on 'preRollDamage'.
   * @param {Item5e|void} item      The item being used.
   * @param {object} config         The configuration options for the damage roll.
   */
  static variantDamageLabels(item, config) {
    if (!item) return;
    const labels = new Set(item.getDerivedDamageLabel().map(i => i.damageType));
    const isTemp = (labels.size === 1) && labels.has("temphp");
    const system = Module.system.toUpperCase();
    const string = labels.every(t => {
      return t in CONFIG[system].healingTypes;
    }) ? `${system}.Healing` : `${system}.DamageRoll`;
    const actionFlavor = game.i18n.localize(string);
    const title = `${item.name} - ${actionFlavor}`;

    let flavor = title;
    if (isTemp) flavor = `${title} (${game.i18n.localize(`${system}.Temp`)})`;
    else if (item.labels.damageTypes.length) flavor = `${title} (${item.labels.damageTypes})`;
    foundry.utils.mergeObject(config, {title, flavor});
  }

  /**
   * Helper function to pick one of the actor's equipped melee weapons.
   * @param {Event} event     The initiating click event.
   * @returns {Promise<D20Roll|DamageRoll|null>}
   */
  static async pickEquippedWeapon(event) {
    const picker = new WeaponPicker(event);
    const weps = picker.equippedWeapons;

    // Case 1: No equipped weapons. Bail out.
    if (!weps.length) {
      ui.notifications.warn(game.i18n.format("ROLLGROUPS.NoEquippedWeapons", {actor: picker.actor.name}));
      return null;
    }

    // Case 2: More than one weapon. Select one.
    else if (weps.length > 1) {
      return picker.render(true);
    }

    // Case 3: There is one weapon, and we want to roll attack.
    else if (event.currentTarget.dataset.action.endsWith("attack")) {
      return weps[0].rollAttack({event});
    }

    // Case 4: There is one weapon, and we want to roll damage - but it has rollgroups or is versatile.
    else if (weps[0].isVersatile || Module.createDamageButtons(weps[0])) {
      return picker.render(true);
    }

    // Case 5: There is one weapon, and we want to roll damage, and it has only one formula.
    else {
      return weps[0].rollDamage({event, options: {parts: picker._scaleCantripDamage()}});
    }
  }
}

class GroupConfig extends FormApplication {
  /**
   * @constructor
   * @param {Item5e} item     The item to whom this config belongs.
   */
  constructor(item) {
    super(item);
    this.item = item;
    this.clone = item.clone({}, {keepId: true});
    this.clone.prepareData();
    this.clone.prepareFinalAttributes();
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${Module.ID}/templates/group_config.hbs`,
      classes: [Module.ID, "group-config"],
      height: "auto",
      wdith: "auto"
    });
  }

  /** @override */
  get id() {
    return `${Module.ID}-groupconfig-${this.item.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.GroupConfigName", {name: this.item.name});
  }

  /**
   * Get the damage parts of an item, filtered for valid ones only.
   * @returns {string[][]}     The array of array of formulas and types.
   */
  get parts() {
    return this.clone.system.damage.parts;
  }

  /** @override */
  getData() {
    const data = {};
    const system = Module.system.toUpperCase();
    const types = {...CONFIG[system].damageTypes, ...CONFIG[system].healingTypes};

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
    data.choices = this.clone.flags[Module.ID]?.config?.groups?.map((g, n) => ({
      value: n,
      label: g.label || "ROLLGROUPS.GroupPlaceholder"
    })) ?? [];
    data.selected = this.clone.flags[Module.ID]?.config?.versatile;

    // If it can be and is a blade cantrip.
    data.eligibleBladeCantrip = (this.item.type === "spell") && (this.item.system.level === 0) && this.item.hasDamage;
    data.isBladeCantrip = this.clone.flags[Module.ID]?.config?.bladeCantrip;

    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    const data = new this.model(foundry.utils.expandObject(formData ?? {})?.flags?.rollgroups?.config ?? {}).toObject();
    for (const group of data.groups) group.parts = group.parts.filter(p => p !== null);
    data.groups = data.groups.filter(g => g.parts.length > 0);
    return this.item.setFlag(Module.ID, "config", data);
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
    const groups = this.clone.flags[Module.ID]?.config?.groups ?? [];
    this.clone.updateSource({[`flags.${Module.ID}.config.groups`]: groups.concat([{label: "", parts: []}])});
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
    this.clone.updateSource({[`flags.${Module.ID}.config`]: data});
    this.render();
  }

  /**
   * The data model used for rendering and saving data.
   * @type {DataModel}
   */
  get model() {
    return class extends foundry.abstract.DataModel {
      static defineSchema() {
        const f = foundry.data.fields;
        return {
          bladeCantrip: new f.BooleanField({nullable: true, initial: null}),
          versatile: new f.NumberField({nullable: true, initial: null}),
          groups: new f.ArrayField(new f.SchemaField({
            label: new f.StringField({required: true}),
            parts: new f.ArrayField(new f.NumberField())
          }))
        };
      }
    };
  }

  /**
   * Focus a selected name element.
   * @param {Event} event      The initiating focus event.
   */
  _onFocusName(event) {
    event.currentTarget.select();
  }

  /**
   * Handle deleting a column.
   * @param {Event} event      The initiating click event.
   */
  _onClickDelete(event) {
    const groups = foundry.utils.deepClone(this.clone.flags[Module.ID]?.config?.groups ?? []);
    groups.splice(event.currentTarget.dataset.idx, 1);
    this.clone.updateSource({[`flags.${Module.ID}.config.groups`]: groups});
    this.render();
  }

  /**
   * Create the data for the existing column(s), or a new empty column if none exist.
   * @returns {object[]}      An array of data objects for one or more columns.
   */
  columnHelper() {
    // Get the columns for initial rendering when any exist.
    const flags = this.clone.flags[Module.ID]?.config?.groups ?? [];
    return flags.map(({label, parts}) => ({
      label: label,
      rows: Array.fromRange(this.parts.length).map(n => ({checked: parts.includes(n)}))
    }));
  }
}

class SaveConfig extends FormApplication {
  /**
   * @constructor
   * @param {Item5e} item     The item to whom this config belongs.
   */
  constructor(item) {
    super(item);
    this.item = item;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${Module.ID}/templates/save_config.hbs`,
      classes: [Module.ID, "save-config"],
      height: "auto",
      wdith: "auto"
    });
  }

  /** @override */
  get id() {
    return `${Module.ID}-saveconfig-${this.item.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.SaveConfigName", {name: this.item.name});
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    const config = new Set(this.item.flags[Module.ID]?.config?.saves ?? []);
    data.abilities = Object.entries(CONFIG[Module.system.toUpperCase()].abilities).reduce((acc, [key, data]) => {
      const disabled = key === this.item.system.save.ability;
      const checked = !disabled && config.has(key);
      acc.push({key, checked, label: data.label, disabled});
      return acc;
    }, []);
    return data;
  }

  /** @override */
  async _updateObject(event, formData) {
    return this.item.setFlag(Module.ID, "config.saves", formData.saves.filter(u => u));
  }
}

class WeaponPicker extends Application {
  /**
   * @constructor
   * @param {Event} event      The initiating click event.
   */
  constructor(event) {
    super();
    const target = event.currentTarget;
    this.actor = fromUuidSync(target.dataset.actorUuid);
    const isNPC = this.actor.type === "npc";
    this.cantrip = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    this.equippedWeapons = this.actor.items.filter(item => {
      return (item.type === "weapon") && (isNPC || item.system.equipped) && item.hasAttack && item.hasDamage;
    });
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${Module.ID}/templates/weapon_picker.hbs`,
      classes: [Module.ID, "weapon-picker"],
      height: "auto",
      wdith: "auto"
    });
  }

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.PickWeapon", {name: this.cantrip.name});
  }

  /** @override */
  async getData() {
    return {
      weapons: this.equippedWeapons.map(w => ({weapon: w, context: Module.createDamageButtons(w)}))
    };
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
   * @returns {Promise<D20Roll>}
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
   * @returns {Promise<D20Roll>}
   */
  async _onClickAttack(event) {
    return this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId).rollAttack({event});
  }

  /**
   * Handle rolling a damage roll with a given weapon.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<DamageRoll>}
   */
  async _onClickDamage(event) {
    const weapon = this.actor.items.get(event.currentTarget.closest("[data-item-id]").dataset.itemId);
    this.close();

    const parts = this._scaleCantripDamage();
    const versatile = "versatile" in event.currentTarget.dataset; // Whether to roll versatile damage.
    const group = "group" in event.currentTarget.dataset; // Whether to roll a specific group.

    const config = {event, options: {parts}, versatile};
    if (versatile) config.rollgroup = weapon.flags[Module.ID]?.config?.versatile ?? 0;
    else if (group) config.rollgroup = event.currentTarget.dataset.group;
    return weapon.rollDamageGroup(config);
  }

  /**
   * Get the formula to append to a damage roll from the blade cantrip.
   * @returns {string[]}
   */
  _scaleCantripDamage() {
    const part = this.cantrip.system.damage.parts[0];
    const level = this.actor.system.details.level ?? this.actor.system.details.spellLevel;
    const add = Math.floor((level + 1) / 6);
    const formula = new Roll(part[0]).alter(1, add).formula;
    return [`${formula}[${part[1]}]`];
  }
}

Hooks.once("setup", () => Module.setup());
