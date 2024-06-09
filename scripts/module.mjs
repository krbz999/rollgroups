const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

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

      const type = isDamage ? "damage" : isHealing ? "healing" : "mixed";
      const buttonProps = {
        damage: {i: "class='fa-solid fa-burst'", label: "Damage"},
        healing: {i: "class='dnd5e-icon' data-src='systems/dnd5e/icons/svg/damage/healing.svg'", label: "Healing"},
        mixed: {i: "class='fa-solid fa-burst'", label: "Mixed"}
      }[type];
      label = label ? `(${label})` : "";
      btn.innerHTML = `<i ${buttonProps.i}></i> ${game.i18n.localize("ROLLGROUPS." + buttonProps.label)} ${label}`;

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
        div.querySelector("A").addEventListener("click", () => new GroupConfig({document: sheet.document}).render({force: true}));
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
        div.querySelector("A").addEventListener("click", () => new SaveConfig({document: sheet.document}).render({force: true}));
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
      return weps[0].rollDamage({event, options: {rollConfigs: picker._scaleCantripDamage()}});
    }
  }
}

class GroupConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["rollgroups", "group-config"],
    position: {
      height: "auto",
      width: 400
    },
    window: {
      icon: "fa-solid fa-burst",
      contentClasses: ["standard-form"]
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      addGroup: this._onAddGroup,
      deleteGroup: this._onDeleteGroup
    }
  };

  /** @override */
  static PARTS = {
    form: {template: "modules/rollgroups/templates/group-config.hbs"}
  };

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.GroupConfigName", {name: this.document.name});
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    const types = foundry.utils.mergeObject(CONFIG.DND5E.damageTypes, CONFIG.DND5E.healingTypes, {inplace: false});
    context.parts = this.document.system.toObject().damage.parts.map(([formula, type], idx) => {
      const label = types[type]?.label || game.i18n.localize("None");
      return {formula, label, idx};
    });

    const groups = foundry.utils.deepClone(this.document.getFlag("rollgroups", "config.groups") ?? []);
    let i = 0;
    for (const group of groups) {
      const parts = new Set(group.parts || []);
      group.idx = i;
      group.rows = context.parts.map(p => ({
        formula: p.formula,
        label: p.label,
        checked: parts.has(p.idx),
        name: `flags.rollgroups.config.groups.${i}.parts.${p.idx}`
      }));
      i++;
    }
    context.groups = groups;

    context.hasDamage = this.document.hasDamage;

    // Set up versatile and versatile choices.
    context.isVersatile = context.hasDamage && this.document.isVersatile;
    if (context.isVersatile) {
      const choices = groups.map(k => k.label || "ROLLGROUPS.GroupPlaceholder");
      const value = this.document.getFlag("rollgroups", "config.versatile") ?? null;
      context.versatile = {
        field: new foundry.data.fields.NumberField({
          nullable: true,
          initial: null,
          choices: choices,
          label: "ROLLGROUPS.VersatileGroup",
          hint: "ROLLGROUPS.VersatileTooltip"
        }),
        value: (value < choices.length) ? value : null,
        name: "flags.rollgroups.config.versatile"
      };
    }

    // Set up blade cantrip function.
    context.isCantrip = context.hasDamage && (this.document.type === "spell") && (this.document.system.level === 0);
    if (context.isCantrip) {
      context.cantrip = {
        field: new foundry.data.fields.BooleanField({
          label: "ROLLGROUPS.BladeCantrip",
          hint: "ROLLGROUPS.BladeCantripTooltip"
        }),
        value: !!this.document.getFlag("rollgroups", "config.bladeCantrip"),
        name: "flags.rollgroups.config.bladeCantrip"
      };
    }

    return context;
  }

  /** @override */
  _prepareSubmitData(event, target, formData) {
    const submitData = super._prepareSubmitData(event, target, formData);
    const groups = [];
    const path = "flags.rollgroups.config.groups";
    for (const {label, parts} of Object.values(foundry.utils.getProperty(submitData, path) ?? {})) {
      const p = [];
      for (const [k, v] of Object.entries(parts || {})) if (v) p.push(parseInt(k));
      groups.push({label: label || game.i18n.localize("ROLLGROUPS.GroupPlaceholder"), parts: p});
    }
    foundry.utils.setProperty(submitData, path, groups);
    return submitData;
  }

  /**
   * Handle adding a new group.
   * @param {PointerEvent} event      The initiating click event.
   * @param {HTMLElement} target      Targeted element.
   */
  static _onAddGroup(event, target) {
    const groups = foundry.utils.deepClone(this.document.getFlag("rollgroups", "config.groups") || []);
    groups.push({label: "", parts: []});
    this.document.setFlag("rollgroups", "config.groups", groups);
  }

  /**
   * Handle deleting a column.
   * @param {PointerEvent} event      The initiating click event.
   * @param {HTMLElement} target      Targeted element.
   */
  static _onDeleteGroup(event, target) {
    const groups = foundry.utils.deepClone(this.document.getFlag("rollgroups", "config.groups"));
    const idx = parseInt(target.closest("[data-idx]").dataset.idx);
    groups.splice(idx, 1);
    this.document.setFlag("rollgroups", "config.groups", groups);
  }
}

class SaveConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    position: {
      height: "auto",
      width: 400
    },
    window: {
      icon: "fa-solid fa-person-falling-burst",
      contentClasses: ["standard-form"]
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    form: {template: "modules/rollgroups/templates/save-config.hbs"},
    footer: {template: "modules/rollgroups/templates/footer.hbs"}
  };

  /** @override */
  get title() {
    return game.i18n.format("ROLLGROUPS.SaveConfigName", {name: this.document.name});
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    const config = new Set(this.document.flags[Module.ID]?.config?.saves ?? []);
    context.abilities = Object.entries(CONFIG[Module.system.toUpperCase()].abilities).map(([key, data]) => {
      const disabled = key === this.document.system.save.ability;
      const value = !disabled && config.has(key);
      const field = new foundry.data.fields.BooleanField({label: data.label});
      const name = `flags.rollgroups.config.saves.${key}`;
      return {field: field, value: value, name: name, disabled: disabled, rootId: this.document.id};
    });

    return context;
  }

  /** @override */
  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);
    const path = "flags.rollgroups.config.saves";
    const value = Object.entries(foundry.utils.getProperty(submitData, path) || {}).reduce((acc, [k, v]) => {
      if (v) acc.push(k);
      return acc;
    }, []);
    foundry.utils.setProperty(submitData, path, value);
    return submitData;
  }
}

class WeaponPicker extends dnd5e.applications.DialogMixin(Application) {
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
      classes: [Module.ID, "weapon-picker", "dnd5e2", "dialog"],
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
    html[0].querySelectorAll("button").forEach(n => n.classList.toggle("gold-button", true));
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
    return weapon.rollDamageGroup({options: {rollConfigs: this._scaleCantripDamage()}});
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

    const config = {event, options: {rollConfigs: parts}, versatile};
    if (versatile) config.rollgroup = weapon.flags[Module.ID]?.config?.versatile ?? 0;
    else if (group) config.rollgroup = event.currentTarget.dataset.group;
    return weapon.rollDamageGroup(config);
  }

  /**
   * Get the roll config to append to a damage roll from the blade cantrip.
   * @returns {object}
   */
  _scaleCantripDamage() {
    const part = this.cantrip.system.damage.parts[0];
    const level = this.actor.system.details.level ?? this.actor.system.details.spellLevel;
    const add = Math.floor((level + 1) / 6);
    const formula = new Roll(part[0]).alter(1, add).formula;
    return {parts: [formula], type: part[1]};
  }
}

Hooks.once("setup", () => Module.setup());
