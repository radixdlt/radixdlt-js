import RadixApplicationData from './RadixApplicationData';

export default interface RadixApplicationDataUpdate {
    type: string,
    hid: string,
    applicationId: string,
    data: RadixApplicationData
}
