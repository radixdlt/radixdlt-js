/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

export enum RadixAtomNodeStatus {
    PENDING = 'PENDING',
    SUBMITTING = 'SUBMITTING',
    SUBMITTED = 'SUBMITTED',
    STORED = 'STORED',
    STORED_FINAL = 'STORED_FINAL',

    EVICTED_CONFLICT_LOSER = 'EVICTED_CONFLICT_LOSER',
    EVICTED_FAILED_CM_VERIFICATION = 'EVICTED_FAILED_CM_VERIFICATION',
    MISSING_DEPEPENDENCY = 'MISSING_DEPEPENDENCY',
    CONFLICT_LOSER = 'CONFLICT_LOSER',
    EVICTED_CONFLICT_LOSER_FINAL = 'EVICTED_CONFLICT_LOSER_FINAL',
    SUBMISSION_ERROR = 'SUBMISSION_ERROR',
}
