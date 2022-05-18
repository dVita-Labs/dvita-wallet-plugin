/**
 * Useful to build a version for developmwnt which is compatible with NeoLine
 */

export function transformEventType<T extends string>(name: T): T {
    return name
        .replace(/^dVITAWallet\./, 'NEOLine.NEO.')
        .replace(/^dvita\./, 'neoline.') as T;
}

export const libraryName = 'NEOLineN3';
