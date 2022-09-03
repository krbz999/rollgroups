export class GroupConfig extends FormApplication {
    constructor(item, options){
        super(item, options);
    }

    static get defaultOptions(){
        return foundry.utils.mergeObject(super.defaultOptions, {
            closeOnSubmit: true,
            width: "auto",
            height: "auto",
            template: "/modules/rollgroups/templates/group_config.html",
            classes: ["rollgroups"]
        });
    }

    get id(){
        return `rollgroups-groupconfig-${this.object.id}`;
    }

    get groups(){
        let flags = this.object.getFlag("rollgroups", "config.groups");
        if ( !flags ){
            const parts = Array.fromRange(this.object.system.damage.parts.length);
            flags = [{ label: "Damage", parts }];
        }
        return flags;
    }

    async getData(){
        const data = await super.getData();
        return data;
    }
    
    async _updateObject(event){
		
	}

	activateListeners(html){
		super.activateListeners(html);
	}
}
