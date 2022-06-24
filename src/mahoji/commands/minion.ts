import { FormattedCustomEmoji } from '@sapphire/discord.js-utilities';
import { ApplicationCommandOptionType, CommandRunOptions } from 'mahoji';

import { MAX_LEVEL, PerkTier } from '../../lib/constants';
import { diaries } from '../../lib/diaries';
import { effectiveMonsters } from '../../lib/minions/data/killableMonsters';
import { Minigames } from '../../lib/settings/minigames';
import Skills from '../../lib/skilling/skills';
import creatures from '../../lib/skilling/skills/hunter/creatures';
import { convertLVLtoXP, isValidNickname } from '../../lib/util';
import getOSItem from '../../lib/util/getOSItem';
import getUsersPerkTier from '../../lib/util/getUsersPerkTier';
import { minionStatsEmbed } from '../../lib/util/minionStatsEmbed';
import BankImageTask from '../../tasks/bankImage';
import {
	achievementDiaryCommand,
	claimAchievementDiaryCommand
} from '../lib/abstracted_commands/achievementDiaryCommand';
import { bankBgCommand } from '../lib/abstracted_commands/bankBgCommand';
import { cancelTaskCommand } from '../lib/abstracted_commands/cancelTaskCommand';
import { crackerCommand } from '../lib/abstracted_commands/crackerCommand';
import { ironmanCommand } from '../lib/abstracted_commands/ironmanCommand';
import { Lampables, lampCommand } from '../lib/abstracted_commands/lampCommand';
import { minionBuyCommand } from '../lib/abstracted_commands/minionBuyCommand';
import { allUsableItems, useCommand } from '../lib/abstracted_commands/useCommand';
import { ownedItemOption, skillOption } from '../lib/mahojiCommandOptions';
import { OSBMahojiCommand } from '../lib/util';
import {
	handleMahojiConfirmation,
	MahojiUserOption,
	mahojiUserSettingsUpdate,
	mahojiUsersSettingsFetch,
	patronMsg
} from '../mahojiSettings';

