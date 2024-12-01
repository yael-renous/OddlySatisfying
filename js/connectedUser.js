class ConnectionData {
    constructor(uuid, name, role, canvas=null, video=null) {
        this.uuid = uuid;
        this.canvas = canvas;
        this.video = video;
        this.name = name;
        this.role = role;
        this.currentRoleIndex = ROLES.indexOf(role);
    }

    // Helper methods you could add
    updateRole(newRole) {
        if (!ROLES.includes(newRole)) {
            throw new Error('Invalid role');
        }
        this.role = newRole;
    }
    
     nextRole() {
        if (this.currentRoleIndex == ROLES.length - 1) {
            return ROLES[this.currentRoleIndex];
        }
        this.currentRoleIndex++;
        this.role = ROLES[this.currentRoleIndex];
    }

    toJSON() {
        return {
            uuid: this.uuid,
            name: this.name,
            role: this.role
        };
    }
}

