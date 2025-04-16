const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configticket')
        .setDescription('Configure the support ticket system')
        .addSubcommand(subcommand => 
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket system')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the ticket message will be sent')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addChannelOption(option => 
                    option.setName('ticket_category')
                        .setDescription('The category where tickets will be created')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory))
                .addRoleOption(option => 
                    option.setName('support_role')
                        .setDescription('Primary support role that can see and respond to tickets')
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('support_role_2')
                        .setDescription('Additional support role (optional)')
                        .setRequired(false))
                .addRoleOption(option => 
                    option.setName('support_role_3')
                        .setDescription('Additional support role (optional)')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('title')
                        .setDescription('The title of the ticket embed')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('The description of the ticket embed')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('color')
                        .setDescription('The color of the embed (hex code)')
                        .setRequired(false)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('send')
                .setDescription('Send the ticket embed to the configured channel'))
        .addSubcommand(subcommand => 
            subcommand
                .setName('addrole')
                .setDescription('Add an additional support role')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The support role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('removerole')
                .setDescription('Remove a support role')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The support role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('listroles')
                .setDescription('List all configured support roles'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'setup') {
            await setupTicketSystem(interaction);
        } else if (subcommand === 'send') {
            await sendTicketEmbed(interaction);
        } else if (subcommand === 'addrole') {
            await addSupportRole(interaction);
        } else if (subcommand === 'removerole') {
            await removeSupportRole(interaction);
        } else if (subcommand === 'listroles') {
            await listSupportRoles(interaction);
        }
    }
};

async function setupTicketSystem(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        const channel = interaction.options.getChannel('channel');
        const ticketCategory = interaction.options.getChannel('ticket_category');
        const supportRole = interaction.options.getRole('support_role');
        const supportRole2 = interaction.options.getRole('support_role_2');
        const supportRole3 = interaction.options.getRole('support_role_3');
        const title = interaction.options.getString('title') || 'Support Tickets';
        const description = interaction.options.getString('description') || 
            'Click the button below to open a support ticket. Our team will assist you as soon as possible.';
        const color = interaction.options.getString('color') || '#5865F2'; // Default Discord blurple
        
        // Validate that the provided channel is a text channel
        if (channel.type !== ChannelType.GuildText) {
            return await interaction.editReply({ 
                content: 'Please select a text channel for the ticket embed.'
            });
        }
        
        // Validate that the provided category is a category channel
        if (ticketCategory.type !== ChannelType.GuildCategory) {
            return await interaction.editReply({ 
                content: 'Please select a category channel for the tickets.'
            });
        }
        
        // Create config directory if it doesn't exist
        const configDir = path.join(__dirname, '..', '..', 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Collect support roles (removing duplicates and nulls)
        const supportRoles = [supportRole];
        if (supportRole2 && !supportRoles.some(role => role.id === supportRole2.id)) {
            supportRoles.push(supportRole2);
        }
        if (supportRole3 && !supportRoles.some(role => role.id === supportRole3.id)) {
            supportRoles.push(supportRole3);
        }
        
        // Check if there's an existing config to preserve the lastTicketId
        let lastTicketId = 0;
        const configPath = path.join(configDir, `ticket-config-${interaction.guild.id}.json`);
        if (fs.existsSync(configPath)) {
            try {
                const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                lastTicketId = existingConfig.lastTicketId || 0;
            } catch (readError) {
                console.error('Error reading existing config:', readError);
            }
        }
        
        // Save the ticket configuration with multiple support roles
        const ticketConfig = {
            guildId: interaction.guild.id,
            channelId: channel.id,
            ticketCategoryId: ticketCategory.id,
            supportRoleIds: supportRoles.map(role => role.id),
            embed: {
                title: title,
                description: description,
                color: color
            },
            // Preserve the last ticket number for auto-incrementing IDs
            lastTicketId: lastTicketId
        };
        
        fs.writeFileSync(
            configPath,
            JSON.stringify(ticketConfig, null, 2)
        );
        
        // Build roles string for display
        const rolesString = supportRoles.map(role => `${role}`).join(', ');
        
        // Create a preview embed to show the configuration
        const previewEmbed = createEmbed({
            title: '✅ Ticket System Configured',
            description: 'The ticket system has been configured successfully. Use `/configticket send` to send the ticket embed to the channel.',
            fields: [
                {
                    name: 'Channel',
                    value: `${channel}`,
                    inline: true
                },
                {
                    name: 'Ticket Category',
                    value: `${ticketCategory.name}`,
                    inline: true
                },
                {
                    name: 'Support Roles',
                    value: rolesString,
                    inline: false
                }
            ],
            footer: `Next step: Use /configticket send to send the embed to ${channel.name}`,
            timestamp: true
        });
        
        // Create a sample of the ticket embed
        const ticketPreviewEmbed = createEmbed({
            title: ticketConfig.embed.title,
            description: ticketConfig.embed.description,
            color: ticketConfig.embed.color,
            footer: '👆 This is how your ticket embed will look (button not shown in preview)',
            timestamp: true
        });
        
        // Reply with success message and preview
        await interaction.editReply({
            content: `✅ Ticket system configured successfully! Use \`/configticket send\` to send the embed to ${channel}.`,
            embeds: [previewEmbed, ticketPreviewEmbed]
        });
    } catch (error) {
        console.error('Error configuring ticket system:', error);
        await interaction.editReply({
            content: 'There was an error configuring the ticket system. Please try again later.'
        });
    }
}

