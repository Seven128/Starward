package app.starward.design.evidence

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.UUID
import org.json.JSONObject

class StarwardDesignEvidenceModule : Module() {
  private var receiverRegistered = false
  private var evidenceSessionActive = false
  private var launchControlId: String? = null
  private var launchContext: Map<String, String?> = emptyMap()
  private var launchSessionId: String? = null

  private val designEvidenceReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (!evidenceSessionActive) return
      when (intent.action) {
        "${context.packageName}.DESIGN_STATE" -> {
          val controlId = intent.getStringExtra("controlId") ?: return
          val state = intent.getStringExtra("state") ?: return
          if (launchControlId != controlId) return
          sendEvent("onDesignState", mapOf("controlId" to controlId, "state" to state))
        }
        "${context.packageName}.DESIGN_CONTEXT" -> {
          val next = contextFromIntent(intent)
          if (!completeContext(next) || next["sessionId"] != launchSessionId) return
          if (
            next["conditionKey"] != launchContext["conditionKey"] ||
            next["mode"] != launchContext["mode"] ||
            next["outcome"] != launchContext["outcome"]
          ) return
          launchContext = next
          launchControlId = next["controlId"]
          sendEvent("onDesignContext", next)
        }
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("StarwardDesignEvidence")
    Events("onDesignContext", "onDesignState")

    Function("getLaunchContext") {
      launchContext = contextFromLaunchIntent(appContext.currentActivity?.intent)
      launchControlId = launchContext["controlId"]
      launchSessionId = launchContext["sessionId"]
      evidenceSessionActive = completeContext(launchContext)
      launchContext
    }

    Function("logWitness") { payload: String, groupHint: String ->
      if (!evidenceSessionActive) return@Function false
      logChunkedWitness(payload, groupHint)
      true
    }

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      ContextCompat.registerReceiver(
        context,
        designEvidenceReceiver,
        IntentFilter("${context.packageName}.DESIGN_STATE").apply {
          addAction("${context.packageName}.DESIGN_CONTEXT")
        },
        ContextCompat.RECEIVER_EXPORTED,
      )
      receiverRegistered = true
    }

    OnDestroy {
      val context = appContext.reactContext
      if (receiverRegistered && context != null) {
        runCatching { context.unregisterReceiver(designEvidenceReceiver) }
      }
      receiverRegistered = false
      evidenceSessionActive = false
      launchContext = emptyMap()
      launchControlId = null
      launchSessionId = null
    }
  }

  private fun contextFromLaunchIntent(intent: Intent?): Map<String, String?> = mapOf(
    "conditionKey" to intent?.getStringExtra("starwardDesignCondition"),
    "controlId" to intent?.getStringExtra("starwardDesignControl"),
    "sessionId" to intent?.getStringExtra("starwardDesignEvidenceSession"),
    "mode" to intent?.getStringExtra("starwardDesignMode"),
    "outcome" to intent?.getStringExtra("starwardDesignOutcome"),
    "sampleId" to intent?.getStringExtra("starwardDesignSample"),
  )

  private fun contextFromIntent(intent: Intent): Map<String, String?> = mapOf(
    "conditionKey" to intent.getStringExtra("conditionKey"),
    "controlId" to intent.getStringExtra("controlId"),
    "sessionId" to intent.getStringExtra("sessionId"),
    "mode" to intent.getStringExtra("mode"),
    "outcome" to intent.getStringExtra("outcome"),
    "sampleId" to intent.getStringExtra("sampleId"),
  )

  private fun completeContext(value: Map<String, String?>): Boolean =
    listOf("conditionKey", "controlId", "sessionId", "mode", "outcome", "sampleId")
      .all { !value[it].isNullOrBlank() }

  private fun logChunkedWitness(payload: String, groupHint: String) {
    val bytes = payload.toByteArray(StandardCharsets.UTF_8)
    val encoded = Base64.encodeToString(
      bytes,
      Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP,
    )
    val digest = MessageDigest.getInstance("SHA-256")
      .digest(bytes)
      .joinToString("") { "%02x".format(it) }
    val chunkSize = 2600
    val chunks = encoded.chunked(chunkSize)
    val safeHint = groupHint.replace(Regex("[^A-Za-z0-9._:-]"), "-").take(160)
    repeat(2) { replica ->
      val groupId = "$safeHint-$replica-${UUID.randomUUID()}".take(240)
      chunks.forEachIndexed { index, chunk ->
        val record = JSONObject()
          .put("schema_version", "starward-design-section-witness-chunk-v1")
          .put("group_id", groupId)
          .put("chunk_index", index)
          .put("chunk_count", chunks.size)
          .put("payload_base64url", chunk)
          .put("payload_sha256", digest)
        Log.i("StarwardDesignEvidence", "STARWARD_DESIGN_FIELD_CHUNK $record")
        Thread.sleep(2)
      }
    }
  }
}
