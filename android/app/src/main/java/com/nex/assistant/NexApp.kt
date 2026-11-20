package com.nex.assistant

import android.app.Application

class NexApp : Application() {
    lateinit var controller: NexController
        private set

    override fun onCreate() {
        super.onCreate()
        controller = NexController(this)
    }
}
