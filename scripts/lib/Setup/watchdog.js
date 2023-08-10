import { system, WatchdogTerminateReason, world } from "@minecraft/server";

/** @type {Record<WatchdogTerminateReason, string>} */
const reasons = {
	Hang: "Скрипт завис",
	StackOverflow: "Стэк переполнен",
};

system.beforeEvents.watchdogTerminate.subscribe((event) => {
	world.say("§cСобакаСутулая: §f" + reasons[event.terminateReason]);
	event.cancel = true;
});
