import { RadixAtomNodeStatus } from '../..'

export const RadixAtomStatusIsInsert = {
    [RadixAtomNodeStatus.PENDING]: true,
    [RadixAtomNodeStatus.SUBMITTING]: true,
    [RadixAtomNodeStatus.SUBMITTED]: true,
    [RadixAtomNodeStatus.STORED]: true,
    [RadixAtomNodeStatus.STORED_FINAL]: true,

    [RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER]: false,
    [RadixAtomNodeStatus.EVICTED_FAILED_CM_VERIFICATION]: false,
    [RadixAtomNodeStatus.MISSING_DEPEPENDENCY]: false,
    [RadixAtomNodeStatus.CONFLICT_LOSER]: false,
    [RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL]: false,
    [RadixAtomNodeStatus.SUBMISSION_ERROR]: false,
}
