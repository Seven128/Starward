export interface ContractReexportChain {
  module: { rule(name: string): {
    test(predicate: (resource: string) => boolean): { sideEffects(value: boolean): void };
  } };
}
export function assertContractReexports(source: string, file: string): void;
export function assertContractInitialization(entry: string): void;
export function applyContractReexportRule(chain: ContractReexportChain, file: string): void;