export const minionCommand: OSBMahojiCommand = {
	name: 'minion',
	description: 'Manage and control your minion.',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'buy',
			description: 'Buy a minion so you can start playing the bot!',
			options: [
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'ironman',
					description: 'Do you want to be an ironman?',
					required: false
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'cracker',
			description: 'Use a Christmas Cracker on someone.',
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: 'user',
					description: 'The user you want to use the cracker on.',
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'stats',
			description: 'Check the stats of your minion.'
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'achievementdiary',
			description: 'Manage your achievement diary.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'diary',
					description: 'The achievement diary name.',
					required: false,
					choices: diaries.map(i => ({ name: i.name, value: i.name }))
				},
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'claim',
					description: 'Claim your rewards?',
					required: false
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'bankbg',
			description: 'Change your bank background.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'name',
					description: 'The name of the bank background you want.',
					autocomplete: async value => {
						const bankImages = (globalClient.tasks.get('bankImage') as BankImageTask).backgroundImages;
						return bankImages
							.filter(bg => (!value ? true : bg.available))
							.filter(bg => (!value ? true : bg.name.toLowerCase().includes(value.toLowerCase())))
							.map(i => {
								const name = i.perkTierNeeded
									? `${i.name} (Tier ${i.perkTierNeeded - 1} patrons)`
									: i.name;
								return { name, value: i.name };
							});
					}
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'lamp',
			description: 'Use lamps to claim XP.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'item',
					description: 'The item you want to use.',
					autocomplete: async (value: string) => {
						return Lampables.map(i => i.items)
							.flat(2)
							.map(getOSItem)
							.filter(p => (!value ? true : p.name.toLowerCase().includes(value.toLowerCase())))
							.map(p => ({ name: p.name, value: p.name }));
					},
					required: true
				},
				{
					...skillOption,
					required: true,
					name: 'skill',
					description: 'The skill you want to use the item on.'
				},
				{
					type: ApplicationCommandOptionType.Number,
					name: 'quantity',
					description: 'You quantity you want to use.',
					required: false,
					min_value: 1,
					max_value: 100_000
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'cancel',
			description: 'Cancel your current trip.'
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'use',
			description: 'Allows you to use items.',
			options: [
				{
					...ownedItemOption(i => allUsableItems.has(i.id)),
					required: true,
					name: 'item'
				},
				{
					...ownedItemOption(i => allUsableItems.has(i.id)),
					required: false,
					name: 'secondary_item',
					description: 'Optional second item to use the first one on.'
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'set_icon',
			description: 'Set the icon for your minion.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'icon',
					description: 'The icon you want to pick.',
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'set_name',
			description: 'Set the name of your minion.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'name',
					description: 'The name you want to pick.',
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'level',
			description: 'Check your level/XP in a skill.',
			options: [
				{
					...skillOption,
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'kc',
			description: 'Check your KC.',
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'name',
					description: 'The monster/thing you want to check your KC of.',
					required: true,
					autocomplete: async (value: string) => {
						return [...effectiveMonsters, ...Minigames, ...creatures]
							.filter(i => (!value ? true : i.aliases.some(alias => alias.includes(value.toLowerCase()))))
							.map(i => ({ name: i.name, value: i.name }));
					}
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'ironman',
			description: 'Become an ironman, or de-iron.',
			options: [
				{
					type: ApplicationCommandOptionType.Boolean,
					name: 'permanent',
					description: 'Do you want to become a permanent ironman?',
					required: false
				}
			]
		}
	],
	run: async ({
		userID,
		options,
		interaction
	}: CommandRunOptions<{
		stats?: {};
		achievementdiary?: { diary?: string; claim?: boolean };
		bankbg?: { name?: string };
		cracker?: { user: MahojiUserOption };
		lamp?: { item: string; quantity?: number; skill: string };
		cancel?: {};
		use?: { item: string; secondary_item?: string };
		set_icon?: { icon: string };
		set_name?: { name: string };
		level?: { skill: string };
		kc?: { name: string };
		buy?: { ironman?: boolean };
		ironman?: { permanent?: boolean };
	}>) => {
		const user = await globalClient.fetchUser(userID.toString());
		const mahojiUser = await mahojiUsersSettingsFetch(user.id);
		const perkTier = getUsersPerkTier(user);

		if (options.stats) {
			return { embeds: [await minionStatsEmbed(user)] };
		}

		if (options.achievementdiary) {
			if (options.achievementdiary.claim) {
				return claimAchievementDiaryCommand(user, options.achievementdiary.diary ?? '');
			}
			return achievementDiaryCommand(user, options.achievementdiary.diary ?? '');
		}

		if (options.bankbg) {
			return bankBgCommand(interaction, user, options.bankbg.name ?? '');
		}
		if (options.cracker) {
			const otherUser = await globalClient.fetchUser(options.cracker.user.user.id);
			return crackerCommand({ owner: user, otherPerson: otherUser, interaction });
		}

		if (options.lamp) {
			return lampCommand(user, options.lamp.item, options.lamp.skill, options.lamp.quantity);
		}

		if (options.cancel) return cancelTaskCommand(mahojiUser, interaction);

		if (options.use) return useCommand(mahojiUser, user, options.use.item, options.use.secondary_item);
		if (options.set_icon) {
			if (perkTier < PerkTier.Four) return patronMsg(PerkTier.Four);

			const res = FormattedCustomEmoji.exec(options.set_icon.icon);
			if (!res || !res[0]) return "That's not a valid emoji.";

			await handleMahojiConfirmation(interaction, 'Icons cannot be inappropriate or NSFW. Do you understand?');
			await mahojiUserSettingsUpdate(user.id, {
				minion_icon: res[0]
			});

			return `Changed your minion icon to ${res}.`;
		}
		if (options.set_name) {
			if (!isValidNickname(options.set_name.name)) return "That's not a valid name for your minion.";
			await mahojiUserSettingsUpdate(user.id, {
				minion_name: options.set_name.name
			});
			return `Renamed your minion to ${user.minionName}.`;
		}

		if (options.level) {
			const skill = Object.values(Skills).find(i => i.id === options.level?.skill);
			if (!skill) return 'Invalid skill.';
			const level = user.skillLevel(skill.id);
			const xp = user.settings.get(`skills.${skill.id}`) as number;

			let str = `${skill.emoji} Your ${skill.name} level is **${level}** (${xp.toLocaleString()} XP).`;
			if (level < MAX_LEVEL) {
				const xpToLevel = convertLVLtoXP(level + 1) - xp;
				str += ` ${xpToLevel.toLocaleString()} XP away from level ${level + 1}`;
			}
			return str;
		}

		if (options.kc) {
			const [kcName, kcAmount] = await user.getKCByName(options.kc.name);
			if (!kcName) {
				return "That's not a valid monster, minigame or hunting creature.";
			}
			return `Your ${kcName} KC is: ${kcAmount}.`;
		}

		if (options.buy) return minionBuyCommand(user, mahojiUser, Boolean(options.buy.ironman));
		if (options.ironman) return ironmanCommand(user, interaction);

		return 'Unknown command';
	}
};
