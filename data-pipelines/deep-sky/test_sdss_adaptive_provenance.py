"""Processing-lineage regressions; these fixtures do not certify science."""
import ast
import copy
import inspect
import unittest

import sdss_noise_display_provenance as owner
from image_quality import digest
from sdss_adaptive_display import VERSION, HALO_VERSION
from sdss_display_recovery import VERSION as SUPPLY_VERSION, REBASE_VERSION


def lineage():
    identity = {'objectRef':'M:51', 'center':{'raDeg':202.469625, 'decDeg':47.1951666667},
                'orientation':'north-up/east-left'}
    science_hashes = {b:str(i)*64 for i,b in enumerate(('g','r','i'), 1)}
    recipe = {'stretch':.63, 'Q':8, 'rgbBands':['i','r','g']}
    diagnostics = {k:str(i)*64 for i,k in enumerate(('qualified','radius','reached','protected'), 4)}
    raw = {b+'-science':{'bytes':100, 'sha256':science_hashes[b]} for b in science_hashes}
    raw['joint-availability'] = {'bytes':20, 'sha256':'8'*64}
    science = identity | {'arrays':raw}
    disclosure = identity | {'source':{k:'retained source term' for k in (
        'provider','credit','license','licenseUrl','imageUsePolicyUrl','landingUrl')},
        'master':{'transfer':{'recipe':recipe}, 'science':{b:raw[b+'-science'] for b in science_hashes},
                  'jointAvailability':raw['joint-availability']}}
    base = identity | {'sourceResolvedRecipe':recipe, 'sourceScienceCOrderSha256':science_hashes,
                      'sourceAvailabilityCOrderSha256':'8'*64, 'quality':'UNVERIFIED',
                      'independentReview':'MISSING', 'adopted':False}
    adaptive = base | {'version':VERSION, 'displayEstimatesCOrderSha256':science_hashes,
                       'diagnosticCOrderSha256':diagnostics}
    halo = copy.deepcopy(adaptive) | {'version':HALO_VERSION, 'parentProcessingVersion':VERSION,
        'parentDisplayEstimatesCOrderSha256':science_hashes, 'parentDiagnosticCOrderSha256':diagnostics,
        'interiorExact':True, 'wholeMasterFilterRuns':0}
    supply = copy.deepcopy(base) | {'version':SUPPLY_VERSION, 'alternativePixels':7}
    snapshot = {'schemaVersion':owner.PROVENANCE_VERSION, 'processingVersion':owner.VERSION,
        'master':{'targetIdentity':identity, 'sourceResolvedRecipe':recipe,
                  'science':{b:{'cOrderSha256':v} for b,v in science_hashes.items()},
                  'jointAvailability':{'cOrderSha256':'8'*64}},
        'fields':[{'fieldKey':'301/1/1/1', 'bands':{b:{'epoch':1} for b in science_hashes}}]}
    qualification = {'kind':'CURRENT_RECOVERY_EXECUTION_WITH_PINNED_OLD_NOISE_PARENT',
                     'currentInputSnapshot':snapshot, 'recoveryReport':copy.deepcopy(supply)}
    current = copy.deepcopy(base) | {'version':REBASE_VERSION, 'baselineProcessingVersion':HALO_VERSION,
        'baselineEstimateCOrderSha256':science_hashes, 'baselineDiagnosticCOrderSha256':diagnostics,
        'baselineQualifiedCOrderSha256':diagnostics['qualified'], 'savedSupplyProcessingVersion':SUPPLY_VERSION,
        'savedSupplyReportCanonicalSha256':digest(owner.canonical_bytes(supply)),
        'savedExecutionCanonicalSha256':digest(owner.canonical_bytes(qualification)), 'sourceInputsExact':True,
        'currentSourceInputs':{'masterAndFieldsCanonicalSha256':digest(owner.canonical_bytes(
            {k:snapshot[k] for k in ('master','fields')}))}, 'savedAlternativePixels':7,
        'alternativePixels':7, 'supplyProjectionRuns':0, 'filterRuns':0, 'fitRuns':0,
        'levels':{'OVERVIEW':{},'MEDIUM':{},'DETAIL':{}}}
    readback = {'alternativePixels':7, 'admittedSavedValuesExact':True, 'outsideAdmittedLatestParentExact':True,
        'baselineDiagnosticLineageExact':True, 'oldQualificationCanonicalInputsExact':True,
        'levels':{k:{'numericDerivationExact':True, 'originalAlphaExact':True} for k in current['levels']}}
    return dict(zip(owner.ADAPTIVE_CHAIN_ROLES, (science,disclosure,adaptive,halo,supply,qualification,current,readback)))


