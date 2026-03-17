package expo.modules.settingsstorage

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

class DeviceAuthHelper(
  private val activity: FragmentActivity,
  private val onSuccess: () -> Unit,
  private val onError: (String) -> Unit
) {
  private val executor = ContextCompat.getMainExecutor(activity)

  private val prompt by lazy {
    BiometricPrompt(
      activity,
      executor,
      object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          onSuccess()
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          onError(errString.toString())
        }

        override fun onAuthenticationFailed() {
          // non-terminal, do nothing
        }
      }
    )
  }

  fun authenticate(force: Boolean = true): Boolean {
    val authenticators =
      BiometricManager.Authenticators.BIOMETRIC_STRONG or
        BiometricManager.Authenticators.DEVICE_CREDENTIAL

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
      .setTitle("Unlock secure settings")
      .setSubtitle("Authenticate to access protected settings")
      .setAllowedAuthenticators(authenticators)
      .build()

    prompt.authenticate(promptInfo)
    return true
  }

  fun onActivityResult(requestCode: Int, resultCode: Int): Boolean {
    return false
  }
}
