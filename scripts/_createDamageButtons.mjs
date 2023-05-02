import {MODULE} from "./_constants.mjs";

export function createDamageButtons(item, data) {
  const el = document.createElement("DIV");
  el.innerHTML = data.content;
  const damageButton = el.querySelector(".card-buttons button[data-action='damage']");
  if (!damageButton) return;

  const {groups, versatile} = item.flags[MODULE]?.config ?? {};
  if (!groups) return;

  const validParts = item.system.damage.parts.filter(([f]) => !!f);
  if (!groups.length || (validParts.length < 2)) return;

  // various labels.
  const damageLabel = game.i18n.localize("ROLLGROUPS.LABELS.DAMAGE");
  const healingLabel = game.i18n.localize("ROLLGROUPS.LABELS.HEALING");
  const mixedLabel = game.i18n.localize("ROLLGROUPS.LABELS.MIXED");

  // the button html.
  const group = groups.reduce((acc, {label, parts}, idx) => {
    const btn = document.createElement("BUTTON");
    btn.setAttribute("data-action", "rollgroup-damage");
    btn.setAttribute("data-group", idx);
    btn.setAttribute("data-item-uuid", item.uuid);
    btn.setAttribute("data-actor-uuid", item.actor.uuid);

    const types = parts.map(t => validParts[t][1]);
    const isDamage = types.every(t => t in CONFIG[game.system.id.toUpperCase()].damageTypes);
    const isHealing = types.every(t => t in CONFIG[game.system.id.toUpperCase()].healingTypes);
    const lab = isDamage ? damageLabel : isHealing ? healingLabel : mixedLabel;
    btn.innerHTML = `${lab} (${label})`;

    acc.appendChild(btn);
    return acc;
  }, document.createElement("DIV"));

  // Replace the damage button(s).
  damageButton.after(...group.children);
  damageButton.remove();

  // Adjust the 'Versatile' button.
  if (Number.isNumeric(versatile) && item.isVersatile) {
    const vers = el.querySelector("[data-action='versatile']");
    vers.setAttribute("data-action", "rollgroup-versatile");
    vers.setAttribute("data-group", versatile);
    vers.setAttribute("data-item-uuid", item.uuid);
    vers.setAttribute("data-actor-uuid", item.actor.uuid);
  }

  data.content = el.innerHTML;
}
