class ConnectionData {
    constructor( name, role, afterMe, video=null) {
        this.video = video;
        this.name = name;
        this.role = role;
        this.afterMe = afterMe;
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
        console.log("my new role", this.role);
    }

    toJSON() {
        return {
            name: this.name,
            role: this.role
        };
    }
}

