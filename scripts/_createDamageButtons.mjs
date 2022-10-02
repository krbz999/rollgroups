import { MODULE } from "./_constants.mjs";

export function createDamageButtons(item, data) {
  const el = document.createElement("DIV");
  el.innerHTML = data.content;
  const select = ".card-buttons button[data-action='damage']";
  const damageButton = el.querySelector(select);
  if (!damageButton) return;

  const groups = item.getFlag(MODULE, "config.groups");
  const validParts = item.system.damage?.parts.filter(([f]) => !!f);
  if (!groups?.length || validParts.length < 2) return;

  // various labels.
  const damageLabel = game.i18n.localize("ROLLGROUPS.LABELS.DAMAGE");
  const healingLabel = game.i18n.localize("ROLLGROUPS.LABELS.HEALING");
  const mixedLabel = game.i18n.localize("ROLLGROUPS.LABELS.MIXED");

  // the button html.
  const group = groups.reduce((acc, { label, parts }) => {
    const r = "rollgroup-damage";
    const p = parts.join(";");
    const u = item.uuid;
    const a = item.parent.uuid;
    const types = parts.map(t => validParts[t][1]);
    const isDamage = types.every(t => t in CONFIG.DND5E.damageTypes);
    const isHealing = types.every(t => t in CONFIG.DND5E.healingTypes);
    const lab = isDamage ? damageLabel : isHealing ? healingLabel : mixedLabel;
    const l = `${lab} (${label})`;
    return acc + `
        <button data-action="${r}" data-group-parts="${p}" data-item-uuid="${u}" data-actor-uuid="${a}">
            ${l}
        </button>`;
  }, "");

  const dmg = document.createElement("DIV");
  dmg.innerHTML = group;
  damageButton.after(...dmg.children);
  damageButton.remove();
  data.content = el.innerHTML;
}
