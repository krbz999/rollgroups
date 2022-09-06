export class GroupConfig extends FormApplication {
    constructor(item, options){
        super(item, options);
    }

    static get defaultOptions(){
        return foundry.utils.mergeObject(super.defaultOptions, {
            closeOnSubmit: true,
            width: "max-content",
            height: "auto",
            template: "/modules/rollgroups/templates/group_config.html",
            classes: ["rollgroups"]
        });
    }

    get id(){
        return `rollgroups-groupconfig-${this.object.id}`;
    }

    get parts(){
        return this.object.system.damage.parts.filter(([formula]) => {
            return !!formula;
        });
    }

    get groups(){
        let flags = this.object.getFlag("rollgroups", "config.groups");
        if ( !flags?.length ) return false;

        const groups = flags.map(({ label, parts }) => {
            const head = `<div class="group-header"><input type="text" value="${label}"></div>`;
            let rows = "";
            for ( let i = 0; i < this.parts.length; i++ ) {
                if ( parts.includes(i) ) {
                    rows += `<div class="group-row"><input type="checkbox" checked></div>`;
                }
                else rows += `<div class="group-row"><input type="checkbox"></div>`;
            }
            return head + rows;
        });
        return groups;
    }

    async getData(){
        const data = await super.getData();
        
        // construct the left column of formulas.
        data.parts = this.parts.reduce((acc, [formula, type]) => {
            const locale = CONFIG.DND5E.damageTypes[type];
            const text = `${formula} (${locale})`;
            return acc + `<div class="damage-row" title="${text}">${text}</div>`;
        }, "");

        // construct the group columns.
        if ( this.groups ) {
            data.groups = this.groups;
        }
        else {
            // if no groups, then create a single group with all formulas checked.
            const length = this.parts.length;
            let group = `<div class="group-header"><input type="text" value="Name"></div>`;
            const row = `<div class="group-row"><input type="checkbox" checked></div>`;
            group += Array.fromRange(length).fill(row).join("");
            data.groups = [group];
        }
        return data;
    }
    
    async _updateObject(event){
        event.stopPropagation();
        if ( event.type !== "submit" ) return;
        const groupNodes = this.form.querySelectorAll("[name='rollgroup-groups']");
        const groups = [];
        for ( let group of groupNodes ) {
            const label = group.querySelector(".group-header > input").value || "Damage";
            const boxes = group.querySelectorAll(".group-row > input");
            const parts = [];
            for ( let i = 0; i < boxes.length; i++ ) {
                if ( boxes[i].checked ) parts.push(i);
            }
            if ( !parts.length ) parts.push(0);
            groups.push({ label, parts });
        }
        return this.object.setFlag("rollgroups", "config.groups", groups);
	}

	activateListeners(html){
		super.activateListeners(html);
        html[0].addEventListener("click", (event) => {
            const button = event.target.closest(".trigger");
            const name = button?.getAttribute("name");
            const form = button?.closest(".app.window-app.rollgroups");
            
            if ( name === "add" ) {
                const length = this.parts.length;

                // create new column element.
                let group = `<div class="group-header"><input type="text" value="Name"></div>`;
                const row = `<div class="group-row"><input type="checkbox" checked></div>`;
                const foot = `<div class="group-delete trigger" name="delete"> <a class="delete-button"> <i class="fas fa-trash"></i> </a> </div>`;
                group += Array.fromRange(length).fill(row).join("") + foot;
                const div = document.createElement("DIV");
                div.classList.add("flexcol");
                div.setAttribute("name", "rollgroup-groups");
                div.innerHTML = group;

                // insert it.
                const col = button.closest("div.flexcol");
                col.before(div);
            }
            else if ( name === "delete" ) {
                const group = button.closest("[name='rollgroup-groups']");
                group.remove();
            }
            else return;

            // fix app size to fit columns.
            if ( form ) {
                form.style.width = "max-content";
                form.style.height = "auto";
                this.setPosition();
            }
        });
	}
}