async function sendTicketEmbed(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        // Check if the ticket system has been configured
        const configPath = path.join(
            __dirname, '..', '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'Ticket system has not been configured yet. Please use `/configticket setup` first.'
            });
        }
        
        // Read the configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Get the channel to send the embed to
        const channel = await interaction.guild.channels.fetch(ticketConfig.channelId).catch(() => null);
        
        if (!channel) {
            return await interaction.editReply({
                content: 'The configured channel no longer exists. Please reconfigure the ticket system.'
            });
        }
        
        // Create the embed
        const embed = createEmbed({
            title: ticketConfig.embed.title,
            description: ticketConfig.embed.description,
            color: ticketConfig.embed.color,
            footer: 'Click the button below to open a ticket',
            timestamp: true
        });
        
        // Create the button with a simplified ID and more common style
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket') // Simplified ID
                .setLabel('Open a Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );
        
        // Send the embed with the button - make sure to catch any errors
        try {
            // Delete any previous ticket embeds in the channel first
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].data.title === ticketConfig.embed.title
            );
            
            // Delete the previous embeds if found
            if (botMessages.size > 0) {
                await channel.bulkDelete(botMessages).catch(e => console.error('Failed to delete previous ticket embeds:', e));
            }
            
            // Send the new embed
            const sentMessage = await channel.send({ embeds: [embed], components: [button] });
            
            // Create a confirmation embed
            const confirmEmbed = createEmbed({
                title: '✅ Ticket Embed Sent',
                description: `The ticket embed has been sent to ${channel} successfully.`,
                fields: [
                    {
                        name: 'Message Link',
                        value: `[Click to view](${sentMessage.url})`,
                        inline: false
                    }
                ],
                thumbnail: interaction.client.user.displayAvatarURL({ dynamic: true }),
                footer: `Configured by ${interaction.user.tag}`,
                timestamp: true
            });
            
            // Reply with success message
            await interaction.editReply({
                content: `✅ Ticket embed sent to ${channel} successfully!`,
                embeds: [confirmEmbed]
            });
        } catch (sendError) {
            console.error('Error sending ticket embed to channel:', sendError);
            return await interaction.editReply({
                content: `Failed to send the ticket embed to ${channel}. Please check the bot's permissions in that channel.`
            });
        }
    } catch (error) {
        console.error('Error sending ticket embed:', error);
        await interaction.editReply({
            content: 'There was an error sending the ticket embed. Please try again later.'
        });
    }
}

async function addSupportRole(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        const role = interaction.options.getRole('role');
        
        // Get the configuration file path
        const configPath = path.join(
            __dirname, '..', '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        // Check if configuration exists
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'Ticket system has not been configured yet. Please use `/configticket setup` first.'
            });
        }
        
        // Read the configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check if the supportRoleIds array exists, create it if it doesn't
        if (!ticketConfig.supportRoleIds) {
            // Old config had a single supportRoleId
            if (ticketConfig.supportRoleId) {
                ticketConfig.supportRoleIds = [ticketConfig.supportRoleId];
                delete ticketConfig.supportRoleId;
            } else {
                ticketConfig.supportRoleIds = [];
            }
        }
        
        // Check if the role is already in the list
        if (ticketConfig.supportRoleIds.includes(role.id)) {
            return await interaction.editReply({
                content: `${role} is already a support role.`
            });
        }
        
        // Add the new role to the array
        ticketConfig.supportRoleIds.push(role.id);
        
        // Save the updated configuration
        fs.writeFileSync(configPath, JSON.stringify(ticketConfig, null, 2));
        
        // Create a list of all current support roles
        const supportRolesList = await Promise.all(
            ticketConfig.supportRoleIds.map(async roleId => {
                const fetchedRole = await interaction.guild.roles.fetch(roleId).catch(() => null);
                return fetchedRole ? `${fetchedRole}` : `Unknown Role (${roleId})`;
            })
        );
        
        // Create confirmation embed
        const confirmEmbed = createEmbed({
            title: 'Support Role Added',
            description: `${role} has been added as a support role.`,
            fields: [
                {
                    name: 'Current Support Roles',
                    value: supportRolesList.join('\n') || 'No roles configured',
                    inline: false
                }
            ],
            footer: 'Any existing tickets will be updated with the new role permissions',
            timestamp: true
        });
        
        await interaction.editReply({
            content: `✅ Added ${role} to support roles!`,
            embeds: [confirmEmbed]
        });
    } catch (error) {
        console.error('Error adding support role:', error);
        await interaction.editReply({
            content: 'There was an error adding the support role. Please try again later.'
        });
    }
}

