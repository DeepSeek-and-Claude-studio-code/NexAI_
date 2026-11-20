package com.nex.assistant

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Enforces mandatory, non-disableable user confirmation for purchases, payments,
 * orders, and financial transfers at the execution layer (cannot be bypassed by prompts).
 */
object SafetyGuard {
    const val ALWAYS_CONFIRM_PURCHASES: Boolean = true

    private val purchaseRegex = Regex(
        pattern = "(купить|оплат|заказ|оформит|корзин|подпис|перевест|списат|карт[ауы]|руб|₽|€|\\$|" +
            "buy|pay|checkout|place order|purchase|subscribe|confirm payment|transfer|billing|order now)",
        option = RegexOption.IGNORE_CASE
    )

    private val mutex = Mutex()
    private var pendingDeferred: CompletableDeferred<Boolean>? = null

    var activeConfirmation by mutableStateOf<PendingConfirmation?>(null)
        private set

    fun looksLikePurchase(text: String): Boolean = purchaseRegex.containsMatchIn(text)

    suspend fun requestConfirmation(
        title: String,
        details: String,
        isPurchase: Boolean
    ): Boolean = mutex.withLock {
        val deferred = CompletableDeferred<Boolean>()
        pendingDeferred = deferred
        activeConfirmation = PendingConfirmation(
            title = title,
            details = details,
            isPurchase = isPurchase
        )
        try {
            deferred.await()
        } finally {
            activeConfirmation = null
            pendingDeferred = null
        }
    }

    fun resolve(approved: Boolean) {
        pendingDeferred?.complete(approved)
    }

    fun cancelActive() {
        pendingDeferred?.complete(false)
    }
}
