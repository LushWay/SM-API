import { Player } from '@minecraft/server'
import { DynamicPropertyDB } from 'lib/Database/Properties.js'

export const OPTIONS_NAME = Symbol('name')

/**
 * Сonverting true and false to boolean
 * @template T
 * @typedef {T extends true | false ? boolean : T} TrueFalseToBoolean
 */

/**
 * Any setting value type
 * @typedef {string | boolean | number | JSONLike} SettingValue
 */

/**
 * @template [T = boolean | string | number | JSONLike]
 * @typedef {Record<string,
 *   { desc: string; value: T, name: string, onChange?: VoidFunction  }
 * > & {[OPTIONS_NAME]?: string}
 * } SettingsConfig
 */

/**
 * @typedef {Record<string, Record<string, SettingValue>>} SETTINGS_DB
 */

export const PLAYER_SETTINGS_DB = new DynamicPropertyDB('playerOptions', {
  /** @type {SETTINGS_DB} */
  type: {},
  defaultValue: () => {
    return {}
  },
}).proxy()

/** @typedef {SettingsConfig<SettingValue> & Record<string, { requires?: boolean, }>} WorldSettings */
export const WORLD_SETTINGS_DB = new DynamicPropertyDB('worldOptions', {
  /** @type {SETTINGS_DB} */
  type: {},
  defaultValue: () => {
    return {}
  },
}).proxy()

export class Settings {
  /** @type {Record<string, SettingsConfig<boolean | string>>} */
  static playerMap = {}
  /**
   * It creates a proxy object that has the same properties as the `CONFIG` object, but the values are
   * stored in a database
   * @param {string} name - The name that shows to players
   * @param {string} groupName - The prefix for the database.
   * @template {SettingsConfig<boolean | string>} Config
   * @param {Config} config - This is an object that contains the default values for each option.
   * @returns {(player: Player) => { [Prop in keyof Config]: TrueFalseToBoolean<Config[Prop]["value"]> }} An object with properties that are getters and setters.
   */
  static player(name, groupName, config) {
    config[OPTIONS_NAME] = name

    if (!(groupName in this.playerMap)) {
      this.playerMap[groupName] = config
    } else {
      this.playerMap[groupName] = {
        ...this.playerMap[groupName],
        ...config,
      }
    }
    return player =>
      // @ts-expect-error Trust me, TS
      generateSettingsProxy(PLAYER_SETTINGS_DB, groupName, this.playerMap[groupName], player)
  }

  /** @type {Record<string, WorldSettings>} */
  static worldMap = {}

  /**
   * It takes a prefix and a configuration object, and returns a proxy that uses the prefix to store the
   * configuration object's properties in localStorage
   * @template {WorldSettings} Config
   * @param {string} groupName - The prefix for the database.
   * @param {Config} config - The default values for the options.
   * @returns {{ [Prop in keyof Config]: TrueFalseToBoolean<Config[Prop]["value"]> }} An object with properties that are getters and setters.
   */
  static world(groupName, config) {
    if (!(groupName in this.worldMap)) {
      this.worldMap[groupName] = config
    } else {
      this.worldMap[groupName] = {
        ...this.worldMap[groupName],
        ...config,
      }
    }
    // @ts-expect-error Trust me, TS
    return generateSettingsProxy(WORLD_SETTINGS_DB, groupName, this.worldMap[groupName])
  }
}

/**
 * It creates a proxy object that allows you to access and modify the values of a given object, but the
 * values are stored in a database
 * @param {SETTINGS_DB} database - The prefix for the database.
 * @param {string} groupName - The group name of the settings
 * @param {SettingsConfig} config - This is the default configuration object. It's an object with the keys being the
 * option names and the values being the default values.
 * @param {Player | null} [player] - The player object.
 * @returns {Record<string, any>} An object with getters and setters
 */
export function generateSettingsProxy(database, groupName, config, player = null) {
  const OptionsProxy = {}
  for (const prop in config) {
    const key = player ? `${player.id}:${prop}` : prop
    Object.defineProperty(OptionsProxy, prop, {
      configurable: false,
      enumerable: true,
      get() {
        return database[groupName]?.[key] ?? config[prop].value
      },
      set(v) {
        const value = database[groupName]
        value[key] = v
        config[prop].onChange?.()
        database[groupName] = value
      },
    })
  }
  return OptionsProxy
}
