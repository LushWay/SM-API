import { Player } from "@minecraft/server";

export class Cooldown {
	/**
	 * Generates a unique key for the cooldown in the database
	 * @param {string} name - The name of the cooldown
	 * @param {string} ID - The ID of the player or source related to the cooldown
	 * @returns {string} - The generated key
	 */
	static genDBkey(name, ID) {
		return "COOLDOWN_" + name + ":" + ID;
	}
	/**
	 * Parses the remaining time in milliseconds into a more human-readable format
	 * @param {number} ms - Milliseconds to parse
	 * @returns {{ parsedTime: string, type: string }} - An object containing the parsed time and the type of time (e.g. "days", "hours", etc.)
	 */
	static getRemainingTime(ms) {
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

		set(ms / (1000 * 60 * 60 * 60 * 24), ["день", "дня", "дней"], 2);
		set(ms / (1000 * 60 * 60), ["час", "часа", "часов"], 1);
		set(ms / (1000 * 60), ["минуту", "минуты", "минут"], 1);
		set(ms / 1000, ["секунда", "секунды", "секунд"]);

		return { parsedTime, type };
	}
	/**
	 *
	 * @param {string} digit
	 * @param {[string, string, string]} _ 1 секунда 2 секунды 5 секунд
	 * @returns
	 */
	static getT(digit, [one = "секунда", few = "секунды", more = "секунд"]) {
		const lastDigit = digit[digit.length - 1];

		let o = more;
		if (lastDigit === "1" && !digit.endsWith("11")) {
			o = one;
		} else if (["1", "2", "3", "4"].includes(lastDigit)) {
			o = few;
		}
		return o;
	}
	/**
	 * @type {AbstactDatabase}
	 * @private
	 */
	db;
	/**
	 * @type {string}
	 * @private
	 */
	key;
	/**
	 * @type {number}
	 * @private
	 */
	time;
	/**
	 * @type {Player | undefined}
	 */
	player;
	/**
	 * create class for manage player cooldowns
	 * @param {AbstactDatabase} db Database to store cooldowns
	 * @param {string} prefix Preifx of the cooldown
	 * @param {string | Player} source id or player that used for generate key and tell messages
	 * @param {number} time Time in ms
	 */
	constructor(db, prefix, source, time) {
		this.db = db;
		this.key = Cooldown.genDBkey(
			prefix,
			typeof source === "string" ? source : source.id
		);
		if (typeof source !== "string") this.player = source;
		this.time = time;
	}
	update() {
		this.db.set(this.key, Date.now());
	}
	/**
	 * DB requred!
	 */
	get statusTime() {
		const data = this.db.get(this.key);
		if (typeof data === "number" && Date.now() - data <= this.time)
			return Date.now() - data;
		return "EXPIRED";
	}
	isExpired() {
		const status = this.statusTime;
		if (status === "EXPIRED") return true;
		if (this.player) {
			const time = Cooldown.getRemainingTime(this.time - status);
			this.player.tell(`§cПодожди еще §f${time.parsedTime} §c${time.type}`);
		}
		return false;
	}
	expire() {
		this.db.delete(this.key);
	}
}
