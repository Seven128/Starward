package app.starward.permissions

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

private data class ActivitySnapshot(
  val moduleId: String,
  val activityId: Long? = null,
  val pauseEpoch: Long = 0,
  val stopEpoch: Long = 0,
  val resumed: Boolean = false,
  val available: Boolean = false,
) {
  fun asMap(): Map<String, Any?> = mapOf(
    "moduleId" to moduleId,
    "activityId" to activityId,
    "pauseEpoch" to pauseEpoch,
    "stopEpoch" to stopEpoch,
    "resumed" to resumed,
    "available" to available,
  )
}

class StarwardPermissionHandoffModule : Module() {
  private val stateLock = Any()
  private val mainHandler = Handler(Looper.getMainLooper())
  private val snapshot = AtomicReference(ActivitySnapshot(moduleId = UUID.randomUUID().toString()))
  // These fields are changed under stateLock. Only the Activity reference is weak.
  private var closed = false
  private var nextActivityId = 0L
  private var activityRef = WeakReference<Activity>(null)
  private var registeredApplication: Application? = null

  private val callbacks = object : Application.ActivityLifecycleCallbacks {
    override fun onActivityPaused(activity: Activity) {
      updateOwner(activity) { it.copy(pauseEpoch = it.pauseEpoch + 1, resumed = false) }
    }

    override fun onActivityStopped(activity: Activity) {
      updateOwner(activity) { it.copy(stopEpoch = it.stopEpoch + 1, resumed = false) }
    }

    override fun onActivityResumed(activity: Activity) {
      updateOwner(activity) {
        val valid = !activity.isFinishing && !activity.isDestroyed
        it.copy(resumed = valid, available = valid)
      }
    }

    override fun onActivityDestroyed(activity: Activity) {
      val changed = synchronized(stateLock) {
        if (closed || activityRef.get() !== activity) return@synchronized false
        snapshot.set(snapshot.get().copy(available = false, resumed = false))
        activityRef.clear()
        true
      }
      if (changed) wakeReaders()
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
  }

  override fun definition() = ModuleDefinition {
    Name("StarwardPermissionHandoff")
    Events("onActivityVisibility")

    AsyncFunction("prepare") {
      prepareOwner()
    }.runOnQueue(Queues.MAIN)

    // No Activity, Lifecycle or UI-thread access occurs on the synchronous JSI path.
    Function("read") {
      snapshot.get().asMap()
    }

    OnDestroy {
      synchronized(stateLock) {
        closed = true
        snapshot.set(snapshot.get().copy(available = false, resumed = false))
      }
      if (Looper.myLooper() == Looper.getMainLooper()) {
        detachCallbacks()
      } else if (!mainHandler.post { detachCallbacks() }) {
        // The main Looper is exiting. Application's callback-list removal is
        // synchronized; this fallback does not read Activity/Lifecycle state.
        detachCallbacks()
      }
    }
  }

  private fun prepareOwner(): Map<String, Any?> {
    check(Looper.myLooper() == Looper.getMainLooper())
    synchronized(stateLock) {
      if (closed) return snapshot.get().asMap()
      val activity = appContext.currentActivity
      val lifecycle = (activity as? LifecycleOwner)?.lifecycle
      if (
        activity == null || activity.isFinishing || activity.isDestroyed ||
        lifecycle?.currentState != Lifecycle.State.RESUMED
      ) {
        snapshot.set(snapshot.get().copy(available = false, resumed = false))
        // A later explicit prepare must obtain a new identity; a resume callback
        // cannot silently requalify an owner that could not be confirmed here.
        activityRef.clear()
        return@synchronized
      }
      val application = activity.application
      if (registeredApplication !== application) {
        snapshot.set(snapshot.get().copy(available = false, resumed = false))
        registeredApplication?.unregisterActivityLifecycleCallbacks(callbacks)
        registeredApplication = null
        application.registerActivityLifecycleCallbacks(callbacks)
        registeredApplication = application
      }
      if (activityRef.get() !== activity) {
        nextActivityId += 1
        activityRef = WeakReference(activity)
        // Epochs are module-scoped and never reset by another prepare or Activity.
        snapshot.set(snapshot.get().copy(activityId = nextActivityId))
      }
      snapshot.set(snapshot.get().copy(available = true, resumed = true))
    }
    wakeReaders()
    // Destruction may have invalidated the snapshot after the main-thread block.
    return snapshot.get().asMap()
  }

  private fun updateOwner(activity: Activity, transform: (ActivitySnapshot) -> ActivitySnapshot) {
    val changed = synchronized(stateLock) {
      if (closed || activityRef.get() !== activity) return@synchronized false
      snapshot.set(transform(snapshot.get()))
      true
    }
    if (changed) wakeReaders()
  }

  private fun wakeReaders() {
    // An event is only a wake-up. Consumers must synchronously read current facts.
    // A runtime already being destroyed cannot keep a native lifecycle callback alive.
    runCatching { sendEvent("onActivityVisibility", snapshot.get().asMap()) }
  }

  private fun detachCallbacks() {
    synchronized(stateLock) {
      registeredApplication?.unregisterActivityLifecycleCallbacks(callbacks)
      registeredApplication = null
      activityRef.clear()
    }
  }
}
