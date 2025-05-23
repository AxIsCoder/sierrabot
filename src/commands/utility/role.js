const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage user roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to add the role to')
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Reason for adding the role')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('Reason for removing the role')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a role')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to get information about')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'add':
                    await handleAddRole(interaction);
                    break;
                case 'remove':
                    await handleRemoveRole(interaction);
                    break;
                case 'info':
                    await handleRoleInfo(interaction);
                    break;
            }
        } catch (error) {
            console.error(`Error in role command (${interaction.options.getSubcommand()}):`, error);
            await interaction.reply({
                content: '❌ There was an error executing this command.',
                ephemeral: true
            });
        }
    }
};

/**
 * Handle the role add subcommand
 * @param {Interaction} interaction - The interaction object
 */
async function handleAddRole(interaction) {
    // Get options
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Check if the role is manageable by the bot
    if (!role.editable) {
        return interaction.reply({
            content: '❌ I cannot assign that role. It may be higher than my highest role or managed by an integration.',
            ephemeral: true
        });
    }
    
    // Get the member
    const member = await interaction.guild.members.fetch(targetUser.id);
    
    // Check if the user already has the role
    if (member.roles.cache.has(role.id)) {
        return interaction.reply({
            content: `❌ ${targetUser.tag} already has the ${role.name} role.`,
            ephemeral: true
        });
    }
    
    // Check if the user is trying to assign a role higher than their highest role
    if (interaction.member.roles.highest.position <= role.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
            content: `❌ You cannot assign the ${role.name} role as it is higher than or equal to your highest role.`,
            ephemeral: true
        });
    }
    
    // Add the role
    await member.roles.add(role, reason);
    
    // Create embed
    const embed = createEmbed({
        title: '✅ Role Added',
        description: `The ${role} role has been added to ${targetUser}.`,
        fields: [
            {
                name: 'User',
                value: `${targetUser} (${targetUser.tag})`,
                inline: true
            },
            {
                name: 'Role',
                value: `${role} (${role.id})`,
                inline: true
            },
            {
                name: 'Reason',
                value: reason,
                inline: false
            },
            {
                name: 'Moderator',
                value: `${interaction.user} (${interaction.user.tag})`,
                inline: false
            }
        ],
        footer: 'Sierra Bot • Made with ❤️ by Axody',
        timestamp: true
    });
    
    // Send confirmation
    await interaction.reply({ embeds: [embed] });
}

/**
 * Handle the role remove subcommand
 * @param {Interaction} interaction - The interaction object
 */
async function handleRemoveRole(interaction) {
    // Get options
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Check if the role is manageable by the bot
    if (!role.editable) {
        return interaction.reply({
            content: '❌ I cannot remove that role. It may be higher than my highest role or managed by an integration.',
            ephemeral: true
        });
    }
    
    // Get the member
    const member = await interaction.guild.members.fetch(targetUser.id);
    
    // Check if the user doesn't have the role
    if (!member.roles.cache.has(role.id)) {
        return interaction.reply({
            content: `❌ ${targetUser.tag} doesn't have the ${role.name} role.`,
            ephemeral: true
        });
    }
    
    // Check if the user is trying to remove a role higher than their highest role
    if (interaction.member.roles.highest.position <= role.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
            content: `❌ You cannot remove the ${role.name} role as it is higher than or equal to your highest role.`,
            ephemeral: true
        });
    }
    
    // Remove the role
    await member.roles.remove(role, reason);
    
    // Create embed
    const embed = createEmbed({
        title: '✅ Role Removed',
        description: `The ${role} role has been removed from ${targetUser}.`,
        fields: [
            {
                name: 'User',
                value: `${targetUser} (${targetUser.tag})`,
                inline: true
            },
            {
                name: 'Role',
                value: `${role} (${role.id})`,
                inline: true
            },
            {
                name: 'Reason',
                value: reason,
                inline: false
            },
            {
                name: 'Moderator',
                value: `${interaction.user} (${interaction.user.tag})`,
                inline: false
            }
        ],
        footer: 'Sierra Bot • Made with ❤️ by Axody',
        timestamp: true
    });
    
    // Send confirmation
    await interaction.reply({ embeds: [embed] });
}

/**
 * Handle the role info subcommand
 * @param {Interaction} interaction - The interaction object
 */
async function handleRoleInfo(interaction) {
    // Get the role
    const role = interaction.options.getRole('role');
    
    // Get count of members with this role
    let memberCount = 0;
    try {
        const membersWithRole = interaction.guild.members.cache.filter(member => member.roles.cache.has(role.id));
        memberCount = membersWithRole.size;
    } catch (error) {
        console.error('Error counting members with role:', error);
    }
    
    // Format role permissions
    const permissions = role.permissions.toArray();
    const formattedPermissions = permissions.length > 0 
        ? permissions.map(perm => `\`${perm.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}\``).join(', ')
        : 'None';
    
    // Format creation time
    const createdTime = `<t:${Math.floor(role.createdTimestamp / 1000)}:F> (<t:${Math.floor(role.createdTimestamp / 1000)}:R>)`;
    
    // Create embed with role information
    const embed = createEmbed({
        title: `Role Information: ${role.name}`,
        description: `Information about the ${role} role.`,
        fields: [
            {
                name: 'ID',
                value: role.id,
                inline: true
            },
            {
                name: 'Created',
                value: createdTime,
                inline: true
            },
            {
                name: 'Color',
                value: role.hexColor,
                inline: true
            },
            {
                name: 'Position',
                value: `${role.position} of ${interaction.guild.roles.cache.size}`,
                inline: true
            },
            {
                name: 'Members',
                value: memberCount.toString(),
                inline: true
            },
            {
                name: 'Hoisted',
                value: role.hoist ? 'Yes' : 'No',
                inline: true
            },
            {
                name: 'Mentionable',
                value: role.mentionable ? 'Yes' : 'No',
                inline: true
            },
            {
                name: 'Managed',
                value: role.managed ? 'Yes (Integration)' : 'No',
                inline: true
            },
            {
                name: 'Key Permissions',
                value: formattedPermissions.length > 1024 
                    ? formattedPermissions.substring(0, 1021) + '...' 
                    : formattedPermissions
            }
        ],
        color: role.color,
        footer: 'Sierra Bot • Made with ❤️ by Axody',
        timestamp: true
    });
    
    // Send the response
    await interaction.reply({ embeds: [embed] });
} 