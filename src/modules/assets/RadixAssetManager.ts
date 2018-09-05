import RadixAsset from './RadixAsset'

/**
 * Assets' information manager.
 */
export class RadixAssetManager {
    
  assets: RadixAsset[] = []

  /**
   * Add or update an asset, indexed by its ID.
   *
   * @param {RadixAsset} asset
   * @memberof RadixAssetManager
   */
  addOrUpdateAsset(asset: RadixAsset): void {
      this.assets[asset.id.toString()] = asset
  }

  /**
   * Get an asset by ID, if it doesn't exists it searches for it in the Ledger.
   *
   * @param {string} id 
   * @returns {RadixAsset}
   * @memberof RadixAssetManager
   */
  getAssetById(id: string): RadixAsset {
    let asset: RadixAsset = this.assets[id]

    if (!asset) {
      // Search asset by id in Ledger?
    }

    return asset
  }
  
  /**
   * Get an asset by ISO, if it doesn't exists it searches for it in the Ledger.
   *
   * @param {string} iso
   * @returns {RadixAsset}
   * @memberof RadixAssetManager
   */
  getAssetByISO(iso: string): RadixAsset {
    for (let id in this.assets) {
      if (this.assets[id].iso == iso) {
        return this.assets[id]
      }
    }

    // Search asset by iso in ledger?

    return null
  }

  /**
   * Return a list of the current assets in the manager.
   *
   * @returns {RadixAsset[]}
   * @memberof RadixAssetManager
   */
  getCurrentAssets(): RadixAsset[] {
    return this.assets
  }
}

export let radixAssetManager = new RadixAssetManager()