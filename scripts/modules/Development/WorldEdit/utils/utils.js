import { BlockTypes, world } from "@minecraft/server";
import { Cooldown, util } from "xapi.js";

/**
 * @param {string} blockTypeID
 * @param {Vector3} location
 */
export function setblock(blockTypeID, location) {
	if (blockTypeID.includes(".") || blockTypeID === "air") {
		// Block is written like "stone.3", so we need to get data and id
		const [_, id, data] = /^(.+)\.(\d+)/g.exec(blockTypeID) ?? [];
		world.overworld.runCommand(
			`setblock ${location.x} ${location.y} ${location.z} ${id} ${data}`,
			{ showError: true },
		);
	} else {
		// Normal block type
		const blockType = BlockTypes.get(
			`minecraft:${blockTypeID.replace("minecraft:", "")}`,
		);
		if (!blockType)
			return util.error(
				new TypeError(`BlockType ${blockTypeID} does not exist!`),
			);
		world.overworld.getBlock(location)?.setType(blockType);
	}
}

/**
 *
 * @param {number} ms
 * @returns
 */
export function get(ms) {
	let parsedTime = "0";
	let type = "ошибок";

	/**
	 * @param {number} value
	 * @param {[string, string, string]} valueType 1 секунда 2 секунды 5 секунд
	 */
	const set = (value, valueType, fiction = 0) => {
		if (parsedTime === "0" && ~~value > 1 && value < 100) {
			// Replace all 234.0 values to 234
			parsedTime = value
				.toFixed(fiction)
				.replace(/(\.[1-9]*)0+$/m, "$1")
				.replace(/\.$/m, "");

			type = Cooldown.getT(parsedTime, valueType);
		}
	};

	set(ms / (1000 * 60), ["минуту", "минуты", "минут"], 2);
	set(ms / 1000, ["секунду", "секунды", "секунд"], 1);
	set(ms, ["миллисекунду", "миллисекунды", "миллисекунд"], 1);

	return { parsedTime, type };
}
