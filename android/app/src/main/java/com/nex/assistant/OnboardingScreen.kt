package com.nex.assistant

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun OnboardingScreen(
    ctrl: NexController,
    onRequestPerms: (Array<String>) -> Unit
) {
    val ctx = LocalContext.current
    var step by remember { mutableIntStateOf(0) }
    val scroll = rememberScrollState()

    var authTab by remember { mutableStateOf("email") }
    var email by remember { mutableStateOf(ctrl.account.email) }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf(ctrl.userName) }
    var googleClientId by remember { mutableStateOf(ctrl.account.googleClientId) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
    ) {
        // Language toggle
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            FilterChip(
                selected = ctrl.lang == "ru",
                onClick = { ctrl.updateLang("ru") },
                label = { Text("Русский") }
            )
            Spacer(Modifier.size(8.dp))
            FilterChip(
                selected = ctrl.lang == "en",
                onClick = { ctrl.updateLang("en") },
                label = { Text("English") }
            )
        }

        // 5 step dots
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            for (i in 0 until 5) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(8.dp)
                        .background(
                            if (i == step) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.outline,
                            CircleShape
                        )
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(scroll),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (step) {
                // Step 0: Initial Welcome Screen with exact slogan
                0 -> {
                    Spacer(Modifier.height(16.dp))
                    NexSphere(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp),
                        state = NexState.SPEAKING,
                        female = ctrl.female
                    )
                    Spacer(Modifier.height(14.dp))
                    Text(
                        text = ctrl.t("welcome_title"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = ctrl.t("welcome_sub"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }

                // Step 1: Sign in via Email or Google Account
                1 -> {
                    Text(
                        text = ctrl.t("sign_in_title"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = ctrl.t("sign_in_sub"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(14.dp))

                    if (ctrl.account.isSignedIn) {
                        Text(
                            text = "${ctrl.account.displayName} (${ctrl.account.email})",
                            fontWeight = FontWeight.Bold,
                            color = NexOkColor
                        )
                        Spacer(Modifier.height(10.dp))
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = authTab == "email",
                            onClick = { authTab = "email" },
                            label = { Text(ctrl.t("email_tab")) }
                        )
                        FilterChip(
                            selected = authTab == "google",
                            onClick = { authTab = "google" },
                            label = { Text(ctrl.t("google_tab")) }
                        )
                    }
                    Spacer(Modifier.height(10.dp))

                    if (authTab == "email") {
                        OutlinedTextField(
                            value = displayName,
                            onValueChange = { displayName = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text(ctrl.t("your_name")) },
                            singleLine = true
                        )
                        Spacer(Modifier.height(6.dp))
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Email") },
                            singleLine = true
                        )
                        Spacer(Modifier.height(6.dp))
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text(if (ctrl.lang == "en") "Password" else "Пароль") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true
                        )
                        Spacer(Modifier.height(10.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    if (ctrl.signInWithEmail(email, password).isSuccess) step = 2
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text(ctrl.t("sign_in_btn")) }
                            OutlinedButton(
                                onClick = {
                                    if (ctrl.registerWithEmail(email, password, displayName).isSuccess) step = 2
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text(ctrl.t("register_btn")) }
                        }
                    } else {
                        OutlinedTextField(
                            value = googleClientId,
                            onValueChange = {
                                googleClientId = it
                                ctrl.updateGoogleClientId(it)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Google OAuth Client ID") },
                            singleLine = true
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(
                            onClick = { ctrl.startGoogleSignIn(googleClientId) },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(ctrl.t("sign_in_google_btn")) }
                    }

                    if (ctrl.authStatusMessage.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            ctrl.authStatusMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }

                // Step 2: Permissions
                2 -> {
                    Text(
                        text = ctrl.t("what_allow"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = ctrl.t("what_allow_sub"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(12.dp))
                    Perms.groups.forEach { g ->
                        val ok = ctrl.permTick >= 0 && Perms.granted(ctx, g)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(g.title(ctrl.lang), fontWeight = FontWeight.SemiBold)
                                Text(
                                    g.desc(ctrl.lang),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (ok) {
                                Text(ctrl.t("allowed"), color = NexOkColor, fontWeight = FontWeight.SemiBold)
                            } else {
                                OutlinedButton(onClick = { onRequestPerms(g.perms.toTypedArray()) }) {
                                    Text(ctrl.t("allow"))
                                }
                            }
                        }
                        HorizontalDivider()
                    }
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = { onRequestPerms(Perms.allRuntimePermissions()) }) {
                        Text(ctrl.t("allow_all"))
                    }
                }

                // Step 3: Voice
                3 -> {
                    NexSphere(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp),
                        state = NexState.SPEAKING,
                        female = ctrl.female
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = ctrl.t("choose_voice"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = ctrl.t("choose_voice_sub"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(20.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        val isMale = ctrl.voice != "f"
                        if (isMale) {
                            Button(
                                onClick = { ctrl.updateVoice("m") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp)
                            ) { Text(ctrl.t("male_nex")) }
                        } else {
                            OutlinedButton(
                                onClick = { ctrl.updateVoice("m") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp)
                            ) { Text(ctrl.t("male_nex")) }
                        }

                        if (!isMale) {
                            Button(
                                onClick = { ctrl.updateVoice("f") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp)
                            ) { Text(ctrl.t("female_nexi")) }
                        } else {
                            OutlinedButton(
                                onClick = { ctrl.updateVoice("f") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(14.dp)
                            ) { Text(ctrl.t("female_nexi")) }
                        }
                    }
                }

                // Step 4: API Keys
                else -> {
                    Text(
                        text = ctrl.t("add_keys"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = ctrl.t("add_keys_sub"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(12.dp))
                    LlmClient.PROVIDERS.forEach { p ->
                        OutlinedTextField(
                            value = ctrl.apiKeys[p].orEmpty(),
                            onValueChange = { ctrl.updateApiKey(p, it) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            label = { Text("$p API Key") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        when (step) {
            0 -> {
                Button(
                    onClick = { step = 1 },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                ) { Text(ctrl.t("get_started")) }
                TextButton(
                    onClick = { ctrl.finishOnboarding() },
                    modifier = Modifier.fillMaxWidth()
                ) { Text(ctrl.t("skip")) }
            }
            1 -> {
                Button(
                    onClick = { step = 2 },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                ) { Text(if (ctrl.account.isSignedIn) ctrl.t("continue_btn") else ctrl.t("skip_for_now")) }
            }
            2, 3 -> {
                Button(
                    onClick = { step++ },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                ) { Text(ctrl.t("continue_btn")) }
            }
            else -> {
                Button(
                    onClick = { ctrl.finishOnboarding() },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                ) { Text(ctrl.t("done")) }
                TextButton(
                    onClick = { ctrl.finishOnboarding() },
                    modifier = Modifier.fillMaxWidth()
                ) { Text(ctrl.t("skip_for_now")) }
            }
        }
    }
}
