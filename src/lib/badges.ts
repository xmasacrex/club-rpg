import { badges, BadgesEnum } from '../lib/constants';
import { prisma } from '../lib/settings/prisma';

export async function cacheBadges() {
	const newCache = new Map();
	const usersWithBadges = await prisma.user.findMany({
		where: {
			badges: {
				hasSome: Object.values(BadgesEnum)
			},
			RSN: {
				not: null
			}
		},
		select: {
			badges: true,
			id: true,
			RSN: true
		}
	});

	for (const user of usersWithBadges) {
		if (!user.RSN) continue;
		const userBadges = user.badges.map((badge: number) => badges[badge]);
		newCache.set(user.RSN.toLowerCase(), userBadges.join(' '));
	}

	globalClient._badgeCache = newCache;
}
