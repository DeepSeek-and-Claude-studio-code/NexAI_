#!/usr/bin/env node
'use strict';

require('../src/cli').main().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err?.message || err);
  process.exit(1);
});
