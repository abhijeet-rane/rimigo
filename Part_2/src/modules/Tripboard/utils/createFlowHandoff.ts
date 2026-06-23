// In-memory hand-off flag between the create-flow submit and the post-login
// reload, used ONLY to fix the new-user "name-less trip" race.
//
// A logged-out user submits the wizard → we stash the resume payload and open
// login. After OTP the auth flip remounts TripboardPage IN THE SAME DOCUMENT,
// and its auto-start would fire `createBasicTrip` before the post-login name
// modal is even submitted — so the backend derives a name-less trip title.
//
// `markAwaitingPostLoginReload()` is called at submit. It lives in module
// memory, so it SURVIVES that same-document remount (we skip the create there)
// but RESETS on the full page reload the create flow does after the name modal
// (`window.location.href = '/tripboard/new?create=true'` → fresh JS context).
// On that reloaded document the flag is false, so the auto-start creates the
// trip — now with the name already saved.
let awaitingPostLoginReload = false

export const markAwaitingPostLoginReload = () => {
    awaitingPostLoginReload = true
}

export const isAwaitingPostLoginReload = () => awaitingPostLoginReload
