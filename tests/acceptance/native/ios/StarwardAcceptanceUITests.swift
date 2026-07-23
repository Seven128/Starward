import XCTest

final class StarwardAcceptanceUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testFrozenOutcomeJourney() throws {
        guard let raw = ProcessInfo.processInfo.environment["STARWARD_ACCEPTANCE_CASE_JSON"],
              let data = raw.data(using: .utf8),
              let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let route = payload["route"] as? String,
              let actionId = payload["action_test_id"] as? String,
              let evidenceIds = payload["evidence_test_ids"] as? [String] else {
            XCTFail("STARWARD_ACCEPTANCE_CASE_JSON is missing or invalid")
            return
        }

        let app = XCUIApplication()
        app.launchArguments = ["--starward-acceptance-route", route]
        app.terminate()
        app.launch()

        let action = app.descendants(matching: .any)[actionId]
        XCTAssertTrue(action.waitForExistence(timeout: 20), "Missing native action \(actionId)")
        action.tap()
        for evidenceId in evidenceIds {
            XCTAssertTrue(app.descendants(matching: .any)[evidenceId].waitForExistence(timeout: 10), "Missing native evidence \(evidenceId)")
        }

        var surfaceValues: [[String: String]] = []
        if let surfaces = payload["cross_surfaces"] as? [[String: Any]] {
            for surface in surfaces where surface["ops_route"] == nil {
                guard let surfaceRef = surface["surface_ref"] as? String,
                      let surfaceRoute = surface["route"] as? String,
                      let testId = surface["test_id"] as? String else { continue }
                app.terminate()
                app.launchArguments = ["--starward-acceptance-route", surfaceRoute]
                app.launch()
                let element = app.descendants(matching: .any)[testId]
                XCTAssertTrue(element.waitForExistence(timeout: 15), "Missing context evidence \(testId)")
                let value = element.value as? String ?? element.label
                XCTAssertFalse(value.isEmpty, "Empty context evidence \(testId)")
                surfaceValues.append(["surface_ref": surfaceRef, "value": value])
            }
        }

        let result: [String: Any] = [
            "session_id": "ios-\(UUID().uuidString.lowercased())",
            "cold_start": true,
            "surface_values": surfaceValues,
        ]
        let resultData = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        let resultText = String(decoding: resultData, as: UTF8.self)
        print("STARWARD_NATIVE_EVIDENCE:\(resultText)")
    }
}
