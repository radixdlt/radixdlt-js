export class RadixConfig {
    dataDir: string
    walletFileName: string
    atomDBFileName: string
    contactsFileName: string
    
    authDBFileName: string
    
    
    mainAssetISO = "TEST"
    version = '1.1.0-alpha'
    dbVersion = '2'

    // faucetAddress = '9evL8jFz7YyEYvDYyzkYHcbq1MGSNJnQiSoBDbuojUcRjjQXhja' //Highgarden
    // faucetAddress = 'JGuwJVu7REeqQtx7736GB9AJ91z5xB55t8NvteaoC25AumYovjp' //Sunstone
    faucetAddress = '9egHejbV2z1p1Luy2mER4BXsaHbyM67LdaLrUoJ9YSFRGCw1XPC' //Alphanet
}

export let radixConfig = new RadixConfig
