interface RegionPermissions {
  /**
   * if the player can use chests, defualt: true
   */
  doorsAndSwitches: boolean
  /**
   * if the player can use doors, default: true
   */
  openContainers: boolean
  /**
   * if players can fight, default: false
   */
  pvp: boolean
  /**
   * the entities allowed to spawn in this region
   */
  allowedEntities: string[] | 'all'
  /**
   * Owners of region
   */
  owners: string[]
}
