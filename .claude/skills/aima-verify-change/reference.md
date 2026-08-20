# Test-integrity rubric (used by aima-verify-change, step 4)

Applies to every test file the diff touches. Compare the old and new version of each changed test, not just whether tests still exist.

## Signals that a test was weakened, not just changed

- A test was deleted entirely and nothing equivalent replaced it.
- A test (or a specific case within it) was skipped: `.skip`, `xdescribe`/`xit`, commented out, wrapped in `if (false)`, or given a `{ skip: true }`-style option.
- An assertion's expected value changed to match the *new* output of the code under test, without evidence that the old expected value was actually wrong (as opposed to the new code being wrong and the test being adjusted to hide that).
- An assertion was loosened: an exact match became a substring/type/truthy check, a specific error type became a generic catch, a count or threshold was widened, `assert.strictEqual` became a looser comparison.
- A previously-asserted failure path (error thrown, rejection, non-zero exit) was removed or its check dropped.
- Test-only fixtures/mocks changed in a way that removes the very condition the test claimed to exercise (e.g., a fixture that used to trigger the risk path no longer does).

## Signals that a test change is legitimate (do not flag as weakening)

- The behavior itself changed intentionally (visible in the non-test diff) and the test was updated to match a *documented* new behavior, with available repository evidence explaining why the old expectation no longer applies.
- A test was split, renamed, or moved without losing coverage — verify by checking the new location/name actually still runs and asserts the same thing.
- A flaky or duplicate test was consolidated into another test that still covers the same case — verify the case is genuinely still covered, not just that the test count looks similar.

## When it's ambiguous

If you cannot tell from the diff alone whether a test change reflects a real, justified behavior change or is covering up a regression, do not silently accept it and do not silently flag it as a blocker either — report it as a named finding under "ambiguous" with the specific before/after excerpt, and let the verdict be `PASS WITH RISKS` rather than `PASS`. This is exactly the kind of judgment call the report should surface, not resolve for the user.