async function removeSupportRole(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        const role = interaction.options.getRole('role');
        
        // Get the configuration file path
        const configPath = path.join(
            __dirname, '..', '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        // Check if configuration exists
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'Ticket system has not been configured yet. Please use `/configticket setup` first.'
            });
        }
        
        // Read the configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check if the supportRoleIds array exists, create it if it doesn't
        if (!ticketConfig.supportRoleIds) {
            // Old config had a single supportRoleId
            if (ticketConfig.supportRoleId) {
                ticketConfig.supportRoleIds = [ticketConfig.supportRoleId];
                delete ticketConfig.supportRoleId;
            } else {
                ticketConfig.supportRoleIds = [];
            }
        }
        
        // Check if the role is in the list
        if (!ticketConfig.supportRoleIds.includes(role.id)) {
            return await interaction.editReply({
                content: `${role} is not currently a support role.`
            });
        }
        
        // Make sure we're not removing the last role
        if (ticketConfig.supportRoleIds.length === 1) {
            return await interaction.editReply({
                content: 'You cannot remove the last support role. At least one support role is required.'
            });
        }
        
        // Remove the role from the array
        ticketConfig.supportRoleIds = ticketConfig.supportRoleIds.filter(id => id !== role.id);
        
        // Save the updated configuration
        fs.writeFileSync(configPath, JSON.stringify(ticketConfig, null, 2));
        
        // Create a list of all current support roles
        const supportRolesList = await Promise.all(
            ticketConfig.supportRoleIds.map(async roleId => {
                const fetchedRole = await interaction.guild.roles.fetch(roleId).catch(() => null);
                return fetchedRole ? `${fetchedRole}` : `Unknown Role (${roleId})`;
            })
        );
        
        // Create confirmation embed
        const confirmEmbed = createEmbed({
            title: 'Support Role Removed',
            description: `${role} has been removed from support roles.`,
            fields: [
                {
                    name: 'Current Support Roles',
                    value: supportRolesList.join('\n') || 'No roles configured',
                    inline: false
                }
            ],
            footer: 'Any existing tickets will still have the previous role permissions',
            timestamp: true
        });
        
        await interaction.editReply({
            content: `✅ Removed ${role} from support roles!`,
            embeds: [confirmEmbed]
        });
    } catch (error) {
        console.error('Error removing support role:', error);
        await interaction.editReply({
            content: 'There was an error removing the support role. Please try again later.'
        });
    }
}

async function listSupportRoles(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        // Get the configuration file path
        const configPath = path.join(
            __dirname, '..', '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        // Check if configuration exists
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'Ticket system has not been configured yet. Please use `/configticket setup` first.'
            });
        }
        
        // Read the configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Determine the support roles, handle both old and new config formats
        let supportRoleIds = [];
        if (ticketConfig.supportRoleIds) {
            supportRoleIds = ticketConfig.supportRoleIds;
        } else if (ticketConfig.supportRoleId) {
            supportRoleIds = [ticketConfig.supportRoleId];
        }
        
        // Fetch all role objects
        const supportRoles = await Promise.all(
            supportRoleIds.map(async roleId => {
                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                return {
                    role,
                    id: roleId,
                    exists: !!role
                };
            })
        );
        
        // Create fields for each role with more details
        const roleFields = supportRoles.map((roleInfo, index) => {
            return {
                name: `Role ${index + 1}${roleInfo.exists ? '' : ' (Missing)'}`,
                value: roleInfo.exists 
                    ? `${roleInfo.role} (ID: ${roleInfo.id})`
                    : `Role ID: ${roleInfo.id} - This role no longer exists`,
                inline: true
            };
        });
        
        // Create the embed with role information
        const rolesEmbed = createEmbed({
            title: 'Ticket Support Roles',
            description: supportRoles.length > 0 
                ? `Here are the roles that have access to support tickets:`
                : `No support roles have been configured yet. Use \`/configticket setup\` to configure.`,
            fields: roleFields.length > 0 ? roleFields : [{
                name: 'No Roles Found',
                value: 'Configure roles with `/configticket setup` or `/configticket addrole`',
                inline: false
            }],
            footer: 'Use /configticket addrole to add more roles',
            timestamp: true
        });
        
        await interaction.editReply({
            embeds: [rolesEmbed]
        });
    } catch (error) {
        console.error('Error listing support roles:', error);
        await interaction.editReply({
            content: 'There was an error listing the support roles. Please try again later.'
        });
    }
} 