/* ==========================================================================
   RELIABLE RUNS
   Apps Script stops any single run after 6 minutes, and a network blip can
   throw in the middle of a batch. Two rules keep the weekly work going:

   1. The monthly job (27th, 7am) is split into stages, each in its own run. Every stage
      books the next one before it starts working (7 minutes out, so it fires
      even if this stage is cut off), then moves it to 1 minute out when it
      finishes early.
   2. A follow-up run (LLM checks, AI Overview checks) books its own retry
      before it does anything, and never runs twice at once. If it succeeds the retry is cancelled; if it
      throws or is cut off, the retry runs 10 minutes later. After 6 failed
      tries in a row it stops and says so in the Run Log.
   ========================================================================== */

const RETRY_MINUTES_ = 10;
const MAX_RETRIES_ = 6;
const WEEKLY_STAGES_ = ['weeklyStage2', 'weeklyStage3', 'weeklyStage4'];

function trig_(fn, ms) { return ScriptApp.newTrigger(fn).timeBased().after(ms).create(); }
/* Deletes one trigger by its id (a trigger object kept from earlier in the run can go stale). */
function untrig_(t) {
  try { const id = t.getUniqueId(); ScriptApp.getProjectTriggers().forEach(function (x) { if (x.getUniqueId() === id) ScriptApp.deleteTrigger(x); }); } catch (e) {}
}
function dropTriggers_(fn) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t); });
}

/* Runs work() with a retry already booked; see rule 2. */
function guarded_(fn, label, work) {
  const props = PropertiesService.getScriptProperties(), k = 'TRIES_' + fn, busyK = 'BUSY_' + fn;
  /* Another run of this job is still working: it has already booked what comes next. */
  const busy = Number(props.getProperty(busyK) || 0);
  if (busy && Date.now() - busy < 6.5 * 60 * 1000) return;
  props.setProperty(busyK, String(Date.now()));
  try { guardedRun_(fn, label, work, props, k); }
  finally { props.deleteProperty(busyK); }
}
function guardedRun_(fn, label, work, props, k) {
  dropTriggers_(fn);
  const retry = trig_(fn, RETRY_MINUTES_ * 60 * 1000);
  const n = Number(props.getProperty(k) || 0) + 1;
  props.setProperty(k, String(n));
  if (n > MAX_RETRIES_ + 1) {
    props.deleteProperty(k);
    untrig_(retry);
    log_(label, 'ERROR', 'Stopped after ' + MAX_RETRIES_ + ' retries in a row. Run it again from the AI Visibility menu once the problem is fixed.');
    return;
  }
  try {
    log_(label, 'OK', work() || '');
    props.deleteProperty(k);
    untrig_(retry);
  } catch (e) {
    if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === fn; })) trig_(fn, RETRY_MINUTES_ * 60 * 1000);
    log_(label, 'RETRY', 'Try ' + n + ' failed, trying again in ' + RETRY_MINUTES_ + ' minutes: ' + e.message);
  }
}

/* One weekly stage; see rule 1. */
function stage_(next, work) {
  const nt = next ? trig_(next, 7 * 60 * 1000) : null;
  work();
  if (nt) { untrig_(nt); trig_(next, 60 * 1000); }
}

/* The 27th of every month at 7am (one run a month keeps DataForSEO spend down): GA4 first.
   The name stays runWeekly so existing menu items keep working. */
function scheduleMonthly_() {
  dropTriggers_('runWeekly');
  ScriptApp.newTrigger('runWeekly').timeBased().onMonthDay(27).atHour(7).nearMinute(0).create();
}
/* Run once from the editor to switch the schedule. */
function scheduleMonthly() {
  scheduleMonthly_();
  log_('Schedule', 'OK', 'Runs once a month: the 27th at 7am (' + Session.getScriptTimeZone() + ').');
}
function runWeekly() {
  WEEKLY_STAGES_.forEach(dropTriggers_);
  stage_('weeklyStage2', function () {
    step_('GA4 discovery', discoverGa4_);
    step_('GA4', pullGa4_);
  });
}
function weeklyStage2() {
  dropTriggers_('weeklyStage2');
  stage_('weeklyStage3', function () {
    step_('Imports', processImports_);
    step_('LLM checks', startLlmChecks_);
  });
}
function weeklyStage3() {
  dropTriggers_('weeklyStage3');
  stage_('weeklyStage4', function () { step_('AI Overview checks', startAioChecks_); });
}
function weeklyStage4() {
  dropTriggers_('weeklyStage4');
  stage_(null, function () { step_('Summary', buildSummary); });
}

function continueLlmChecks() {
  guarded_('continueLlmChecks', 'LLM checks (continued)', function () {
    const r = processLlmQueue_();
    step_('Summary', buildSummary);
    return r;
  });
}

function continueAioChecks() {
  guarded_('continueAioChecks', 'AI Overview checks (continued)', processAioQueue_);
}
