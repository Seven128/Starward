import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import type {MiniappApiError as ApiError} from '../../services/api-client';
import {localFailureMessage} from '../../utils/presentation';

// Execute the actual error class, formatter and Sky policy without importing
// native transport. These are isolated policy checks, not wx/Query acceptance.
const source=ts.createSourceFile('api-client.ts',readFileSync(new URL('../../services/api-client.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const declarations=source.statements.filter(node=>
  ts.isClassDeclaration(node)&&node.name?.text==='MiniappApiError'||
  ts.isFunctionDeclaration(node)&&node.name?.text==='errorMessage');
if(declarations.length!==2)throw Error('sky_report_error_owner_missing');
const policy=ts.createSourceFile('sky-report-access.ts',readFileSync(new URL('./sky-report-access.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const code=[...declarations.map(node=>node.getText(source)),...policy.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(policy))]
  .join('\n').replace(/^export /gmu,'');
const owner=vm.runInNewContext(ts.transpileModule(code+'\n({MiniappApiError,skyReportAccessRejection,skyReportRecovery});',
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,{localFailureMessage});
const ErrorOwner=owner.MiniappApiError as typeof import('../../services/api-client').MiniappApiError;
export class SkyTestApiError extends ErrorOwner {
  constructor(code:string){super({code:code as ApiError['code'],message:code,retryable:false,recovery:[],requestId:'controlled-policy'},400);}
}
export const skyReportTestPolicy=owner as {
  skyReportAccessRejection:typeof import('./sky-report-access').skyReportAccessRejection;
  skyReportRecovery:typeof import('./sky-report-access').skyReportRecovery;
};
