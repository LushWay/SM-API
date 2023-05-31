import { WorldEditBuild } from "../../builders/WorldEditBuilder.js";

new XCommand({
	name: "paste",
	description: "Вставляет заранее скопированную зону",
	role: "moderator",
	type: "wb",
})
	.int("rotation", true)
	.string("mirror", true)
	.boolean("includeEntites", true)
	.boolean("includeBlocks", true)
	.int("integrity", true)
	.int("seed", true)
	.executes(
		async (
			ctx,
			rotation,
			mirror,
			includeEntites,
			includeBlocks,
			integrity,
			seed
		) => {
			let b, e;
			if (!includeEntites && !includeBlocks) {
				e = false;
				b = true;
			} else {
				b = includeBlocks;
				e = includeEntites;
			}
			if (![0, 90, 180, 270].includes(rotation))
				return ctx.reply("§c" + rotation);
			const status = await WorldEditBuild.paste(
				ctx.sender,
				// @ts-expect-error
				rotation,
				mirror,
				e,
				b,
				integrity,
				seed
			);
			ctx.reply(status);
		}
	);
