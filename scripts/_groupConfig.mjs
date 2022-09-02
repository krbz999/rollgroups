export class GroupConfig extends FormApplication {
    constructor(item, options){
        super(item, options);
    }

    static get defaultOptions(){
        return foundry.utils.mergeObject(super.defaultOptions, {
            closeOnSubmit: true,
            width: "auto",
            height: "auto",
            template: "/modules/formulagroups/templates/group_config.html",
            classes: ["formulagroups"]
        });
    }

    get id(){
        return `formulagroups-groupconfig-${this.object.id}`;
    }

    // the base damage parts.
    get parts(){
        const parts = foundry.utils.duplicate(this.object.system.damage.parts);
        return parts.map(([formula, type], index) => {
            return {formula, type, index};
        });
    }

    get groups(){
        const flags = this.object.getFlag("formulagroups", "config.groups") ?? [
            {label: "Damage", parts: Array.fromRange(this.parts.length)}
        ];
        for ( let i = 0; i < flags.length; i++ ) {
            flags[i].index = i;
        }
        return flags;
    }

    async getData(){
        const data = await super.getData();
        data.parts = this.parts;
        data.groups = this.groups;
        console.log("GETDATA, THIS.PARTS", this.parts);
        return data;
    }
    
    async _updateObject(event){
		event.stopPropagation();
		const html = event.target;
		const button = event.submitter;
		if ( button?.name !== "submit" ) return;

        const groups = [];
        let groupIndex = 0;
        let column = html.querySelector(`.group-header [data-group-index='${groupIndex}']`);
        while ( column ) {
            const nodes = html.querySelectorAll(`.check input[data-group-index='${groupIndex}']:checked`);
            console.log("NODES");
            for( let n of nodes ) console.log(n);
            const parts = Array.from(nodes).map(i => Number(i.dataset.partIndex));
            console.log("PARTS", column.value, parts);
            groups.push({ label: column.value, parts });
            
            groupIndex++;
            column = html.querySelector(`.group-header [data-group-index='${groupIndex}']`);
        }
        console.log(groups);
        return this.object.setFlag("formulagroups", "config.groups", groups);
	}

	activateListeners(html){
		super.activateListeners(html);
		const app = this;

        return;
	}

}
