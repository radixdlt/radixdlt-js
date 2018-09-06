import RadixTokenClass from './RadixTokenClass'

/**
 * Tokens' information manager.
 */
export class RadixToken {
    
  tokens: RadixTokenClass[] = []

  /**
   * Add or update a token, indexed by its ID.
   *
   * @param {RadixTokenClass} token
   * @memberof RadixToken
   */
  addOrUpdateToken(token: RadixTokenClass): void {
      this.tokens[token.id.toString()] = token
  }

  /**
   * Get a token by ID, if it doesn't exists it searches for it in the Ledger.
   *
   * @param {string} id 
   * @returns {RadixTokenClass}
   * @memberof RadixToken
   */
  getTokenByID(id: string): RadixTokenClass {
    let token: RadixTokenClass = this.tokens[id]

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
  getTokenByISO(iso: string): RadixTokenClass {
    for (let id in this.tokens) {
      if (this.tokens[id].iso == iso) {
        return this.tokens[id]
      }
    }

    // Search token by iso in Ledger?

    return null
  }

  /**
   * Return a list of the current tokens in the manager.
   *
   * @returns {RadixTokenClass[]}
   * @memberof RadixToken
   */
  getCurrentTokens(): RadixTokenClass[] {
    return this.tokens
  }
}

export let radixToken = new RadixToken()