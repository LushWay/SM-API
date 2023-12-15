import { Player } from '@minecraft/server'
import { CmdLet } from 'lib/Command/Cmdlet.js'
import { CommandContext } from 'lib/Command/Context.js'
import { Command } from 'lib/Command/index.js'
import { commandNotFound, noPerm } from 'lib/Command/utils.js'
import { ROLES, getRole } from 'smapi.js'

/**
 * @param {Player} player
 * @param {Command} command
 * @returns {Command<any>[]}
 */
function childrensToHelpText(player, command) {
  const childrens = []
  for (const children of command.sys.children.filter(e => e.sys.data.requires(player))) {
    if (children.sys.children.length < 1) childrens.push(children)
    else childrens.push(...childrensToHelpText(player, children))
  }
  return childrens
}

/**
 *
 * @param {Command} command
 * @returns {[string, undefined | string]}
 */
function getParentType(command, init = true) {
  const curtype = getType(command)

  let description

  if (init && command.sys.data.description) {
    description = command.sys.data.description
    init = false
  }

  if (command.sys.depth === 0 || !command.sys.parent) return [curtype, description]
  else {
    const parents = getParentType(command.sys.parent, init)
    return [`${parents[0]}§f ${curtype}`, description ?? parents[1] ?? '<нет описания>']
  }
}

/**
 *
 * @param {Command} o
 * @returns
 */
function getType(o) {
  const t = o.sys.type
  const q = t.optional

  if (t.typeName === 'literal') return `${q ? '§7' : '§f'}${t.name}`
  return `${q ? `§7[${t.name}: §7${t.typeName}§7]` : `§6<${t.name}: §6${t.typeName}§6>`}`
}

const help = new Command({
  name: 'help',
  description: 'Выводит список команд',
  aliases: ['?', 'h'],
})

/** @type {Record<keyof typeof ROLES, string>}} */
const colors = {
  admin: '§c',
  builder: '§3',
  member: '§2',
  moderator: '§5', //§r
}

help
  .int('page', true)
  .int('commandsInPage', true)
  .executes((ctx, inputPage, commandsInPage) => {
    const avaibleCommands = Command.commands.filter(e => e.sys.data.requires(ctx.sender))
    const cmds = commandsInPage || 15
    const maxPages = Math.ceil(avaibleCommands.length / cmds)
    const page = Math.min(inputPage || 1, maxPages)
    const path = avaibleCommands.slice(page * cmds - cmds, page * cmds)

    const cv = colors[getRole(ctx.sender.id)]

    ctx.reply(`§ы${cv}─═─═─═─═─═ §r${page}/${maxPages} ${cv}═─═─═─═─═─═─`)

    for (const command of path) {
      const q = '§f-'
      const c = `${cv}§r ${q}${command.sys.data.name} §o§7- ${
        command.sys.data.description ? `${command.sys.data.description}` : ' Пусто' //§r
      }`
      ctx.reply('§ы' + c)
    }
    ctx.reply(`${cv}─═─═─═§f Доступно: ${avaibleCommands.length}/${Command.commands.length} ${cv}═─═─═─═─`)
  })

/**
 *
 * @param {CommandContext} ctx
 * @param {string} commandName
 * @returns
 */
function helpForCommand(ctx, commandName) {
  const cmd = Command.commands.find(e => e.sys.data.name == commandName || e.sys.data?.aliases?.includes(commandName))

  if (!cmd) return commandNotFound(ctx.sender, commandName)
  if (!cmd.sys.data?.requires(ctx.data.sender)) return noPerm(ctx.data.sender, cmd), 'fail'

  const d = cmd.sys.data
  const aliases = d.aliases?.length > 0 ? '§7(также §f' + d.aliases.join('§7, §f') + '§7)§r' : ''
  const str = `   §fКоманда §6-${d.name} ${aliases}`

  // ctx.reply(`§7§ы┌──`);
  ctx.reply(' ')
  ctx.reply(str)
  ctx.reply(' ')

  let l = str.length

  for (const [command, description] of childrensToHelpText(ctx.sender, cmd).map(e => getParentType(e))) {
    const _ = `§7   §f-${command}§7§o - ${description}§r`
    l = Math.max(l, _.length)
    ctx.reply(_)
  }
  ctx.reply(' ')
  // ctx.reply(`${new Array(l).join(" ")}§7§ы──┘`);
  return
}

Command.getHelpForCommand = (command, ctx) => helpForCommand(ctx, command.sys.data.name)

help.string('commandName').executes(helpForCommand)

new CmdLet({
  name: 'help',
  description: 'Выводит справку о команде',
  callback(ctx) {
    helpForCommand(ctx, ctx.command.sys.data.name)
    return 'stop'
  },
})