class AdaptiveProvenanceTest(unittest.TestCase):
    def test_snapshot_is_input_role_not_adaptive_algorithm_version(self):
        documents = lineage()
        identity,snapshot,recipe = owner._adaptive_recovery_lineage(documents)
        self.assertEqual(identity['objectRef'],'M:51')
        self.assertEqual(snapshot['processingVersion'],owner.VERSION)
        self.assertEqual(documents['current']['version'],REBASE_VERSION)

    def test_same_geometry_other_target_cannot_relabel_a_parent(self):
        documents = lineage();documents['halo']['objectRef'] = 'M:82'
        with self.assertRaisesRegex(RuntimeError,'target_changed'):owner._adaptive_recovery_lineage(documents)

    def test_parent_diagnostic_and_estimate_epoch_are_both_required(self):
        for key in ('parentDiagnosticCOrderSha256','parentDisplayEstimatesCOrderSha256'):
            documents = lineage();documents['halo'][key] = {'g':'9'*64}
            with self.assertRaisesRegex(RuntimeError,'parent_changed'):owner._adaptive_recovery_lineage(documents)

    def test_source_epoch_rewrite_cannot_hide_behind_new_canonical_report_hash(self):
        documents = lineage()
        documents['qualification']['currentInputSnapshot']['fields'][0]['bands']['g']['epoch'] = 2
        documents['current']['savedExecutionCanonicalSha256'] = digest(owner.canonical_bytes(documents['qualification']))
        # Bounded removal reproduces the escaped failure: all other target,
        # fallback/readback/disclosure checks still accept the changed epoch.
        tree = ast.parse(inspect.getsource(owner._adaptive_recovery_lineage))
        function = tree.body[0]
        removed = [node for node in function.body if isinstance(node,ast.If) and
                   any(isinstance(v,ast.Constant) and v.value == 'sdss_adaptive_chain_qualification_changed'
                       for v in ast.walk(node))]
        self.assertEqual(len(removed),1)
        function.body.remove(removed[0]);ast.fix_missing_locations(tree)
        namespace = dict(owner.__dict__);exec(compile(tree,'bounded-lineage-guard-mutation','exec'),namespace)
        escaped = namespace['_adaptive_recovery_lineage'](documents)
        self.assertEqual(escaped[1]['fields'][0]['bands']['g']['epoch'],2)
        with self.assertRaisesRegex(RuntimeError,'qualification_changed'):owner._adaptive_recovery_lineage(documents)

    def test_coverage_and_scientific_identity_are_not_display_alpha_or_supply(self):
        documents = lineage();documents['current']['sourceAvailabilityCOrderSha256'] = '9'*64
        with self.assertRaisesRegex(RuntimeError,'science_changed'):owner._adaptive_recovery_lineage(documents)

    def test_missing_or_false_numeric_alpha_evidence_cannot_close_chain(self):
        for value in ({}, {'OVERVIEW':{'numericDerivationExact':True,'originalAlphaExact':False}}):
            documents = lineage();documents['readback']['levels'] = value
            with self.assertRaisesRegex(RuntimeError,'saved_derivation_missing'):owner._adaptive_recovery_lineage(documents)

    def test_disclosure_of_other_science_cannot_supply_same_credit(self):
        documents = lineage();documents['disclosure']['master']['science'] = {'g':{'sha256':'9'*64}}
        with self.assertRaisesRegex(RuntimeError,'disclosure_science_changed'):owner._adaptive_recovery_lineage(documents)

    def test_old_version_or_adopted_flag_cannot_replace_current_chain(self):
        for key,value in (('version',SUPPLY_VERSION),('adopted',True)):
            documents = lineage();documents['current'][key] = value
            with self.assertRaisesRegex(RuntimeError,'version_or_adoption_invalid'):owner._adaptive_recovery_lineage(documents)


if __name__ == '__main__':unittest.main()
