import {RadixTokenClass, RadixSerializer,
    } from '../atom_model'
import { radixUniverse } from '../..';

/**
 * Tokens' information manager.
 */
export class RadixToken {
    
  public tokens: { [id: string]: RadixTokenClass} = {}


  public initialize() {
    for (const atom of radixUniverse.universeConfig.genesis) {
      if (atom.serializer === RadixTokenClass.SERIALIZER) {
        radixToken.addOrUpdateToken(RadixSerializer.fromJson(atom))
      }
    }
  }


  /**
   * Add or update a token, indexed by its ID.
   *
   * @param {RadixTokenClass} token
   * @memberof RadixToken
   */
  public addOrUpdateToken(token: RadixTokenClass): void {
      this.tokens[token.id.toString()] = token
  }

  /**
   * Get a token by ID, if it doesn't exists it searches for it in the Ledger.
   *
   * @param {string} id 
   * @returns {RadixTokenClass}
   * @memberof RadixToken
   */
  public getTokenByID(id: string): RadixTokenClass {
    const token = this.tokens[id]

    if (!token) {
      // Search token by id in Ledger?
    }

    return token
  }
  
  /**
   * Get a token by ISO, if it doesn't exists it searches for it in the Ledger.
   *
   * @param {string} iso
   * @returns {RadixTokenClass}
   * @memberof RadixToken
   */
  public getTokenByISO(iso: string): RadixTokenClass {
    for (const token of Object.values(this.tokens)) {
      if (token.iso === iso) {
        return token
      }
    }

    // Search token by iso in Ledger?

    return null
  }

  /**
   * Return a list of the current tokens in the manager.
   *
   * @returns 
   * @memberof RadixToken
   */
  public getCurrentTokens() {
    return this.tokens
  }
}

export let radixToken = new RadixToken()
